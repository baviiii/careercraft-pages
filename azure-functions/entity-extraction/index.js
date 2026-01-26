/**
 * ENTITY EXTRACTION - Extract entities from document chunks for Graph RAG
 * 
 * This function processes document chunks and extracts:
 * - Organizations (SA Government departments, agencies)
 * - Programs (Government initiatives)
 * - Locations (SA regions, suburbs)
 * - Sectors (Industry sectors)
 * - Funding amounts
 * - Key metrics
 * 
 * Can be called:
 * - Per-chunk during PDF processing
 * - In batch mode for existing chunks
 * 
 * Saves to:
 * - Azure Cosmos DB (Gremlin API) - Graph relationships
 * - Azure AI Search (Entity Index) - Semantic similarity discovery
 */

const gremlin = require('gremlin');

// Cosmos DB Gremlin connection
let gremlinClient = null;

function getGremlinClient() {
  if (!gremlinClient) {
    const authenticator = new gremlin.driver.auth.PlainTextSaslAuthenticator(
      `/dbs/${process.env.COSMOS_DATABASE}/colls/${process.env.COSMOS_GRAPH}`,
      process.env.COSMOS_PRIMARY_KEY
    );
    gremlinClient = new gremlin.driver.Client(
      process.env.COSMOS_GREMLIN_ENDPOINT,
      {
        authenticator,
        traversalsource: 'g',
        rejectUnauthorized: true,
        mimeType: 'application/vnd.gremlin-v2.0+json'
      }
    );
  }
  return gremlinClient;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-functions-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Entity extraction tools for GPT-4 function calling
const extractionTools = [
  {
    type: "function",
    function: {
      name: "extract_entities",
      description: "Extract named entities from document text",
      parameters: {
        type: "object",
        properties: {
          entities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Entity name as it appears in text"
                },
                canonicalName: {
                  type: "string",
                  description: "Normalized name (lowercase, underscores, no special chars)"
                },
                entityType: {
                  type: "string",
                  enum: ["organization", "program", "policy", "funding", "skill", "occupation", "location", "sector", "qualification", "date_period", "metric", "person"],
                  description: "Type of entity"
                },
                description: {
                  type: "string",
                  description: "Brief description based on context"
                },
                aliases: {
                  type: "array",
                  items: { type: "string" },
                  description: "Alternative names or abbreviations"
                },
                properties: {
                  type: "object",
                  description: "Type-specific properties (e.g., amount for funding, url for organization)"
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                  description: "Extraction confidence (0-1)"
                },
                mentionPosition: {
                  type: "integer",
                  description: "Approximate character position in text"
                }
              },
              required: ["name", "canonicalName", "entityType", "confidence"]
            }
          },
          relationships: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sourceEntity: {
                  type: "string",
                  description: "Canonical name of source entity"
                },
                targetEntity: {
                  type: "string",
                  description: "Canonical name of target entity"
                },
                relationshipType: {
                  type: "string",
                  enum: ["funds", "employs", "requires", "located_in", "part_of", "targets", "leads_to", "replaces", "contradicts", "supports", "related_to", "mentions", "allocates", "certifies", "sameAs", "aliasOf", "subDepartmentOf"],
                  description: "Type of relationship. Use sameAs for identical entities, aliasOf for abbreviations/variants, subDepartmentOf for hierarchical org relationships"
                },
                evidence: {
                  type: "string",
                  description: "Text excerpt supporting this relationship"
                },
                strength: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                  description: "Relationship strength (0-1)"
                }
              },
              required: ["sourceEntity", "targetEntity", "relationshipType", "strength"]
            }
          },
          primaryTopics: {
            type: "array",
            items: { type: "string" },
            description: "Canonical names of entities that are the main topic of this text"
          },
          // NEW: Structured Impact Extraction
          impacts: {
            type: "array",
            description: "Policy impacts extracted from the document",
            items: {
              type: "object",
              properties: {
                policyId: {
                  type: "string",
                  description: "Canonical name of the policy/program causing the impact"
                },
                policyName: {
                  type: "string",
                  description: "Human-readable name of the policy"
                },
                affectedEntity: {
                  type: "string",
                  description: "What/who is affected (role, industry, org, location, demographic)"
                },
                affectedEntityType: {
                  type: "string",
                  enum: ["occupation", "sector", "organization", "location", "demographic", "skill", "service", "budget"],
                  description: "Type of the affected entity"
                },
                impactType: {
                  type: "string",
                  enum: ["cost", "compliance", "hiring", "skills", "service", "funding", "workforce", "training", "regulation", "opportunity"],
                  description: "Category of impact"
                },
                direction: {
                  type: "string",
                  enum: ["increase", "decrease", "constraint", "enable", "change", "maintain"],
                  description: "Direction of the impact"
                },
                severity: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "Magnitude of the impact"
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                  description: "Confidence in this impact extraction (0-1)"
                },
                evidenceText: {
                  type: "string",
                  description: "Exact quote from the document supporting this impact"
                },
                quantitativeValue: {
                  type: "string",
                  description: "Specific numbers if mentioned (e.g., '$50M', '5000 jobs', '15%')"
                },
                timeframe: {
                  type: "string",
                  description: "When the impact occurs or takes effect (e.g., '2024-2025', 'immediate')"
                }
              },
              required: ["policyId", "affectedEntity", "affectedEntityType", "impactType", "direction", "severity", "confidence", "evidenceText"]
            }
          }
        },
        required: ["entities", "relationships", "primaryTopics", "impacts"]
      }
    }
  }
];

// System prompt for entity extraction
const extractionSystemPrompt = `You are an expert entity and impact extractor specializing in South Australian government documents.

Your job is to identify and extract named entities, their relationships, AND policy impacts from document chunks.

ENTITY TYPES TO EXTRACT:
- organization: SA Government departments, agencies, companies (e.g., "SA Health", "Department for Education", "TAFE SA")
- program: Government programs, initiatives (e.g., "Skills SA", "JobTrainer")
- policy: Regulations, policies, legislation (e.g., "State Budget 2024-25")
- funding: Specific funding allocations (e.g., "$50 million health investment")
- skill: Job skills, competencies (e.g., "data analysis", "project management")
- occupation: Job titles, career paths (e.g., "registered nurse", "software developer")
- location: SA locations (e.g., "Adelaide", "Northern Adelaide", "Whyalla")
- sector: Industry sectors (e.g., "Healthcare", "Defence", "Renewable Energy")
- qualification: Certifications, degrees (e.g., "Certificate III", "Bachelor of Nursing")
- date_period: Time periods, budget years (e.g., "2024-2025", "FY24")
- metric: Statistics, KPIs (e.g., "15% growth", "5,000 jobs")

CANONICAL NAME RULES:
- Lowercase everything
- Replace spaces with underscores
- Remove special characters except underscores
- Use consistent abbreviations (e.g., "sa_health" not "south_australian_health")

RELATIONSHIP TYPES:
- funds: Organization funds Program/Organization
- employs: Organization employs Occupation
- requires: Occupation requires Skill/Qualification
- located_in: Entity located in Location
- part_of: Program part of Policy/Organization
- targets: Program/Policy targets Sector
- leads_to: Qualification leads to Occupation
- allocates: Budget allocates Funding
- sameAs: Two names refer to the SAME entity (e.g., "SA Health" sameAs "South Australian Health")
- aliasOf: One name is an abbreviation/variant of another (e.g., "TAFE" aliasOf "TAFE SA")
- subDepartmentOf: Hierarchical organization relationship (e.g., "Office of Chief Psychiatrist" subDepartmentOf "SA Health")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENTITY CANONICALIZATION (CRITICAL FOR GRAPH QUALITY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALIAS DETECTION RULES:
1. When you see multiple names for the same entity, create sameAs/aliasOf relationships
2. Common patterns to look for:
   - Full name vs abbreviation: "Department for Education" vs "DfE"
   - With/without "SA": "SA Health" vs "Health SA" vs "South Australian Health"
   - Different capitalization or spacing: "TAFE SA" vs "TafeSA"
   - Historical name changes: "Department of Health" might now be "SA Health"

3. Use sameAs when entities are identical (interchangeable)
4. Use aliasOf when one is an abbreviation or informal variant
5. Use subDepartmentOf for organizational hierarchy

KNOWN SA GOVERNMENT ENTITY ALIASES (USE THESE):
- sa_health = south_australian_health = department_of_health_and_wellbeing
- department_for_education = dfe = education_sa
- tafe_sa = tafe = technical_and_further_education
- skills_sa = office_of_skills_sa
- infrastructure_sa = department_of_infrastructure_and_transport
- dpc = department_of_premier_and_cabinet
- dti = department_for_trade_and_investment
- sa_police = sapol = south_australia_police

CANONICALIZATION GUIDELINES:
1. Always use the most common/official name as the canonical name
2. Extract ALL variants as separate entities with aliases array
3. Create sameAs relationships between variant entities
4. Set high confidence (>0.9) only when alias relationship is certain
5. Include evidence text showing both names used interchangeably

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPACT EXTRACTION (CRITICAL FOR GOVERNMENT INTELLIGENCE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Extract POLICY IMPACTS - how policies, budgets, and programs affect entities:

IMPACT TYPES:
- cost: Financial impact on budgets, prices, fees
- compliance: Regulatory requirements, obligations
- hiring: Employment changes, job creation/reduction
- skills: Skills demand, training requirements
- service: Service delivery changes
- funding: Grant availability, budget allocation changes
- workforce: Staffing levels, workforce composition
- training: Education/training program changes
- regulation: Rule changes, policy requirements
- opportunity: New opportunities created

DIRECTION:
- increase: More of something (jobs, funding, requirements)
- decrease: Less of something (budget cuts, job losses)
- constraint: New limitations or restrictions
- enable: Removing barriers, creating pathways
- change: Transformation without clear increase/decrease
- maintain: Continuation of existing state

SEVERITY:
- high: Significant, widespread, or transformative impact
- medium: Moderate impact on specific areas
- low: Minor or limited impact

IMPACT EXTRACTION RULES:
1. ALWAYS include exact evidence text from the document
2. Only extract impacts with explicit textual support
3. Use high confidence (>0.8) only when impact is clearly stated
4. Include quantitative values when numbers are mentioned
5. Link impacts to specific policies/programs when possible
6. Identify the timeframe when mentioned

EXAMPLE IMPACT:
{
  "policyId": "state_budget_2024-25",
  "policyName": "State Budget 2024-25",
  "affectedEntity": "registered_nurse",
  "affectedEntityType": "occupation",
  "impactType": "hiring",
  "direction": "increase",
  "severity": "high",
  "confidence": 0.9,
  "evidenceText": "The budget allocates $50 million to hire 500 additional registered nurses",
  "quantitativeValue": "500 nurses, $50M",
  "timeframe": "2024-2025"
}

EXTRACTION GUIDELINES:
1. Only extract entities clearly mentioned in the text
2. Use high confidence (>0.8) only when entity is unambiguous
3. Extract relationships only when explicitly stated or strongly implied
4. Mark entities as primary topics if they are the main subject of the text
5. Prefer specific entities over generic ones
6. ALWAYS extract impacts when policies affect jobs, budgets, skills, or services`;

/**
 * Generate embedding for an entity
 */
async function generateEmbedding(openAIEndpoint, openAIKey, text) {
  const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large';
  
  const response = await fetch(
    `${openAIEndpoint}/openai/deployments/${embeddingDeployment}/embeddings?api-version=2024-02-15-preview`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': openAIKey,
      },
      body: JSON.stringify({
        input: text.substring(0, 8000),
        model: embeddingDeployment,
      }),
    }
  );

  if (!response.ok) {
    console.warn('Embedding generation failed:', await response.text());
    return null;
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Extract entities from text using GPT-4
 */
async function extractEntities(openAIEndpoint, openAIKey, text, documentId, chunkId) {
  const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o-mini';

  const response = await fetch(
    `${openAIEndpoint}/openai/deployments/${chatDeployment}/chat/completions?api-version=2024-02-15-preview`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': openAIKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: extractionSystemPrompt },
          { role: 'user', content: `Extract entities and relationships from this document chunk:\n\nDocument ID: ${documentId}\nChunk ID: ${chunkId}\n\nText:\n${text.substring(0, 6000)}` }
        ],
        tools: extractionTools,
        tool_choice: { type: "function", function: { name: "extract_entities" } },
        temperature: 0.2,
        max_tokens: 2000,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`GPT-4 extraction failed: ${await response.text()}`);
  }

  const data = await response.json();
  const toolCall = data.choices[0]?.message?.tool_calls?.[0];

  if (!toolCall || toolCall.function.name !== 'extract_entities') {
    throw new Error('GPT-4 did not return valid extraction');
  }

  return JSON.parse(toolCall.function.arguments);
}

// ============================================================================
// ENTITY CANONICALIZATION
// Known aliases for SA Government entities to prevent duplicates
// ============================================================================

const KNOWN_ENTITY_ALIASES = {
  // Health
  'sa_health': ['south_australian_health', 'department_of_health_and_wellbeing', 'health_sa', 'dept_health'],
  'wellbeing_sa': ['office_of_wellbeing_sa', 'wellbeing_south_australia'],
  
  // Education
  'department_for_education': ['dfe', 'education_sa', 'dept_education', 'sa_education'],
  'tafe_sa': ['tafe', 'technical_and_further_education', 'tafe_south_australia'],
  
  // Skills & Employment
  'skills_sa': ['office_of_skills_sa', 'skills_south_australia'],
  'workskil': ['workskil_australia', 'work_skil'],
  
  // Infrastructure
  'infrastructure_sa': ['department_of_infrastructure_and_transport', 'dit', 'infrastructure_south_australia'],
  
  // Premier & Cabinet
  'department_of_premier_and_cabinet': ['dpc', 'premier_and_cabinet', 'premiers_office'],
  
  // Trade & Investment
  'department_for_trade_and_investment': ['dti', 'trade_and_investment_sa'],
  
  // Police & Emergency
  'sa_police': ['sapol', 'south_australia_police', 'sa_police_force'],
  'sa_ambulance': ['saas', 'south_australian_ambulance_service'],
  'mfs': ['metropolitan_fire_service', 'sa_mfs'],
  'cfs': ['country_fire_service', 'sa_cfs'],
  
  // Treasury & Finance
  'department_of_treasury_and_finance': ['dtf', 'treasury_sa', 'sa_treasury'],
  
  // Environment
  'department_for_environment_and_water': ['dew', 'environment_sa', 'environment_and_water'],
  
  // Human Services
  'department_of_human_services': ['dhs', 'human_services_sa'],
};

/**
 * Find canonical entity ID for a given entity name
 * Checks against known aliases to prevent duplicates
 */
function resolveCanonicalEntity(canonicalName, entityType) {
  const normalizedName = canonicalName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  // Check if this name is a known alias
  for (const [canonical, aliases] of Object.entries(KNOWN_ENTITY_ALIASES)) {
    if (canonical === normalizedName || aliases.includes(normalizedName)) {
      return canonical;
    }
  }
  
  return normalizedName;
}

/**
 * Check if two entity names refer to the same entity
 */
function areEntitiesSame(name1, name2) {
  const norm1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const norm2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // One is substring of other (for abbreviations)
  if (norm1.length > 3 && norm2.length > 3) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  }
  
  // Check known aliases
  for (const [canonical, aliases] of Object.entries(KNOWN_ENTITY_ALIASES)) {
    const allNames = [canonical, ...aliases].map(n => n.replace(/_/g, ''));
    if (allNames.includes(norm1) && allNames.includes(norm2)) return true;
  }
  
  return false;
}

/**
 * Save entities to Cosmos DB Gremlin with canonicalization
 */
async function saveEntitiesToCosmos(entities, documentId, chunkId) {
  const client = getGremlinClient();
  const savedEntities = [];
  const processedCanonicals = new Set();

  for (const entity of entities) {
    try {
      // Resolve to canonical name to prevent duplicates
      const resolvedCanonical = resolveCanonicalEntity(entity.canonicalName, entity.entityType);
      const vertexId = `${entity.entityType}_${resolvedCanonical}`;
      
      // Skip if we already processed this canonical in this batch
      if (processedCanonicals.has(vertexId)) {
        savedEntities.push({
          id: vertexId,
          canonical_name: resolvedCanonical,
          entity_type: entity.entityType,
          name: entity.name,
          wasResolved: true
        });
        continue;
      }
      processedCanonicals.add(vertexId);
      
      // Check if vertex exists, if not create it
      const checkQuery = `g.V('${escapeGremlin(vertexId)}')`;
      const existing = await client.submit(checkQuery);
      
      // Store all names/aliases seen for this entity
      const aliasesJson = JSON.stringify(entity.aliases || [entity.name]);
      
      if (existing._items && existing._items.length > 0) {
        // Update existing vertex - add document to source list and merge aliases
        const updateQuery = `
          g.V('${escapeGremlin(vertexId)}')
            .property('mention_count', g.V('${escapeGremlin(vertexId)}').values('mention_count').fold().coalesce(unfold(), constant(0)).math('_ + 1'))
            .property('last_seen_document', '${escapeGremlin(documentId)}')
            .property('last_updated', '${new Date().toISOString()}')
        `;
        await client.submit(updateQuery);
        savedEntities.push({
          id: vertexId,
          canonical_name: resolvedCanonical,
          entity_type: entity.entityType,
          name: entity.name,
          wasResolved: resolvedCanonical !== entity.canonicalName
        });
      } else {
        // Create new vertex with aliases
        const createQuery = `
          g.addV('${escapeGremlin(entity.entityType)}')
            .property('id', '${escapeGremlin(vertexId)}')
            .property('partitionKey', '${escapeGremlin(entity.entityType)}')
            .property('entity_type', '${escapeGremlin(entity.entityType)}')
            .property('name', '${escapeGremlin(entity.name)}')
            .property('canonical_name', '${escapeGremlin(resolvedCanonical)}')
            .property('original_canonical', '${escapeGremlin(entity.canonicalName)}')
            .property('aliases', '${escapeGremlin(aliasesJson)}')
            .property('description', '${escapeGremlin(entity.description || '')}')
            .property('confidence', ${entity.confidence || 0.8})
            .property('source_document', '${escapeGremlin(documentId)}')
            .property('source_chunk', '${escapeGremlin(chunkId)}')
            .property('mention_count', 1)
            .property('created_at', '${new Date().toISOString()}')
        `;
        await client.submit(createQuery);
        savedEntities.push({
          id: vertexId,
          canonical_name: resolvedCanonical,
          entity_type: entity.entityType,
          name: entity.name,
          wasResolved: resolvedCanonical !== entity.canonicalName
        });
      }
    } catch (error) {
      console.warn(`Failed to save entity ${entity.name}:`, error.message);
    }
  }

  return savedEntities;
}

// Escape special characters for Gremlin
function escapeGremlin(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/\\/g, '\\\\');
}

// ============================================================================
// ENTITY SEMANTIC INDEX
// Indexes entities to Azure AI Search for semantic similarity discovery
// ============================================================================

/**
 * Index entities to Azure AI Search for semantic discovery
 * This creates the "sidecar" semantic index alongside the graph
 * Enables finding similar entities without automatic graph edges
 */
async function indexEntitiesToSearch(entities, savedEntities, documentId, openAIEndpoint, openAIKey) {
  const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const searchKey = process.env.AZURE_SEARCH_KEY;
  const entityIndex = process.env.AZURE_SEARCH_ENTITY_INDEX || 'entities';
  
  if (!searchEndpoint || !searchKey) {
    console.warn('Azure Search credentials not configured - skipping entity indexing');
    return { indexed: 0, skipped: entities.length };
  }
  
  const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large';
  const indexedEntities = [];
  
  // Create a map of saved entities for lookup
  const savedEntityMap = new Map(savedEntities.map(e => [e.canonical_name, e]));
  
  for (const entity of entities) {
    try {
      const savedEntity = savedEntityMap.get(entity.canonicalName) || 
                          savedEntityMap.get(resolveCanonicalEntity(entity.canonicalName, entity.entityType));
      
      if (!savedEntity) continue;
      
      // Generate embedding for entity (name + description)
      const textToEmbed = `${entity.name}. ${entity.description || ''}. Type: ${entity.entityType}`;
      
      const embeddingResponse = await fetch(
        `${openAIEndpoint}/openai/deployments/${embeddingDeployment}/embeddings?api-version=2024-02-15-preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': openAIKey,
          },
          body: JSON.stringify({
            input: textToEmbed.substring(0, 8000),
            model: embeddingDeployment,
          }),
        }
      );
      
      if (!embeddingResponse.ok) {
        console.warn(`Failed to generate embedding for entity ${entity.name}`);
        continue;
      }
      
      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;
      
      // Create entity document for Azure Search
      const entityDoc = {
        id: savedEntity.id.replace(/[^a-zA-Z0-9_-]/g, '_'), // Sanitize ID for Azure Search
        entityType: entity.entityType,
        name: entity.name,
        canonicalName: savedEntity.canonical_name,
        description: entity.description || '',
        aliases: entity.aliases || [entity.name],
        sector: null, // Will be populated if entity is a sector or related to one
        sourceDocuments: [documentId],
        mentionCount: 1,
        confidence: entity.confidence || 0.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entityVector: embedding,
        graphVertexId: savedEntity.id,
        relatedEntityIds: []
      };
      
      // Detect sector from entity type or name
      if (entity.entityType === 'sector') {
        entityDoc.sector = entity.canonicalName;
      }
      
      indexedEntities.push(entityDoc);
      
    } catch (error) {
      console.warn(`Failed to index entity ${entity.name}:`, error.message);
    }
  }
  
  if (indexedEntities.length === 0) {
    return { indexed: 0, skipped: entities.length };
  }
  
  // Batch upload to Azure Search
  try {
    const searchUrl = `${searchEndpoint}/indexes/${entityIndex}/docs/index?api-version=2023-11-01`;
    const batch = {
      value: indexedEntities.map(doc => ({
        '@search.action': 'mergeOrUpload',
        ...doc
      }))
    };
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': searchKey,
      },
      body: JSON.stringify(batch),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Failed to index entities to Azure Search: ${errorText}`);
      return { indexed: 0, skipped: entities.length, error: errorText };
    }
    
    const result = await response.json();
    const successCount = result.value?.filter(r => r.status === true || r.statusCode === 200 || r.statusCode === 201).length || 0;
    
    return { 
      indexed: successCount, 
      skipped: entities.length - successCount,
      results: result.value?.slice(0, 5) // First 5 for debugging
    };
    
  } catch (error) {
    console.warn('Entity indexing to Azure Search failed:', error.message);
    return { indexed: 0, skipped: entities.length, error: error.message };
  }
}

/**
 * Search for similar entities in the semantic index
 * Used by agentic planner for entity discovery
 */
async function searchSimilarEntities(entityName, entityType = null, topK = 5) {
  const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const searchKey = process.env.AZURE_SEARCH_KEY;
  const openAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const openAIKey = process.env.AZURE_OPENAI_KEY;
  const entityIndex = process.env.AZURE_SEARCH_ENTITY_INDEX || 'entities';
  const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large';
  
  if (!searchEndpoint || !searchKey || !openAIEndpoint || !openAIKey) {
    return { similar: [], error: 'Search or OpenAI credentials not configured' };
  }
  
  try {
    // Generate embedding for search query
    const embeddingResponse = await fetch(
      `${openAIEndpoint}/openai/deployments/${embeddingDeployment}/embeddings?api-version=2024-02-15-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': openAIKey,
        },
        body: JSON.stringify({
          input: entityName,
          model: embeddingDeployment,
        }),
      }
    );
    
    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }
    
    const embeddingData = await embeddingResponse.json();
    const queryVector = embeddingData.data[0].embedding;
    
    // Build search query
    const searchBody = {
      vectorQueries: [
        {
          kind: 'vector',
          vector: queryVector,
          fields: 'entityVector',
          k: topK
        }
      ],
      select: 'id,entityType,name,canonicalName,description,aliases,confidence,graphVertexId,mentionCount'
    };
    
    // Add entity type filter if specified
    if (entityType) {
      searchBody.filter = `entityType eq '${entityType}'`;
    }
    
    const searchResponse = await fetch(
      `${searchEndpoint}/indexes/${entityIndex}/docs/search?api-version=2023-11-01`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': searchKey,
        },
        body: JSON.stringify(searchBody),
      }
    );
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Search failed: ${errorText}`);
    }
    
    const searchData = await searchResponse.json();
    
    // Format results with similarity scores
    const similar = (searchData.value || []).map(hit => ({
      id: hit.id,
      name: hit.name,
      canonicalName: hit.canonicalName,
      entityType: hit.entityType,
      description: hit.description,
      aliases: hit.aliases,
      confidence: hit.confidence,
      graphVertexId: hit.graphVertexId,
      mentionCount: hit.mentionCount,
      similarity: hit['@search.score'] || 0,
      // Classification based on similarity (using rubric thresholds)
      classification: hit['@search.score'] >= 0.88 ? 'high_similarity' : 
                      hit['@search.score'] >= 0.75 ? 'medium_similarity' : 'low_similarity'
    }));
    
    return { similar, searchedFor: entityName };
    
  } catch (error) {
    return { similar: [], error: error.message };
  }
}

/**
 * Save document-entity mappings (stored as properties on vertices in Cosmos)
 * This is now handled during vertex creation/update
 */
async function saveDocumentEntityMappings(savedEntities, documentId, chunkId, primaryTopics, entities) {
  // Document mappings are stored as vertex properties in Cosmos DB
  // Primary topic marking
  const client = getGremlinClient();
  
  for (const savedEntity of savedEntities) {
    const isPrimary = primaryTopics.includes(savedEntity.canonical_name);
    if (isPrimary) {
      try {
        const query = `g.V('${escapeGremlin(savedEntity.id)}').property('is_primary_topic', true)`;
        await client.submit(query);
      } catch (error) {
        console.warn(`Failed to mark primary topic:`, error.message);
      }
    }
  }
}

/**
 * Save relationships as edges in Cosmos DB
 */
async function saveRelationshipsToCosmos(relationships, savedEntities, documentId, chunkId) {
  const client = getGremlinClient();
  const entityMap = new Map(savedEntities.map(e => [e.canonical_name, e.id]));

  for (const rel of relationships) {
    const sourceId = entityMap.get(rel.sourceEntity);
    const targetId = entityMap.get(rel.targetEntity);

    if (!sourceId || !targetId) {
      console.warn(`Skipping relationship: entity not found (${rel.sourceEntity} -> ${rel.targetEntity})`);
      continue;
    }

    try {
      // Check if edge already exists
      const checkQuery = `
        g.V('${escapeGremlin(sourceId)}')
          .outE('${escapeGremlin(rel.relationshipType)}')
          .where(inV().hasId('${escapeGremlin(targetId)}'))
      `;
      const existing = await client.submit(checkQuery);
      
      if (!existing._items || existing._items.length === 0) {
        // Create new edge
        const createQuery = `
          g.V('${escapeGremlin(sourceId)}')
            .addE('${escapeGremlin(rel.relationshipType)}')
            .to(g.V('${escapeGremlin(targetId)}'))
            .property('strength', ${rel.strength || 0.8})
            .property('evidence', '${escapeGremlin(rel.evidence || '')}')
            .property('source_document', '${escapeGremlin(documentId)}')
            .property('source_chunk', '${escapeGremlin(chunkId)}')
            .property('created_at', '${new Date().toISOString()}')
        `;
        await client.submit(createQuery);
      }
    } catch (error) {
      console.warn(`Failed to save relationship:`, error.message);
    }
  }
}

/**
 * Save impacts to Cosmos DB as vertices with edges to related entities
 * Each impact is stored as a vertex with edges to the policy and affected entity
 */
async function saveImpactsToCosmos(impacts, savedEntities, documentId, chunkId) {
  if (!impacts || impacts.length === 0) return [];
  
  const client = getGremlinClient();
  const savedImpacts = [];
  const entityMap = new Map(savedEntities.map(e => [e.canonical_name, e.id]));
  
  for (const impact of impacts) {
    try {
      // Generate unique impact ID
      const impactId = `impact_${impact.policyId}_${impact.affectedEntity}_${impact.impactType}_${Date.now()}`.substring(0, 100);
      
      // Create impact vertex
      const createQuery = `
        g.addV('impact')
          .property('id', '${escapeGremlin(impactId)}')
          .property('partitionKey', 'impact')
          .property('policy_id', '${escapeGremlin(impact.policyId || '')}')
          .property('policy_name', '${escapeGremlin(impact.policyName || impact.policyId || '')}')
          .property('affected_entity', '${escapeGremlin(impact.affectedEntity || '')}')
          .property('affected_entity_type', '${escapeGremlin(impact.affectedEntityType || '')}')
          .property('impact_type', '${escapeGremlin(impact.impactType || '')}')
          .property('direction', '${escapeGremlin(impact.direction || '')}')
          .property('severity', '${escapeGremlin(impact.severity || 'medium')}')
          .property('confidence', ${impact.confidence || 0.7})
          .property('evidence_text', '${escapeGremlin((impact.evidenceText || '').substring(0, 500))}')
          .property('quantitative_value', '${escapeGremlin(impact.quantitativeValue || '')}')
          .property('timeframe', '${escapeGremlin(impact.timeframe || '')}')
          .property('source_document', '${escapeGremlin(documentId)}')
          .property('source_chunk', '${escapeGremlin(chunkId)}')
          .property('created_at', '${new Date().toISOString()}')
      `;
      
      await client.submit(createQuery);
      
      // Create edge from policy to impact if policy exists as entity
      const policyEntityId = entityMap.get(impact.policyId);
      if (policyEntityId) {
        try {
          const policyEdgeQuery = `
            g.V('${escapeGremlin(policyEntityId)}')
              .addE('has_impact')
              .to(g.V('${escapeGremlin(impactId)}'))
              .property('source_document', '${escapeGremlin(documentId)}')
              .property('created_at', '${new Date().toISOString()}')
          `;
          await client.submit(policyEdgeQuery);
        } catch (edgeErr) {
          console.warn(`Failed to create policy->impact edge:`, edgeErr.message);
        }
      }
      
      // Create edge from impact to affected entity if it exists
      const affectedEntityId = entityMap.get(impact.affectedEntity);
      if (affectedEntityId) {
        try {
          const affectedEdgeQuery = `
            g.V('${escapeGremlin(impactId)}')
              .addE('affects')
              .to(g.V('${escapeGremlin(affectedEntityId)}'))
              .property('impact_type', '${escapeGremlin(impact.impactType || '')}')
              .property('direction', '${escapeGremlin(impact.direction || '')}')
              .property('severity', '${escapeGremlin(impact.severity || '')}')
              .property('source_document', '${escapeGremlin(documentId)}')
              .property('created_at', '${new Date().toISOString()}')
          `;
          await client.submit(affectedEdgeQuery);
        } catch (edgeErr) {
          console.warn(`Failed to create impact->affected edge:`, edgeErr.message);
        }
      }
      
      savedImpacts.push({
        id: impactId,
        policyId: impact.policyId,
        affectedEntity: impact.affectedEntity,
        impactType: impact.impactType,
        direction: impact.direction,
        severity: impact.severity
      });
      
    } catch (error) {
      console.warn(`Failed to save impact:`, error.message);
    }
  }
  
  return savedImpacts;
}

/**
 * Process a batch of chunks
 */
async function processBatch(openAIEndpoint, openAIKey, searchEndpoint, searchKey, searchIndex, batchSize = 10, offset = 0) {
  // Fetch chunks from Azure Search
  const searchBody = {
    search: '*',
    queryType: 'simple',
    top: batchSize,
    skip: offset,
    select: 'id,content,documentId,title,category,sector',
    orderby: 'documentId',
  };

  const searchResponse = await fetch(
    `${searchEndpoint}/indexes/${searchIndex}/docs/search?api-version=2023-11-01`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': searchKey,
      },
      body: JSON.stringify(searchBody),
    }
  );

  if (!searchResponse.ok) {
    throw new Error(`Failed to fetch chunks: ${await searchResponse.text()}`);
  }

  const searchData = await searchResponse.json();
  const chunks = searchData.value || [];

  const results = [];

  for (const chunk of chunks) {
    try {
      // Extract entities from chunk
      const extraction = await extractEntities(
        openAIEndpoint, openAIKey,
        chunk.content,
        chunk.documentId,
        chunk.id
      );

      // Save entities to Cosmos DB
      const savedEntities = await saveEntitiesToCosmos(
        extraction.entities,
        chunk.documentId,
        chunk.id
      );

      // Save document-entity mappings
      await saveDocumentEntityMappings(
        savedEntities,
        chunk.documentId,
        chunk.id,
        extraction.primaryTopics,
        extraction.entities
      );

      // Save relationships to Cosmos DB
      await saveRelationshipsToCosmos(
        extraction.relationships,
        savedEntities,
        chunk.documentId,
        chunk.id
      );

      // Save impacts to Cosmos DB
      const savedImpacts = await saveImpactsToCosmos(
        extraction.impacts || [],
        savedEntities,
        chunk.documentId,
        chunk.id
      );

      // Index entities to Azure Search for semantic discovery
      const indexResult = await indexEntitiesToSearch(
        extraction.entities,
        savedEntities,
        chunk.documentId,
        openAIEndpoint,
        openAIKey
      );

      results.push({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        entitiesExtracted: extraction.entities.length,
        relationshipsExtracted: extraction.relationships.length,
        impactsExtracted: savedImpacts.length,
        entitiesIndexed: indexResult.indexed,
        success: true,
      });

    } catch (error) {
      results.push({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        success: false,
        error: error.message,
      });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    processed: results.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
    hasMore: chunks.length === batchSize,
    nextOffset: offset + batchSize,
  };
}

/**
 * Main handler
 */
module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: '',
    };
    return;
  }

  context.log('Entity Extraction request received');

  try {
    // Parse request
    let request = {};
    if (typeof req.body === 'string' && req.body.trim()) {
      request = JSON.parse(req.body);
    } else if (req.body) {
      request = req.body;
    }

    const { 
      mode = 'single', // 'single' or 'batch'
      text,
      documentId,
      chunkId,
      batchSize = 10,
      offset = 0,
    } = request;

    // Get credentials
    const openAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const openAIKey = process.env.AZURE_OPENAI_KEY;
    const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const searchKey = process.env.AZURE_SEARCH_KEY;
    const searchIndex = process.env.AZURE_SEARCH_INDEX || 'sa-gov-documents';

    if (!openAIEndpoint || !openAIKey) {
      throw new Error('Azure OpenAI credentials not configured');
    }

    if (!process.env.COSMOS_GREMLIN_ENDPOINT || !process.env.COSMOS_PRIMARY_KEY) {
      throw new Error('Cosmos DB credentials not configured');
    }

    const startTime = Date.now();

    if (mode === 'batch') {
      // Batch processing mode
      if (!searchEndpoint || !searchKey) {
        throw new Error('Azure Search credentials required for batch mode');
      }

      const batchResult = await processBatch(
        openAIEndpoint, openAIKey,
        searchEndpoint, searchKey, searchIndex,
        batchSize, offset
      );

      context.res = {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...batchResult,
          executionTime: Date.now() - startTime,
        }),
      };
      return;
    }

    // Single chunk mode
    if (!text || !documentId) {
      context.res = {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'text and documentId are required for single mode' }),
      };
      return;
    }

    // Extract entities
    const extraction = await extractEntities(
      openAIEndpoint, openAIKey,
      text,
      documentId,
      chunkId || 'manual'
    );

    // Save entities to Cosmos DB
    const savedEntities = await saveEntitiesToCosmos(
      extraction.entities,
      documentId,
      chunkId || 'manual'
    );

    // Save document-entity mappings
    await saveDocumentEntityMappings(
      savedEntities,
      documentId,
      chunkId || 'manual',
      extraction.primaryTopics,
      extraction.entities
    );

    // Save relationships to Cosmos DB
    await saveRelationshipsToCosmos(
      extraction.relationships,
      savedEntities,
      documentId,
      chunkId || 'manual'
    );

    context.res = {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entities: extraction.entities,
        relationships: extraction.relationships,
        primaryTopics: extraction.primaryTopics,
        savedCount: savedEntities.length,
        executionTime: Date.now() - startTime,
      }),
    };

  } catch (error) {
    context.log('Entity Extraction error:', error);
    
    context.res = {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

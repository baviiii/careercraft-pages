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
 * Saves to Azure Cosmos DB (Gremlin API)
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
                  enum: ["funds", "employs", "requires", "located_in", "part_of", "targets", "leads_to", "replaces", "contradicts", "supports", "related_to", "mentions", "allocates", "certifies"],
                  description: "Type of relationship"
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
          }
        },
        required: ["entities", "relationships", "primaryTopics"]
      }
    }
  }
];

// System prompt for entity extraction
const extractionSystemPrompt = `You are an expert entity extractor specializing in South Australian government documents.

Your job is to identify and extract named entities and their relationships from document chunks.

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

EXTRACTION GUIDELINES:
1. Only extract entities clearly mentioned in the text
2. Use high confidence (>0.8) only when entity is unambiguous
3. Extract relationships only when explicitly stated or strongly implied
4. Mark entities as primary topics if they are the main subject of the text
5. Prefer specific entities over generic ones`;

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

/**
 * Save entities to Cosmos DB Gremlin
 */
async function saveEntitiesToCosmos(entities, documentId, chunkId) {
  const client = getGremlinClient();
  const savedEntities = [];

  for (const entity of entities) {
    try {
      const vertexId = `${entity.entityType}_${entity.canonicalName}`;
      
      // Check if vertex exists, if not create it
      const checkQuery = `g.V('${escapeGremlin(vertexId)}')`;
      const existing = await client.submit(checkQuery);
      
      if (existing._items && existing._items.length > 0) {
        // Update existing vertex - add document to source list
        const updateQuery = `
          g.V('${escapeGremlin(vertexId)}')
            .property('mention_count', g.V('${escapeGremlin(vertexId)}').values('mention_count').fold().coalesce(unfold(), constant(0)).math('_ + 1'))
        `;
        await client.submit(updateQuery);
        savedEntities.push({
          id: vertexId,
          canonical_name: entity.canonicalName,
          entity_type: entity.entityType,
          name: entity.name
        });
      } else {
        // Create new vertex
        const createQuery = `
          g.addV('${escapeGremlin(entity.entityType)}')
            .property('id', '${escapeGremlin(vertexId)}')
            .property('partitionKey', '${escapeGremlin(entity.entityType)}')
            .property('entity_type', '${escapeGremlin(entity.entityType)}')
            .property('name', '${escapeGremlin(entity.name)}')
            .property('canonical_name', '${escapeGremlin(entity.canonicalName)}')
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
          canonical_name: entity.canonicalName,
          entity_type: entity.entityType,
          name: entity.name
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

      results.push({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        entitiesExtracted: extraction.entities.length,
        relationshipsExtracted: extraction.relationships.length,
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

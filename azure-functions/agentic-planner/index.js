/**
 * AGENTIC PLANNER - Query Planning with GPT-4 Function Calling
 * 
 * This function takes a user query and generates a multi-step retrieval plan.
 * Features:
 * - Query intent classification
 * - Sub-query decomposition
 * - Graph traversal planning
 * - Plan caching for similar queries
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-functions-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Query planning tools for GPT-4 function calling
const planningTools = [
  {
    type: "function",
    function: {
      name: "create_retrieval_plan",
      description: "Create a multi-step retrieval plan to answer the user's query comprehensively",
      parameters: {
        type: "object",
        properties: {
          strategy: {
            type: "string",
            enum: ["single_query", "multi_step", "graph_traversal", "comparative", "temporal"],
            description: "The overall retrieval strategy"
          },
          intent: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["jobs", "training", "budget", "policy", "funding", "skills", "general"],
                description: "Primary category of the query"
              },
              sectors: {
                type: "array",
                items: { type: "string" },
                description: "Relevant industry sectors"
              },
              entities: {
                type: "array",
                items: { type: "string" },
                description: "Key entities mentioned (organizations, programs, locations)"
              },
              timeframe: {
                type: "string",
                description: "Time period if mentioned (e.g., '2024-2025', 'current')"
              }
            },
            required: ["category"]
          },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step: { type: "integer", description: "Step number" },
                purpose: { type: "string", description: "What this step retrieves" },
                method: {
                  type: "string",
                  enum: ["hybrid_search", "graph_traversal", "entity_lookup", "filter_search"],
                  description: "Retrieval method"
                },
                query: { type: "string", description: "Search query for this step" },
                filters: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    sector: { type: "string" },
                    documentType: { type: "string" }
                  }
                },
                graphParams: {
                  type: "object",
                  properties: {
                    startEntity: { type: "string", description: "Entity to start graph traversal from" },
                    relationships: {
                      type: "array",
                      items: { type: "string" },
                      description: "Relationship types to follow"
                    },
                    depth: { type: "integer", description: "Traversal depth (1-3)" }
                  }
                },
                dependsOn: {
                  type: "array",
                  items: { type: "integer" },
                  description: "Steps this depends on (for sequential execution)"
                }
              },
              required: ["step", "purpose", "method", "query"]
            },
            description: "Ordered retrieval steps"
          },
          synthesisGuidance: {
            type: "string",
            description: "Instructions for how to synthesize results from all steps"
          },
          contradictionChecks: {
            type: "array",
            items: { type: "string" },
            description: "Specific contradictions to look for in results"
          }
        },
        required: ["strategy", "intent", "steps", "synthesisGuidance"]
      }
    }
  }
];

// System prompt for query planning
const plannerSystemPrompt = `You are an expert query planner for a South Australian Government intelligence system.

Your job is to analyze user queries and create optimal retrieval plans that will gather all relevant information.

AVAILABLE DATA SOURCES:
- SA Government budget documents (2024-2025)
- Job listings and career information
- Skills and training programs
- Policy documents
- Funding announcements
- Economic reports

RETRIEVAL METHODS:
1. hybrid_search: Combined vector + keyword search. Best for general queries.
2. graph_traversal: Follow entity relationships. Best when query involves connections between entities.
3. entity_lookup: Direct entity search. Best when specific organizations/programs are mentioned.
4. filter_search: Filtered search by category/sector. Best for scoped queries.

PLANNING GUIDELINES:
- For simple factual queries: Use single_query strategy with 1 step
- For comparison queries: Use comparative strategy with parallel steps
- For "how does X relate to Y" queries: Use graph_traversal strategy
- For queries spanning time periods: Use temporal strategy
- For complex policy questions: Use multi_step with 2-4 steps

IMPORTANT - USE GRAPH FOR RICHER RESULTS:
- ALWAYS include at least one graph_traversal step when entities are mentioned (organizations, programs, sectors)
- Combine document search WITH graph traversal for comprehensive answers
- Example plan for "renewable energy initiatives":
  Step 1: filter_search for documents about renewable energy
  Step 2: graph_traversal starting from "renewable energy" sector to find connected entities
  Step 3: entity_lookup for specific organizations found

ENTITY TYPES TO RECOGNIZE:
- Organizations: SA Health, TAFE SA, Department for Education, etc.
- Programs: Skills SA, JobTrainer, etc.
- Sectors: Healthcare, IT, Defence, Renewable Energy, etc.
- Locations: Adelaide, Northern Adelaide, Regional SA, etc.

Always create efficient plans - don't add unnecessary steps. Each step should retrieve distinct information.`;

/**
 * Generate embedding for query (for cache lookup)
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
    throw new Error(`Embedding generation failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Check Supabase for cached similar query plans
 */
async function findCachedPlan(supabaseUrl, supabaseKey, queryEmbedding, similarityThreshold = 0.90) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/find_similar_query_plans`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_query_embedding: queryEmbedding,
          p_similarity_threshold: similarityThreshold,
          p_limit: 1,
        }),
      }
    );

    if (!response.ok) {
      console.warn('Cache lookup failed:', await response.text());
      return null;
    }

    const results = await response.json();
    if (results && results.length > 0 && results[0].success_rate >= 0.7) {
      console.log(`Found cached plan with ${(results[0].similarity * 100).toFixed(1)}% similarity`);
      return results[0];
    }

    return null;
  } catch (error) {
    console.warn('Cache lookup error:', error);
    return null;
  }
}

/**
 * Save successful plan to cache
 */
async function cachePlan(supabaseUrl, supabaseKey, query, queryEmbedding, plan) {
  try {
    // Generate hash for exact matching
    const encoder = new TextEncoder();
    const data = encoder.encode(query.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const queryHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const response = await fetch(
      `${supabaseUrl}/rest/v1/agentic_query_plans`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          query_text: query,
          query_embedding: queryEmbedding,
          query_hash: queryHash,
          plan: plan,
          strategy: plan.strategy,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      // Ignore duplicate key errors (plan already exists)
      if (!error.includes('duplicate key')) {
        console.warn('Failed to cache plan:', error);
      }
    }
  } catch (error) {
    console.warn('Cache save error:', error);
  }
}

/**
 * Get focus area specific context for planning
 */
function getFocusAreaContext(focusArea) {
  const focusContexts = {
    careers: `FOCUS: Career guidance and job opportunities in South Australia.
Prioritize: Job listings, skills requirements, training pathways, career progression, salary information.
Key entities: TAFE SA, universities, employers, industry sectors.`,
    
    entrepreneurship: `FOCUS: Starting and growing businesses in South Australia.
Prioritize: Business grants, startup programs, funding opportunities, regulatory requirements, incubators.
Key entities: Business SA, Innovation Hub, Treasury funding programs, small business grants.`,
    
    policies: `FOCUS: Government policies and regulations in South Australia.
Prioritize: Policy documents, legislation, regulatory changes, compliance requirements.
Key entities: SA Government departments, regulatory bodies, policy frameworks.`,
    
    basic: `FOCUS: General South Australian government information.
Prioritize: Broad coverage across all topics, recent news, general services.
Key entities: All SA Government agencies and services.`,
    
    funding: `FOCUS: Funding and grants available in South Australia.
Prioritize: Grant programs, funding amounts, eligibility criteria, application deadlines.
Key entities: Treasury, funding bodies, industry development funds.`,
  };
  
  return focusContexts[focusArea] || focusContexts.basic;
}

/**
 * Generate query plan using GPT-4 with function calling
 */
async function generatePlan(openAIEndpoint, openAIKey, query, conversationContext = [], focusArea = 'careers') {
  const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o-mini';

  // Build context from conversation history
  let contextMessage = '';
  if (conversationContext.length > 0) {
    contextMessage = '\n\nCONVERSATION CONTEXT:\n';
    conversationContext.slice(-3).forEach((msg, i) => {
      contextMessage += `${msg.role}: ${msg.content.substring(0, 200)}...\n`;
    });
  }

  // Add focus area context
  const focusContext = getFocusAreaContext(focusArea);

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
          { role: 'system', content: plannerSystemPrompt + '\n\n' + focusContext },
          { role: 'user', content: `Create a retrieval plan for this query:\n\n"${query}"${contextMessage}` }
        ],
        tools: planningTools,
        tool_choice: { type: "function", function: { name: "create_retrieval_plan" } },
        temperature: 0.3,
        max_tokens: 2000,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`GPT-4 planning failed: ${await response.text()}`);
  }

  const data = await response.json();
  const toolCall = data.choices[0]?.message?.tool_calls?.[0];

  if (!toolCall || toolCall.function.name !== 'create_retrieval_plan') {
    throw new Error('GPT-4 did not return a valid plan');
  }

  const plan = JSON.parse(toolCall.function.arguments);

  // Add metadata
  plan.generatedAt = new Date().toISOString();
  plan.estimatedTime = estimateExecutionTime(plan);

  return plan;
}

/**
 * Estimate execution time based on plan complexity
 */
function estimateExecutionTime(plan) {
  let time = 500; // Base time
  
  for (const step of plan.steps) {
    switch (step.method) {
      case 'hybrid_search':
        time += 1500;
        break;
      case 'graph_traversal':
        time += 2000 + (step.graphParams?.depth || 1) * 500;
        break;
      case 'entity_lookup':
        time += 800;
        break;
      case 'filter_search':
        time += 1000;
        break;
    }
  }

  return time;
}

/**
 * Lookup entities from Cosmos DB graph via graph-query function
 */
async function lookupEntities(entityNames) {
  try {
    const graphQueryUrl = process.env.GRAPH_QUERY_URL || 'http://localhost:7071/api/graph-query';
    const results = [];
    
    for (const name of entityNames) {
      const response = await fetch(
        graphQueryUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'search',
            query: name,
            limit: 3
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          results.push(...result.data);
        }
      }
    }

    // Deduplicate by id
    const seen = new Set();
    return results.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  } catch (error) {
    console.warn('Entity lookup error:', error);
    return [];
  }
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

  context.log('Agentic Planner request received');

  try {
    // Parse request
    let request = {};
    if (typeof req.body === 'string' && req.body.trim()) {
      request = JSON.parse(req.body);
    } else if (req.body) {
      request = req.body;
    }

    const { query, conversationContext = [], useCache = true, focusArea = 'careers' } = request;

    if (!query) {
      context.res = {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Query is required' }),
      };
      return;
    }

    // Get credentials
    const openAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const openAIKey = process.env.AZURE_OPENAI_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!openAIEndpoint || !openAIKey) {
      throw new Error('Azure OpenAI credentials not configured');
    }

    const startTime = Date.now();
    let plan = null;
    let fromCache = false;

    // Step 1: Generate query embedding
    const queryEmbedding = await generateEmbedding(openAIEndpoint, openAIKey, query);

    // Step 2: Check cache for similar plans
    if (useCache && supabaseUrl && supabaseKey) {
      const cachedResult = await findCachedPlan(supabaseUrl, supabaseKey, queryEmbedding);
      if (cachedResult) {
        plan = cachedResult.plan;
        fromCache = true;
        context.log(`Using cached plan (similarity: ${(cachedResult.similarity * 100).toFixed(1)}%)`);
      }
    }

    // Step 3: Generate new plan if not cached
    if (!plan) {
      plan = await generatePlan(openAIEndpoint, openAIKey, query, conversationContext, focusArea);
      
      // Step 4: Enhance plan with entity lookups from Cosmos DB
      if (plan.intent.entities?.length > 0) {
        const entities = await lookupEntities(plan.intent.entities);
        if (entities.length > 0) {
          plan.resolvedEntities = entities.map(e => ({
            id: e.id,
            name: e.name,
            type: e.entity_type,
            canonicalName: e.canonical_name,
          }));

          // Update graph traversal steps with resolved entity IDs
          for (const step of plan.steps) {
            if (step.method === 'graph_traversal' && step.graphParams?.startEntity) {
              const matchedEntity = entities.find(e => 
                e.name.toLowerCase().includes(step.graphParams.startEntity.toLowerCase()) ||
                e.canonical_name.includes(step.graphParams.startEntity.toLowerCase().replace(/\s+/g, '_'))
              );
              if (matchedEntity) {
                step.graphParams.startEntityId = matchedEntity.id;
              }
            }
          }
        }
      }

      // Step 5: Cache the new plan
      if (supabaseUrl && supabaseKey) {
        await cachePlan(supabaseUrl, supabaseKey, query, queryEmbedding, plan);
      }
    }

    const executionTime = Date.now() - startTime;

    context.res = {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        fromCache,
        planningTime: executionTime,
        queryEmbedding: queryEmbedding.slice(0, 10), // Return truncated embedding for reference
      }),
    };

  } catch (error) {
    context.log('Agentic Planner error:', error);
    
    context.res = {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        plan: null,
      }),
    };
  }
};

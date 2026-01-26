const gremlin = require('gremlin');
const neo4j = require('neo4j-driver');

// Cosmos DB Gremlin connection
const authenticator = new gremlin.driver.auth.PlainTextSaslAuthenticator(
  `/dbs/${process.env.COSMOS_DATABASE}/colls/${process.env.COSMOS_GRAPH}`,
  process.env.COSMOS_PRIMARY_KEY
);

const cosmosClient = new gremlin.driver.Client(
  process.env.COSMOS_GREMLIN_ENDPOINT,
  {
    authenticator,
    traversalsource: 'g',
    rejectUnauthorized: true,
    mimeType: 'application/vnd.gremlin-v2.0+json'
  }
);

// ============================================================================
// SEMANTIC ENTITY SEARCH
// Uses Azure AI Search entity index for semantic similarity discovery
// This is the "sidecar" semantic index - discovery without graph pollution
// ============================================================================

/**
 * Search for similar entities using semantic similarity
 * This enables finding entities even when names don't match exactly
 * 
 * @param {string} entityName - Entity name to search for
 * @param {string} entityType - Optional entity type filter
 * @param {number} topK - Number of results to return
 * @param {Object} context - Azure Function context for logging
 * @returns {Promise<Array>} Array of similar entities with similarity scores
 */
async function searchSimilarEntities(entityName, entityType = null, topK = 10, context = null) {
  const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const searchKey = process.env.AZURE_SEARCH_KEY;
  const openAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const openAIKey = process.env.AZURE_OPENAI_KEY;
  const entityIndex = process.env.AZURE_SEARCH_ENTITY_INDEX || 'entities';
  const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large';
  
  // Check if entity index is configured
  if (!searchEndpoint || !searchKey || !openAIEndpoint || !openAIKey) {
    if (context) context.log('Semantic entity search not configured - missing credentials');
    return [];
  }
  
  try {
    // Step 1: Generate embedding for search query
    const embeddingResponse = await fetch(
      `${openAIEndpoint}/openai/deployments/${embeddingDeployment}/embeddings?api-version=2024-02-15-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': openAIKey,
        },
        body: JSON.stringify({
          input: entityName.substring(0, 8000),
          model: embeddingDeployment,
        }),
      }
    );
    
    if (!embeddingResponse.ok) {
      if (context) context.log.warn('Failed to generate entity query embedding');
      return [];
    }
    
    const embeddingData = await embeddingResponse.json();
    const queryVector = embeddingData.data[0].embedding;
    
    // Step 2: Build semantic search query
    const searchBody = {
      vectorQueries: [
        {
          kind: 'vector',
          vector: queryVector,
          fields: 'entityVector',
          k: topK
        }
      ],
      select: 'id,entityType,name,canonicalName,description,aliases,confidence,graphVertexId,mentionCount,sector',
      top: topK
    };
    
    // Add entity type filter if specified
    if (entityType) {
      searchBody.filter = `entityType eq '${entityType}'`;
    }
    
    // Step 3: Execute semantic search
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
      // Entity index might not exist yet - that's okay, fallback to text search
      const errorText = await searchResponse.text();
      if (context) context.log(`Semantic entity search failed (index may not exist): ${errorText.substring(0, 200)}`);
      return [];
    }
    
    const searchData = await searchResponse.json();
    
    // Step 4: Format results with similarity scores and classification
    const similar = (searchData.value || []).map(hit => {
      // Normalize similarity score (Azure Search vector scores are typically 0-1 for cosine)
      // Higher is better, so we use the score directly
      const similarity = hit['@search.score'] || 0;
      
      return {
        id: hit.id,
        name: hit.name,
        canonicalName: hit.canonicalName,
        entityType: hit.entityType,
        description: hit.description || '',
        aliases: hit.aliases || [],
        confidence: hit.confidence || 0.8,
        graphVertexId: hit.graphVertexId, // Link to graph vertex
        mentionCount: hit.mentionCount || 1,
        sector: hit.sector,
        // Similarity metrics
        similarity: similarity,
        similarityPercent: Math.round(similarity * 100),
        // Classification based on decision rubric thresholds
        classification: similarity >= 0.88 ? 'high_similarity' : 
                        similarity >= 0.75 ? 'medium_similarity' : 'low_similarity',
        // Search method indicator
        searchMethod: 'semantic',
        // Verification status (for agent decision rubric)
        needsVerification: similarity < 0.88, // Below high threshold needs doc verification
      };
    });
    
    if (context) context.log(`Semantic entity search found ${similar.length} similar entities for "${entityName}"`);
    
    return similar;
    
  } catch (error) {
    if (context) context.log.warn(`Semantic entity search error: ${error.message}`);
    return []; // Return empty array on error - will fallback to text search
  }
}

// Neo4j connection
let neo4jDriver = null;
function getNeo4jDriver() {
  if (!neo4jDriver && process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USERNAME || 'neo4j', process.env.NEO4J_PASSWORD)
    );
  }
  return neo4jDriver;
}

module.exports = async function (context, req) {
  context.log('Graph query function triggered');

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers };
    return;
  }

  try {
    const { action, entityName, entityType, depth = 2, limit = 20, backend = 'cosmos' } = req.body || {};

    if (!action) {
      context.res = {
        status: 400,
        headers,
        body: { error: 'Action required: lookup, traverse, path, search, or analytics' }
      };
      return;
    }

    context.log(`Graph query: action=${action}, backend=${backend}`);
    let result;

    // Route to appropriate backend
    if (backend === 'neo4j') {
      result = await executeNeo4jQuery(context, req.body);
    } else {
      // Default to Cosmos DB
      switch (action) {
        case 'lookup':
          result = await lookupEntity(entityName, entityType, context);
          break;

        case 'traverse':
          // For traverse, first find the entity using semantic search if needed
          if (entityName) {
            const foundEntities = await lookupEntity(entityName, entityType, context);
            if (foundEntities.length > 0) {
              // Use the first found entity (highest similarity if semantic)
              const targetEntity = foundEntities[0];
              result = await traverseRelationships(targetEntity.canonical_name || targetEntity.name, depth, limit);
            } else {
              result = [];
            }
          } else {
            result = await traverseRelationships(entityName, depth, limit);
          }
          break;

        case 'path':
          const { fromEntity, toEntity, maxHops = 5 } = req.body;
          // Use semantic search to find both entities first
          const fromEntities = await lookupEntity(fromEntity, null, context);
          const toEntities = await lookupEntity(toEntity, null, context);
          if (fromEntities.length > 0 && toEntities.length > 0) {
            result = await findPath(
              fromEntities[0].canonical_name || fromEntities[0].name,
              toEntities[0].canonical_name || toEntities[0].name,
              maxHops
            );
          } else {
            result = [];
          }
          break;

        case 'search':
          const { query, types } = req.body;
          result = await searchEntities(query, types, limit, context);
          break;

        case 'related':
          const { relationshipType } = req.body;
          result = await getRelatedEntities(entityName, relationshipType, limit);
          break;

        case 'list_all':
          result = await listAllEntities(limit);
          break;

        case 'list_edges':
          result = await listAllEdges(limit);
          break;

        default:
          context.res = {
            status: 400,
            headers,
            body: { error: `Unknown action: ${action}` }
          };
          return;
      }
    }

    // Add semantic search metadata if available
    const semanticMetadata = Array.isArray(result) && result.length > 0 && result[0]._semantic
      ? {
          searchMethod: result[0]._semantic.searchMethod,
          semanticResultsCount: result.filter(r => r._semantic?.searchMethod === 'semantic').length,
          textResultsCount: result.filter(r => r._semantic?.searchMethod === 'text').length,
          avgSimilarity: result
            .filter(r => r._semantic?.similarity !== null && r._semantic?.similarity !== undefined)
            .reduce((sum, r) => sum + (r._semantic.similarity || 0), 0) / 
            Math.max(1, result.filter(r => r._semantic?.similarity !== null).length)
        }
      : null;
    
    context.res = {
      status: 200,
      headers,
      body: {
        success: true,
        action,
        backend,
        data: result,
        count: Array.isArray(result) ? result.length : 1,
        // Semantic search metadata for agent decision rubric
        semanticSearch: semanticMetadata
      }
    };

  } catch (error) {
    context.log.error('Graph query error:', error);
    context.res = {
      status: 500,
      headers,
      body: {
        error: 'Graph query failed',
        message: error.message
      }
    };
  }
};

// Lookup entity by name OR canonical_name, and optional type
// Uses SEMANTIC SEARCH first to find similar entities, then exact match
async function lookupEntity(entityName, entityType, context = null) {
  // STEP 1: Try semantic search first (finds similar entities)
  const semanticResults = await searchSimilarEntities(entityName, entityType, 5, context);
  
  if (semanticResults.length > 0 && semanticResults[0].similarity >= 0.75) {
    // Found good semantic matches - return them
    const graphResults = semanticResults.map(semanticEntity => ({
      id: semanticEntity.graphVertexId || semanticEntity.id,
      name: semanticEntity.name,
      canonical_name: semanticEntity.canonicalName,
      entity_type: semanticEntity.entityType,
      description: semanticEntity.description,
      aliases: semanticEntity.aliases,
      confidence: semanticEntity.confidence,
      mention_count: semanticEntity.mentionCount,
      _semantic: {
        similarity: semanticEntity.similarity,
        similarityPercent: semanticEntity.similarityPercent,
        classification: semanticEntity.classification,
        searchMethod: 'semantic'
      }
    }));
    
    if (context) {
      context.log(`Entity lookup: Found ${semanticResults.length} entities via semantic search`);
    }
    
    return graphResults;
  }
  
  // STEP 2: Fallback to exact match in graph
  if (context) {
    context.log(`Entity lookup: Semantic search found no good matches, using exact match`);
  }
  
  let query = `g.V().or(has('name', '${escapeGremlin(entityName)}'), has('canonical_name', '${escapeGremlin(entityName)}'))`;
  
  if (entityType) {
    query = `g.V().has('entity_type', '${escapeGremlin(entityType)}').or(has('name', '${escapeGremlin(entityName)}'), has('canonical_name', '${escapeGremlin(entityName)}'))`;
  }
  
  query += `.valueMap(true).limit(10)`;
  
  const result = await cosmosClient.submit(query);
  const exactResults = formatVertices(result._items || []);
  
  // Mark as text search
  exactResults.forEach(r => {
    r._semantic = {
      searchMethod: 'text',
      similarity: null
    };
  });
  
  return exactResults;
}

// Traverse relationships from an entity
async function traverseRelationships(entityName, depth, limit) {
  const query = `
    g.V().has('name', '${escapeGremlin(entityName)}')
      .repeat(bothE().otherV().simplePath())
      .times(${Math.min(depth, 3)})
      .path()
      .by(valueMap(true))
      .limit(${Math.min(limit, 50)})
  `;
  
  const result = await cosmosClient.submit(query);
  return formatPaths(result._items || []);
}

// Find path between two entities
async function findPath(fromEntity, toEntity, maxHops) {
  const query = `
    g.V().has('name', '${escapeGremlin(fromEntity)}')
      .repeat(bothE().otherV().simplePath())
      .until(has('name', '${escapeGremlin(toEntity)}').or().loops().is(gte(${maxHops})))
      .has('name', '${escapeGremlin(toEntity)}')
      .path()
      .by(valueMap(true))
      .limit(5)
  `;
  
  const result = await cosmosClient.submit(query);
  return formatPaths(result._items || []);
}

// Search entities by query string - SEMANTIC FIRST, then text fallback
async function searchEntities(query, types, limit, context = null) {
  // STEP 1: Try semantic entity search first (finds similar entities even with different names)
  const semanticResults = await searchSimilarEntities(query, types?.[0], limit, context);
  
  if (semanticResults.length > 0) {
    // Found semantic matches - convert to graph format and return
    // Map semantic results to graph vertex format
    const graphResults = semanticResults.map(semanticEntity => {
      // If we have graphVertexId, we can fetch full vertex data
      // Otherwise, return the semantic data formatted as a vertex
      return {
        id: semanticEntity.graphVertexId || semanticEntity.id,
        name: semanticEntity.name,
        canonical_name: semanticEntity.canonicalName,
        entity_type: semanticEntity.entityType,
        description: semanticEntity.description,
        aliases: semanticEntity.aliases,
        confidence: semanticEntity.confidence,
        mention_count: semanticEntity.mentionCount,
        sector: semanticEntity.sector,
        // Semantic search metadata
        _semantic: {
          similarity: semanticEntity.similarity,
          similarityPercent: semanticEntity.similarityPercent,
          classification: semanticEntity.classification,
          searchMethod: 'semantic',
          needsVerification: semanticEntity.needsVerification
        }
      };
    });
    
    if (context) {
      context.log(`Entity search: Found ${semanticResults.length} entities via semantic search (similarity: ${semanticResults[0]?.similarityPercent || 0}%)`);
    }
    
    return graphResults;
  }
  
  // STEP 2: Fallback to text search in graph (exact/partial name matching)
  if (context) {
    context.log(`Entity search: Semantic search found no results, falling back to text search`);
  }
  
  let gremlinQuery = `g.V()`;
  
  if (types && types.length > 0) {
    const typeFilter = types.map(t => `'${escapeGremlin(t)}'`).join(',');
    gremlinQuery += `.has('entity_type', within(${typeFilter}))`;
  }
  
  // Search by name OR canonical_name containing the query
  gremlinQuery += `.or(has('name', containing('${escapeGremlin(query)}')), has('canonical_name', containing('${escapeGremlin(query)}')))`;
  gremlinQuery += `.valueMap(true).limit(${Math.min(limit, 50)})`;
  
  const result = await cosmosClient.submit(gremlinQuery);
  const textResults = formatVertices(result._items || []);
  
  // Mark text search results
  textResults.forEach(r => {
    r._semantic = {
      searchMethod: 'text',
      similarity: null,
      needsVerification: true // Text matches always need verification
    };
  });
  
  return textResults;
}

// Get related entities by relationship type
async function getRelatedEntities(entityName, relationshipType, limit) {
  // Find entity by name or canonical_name
  let query = `g.V().or(has('name', '${escapeGremlin(entityName)}'), has('canonical_name', '${escapeGremlin(entityName)}'))`;
  
  if (relationshipType) {
    query += `.bothE('${escapeGremlin(relationshipType)}').otherV()`;
  } else {
    query += `.bothE().otherV()`;
  }
  
  query += `.valueMap(true).limit(${Math.min(limit, 50)})`;
  
  const result = await cosmosClient.submit(query);
  return formatVertices(result._items || []);
}

// List all entities (for migration)
async function listAllEntities(limit) {
  const query = `g.V().valueMap(true).limit(${Math.min(limit, 1000)})`;
  const result = await cosmosClient.submit(query);
  return formatVertices(result._items || []);
}

// List all edges (for migration)
async function listAllEdges(limit) {
  const query = `g.E().project('id','label','inV','outV','properties')
    .by(id)
    .by(label)
    .by(inV().values('canonical_name'))
    .by(outV().values('canonical_name'))
    .by(valueMap())
    .limit(${Math.min(limit, 1000)})`;
  const result = await cosmosClient.submit(query);
  return result._items || [];
}

// Escape special characters for Gremlin
function escapeGremlin(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
}

// Format vertex results
function formatVertices(items) {
  return items.map(item => {
    const formatted = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === 'id') {
        formatted.id = value;
      } else if (Array.isArray(value) && value.length === 1) {
        formatted[key] = value[0];
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  });
}

// Format path results
function formatPaths(items) {
  return items.map(path => {
    if (Array.isArray(path)) {
      return path.map(step => {
        if (typeof step === 'object') {
          return formatVertices([step])[0];
        }
        return step;
      });
    }
    return path;
  });
}

// ==================== NEO4J FUNCTIONS ====================

async function executeNeo4jQuery(context, params) {
  const driver = getNeo4jDriver();
  if (!driver) {
    throw new Error('Neo4j not configured');
  }

  const session = driver.session();
  try {
    const { action, entityName, query, depth = 3, limit = 20 } = params;

    switch (action) {
      case 'lookup':
        return await neo4jLookup(session, entityName, limit);
      case 'search':
        return await neo4jSearch(session, query, limit);
      case 'traverse':
        return await neo4jTraverse(session, entityName, depth, limit);
      case 'path':
        return await neo4jShortestPath(session, params.fromEntity, params.toEntity);
      case 'analytics':
        return await neo4jAnalytics(session, params.analyticsType, limit);
      case 'create_entity':
        return await neo4jCreateEntity(session, entityName, params.entityType, params.canonicalName, params.properties);
      case 'create_relationship':
        return await neo4jCreateRelationship(session, params.fromCanonical, params.toCanonical, params.relationType, params.properties);
      default:
        throw new Error(`Unknown Neo4j action: ${action}`);
    }
  } finally {
    await session.close();
  }
}

async function neo4jLookup(session, entityName, limit) {
  const result = await session.run(
    `MATCH (n) WHERE n.name CONTAINS $name OR n.canonical_name CONTAINS $name
     RETURN n LIMIT $limit`,
    { name: entityName, limit: neo4j.int(limit) }
  );
  return result.records.map(r => r.get('n').properties);
}

async function neo4jSearch(session, query, limit) {
  const result = await session.run(
    `MATCH (n) WHERE n.name CONTAINS $query OR n.canonical_name CONTAINS $query
     RETURN n LIMIT $limit`,
    { query: query, limit: neo4j.int(limit) }
  );
  return result.records.map(r => r.get('n').properties);
}

async function neo4jTraverse(session, entityName, depth, limit) {
  const result = await session.run(
    `MATCH path = (start)-[*1..${Math.min(depth, 5)}]-(connected)
     WHERE start.name CONTAINS $name OR start.canonical_name CONTAINS $name
     RETURN path LIMIT $limit`,
    { name: entityName, limit: neo4j.int(limit) }
  );
  return result.records.map(r => {
    const path = r.get('path');
    return {
      nodes: path.segments.map(s => s.start.properties).concat([path.end.properties]),
      relationships: path.segments.map(s => ({ type: s.relationship.type, properties: s.relationship.properties }))
    };
  });
}

async function neo4jShortestPath(session, fromEntity, toEntity) {
  const result = await session.run(
    `MATCH (start), (end)
     WHERE (start.name CONTAINS $from OR start.canonical_name CONTAINS $from)
       AND (end.name CONTAINS $to OR end.canonical_name CONTAINS $to)
     MATCH path = shortestPath((start)-[*..10]-(end))
     RETURN path LIMIT 5`,
    { from: fromEntity, to: toEntity }
  );
  return result.records.map(r => {
    const path = r.get('path');
    return {
      nodes: path.segments.map(s => s.start.properties).concat([path.end.properties]),
      relationships: path.segments.map(s => ({ type: s.relationship.type })),
      length: path.length
    };
  });
}

async function neo4jCreateRelationship(session, fromCanonical, toCanonical, relationType, properties) {
  const result = await session.run(
    `MATCH (a:Entity {canonical_name: $from}), (b:Entity {canonical_name: $to})
     MERGE (a)-[r:${relationType || 'RELATED_TO'}]->(b)
     SET r += $properties
     RETURN r`,
    { 
      from: fromCanonical,
      to: toCanonical,
      properties: properties || {}
    }
  );
  return result.records.map(r => ({ type: relationType, from: fromCanonical, to: toCanonical }));
}

async function neo4jCreateEntity(session, entityName, entityType, canonicalName, properties) {
  const result = await session.run(
    `MERGE (n:Entity {canonical_name: $canonicalName})
     SET n.name = $name, n.entity_type = $entityType, n += $properties
     RETURN n`,
    { 
      canonicalName: canonicalName || entityName.toLowerCase().replace(/\s+/g, '_'),
      name: entityName,
      entityType: entityType || 'unknown',
      properties: properties || {}
    }
  );
  return result.records.map(r => r.get('n').properties);
}

async function neo4jAnalytics(session, analyticsType, limit) {
  let query;
  switch (analyticsType) {
    case 'pagerank':
      query = `MATCH (n) RETURN n.name as name, n.entity_type as type ORDER BY n.name LIMIT $limit`;
      break;
    case 'communities':
      query = `MATCH (n)-[r]-(m) RETURN n.name as name, count(r) as connections ORDER BY connections DESC LIMIT $limit`;
      break;
    case 'central':
      query = `MATCH (n)-[r]-() RETURN n.name as name, n.entity_type as type, count(r) as degree ORDER BY degree DESC LIMIT $limit`;
      break;
    default:
      query = `MATCH (n)-[r]-() RETURN n.name as name, count(r) as connections ORDER BY connections DESC LIMIT $limit`;
  }
  const result = await session.run(query, { limit: neo4j.int(limit) });
  return result.records.map(r => r.toObject());
}

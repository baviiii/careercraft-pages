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
          result = await lookupEntity(entityName, entityType);
          break;

        case 'traverse':
          result = await traverseRelationships(entityName, depth, limit);
          break;

        case 'path':
          const { fromEntity, toEntity, maxHops = 5 } = req.body;
          result = await findPath(fromEntity, toEntity, maxHops);
          break;

        case 'search':
          const { query, types } = req.body;
          result = await searchEntities(query, types, limit);
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

    context.res = {
      status: 200,
      headers,
      body: {
        success: true,
        action,
        backend,
        data: result,
        count: Array.isArray(result) ? result.length : 1
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
async function lookupEntity(entityName, entityType) {
  // Search by both name and canonical_name
  let query = `g.V().or(has('name', '${escapeGremlin(entityName)}'), has('canonical_name', '${escapeGremlin(entityName)}'))`;
  
  if (entityType) {
    query = `g.V().has('entity_type', '${escapeGremlin(entityType)}').or(has('name', '${escapeGremlin(entityName)}'), has('canonical_name', '${escapeGremlin(entityName)}'))`;
  }
  
  query += `.valueMap(true).limit(10)`;
  
  const result = await cosmosClient.submit(query);
  return formatVertices(result._items || []);
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

// Search entities by query string (searches name and canonical_name)
async function searchEntities(query, types, limit) {
  let gremlinQuery = `g.V()`;
  
  if (types && types.length > 0) {
    const typeFilter = types.map(t => `'${escapeGremlin(t)}'`).join(',');
    gremlinQuery += `.has('entity_type', within(${typeFilter}))`;
  }
  
  // Search by name OR canonical_name containing the query
  gremlinQuery += `.or(has('name', containing('${escapeGremlin(query)}')), has('canonical_name', containing('${escapeGremlin(query)}')))`;
  gremlinQuery += `.valueMap(true).limit(${Math.min(limit, 50)})`;
  
  const result = await client.submit(gremlinQuery);
  return formatVertices(result._items || []);
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

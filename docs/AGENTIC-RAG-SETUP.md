# Agentic RAG System Setup Guide

## Overview

The Agentic RAG system provides advanced multi-step reasoning capabilities beyond standard hybrid RAG:

- **Query Planning**: GPT-4 decomposes complex queries into sub-queries
- **Graph Traversal**: Navigate entity relationships for contextual retrieval  
- **Intersection Reasoning**: Identify connections, contradictions, and gaps across documents
- **Plan Caching**: Reuse successful query plans for similar queries

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENTIC RAG FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User Query                                                         │
│      │                                                              │
│      ▼                                                              │
│  ┌─────────────────────┐                                           │
│  │  agentic-planner    │ ◄── GPT-4 Function Calling                │
│  │  Azure Function     │     Creates multi-step retrieval plan     │
│  └─────────┬───────────┘                                           │
│            │                                                        │
│            ▼                                                        │
│  ┌─────────────────────┐     ┌─────────────────────┐              │
│  │  Plan Execution     │────►│  Graph Traversal    │              │
│  │  (useAgenticRAG)    │     │  (Supabase Tables)  │              │
│  └─────────┬───────────┘     └─────────────────────┘              │
│            │                                                        │
│            ▼                                                        │
│  ┌─────────────────────┐                                           │
│  │intersection-reasoning│ ◄── Analyze overlaps & contradictions    │
│  │  Azure Function     │                                           │
│  └─────────┬───────────┘                                           │
│            │                                                        │
│            ▼                                                        │
│  ┌─────────────────────┐                                           │
│  │  Final Response     │ ◄── Synthesized answer with insights      │
│  └─────────────────────┘                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Supabase Graph Tables

Migration: `supabase/migrations/20260106000001_add_graph_rag_tables.sql`

| Table | Purpose |
|-------|---------|
| `graph_entities` | Stores extracted entities (orgs, programs, locations, etc.) |
| `graph_relationships` | Stores relationships between entities |
| `document_entity_map` | Maps which entities appear in which documents |
| `agentic_query_plans` | Caches successful query plans |
| `graph_contradictions` | Tracks discovered contradictions |

### 2. Azure Functions

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `agentic-planner` | Query planning with GPT-4 | `/api/agentic-planner` |
| `intersection-reasoning` | Analyze results for connections/contradictions | `/api/intersection-reasoning` |
| `entity-extraction` | Extract entities from chunks to populate graph | `/api/entity-extraction` |

### 3. Frontend Hook

File: `src/hooks/useAgenticRAG.ts`

Provides the same interface as `useEnterpriseRAG` but with agentic capabilities:
- Multi-step query execution
- Graph traversal
- Contradiction detection

## Setup Instructions

### Step 1: Deploy Supabase Migration

```bash
# Push the migration to Supabase
supabase db push
```

Or apply manually in Supabase SQL Editor.

### Step 2: Configure Environment Variables

Add to your `.env` file:

```env
# Agentic RAG Azure Functions
VITE_AZURE_AGENTIC_PLANNER_URL=https://your-functions.azurewebsites.net/api/agentic-planner
VITE_AZURE_INTERSECTION_REASONING_URL=https://your-functions.azurewebsites.net/api/intersection-reasoning
VITE_AZURE_FUNCTION_KEY=your-function-key

# Required for Azure Functions
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com
AZURE_OPENAI_KEY=your-openai-key
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large

# Supabase (for graph storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Deploy Azure Functions

```bash
cd azure-functions

# Deploy agentic-planner
func azure functionapp publish your-app-name --slot staging

# Or deploy from VS Code Azure Functions extension
```

### Step 4: Seed Initial Graph Data

The migration includes seed data for SA Government entities. To add more:

```sql
-- Add an entity
INSERT INTO graph_entities (name, canonical_name, entity_type, description)
VALUES ('My Program', 'my_program', 'program', 'Description here');

-- Add a relationship
INSERT INTO graph_relationships (source_entity_id, target_entity_id, relationship_type, strength)
SELECT s.id, t.id, 'targets'::relationship_type, 0.9
FROM graph_entities s, graph_entities t
WHERE s.canonical_name = 'my_program' AND t.canonical_name = 'healthcare';
```

## Usage

### Toggle Agentic Mode in UI

In `CareerCoach.tsx`, the mode toggle is available. When agentic mode is enabled:

1. Queries go through `useAgenticRAG` instead of `useEnterpriseRAG`
2. Multi-step plans are generated
3. Graph relationships are traversed
4. Contradictions are detected

### API Reference

#### agentic-planner

**Request:**
```json
{
  "query": "How does healthcare funding relate to training programs?",
  "conversationContext": [],
  "useCache": true
}
```

**Response:**
```json
{
  "plan": {
    "strategy": "multi_step",
    "intent": {
      "category": "funding",
      "sectors": ["healthcare"],
      "entities": ["SA Health", "TAFE SA"]
    },
    "steps": [
      {
        "step": 1,
        "purpose": "Find healthcare funding allocations",
        "method": "hybrid_search",
        "query": "healthcare funding allocation budget 2024-2025"
      },
      {
        "step": 2,
        "purpose": "Find related training programs",
        "method": "graph_traversal",
        "graphParams": {
          "startEntity": "SA Health",
          "relationships": ["funds", "supports"],
          "depth": 2
        }
      }
    ],
    "synthesisGuidance": "Connect funding amounts to training outcomes"
  },
  "fromCache": false,
  "planningTime": 1234
}
```

#### intersection-reasoning

**Request:**
```json
{
  "queryResults": [
    {
      "query": "healthcare funding",
      "method": "hybrid_search",
      "results": [{ "documentId": "doc1", "content": "...", "title": "..." }]
    }
  ],
  "originalQuery": "How does healthcare funding relate to training?",
  "saveFindings": true
}
```

**Response:**
```json
{
  "connections": [
    {
      "type": "funding_flow",
      "source": "doc1",
      "target": "doc2",
      "strength": 0.85,
      "description": "SA Health funding flows to TAFE SA training programs"
    }
  ],
  "contradictions": [
    {
      "type": "funding_mismatch",
      "severity": "medium",
      "source1Document": "doc1",
      "source2Document": "doc3",
      "description": "Budget document states $50M, annual report states $45M"
    }
  ],
  "gaps": [
    {
      "topic": "Training outcomes data",
      "importance": "important",
      "suggestedQuery": "healthcare training program completion rates"
    }
  ],
  "themes": [
    {
      "theme": "Healthcare workforce expansion",
      "documents": ["doc1", "doc2"],
      "confidence": 0.9
    }
  ],
  "synthesisRecommendation": "Focus on the funding-training connection but note the $5M discrepancy"
}
```

## Graph Functions

### get_related_entities(entity_id, relationship_type, direction)

Returns entities connected to the given entity.

```sql
SELECT * FROM get_related_entities(
  'entity-uuid-here',
  'funds',
  'outgoing'
);
```

### find_entity_path(source_id, target_id, max_depth)

Finds paths between two entities.

```sql
SELECT * FROM find_entity_path(
  'source-uuid',
  'target-uuid',
  3
);
```

### find_similar_query_plans(embedding, threshold, limit)

Finds cached plans similar to a new query.

#### entity-extraction

**Single chunk mode:**
```json
{
  "mode": "single",
  "text": "SA Health has allocated $50 million for healthcare training...",
  "documentId": "budget-2024-health",
  "chunkId": "chunk-42"
}
```

**Response:**
```json
{
  "entities": [
    {
      "name": "SA Health",
      "canonicalName": "sa_health",
      "entityType": "organization",
      "confidence": 0.95
    },
    {
      "name": "$50 million",
      "canonicalName": "50m_healthcare_training",
      "entityType": "funding",
      "confidence": 0.9
    }
  ],
  "relationships": [
    {
      "sourceEntity": "sa_health",
      "targetEntity": "50m_healthcare_training",
      "relationshipType": "allocates",
      "strength": 0.9
    }
  ],
  "primaryTopics": ["sa_health"],
  "savedCount": 2,
  "executionTime": 1500
}
```

**Batch mode (for processing existing chunks):**
```json
{
  "mode": "batch",
  "batchSize": 10,
  "offset": 0
}
```

**Response:**
```json
{
  "processed": 10,
  "succeeded": 9,
  "failed": 1,
  "hasMore": true,
  "nextOffset": 10,
  "results": [...]
}
```

## Troubleshooting

### "Agentic planner URL not configured"

Add `VITE_AZURE_AGENTIC_PLANNER_URL` to your `.env` file.

### Graph traversal returns empty

1. Check if entities exist in `graph_entities`
2. Check if relationships exist in `graph_relationships`
3. Verify the entity ID is correct

### High latency

- Enable plan caching (`useCache: true`)
- Reduce graph traversal depth
- Check Azure Function cold start times

## Performance Tips

1. **Use plan caching**: Similar queries reuse plans (90% similarity threshold)
2. **Limit graph depth**: Keep traversal depth ≤ 2 for most queries
3. **Seed common entities**: Pre-populate graph with frequently queried entities
4. **Monitor contradictions**: High contradiction count may indicate stale data

# Horus Intelligence SDK

**The intelligence engine behind smarter decisions.**

Horus is a B2B SaaS SDK that provides enterprise-grade intelligence services — retrieval-augmented generation (RAG), knowledge graphs, entity extraction, document intelligence, and proactive alerting — all accessible through a single TypeScript SDK.

---

## Quick Start

```bash
npm install @horus/sdk
```

```typescript
import { HorusClient } from '@horus/sdk';

const horus = new HorusClient({
  apiKey: 'horus_sk_...',
  tenantId: 'your-tenant-id',
  environment: 'production',
});

// Ask a question against your document corpus
const answer = await horus.rag.query({
  query: 'What funding programs support renewable energy in South Australia?',
  filters: { sector: 'energy', region: 'sa' },
});

console.log(answer.response);     // Natural language answer
console.log(answer.sources);      // Source documents with citations
console.log(answer.confidence);   // 0.0 - 1.0 confidence score
```

---

## What Horus Does

| Capability | Description |
|---|---|
| **Hybrid RAG** | Combines vector search + keyword search + semantic reranking for accurate retrieval |
| **Agentic RAG** | Multi-step reasoning: decomposes complex queries into sub-queries, executes a plan, synthesizes results |
| **Graph Intelligence** | Knowledge graphs with entity relationships, traversal, and contradiction detection |
| **Document Intelligence** | Upload PDFs, extract entities/charts/tables, auto-tag, chunk, and embed |
| **Proactive Alerts** | Anomaly detection across your data — get notified when something changes |
| **Career Intelligence** | Skills gap analysis, sector heatmaps, funding intelligence, job market trends |

---

## Architecture

Horus runs as **6 independent microservices** behind an API gateway:

```
Client App (e.g., CareerCraft)
    │
    ▼
@horus/sdk (TypeScript)
    │
    ▼
API Gateway (auth, rate limiting, routing)
    │
    ├── RAG Service         → Hybrid + Agentic + Chat
    ├── Graph Service       → Knowledge graph queries
    ├── Document Service    → Upload, parse, index, embed
    ├── Entity Service      → NER, entity resolution
    ├── Alert Service       → Anomaly detection, notifications
    └── Scraper Service     → Web crawling, data ingestion
```

### Data Layer

| Store | Purpose |
|---|---|
| **Supabase (PostgreSQL)** | Relational data: tenants, sessions, prompts, metadata |
| **Azure Cosmos DB (Gremlin)** | Graph data: entities, relationships, traversals |
| **Azure AI Search** | Vector + keyword search over document corpus |
| **Azure Blob Storage** | Raw document storage (PDFs, HTML) |
| **Redis** | Response caching, rate limiting, session state |

---

## SDK Reference

### `HorusClient`

```typescript
const horus = new HorusClient({
  apiKey: string,              // Your API key
  tenantId: string,            // Your tenant ID
  environment: 'production' | 'staging' | 'development',
  options?: {
    timeout: number,           // Request timeout (ms), default 30000
    retries: number,           // Retry count, default 3
    cache: boolean,            // Enable client-side caching, default true
    cacheTTL: number,          // Cache TTL (ms), default 300000 (5min)
    baseUrl: string,           // Custom API endpoint (self-hosted)
  }
});
```

---

### RAG Services — `horus.rag`

#### `horus.rag.query(input)`
Single-shot retrieval-augmented generation.

```typescript
const result = await horus.rag.query({
  query: 'What are the top 5 growing occupations in SA?',
  filters: {
    documentType: 'government-report',
    dateRange: { from: '2025-01-01', to: '2026-01-01' },
    sector: 'technology',
  },
  options: {
    maxSources: 10,
    minConfidence: 0.85,
    includeChunks: true,
  },
});

// result.response     → string (natural language answer)
// result.sources      → Source[] (documents with page numbers)
// result.confidence   → number (0-1)
// result.chunks       → Chunk[] (relevant text passages)
// result.metadata     → { tokensUsed, latencyMs, model }
```

#### `horus.rag.chat(input)`
Conversational RAG with session memory.

```typescript
const response = await horus.rag.chat({
  sessionId: 'session-abc-123',          // Persists conversation
  message: 'How does that compare to last year?',
  context: 'career-coaching',            // System prompt context
  history: [],                           // Optional: override history
});

// response.message     → string
// response.sources     → Source[]
// response.followUps   → string[] (suggested follow-up questions)
// response.sessionId   → string
```

#### `horus.rag.metadata(options)`
Retrieve corpus metadata: document counts, categories, available filters.

```typescript
const meta = await horus.rag.metadata({
  operation: 'stats' | 'documents' | 'categories' | 'search',
});
```

---

### Agentic RAG — `horus.agentic`

For complex queries that require multi-step reasoning.

#### `horus.agentic.plan(query)`
Decompose a complex query into an execution plan.

```typescript
const plan = await horus.agentic.plan(
  'Compare SA government funding for healthcare vs education over the past 3 years and identify any contradictions in stated policy goals'
);

// plan.steps → [
//   { id: 1, query: 'SA healthcare funding 2023-2026', type: 'search' },
//   { id: 2, query: 'SA education funding 2023-2026', type: 'search' },
//   { id: 3, type: 'compare', inputs: [1, 2] },
//   { id: 4, query: 'SA policy goals healthcare education', type: 'search' },
//   { id: 5, type: 'contradiction-check', inputs: [3, 4] },
// ]
```

#### `horus.agentic.execute(plan)`
Execute a query plan and get synthesized results.

```typescript
const result = await horus.agentic.execute(plan);

// result.response          → string (synthesized answer)
// result.stepResults       → StepResult[] (per-step outputs)
// result.contradictions    → Contradiction[] (detected conflicts)
// result.connections       → Connection[] (discovered links)
// result.confidence        → number
```

#### `horus.agentic.reason(results)`
Perform intersection reasoning across multiple search results.

```typescript
const analysis = await horus.agentic.reason(searchResults);

// analysis.contradictions  → Contradiction[]
// analysis.connections     → Connection[]
// analysis.gaps            → Gap[] (missing information)
// analysis.synthesis       → string (unified narrative)
```

---

### Graph Intelligence — `horus.graph`

#### `horus.graph.query(input)`
Query the knowledge graph.

```typescript
const result = await horus.graph.query({
  entity: 'Department of Education',
  relationshipType: 'funds',
  depth: 2,
});

// result.nodes  → Entity[]
// result.edges  → Relationship[]
// result.paths  → Path[] (traversal paths)
```

#### `horus.graph.entities(filters)`
List entities with filtering.

```typescript
const entities = await horus.graph.entities({
  type: 'organization' | 'program' | 'policy' | 'funding' | 'skill' | 'occupation',
  sector: 'education',
  limit: 50,
});
```

#### `horus.graph.relationships(entityId)`
Get all relationships for an entity.

```typescript
const rels = await horus.graph.relationships('entity-uuid');

// rels → [
//   { type: 'funds', target: { name: 'STEM Skills Program', type: 'program' } },
//   { type: 'employs', target: { name: '12,000 staff', type: 'metric' } },
// ]
```

#### `horus.graph.traverse(start, depth)`
Deep graph traversal from a starting entity.

```typescript
const graph = await horus.graph.traverse('entity-uuid', 3);

// graph.nodes      → Entity[] (all discovered entities)
// graph.edges      → Relationship[] (all connections)
// graph.clusters   → Cluster[] (auto-detected groupings)
```

---

### Document Intelligence — `horus.documents`

#### `horus.documents.upload(file, metadata)`
Upload and process a document.

```typescript
const doc = await horus.documents.upload(pdfFile, {
  title: 'SA Budget 2025-26',
  category: 'government-budget',
  tags: ['budget', 'sa', '2025'],
});

// doc.id          → string
// doc.status      → 'processing' | 'indexed' | 'failed'
// doc.pageCount   → number
// doc.entities    → Entity[] (auto-extracted)
// doc.chunks      → number (chunks created)
```

#### `horus.documents.extract(documentId)`
Extract structured data from a document.

```typescript
const extraction = await horus.documents.extract('doc-uuid');

// extraction.entities   → Entity[]
// extraction.tables     → Table[]
// extraction.charts     → Chart[]
// extraction.keyFacts   → Fact[]
// extraction.summary    → string
```

#### `horus.documents.search(query, filters)`
Search across indexed documents.

```typescript
const results = await horus.documents.search('renewable energy funding', {
  dateRange: { from: '2025-01-01' },
  category: 'policy',
  limit: 20,
});
```

---

### Intelligence Features — `horus.intelligence`

Pre-built intelligence dashboards and analytics.

```typescript
// Sector investment heatmap
const heatmap = await horus.intelligence.sectorHeatmap({
  region: 'south-australia',
  year: 2026,
});

// Funding analysis
const funding = await horus.intelligence.fundingAnalysis('healthcare');

// Skills gap analysis
const skills = await horus.intelligence.skillsGap('south-australia');

// Contradiction detection across documents
const contradictions = await horus.intelligence.contradictions([
  'doc-uuid-1', 'doc-uuid-2', 'doc-uuid-3'
]);

// Proactive alerts
const alerts = await horus.intelligence.alerts({
  sectors: ['education', 'healthcare'],
  threshold: 'medium',
  since: '2026-01-01',
});
```

---

### Admin — `horus.admin`

For B2B customers managing their Horus tenant.

```typescript
// Manage system prompts
const prompts = await horus.admin.prompts.list();
await horus.admin.prompts.update('career-coach', { template: '...' });

// Usage analytics
const usage = await horus.admin.usage.summary({ period: 'last-30-days' });
// usage → { queries: 12450, tokens: 2340000, documents: 156, cost: '$45.20' }

// Audit trail
const logs = await horus.admin.analytics.auditLog({
  action: 'rag.query',
  since: '2026-04-01',
});
```

---

## Pricing (B2B)

| Plan | Queries/mo | Documents | Graph Entities | Price |
|---|---|---|---|---|
| **Starter** | 1,000 | 100 | 500 | $99/mo |
| **Pro** | 10,000 | 1,000 | 5,000 | $499/mo |
| **Enterprise** | Unlimited | Unlimited | Unlimited | Custom |

All plans include: Hybrid RAG, Agentic RAG, Graph Intelligence, Document Upload, Proactive Alerts.

Enterprise adds: Custom models, dedicated infrastructure, SLA, priority support, on-premise option.

---

## Self-Hosting

Horus can be self-hosted using Docker Compose or Kubernetes:

```bash
git clone https://github.com/your-org/horus-platform.git
cd horus-platform
cp .env.example .env   # Configure your Azure credentials
docker-compose up -d
```

Requirements:
- Azure AI Search instance
- Azure OpenAI deployment (GPT-4o-mini + text-embedding-3-large)
- Azure Cosmos DB (Gremlin API) or Neo4j
- Supabase project (or self-hosted PostgreSQL + pgvector)
- Redis

---

## Development

```bash
# Clone & install
git clone https://github.com/your-org/horus-platform.git
cd horus-platform
npm install

# Start all services locally
npm run dev          # Starts all 6 services + gateway

# Run tests
npm run test         # All packages
npm run test:sdk     # SDK tests only
npm run test:services # Service tests only

# Build SDK
cd packages/horus-sdk
npm run build
npm pack             # Create tarball for local testing
```

---

## Entity Types

Horus recognizes and tracks these entity types in its knowledge graph:

| Type | Examples |
|---|---|
| `organization` | Department of Education, SA Health |
| `program` | STEM Skills Program, JobTrainer |
| `policy` | National Skills Agreement, SA Strategic Plan |
| `funding` | $2.4B health budget, $500M infrastructure spend |
| `skill` | Data Analysis, Cybersecurity, Nursing |
| `occupation` | Software Engineer, Registered Nurse |
| `location` | South Australia, Adelaide, Mount Gambier |
| `sector` | Healthcare, Education, Technology, Defence |
| `qualification` | Certificate IV, Bachelor of Engineering |
| `date_period` | FY2025-26, Q1 2026 |
| `metric` | 12,000 jobs created, 15% growth |

## Relationship Types

| Relationship | Example |
|---|---|
| `funds` | SA Government → funds → STEM Skills Program |
| `employs` | SA Health → employs → 42,000 staff |
| `requires` | Registered Nurse → requires → Bachelor of Nursing |
| `located_in` | BioMed City → located_in → Adelaide |
| `part_of` | TAFE SA → part_of → Department of Education |
| `targets` | JobTrainer → targets → Aged Care sector |
| `leads_to` | Certificate IV → leads_to → Diploma |
| `contradicts` | Policy A → contradicts → Policy B |
| `supports` | Budget allocation → supports → Strategic goal |
| `competes_with` | Program X → competes_with → Program Y |

---

## License

Proprietary. Contact sales@horus.ai for licensing.

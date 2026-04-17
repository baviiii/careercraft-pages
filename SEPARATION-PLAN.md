# CareerCraft + Horus: Surgical Separation Plan

## The Vision

```
BEFORE (Current Monolith):
┌──────────────────────────────────────────┐
│            careercraft-pages             │
│  ┌─────────────┐  ┌──────────────────┐   │
│  │ CareerCraft  │──│  Horus Intel     │   │
│  │ (Resume, Job │  │  (RAG, Graph,    │   │
│  │  Tracker)    │  │   Policy, etc.)  │   │
│  └──────┬───────┘  └───────┬──────────┘   │
│         │      Shared      │              │
│         └──────┬───────────┘              │
│         ┌──────┴───────┐                  │
│         │  Supabase    │                  │
│         │  Azure Funcs │                  │
│         │  Auth        │                  │
│         └──────────────┘                  │
└──────────────────────────────────────────┘

AFTER (Separated Architecture):
┌─────────────────────┐     ┌──────────────────────────────────┐
│    CareerCraft SaaS  │     │        Horus B2B SDK             │
│    (Consumer App)    │     │     (Microservice Platform)      │
│                      │     │                                  │
│  Resume Builder      │     │  ┌──────────┐ ┌──────────────┐  │
│  Job Tracker         │     │  │ RAG      │ │ Graph        │  │
│  Interview Prep      │     │  │ Service  │ │ Intelligence │  │
│  Cover Letters       │     │  └────┬─────┘ └──────┬───────┘  │
│  ATS Analysis        │     │  ┌────┴─────┐ ┌──────┴───────┐  │
│                      │     │  │ Document │ │ Entity       │  │
│  Uses: @horus/sdk    │────▶│  │ Service  │ │ Service      │  │
│                      │     │  └────┬─────┘ └──────┬───────┘  │
│  Own DB: Supabase    │     │  ┌────┴─────┐ ┌──────┴───────┐  │
│  Own Auth            │     │  │ Alert    │ │ Scraper      │  │
│  Own Deployment      │     │  │ Service  │ │ Service      │  │
│                      │     │  └──────────┘ └──────────────┘  │
│                      │     │                                  │
│                      │     │  API Gateway → REST/GraphQL      │
│                      │     │  Own DB: Supabase + Cosmos       │
│                      │     │  Multi-tenant Auth (API Keys)    │
└─────────────────────┘     └──────────────────────────────────┘
```

---

## Phase 0: Pre-Surgery Preparation (Week 1)

### 0.1 — Set Up Monorepo Structure
Before splitting into separate repos, restructure within the current repo first. This is safer and allows incremental migration.

```
careercraft-monorepo/
├── packages/
│   ├── horus-sdk/           # Horus TypeScript SDK (npm package)
│   ├── horus-services/      # Horus microservices (Azure Functions)
│   ├── careercraft-web/     # CareerCraft React frontend
│   └── shared/              # Truly shared utilities (security, types)
├── infrastructure/          # Stays as-is (Bicep, scraper)
├── supabase/                # Split later into per-service schemas
├── turbo.json               # Turborepo config
├── package.json             # Root workspace config
└── tsconfig.base.json       # Shared TS config
```

**Tool choice**: Use **Turborepo** for monorepo management (faster builds, caching, task orchestration).

### 0.2 — Audit & Tag Every File
Go through every file and tag it:
- `[CC]` — CareerCraft only
- `[H]` — Horus only
- `[SHARED]` — Used by both (must be in `shared/` or `horus-sdk/`)

### 0.3 — Create Integration Tests
Before cutting anything, write integration tests for the critical paths:
- Resume creation → save → export flow
- RAG query → response → feedback flow
- Agentic RAG → graph traversal → contradiction detection
- Auth → session → profile flow

---

## Phase 1: Extract Horus SDK (Weeks 2-3)

### 1.1 — Define the Horus SDK Public API

The SDK is what CareerCraft (and future B2B customers) will use to consume Horus services. This is the **contract**.

```typescript
// @horus/sdk

// === Core Client ===
export class HorusClient {
  constructor(config: HorusConfig)

  // RAG Services
  rag: {
    query(input: RAGQueryInput): Promise<RAGResponse>
    chat(input: ChatInput): Promise<ChatResponse>
    metadata(options: MetadataOptions): Promise<MetadataResponse>
  }

  // Agentic RAG
  agentic: {
    plan(query: string): Promise<QueryPlan>
    execute(plan: QueryPlan): Promise<AgenticResponse>
    reason(results: SearchResult[]): Promise<IntersectionAnalysis>
  }

  // Graph Intelligence
  graph: {
    query(input: GraphQuery): Promise<GraphResult>
    entities(filters: EntityFilter): Promise<Entity[]>
    relationships(entityId: string): Promise<Relationship[]>
    traverse(start: string, depth: number): Promise<TraversalResult>
  }

  // Document Intelligence
  documents: {
    upload(file: File, metadata?: DocMetadata): Promise<Document>
    extract(documentId: string): Promise<ExtractionResult>
    tag(documentId: string): Promise<TagResult>
    search(query: string, filters?: SearchFilter): Promise<SearchResult[]>
  }

  // Intelligence Features
  intelligence: {
    sectorHeatmap(filters?: SectorFilter): Promise<HeatmapData>
    fundingAnalysis(sector?: string): Promise<FundingData>
    skillsGap(region?: string): Promise<SkillsGapData>
    contradictions(documentIds: string[]): Promise<Contradiction[]>
    alerts(config?: AlertConfig): Promise<Alert[]>
  }

  // Admin (for B2B customers managing their tenant)
  admin: {
    prompts: PromptManager
    usage: UsageTracker
    analytics: AnalyticsDashboard
  }
}

// === Configuration ===
export interface HorusConfig {
  apiKey: string           // B2B customer API key
  tenantId: string         // Multi-tenant isolation
  environment: 'production' | 'staging' | 'development'
  region?: 'au-east' | 'us-east' | 'eu-west'
  options?: {
    timeout?: number
    retries?: number
    cache?: boolean
    cacheTTL?: number
  }
}
```

### 1.2 — Extract Files into `packages/horus-sdk/`

```
packages/horus-sdk/
├── src/
│   ├── index.ts                    # Public exports
│   ├── client.ts                   # HorusClient class
│   ├── types.ts                    # All public types
│   ├── services/
│   │   ├── rag.service.ts          # ← from hooks/useEnterpriseRAG.ts
│   │   ├── agentic.service.ts      # ← from hooks/useAgenticRAG.ts
│   │   ├── graph.service.ts        # ← from lib/intelligence/graphDataTransform.ts
│   │   ├── document.service.ts     # ← from lib/azureFunctions.ts (doc parts)
│   │   ├── intelligence.service.ts # ← from contexts/IntelligenceContext.tsx (data logic)
│   │   └── alert.service.ts        # ← from lib/impactAnomalyDetection.ts
│   ├── prompts/
│   │   └── system-prompts.ts       # ← from lib/intelligencePrompts.ts
│   └── utils/
│       ├── http.ts                 # HTTP client wrapper
│       └── cache.ts                # Client-side caching
├── package.json
├── tsconfig.json
├── README.md
└── tests/
```

### 1.3 — File Migration Map

| Current Location | Destination | Notes |
|---|---|---|
| `src/hooks/useAgenticRAG.ts` | `horus-sdk/src/services/agentic.service.ts` | Strip React hooks, make pure functions |
| `src/hooks/useEnterpriseRAG.ts` | `horus-sdk/src/services/rag.service.ts` | Strip React hooks, make pure functions |
| `src/hooks/useRAGMetadata.ts` | `horus-sdk/src/services/rag.service.ts` | Merge into RAG service |
| `src/hooks/useImpactQueries.ts` | `horus-sdk/src/services/intelligence.service.ts` | Strip React |
| `src/hooks/useIntelligencePrompts.ts` | `horus-sdk/src/prompts/` | Extract prompt management |
| `src/lib/intelligencePrompts.ts` | `horus-sdk/src/prompts/system-prompts.ts` | Core Horus prompts |
| `src/lib/azureFunctions.ts` | `horus-sdk/src/utils/http.ts` | Azure Functions HTTP client |
| `src/lib/impactAnomalyDetection.ts` | `horus-sdk/src/services/alert.service.ts` | Alert/anomaly logic |
| `src/lib/intelligence/` | `horus-sdk/src/services/` | Graph transforms, viz data |
| `src/lib/agents.ts` | `horus-sdk/src/services/agentic.service.ts` | Agent configurations |
| `src/contexts/IntelligenceContext.tsx` | Split: data logic → SDK, React state → CC | This is the hardest file |
| `src/integrations/supabase/types.ts` | Split: Horus types → SDK, CC types → CC | Type definitions |
| `azure-functions/*` | `packages/horus-services/` | All Azure Functions move here |
| `infrastructure/web-scraper/` | `packages/horus-services/scraper/` | Scraper is Horus-owned |

---

## Phase 2: Horus Microservice Architecture (Weeks 3-5)

### 2.1 — Service Decomposition

Horus is heavy because it runs: triple RAG, graph DB queries, entity extraction, document intelligence, web scraping, contradiction detection, and alert generation. Break it into **6 focused microservices**:

```
┌──────────────────────────────────────────────────────────┐
│                    HORUS PLATFORM                         │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              API Gateway (Azure APIM)               │ │
│  │  Rate Limiting │ Auth │ Routing │ Caching │ Metrics │ │
│  └───────┬────────┬──────┬────────┬─────────┬─────────┘ │
│          │        │      │        │         │            │
│  ┌───────▼──┐ ┌───▼────┐ │  ┌─────▼───┐ ┌──▼────────┐  │
│  │ RAG      │ │ Graph  │ │  │ Entity  │ │ Alert     │  │
│  │ Service  │ │ Intel  │ │  │ Service │ │ Service   │  │
│  │          │ │ Service│ │  │         │ │           │  │
│  │ • Hybrid │ │• Query │ │  │• NER    │ │• Anomaly  │  │
│  │ • Agentc │ │• Travrse│ │  │• Extrctn│ │• Proactve │  │
│  │ • Chat   │ │• Contrd│ │  │• Charts │ │• Threshld │  │
│  └────┬─────┘ └───┬────┘ │  └────┬────┘ └────┬──────┘  │
│       │           │      │       │            │          │
│  ┌────▼───────────▼──────▼───────▼────────────▼───────┐  │
│  │              Document Service                      │  │
│  │  Upload │ Parse │ Index │ Tag │ Chunk │ Embed      │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                  │
│  ┌────────────────────▼───────────────────────────────┐  │
│  │              Scraper Service                       │  │
│  │  Crawl │ Schedule │ Transform │ Load               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Shared Data Layer                     │  │
│  │  Supabase (SQL) │ Cosmos (Graph) │ AI Search │ Blob│  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 2.2 — Service Definitions

#### Service 1: RAG Service
**Responsibility**: All retrieval-augmented generation — hybrid search, agentic multi-step, conversational chat.

```
packages/horus-services/rag-service/
├── src/
│   ├── index.ts                 # Express/Hono entry point
│   ├── routes/
│   │   ├── query.ts             # POST /rag/query
│   │   ├── chat.ts              # POST /rag/chat
│   │   ├── metadata.ts          # GET /rag/metadata
│   │   └── feedback.ts          # POST /rag/feedback
│   ├── handlers/
│   │   ├── hybridSearch.ts      # ← azure-functions/rag-metadata
│   │   ├── agenticPlanner.ts    # ← azure-functions/agentic-planner
│   │   └── intersectionReasoning.ts # ← azure-functions/intersection-reasoning
│   ├── prompts/
│   │   └── system.ts            # RAG-specific prompts
│   └── middleware/
│       ├── auth.ts              # API key validation
│       ├── rateLimit.ts         # Per-tenant rate limiting
│       └── cache.ts             # Response caching
├── Dockerfile
├── package.json
└── tests/
```

**Current Azure Functions absorbed**:
- `rag-metadata` → `handlers/hybridSearch.ts`
- `rag-query` (supabase) → `routes/query.ts`
- `agentic-planner` → `handlers/agenticPlanner.ts`
- `intersection-reasoning` → `handlers/intersectionReasoning.ts`

#### Service 2: Graph Intelligence Service
**Responsibility**: Knowledge graph queries, entity relationships, traversal, contradiction detection.

```
packages/horus-services/graph-service/
├── src/
│   ├── routes/
│   │   ├── query.ts             # POST /graph/query
│   │   ├── entities.ts          # GET /graph/entities
│   │   ├── relationships.ts     # GET /graph/relationships/:id
│   │   └── traverse.ts          # POST /graph/traverse
│   ├── handlers/
│   │   ├── gremlinClient.ts     # ← azure-functions/graph-query
│   │   ├── contradictions.ts    # Contradiction detection logic
│   │   └── pathfinder.ts        # Graph path algorithms
│   └── middleware/
├── Dockerfile
└── package.json
```

**Current Azure Functions absorbed**:
- `graph-query` → `handlers/gremlinClient.ts`

#### Service 3: Document Service
**Responsibility**: Document upload, parsing, chunking, embedding, indexing, tagging.

```
packages/horus-services/document-service/
├── src/
│   ├── routes/
│   │   ├── upload.ts            # POST /documents/upload
│   │   ├── extract.ts           # POST /documents/extract
│   │   ├── search.ts            # GET /documents/search
│   │   └── tag.ts               # POST /documents/tag
│   ├── handlers/
│   │   ├── pdfParser.ts         # ← azure-functions/pdf-upload
│   │   ├── chartExtractor.ts    # ← azure-functions/chart-extraction
│   │   ├── entityExtractor.ts   # ← azure-functions/entity-extraction
│   │   ├── chunker.ts           # Document chunking strategies
│   │   └── embedder.ts          # Azure OpenAI embedding calls
│   └── middleware/
├── Dockerfile
└── package.json
```

**Current Azure Functions absorbed**:
- `pdf-upload` → `handlers/pdfParser.ts`
- `chart-extraction` → `handlers/chartExtractor.ts`
- `entity-extraction` → `handlers/entityExtractor.ts`
- `rag-tag-documents` → `routes/tag.ts`
- `pdf-renderer` → `handlers/pdfParser.ts`

#### Service 4: Entity Service
**Responsibility**: Named entity recognition, entity storage, entity-document mapping.

```
packages/horus-services/entity-service/
├── src/
│   ├── routes/
│   │   ├── extract.ts           # POST /entities/extract
│   │   ├── list.ts              # GET /entities
│   │   ├── relationships.ts     # GET /entities/:id/relationships
│   │   └── merge.ts             # POST /entities/merge (dedup)
│   ├── handlers/
│   │   ├── ner.ts               # NER pipeline
│   │   ├── resolver.ts          # Entity resolution/dedup
│   │   └── linker.ts            # Entity-document linking
│   └── db/
│       └── schema.ts            # graph_entities, graph_relationships
├── Dockerfile
└── package.json
```

#### Service 5: Alert Service
**Responsibility**: Proactive impact alerts, anomaly detection, threshold monitoring.

```
packages/horus-services/alert-service/
├── src/
│   ├── routes/
│   │   ├── alerts.ts            # GET /alerts
│   │   ├── configure.ts         # POST /alerts/configure
│   │   └── history.ts           # GET /alerts/history
│   ├── handlers/
│   │   ├── anomalyDetector.ts   # ← lib/impactAnomalyDetection.ts
│   │   ├── impactAnalyzer.ts    # ← azure-functions/proactive-impact-alerts
│   │   └── scheduler.ts        # Periodic alert checking
│   └── middleware/
├── Dockerfile
└── package.json
```

**Current Azure Functions absorbed**:
- `proactive-impact-alerts` → `handlers/impactAnalyzer.ts`

#### Service 6: Scraper Service
**Responsibility**: Web crawling, data transformation, index loading.

```
packages/horus-services/scraper-service/
├── src/
│   ├── crawlers/
│   │   ├── saGov.ts             # SA Government sites
│   │   ├── jobsSA.ts            # jobs.sa.gov.au
│   │   └── skillsSA.ts          # skills.sa.gov.au
│   ├── transformers/
│   │   └── documentTransform.ts # Raw HTML → structured docs
│   ├── loaders/
│   │   └── searchIndexLoader.ts # Push to Azure AI Search
│   └── scheduler/
│       └── cron.ts              # 6-hour crawl schedule
├── Dockerfile
└── package.json
```

**Current infra absorbed**:
- `infrastructure/web-scraper/` → entire scraper service

### 2.3 — API Gateway

Use **Azure API Management (APIM)** or a lightweight gateway (Kong/Express gateway) for:

```yaml
# gateway-config.yaml
services:
  rag:
    upstream: http://rag-service:3001
    routes:
      - path: /api/v1/rag/*
    rateLimit: 100/min/tenant
    cache: 5min

  graph:
    upstream: http://graph-service:3002
    routes:
      - path: /api/v1/graph/*
    rateLimit: 50/min/tenant

  documents:
    upstream: http://document-service:3003
    routes:
      - path: /api/v1/documents/*
    rateLimit: 20/min/tenant
    maxUploadSize: 50MB

  entities:
    upstream: http://entity-service:3004
    routes:
      - path: /api/v1/entities/*
    rateLimit: 100/min/tenant

  alerts:
    upstream: http://alert-service:3005
    routes:
      - path: /api/v1/alerts/*
    rateLimit: 30/min/tenant

  scraper:
    upstream: http://scraper-service:3006
    routes:
      - path: /api/v1/scraper/*
    auth: admin-only
```

### 2.4 — Multi-Tenancy Design

```sql
-- Every Horus table gets a tenant_id column
ALTER TABLE graph_entities ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE graph_relationships ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE chat_sessions ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE documents ADD COLUMN tenant_id UUID NOT NULL;

-- API Keys table
CREATE TABLE horus_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES horus_tenants(id),
  key_hash TEXT NOT NULL,  -- bcrypt hash of API key
  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL,  -- ['rag:read', 'graph:read', 'documents:write']
  rate_limit INTEGER DEFAULT 100,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tenants table
CREATE TABLE horus_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',  -- starter, pro, enterprise
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policy: tenant isolation
CREATE POLICY tenant_isolation ON graph_entities
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

### 2.5 — Deployment: Containerized on Azure

```yaml
# docker-compose.yml (development)
version: '3.8'
services:
  rag-service:
    build: ./packages/horus-services/rag-service
    ports: ["3001:3001"]
    env_file: .env.rag
    depends_on: [redis]

  graph-service:
    build: ./packages/horus-services/graph-service
    ports: ["3002:3002"]
    env_file: .env.graph

  document-service:
    build: ./packages/horus-services/document-service
    ports: ["3003:3003"]
    env_file: .env.docs

  entity-service:
    build: ./packages/horus-services/entity-service
    ports: ["3004:3004"]
    env_file: .env.entity

  alert-service:
    build: ./packages/horus-services/alert-service
    ports: ["3005:3005"]
    env_file: .env.alerts

  scraper-service:
    build: ./packages/horus-services/scraper-service
    ports: ["3006:3006"]
    env_file: .env.scraper

  gateway:
    build: ./packages/horus-services/gateway
    ports: ["3000:3000"]
    depends_on:
      - rag-service
      - graph-service
      - document-service
      - entity-service
      - alert-service

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

**Production**: Deploy to **Azure Container Apps** (serverless containers, auto-scaling, built-in ingress).

---

## Phase 3: Clean Up CareerCraft (Weeks 4-5)

### 3.1 — CareerCraft Keeps These Files

```
packages/careercraft-web/
├── src/
│   ├── App.tsx                    # Simplified router (CC pages only)
│   ├── pages/
│   │   ├── Index.tsx              # CC landing page (redesigned)
│   │   ├── Dashboard.tsx          # User dashboard
│   │   ├── ResumeBuilder.tsx      # Resume creation
│   │   ├── MyResumes.tsx          # Resume management
│   │   ├── Editor.tsx             # Document editor
│   │   ├── Analysis.tsx           # ATS analysis (uses @horus/sdk)
│   │   ├── Rewrite.tsx            # AI rewriter (uses @horus/sdk)
│   │   ├── CoverLetter.tsx        # Cover letters
│   │   ├── InterviewPrep.tsx      # Interview prep
│   │   ├── JobTracker.tsx         # Job tracking
│   │   ├── AustralianJobs.tsx     # Job listings
│   │   ├── CareerExplorer.tsx     # Career exploration (uses @horus/sdk)
│   │   ├── Auth.tsx               # Authentication
│   │   ├── Settings.tsx           # User settings
│   │   ├── AboutUs.tsx            # About page
│   │   ├── ContactUs.tsx          # Contact
│   │   ├── Privacy.tsx            # Privacy policy
│   │   └── TryUs.tsx              # Trial signup
│   ├── components/
│   │   ├── ui/                    # shadcn-ui (stays)
│   │   ├── landing/               # CC landing components
│   │   ├── layout/                # Layout wrappers
│   │   ├── interview/             # Interview components
│   │   ├── careers/               # Career exploration
│   │   ├── job-market/            # Job market dashboard
│   │   ├── templates/             # Resume templates
│   │   └── rag/                   # CareerCoach chat (uses @horus/sdk)
│   ├── hooks/
│   │   ├── useResumeParser.ts     # Stays in CC
│   │   ├── useUserProfile.ts      # Stays in CC
│   │   ├── useJobCounts.ts        # Stays in CC
│   │   ├── usePersonalization.ts  # Stays in CC
│   │   ├── useSessionTracking.ts  # Stays in CC
│   │   ├── useHorus.ts            # NEW: wrapper around @horus/sdk
│   │   └── use-mobile.ts          # Utility hook
│   ├── lib/
│   │   ├── atsAIAnalyzer.ts       # Stays (calls Horus SDK internally)
│   │   ├── resumeParser.ts        # Stays
│   │   ├── enhancedResumeParser.ts # Stays
│   │   ├── linkedinParser.ts      # Stays
│   │   ├── ocrParser.ts           # Stays
│   │   ├── pdfExport.ts           # Stays
│   │   ├── pdfService.ts          # Stays
│   │   ├── aiRewriter.ts          # Stays (calls Horus SDK internally)
│   │   ├── careerGuardrails.ts    # Stays
│   │   ├── utils.ts               # Stays
│   │   └── security/              # Stays (CC's own security layer)
│   └── integrations/
│       └── supabase/              # CC's own Supabase client
├── package.json                   # CC dependencies + @horus/sdk
├── vite.config.ts
├── vercel.json
└── tailwind.config.ts
```

### 3.2 — CareerCraft Removes These Files

Everything Horus-specific gets deleted from CC:

- `src/pages/IntelligenceOverview.tsx` — Horus dashboard
- `src/pages/PolicyVisualizer.tsx` — Horus policy page
- `src/pages/MarketTrends.tsx` — Horus market page
- `src/pages/SACareerHub.tsx` — Horus SA hub
- `src/pages/Playground.tsx` — Horus testing
- `src/pages/admin/` — Moves to Horus admin portal
- `src/components/intelligence/` — All 40+ Horus intel components
- `src/components/admin/` — Moves to Horus admin portal
- `src/contexts/IntelligenceContext.tsx` — 154KB monster, replaced by SDK
- `src/hooks/useAgenticRAG.ts` — Moved to SDK
- `src/hooks/useEnterpriseRAG.ts` — Moved to SDK
- `src/hooks/useRAGMetadata.ts` — Moved to SDK
- `src/hooks/useImpactQueries.ts` — Moved to SDK
- `src/hooks/useIntelligencePrompts.ts` — Moved to SDK
- `src/hooks/useAdminAuth.ts` — Moved to Horus admin
- `src/hooks/useAdminData.ts` — Moved to Horus admin
- `src/lib/intelligencePrompts.ts` — Moved to SDK
- `src/lib/agents.ts` — Moved to SDK
- `src/lib/azureFunctions.ts` — Replaced by SDK HTTP client
- `src/lib/impactAnomalyDetection.ts` — Moved to alert service
- `src/lib/intelligence/` — Moved to SDK

### 3.3 — How CareerCraft Uses Horus SDK

```typescript
// src/hooks/useHorus.ts — CareerCraft's interface to Horus

import { HorusClient } from '@horus/sdk';

const horus = new HorusClient({
  apiKey: import.meta.env.VITE_HORUS_API_KEY,
  tenantId: import.meta.env.VITE_HORUS_TENANT_ID,
  environment: import.meta.env.VITE_HORUS_ENV || 'production',
});

// React hook wrapper
export function useHorusRAG() {
  return useQuery({
    queryFn: (query: string) => horus.rag.query({ query }),
    // ...
  });
}

export function useHorusChat(sessionId: string) {
  return useMutation({
    mutationFn: (message: string) => horus.rag.chat({
      sessionId,
      message,
      context: 'career-coaching'
    }),
  });
}

export function useCareerIntelligence() {
  return useQuery({
    queryFn: () => horus.intelligence.skillsGap('south-australia'),
    staleTime: 30 * 60 * 1000, // 30 min cache
  });
}
```

---

## Phase 4: Database Separation (Week 5-6)

### 4.1 — Split Schema

**CareerCraft DB** (Supabase Project 1):
```sql
-- User-facing tables
profiles, resumes, cover_letters, job_applications,
interview_prep_sessions, user_skills, user_preferences,
login_history, session_tracking
```

**Horus DB** (Supabase Project 2 + Cosmos DB):
```sql
-- Supabase (relational data)
horus_tenants, horus_api_keys, chat_sessions, rag_feedback,
chat_prompts, documents, search_queries, audit_logs,
security_alerts, job_counts, job_news_cache, location_data,
query_plans, prompt_cache

-- Cosmos DB (graph data)
graph_entities, graph_relationships, graph_entity_documents
```

### 4.2 — Migration Strategy

1. Create new Supabase project for Horus
2. Run schema migrations on new project
3. Data migration script (one-time ETL)
4. Update connection strings in Horus services
5. Keep CC on existing Supabase project (less disruption)
6. Remove Horus tables from CC's Supabase

---

## Phase 5: Horus Admin Portal (Week 6-7)

The current admin pages (`src/pages/admin/`) become part of Horus, not CareerCraft. Build a separate admin UI for Horus B2B customers:

```
packages/horus-admin/
├── src/
│   ├── pages/
│   │   ├── Overview.tsx           # ← admin/AdminOverview.tsx
│   │   ├── Tenants.tsx            # NEW: multi-tenant management
│   │   ├── APIKeys.tsx            # NEW: API key management
│   │   ├── Usage.tsx              # NEW: usage analytics per tenant
│   │   ├── Prompts.tsx            # ← admin/ChatPrompts.tsx
│   │   ├── Documents.tsx          # ← admin/AdminDocuments.tsx
│   │   ├── AuditTrail.tsx         # ← admin/AuditTrail.tsx
│   │   ├── Security.tsx           # ← admin/SecurityAlerts.tsx
│   │   └── Settings.tsx           # ← admin/AdminSettings.tsx
│   └── components/
│       └── [extracted from src/components/admin/]
├── package.json
└── vite.config.ts
```

---

## Phase 6: CI/CD & Deployment (Week 7-8)

### 6.1 — Pipeline Structure

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  # Detect which packages changed
  changes:
    runs-on: ubuntu-latest
    outputs:
      careercraft: ${{ steps.filter.outputs.careercraft }}
      horus-sdk: ${{ steps.filter.outputs.horus-sdk }}
      horus-services: ${{ steps.filter.outputs.horus-services }}
    steps:
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            careercraft: 'packages/careercraft-web/**'
            horus-sdk: 'packages/horus-sdk/**'
            horus-services: 'packages/horus-services/**'

  # Build & deploy only changed packages
  deploy-careercraft:
    needs: changes
    if: needs.changes.outputs.careercraft == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: turbo build --filter=careercraft-web
      - run: vercel deploy --prod

  deploy-horus-sdk:
    needs: changes
    if: needs.changes.outputs.horus-sdk == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: turbo build --filter=@horus/sdk
      - run: npm publish  # to npm registry

  deploy-horus-services:
    needs: changes
    if: needs.changes.outputs.horus-services == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: turbo build --filter=horus-services...
      - run: az containerapp update  # deploy to Azure Container Apps
```

### 6.2 — Deployment Targets

| Package | Hosting | URL Pattern |
|---|---|---|
| `careercraft-web` | Vercel | `app.careercraft.com.au` |
| `horus-sdk` | npm registry | `npm install @horus/sdk` |
| `horus-services/*` | Azure Container Apps | `api.horus.ai/v1/*` |
| `horus-admin` | Vercel | `admin.horus.ai` |
| Infrastructure | Azure (Bicep) | Managed resources |

---

## Execution Order Summary

| Phase | What | Duration | Risk |
|---|---|---|---|
| **0** | Monorepo setup, audit, tests | Week 1 | Low |
| **1** | Extract Horus SDK package | Weeks 2-3 | Medium |
| **2** | Build Horus microservices | Weeks 3-5 | High |
| **3** | Clean CareerCraft, wire to SDK | Weeks 4-5 | Medium |
| **4** | Database separation | Weeks 5-6 | High |
| **5** | Horus Admin Portal | Weeks 6-7 | Low |
| **6** | CI/CD & deployment | Weeks 7-8 | Medium |

### Critical Path
```
Phase 0 → Phase 1 → Phase 2 ──→ Phase 4 → Phase 6
                  ↘ Phase 3 ↗         ↘ Phase 5 ↗
```

Phase 1 (SDK) must come first — both Phase 2 (services) and Phase 3 (CC cleanup) depend on the SDK contract being defined. Phase 4 (DB split) blocks final deployment. Phase 5 and 6 can overlap.

### Rollback Strategy
- Keep the original monolith branch intact (`main-monolith`)
- Feature flags for SDK vs direct calls during migration
- Blue-green deployment for each microservice cutover
- Database separation is last because it's hardest to roll back

---

## Cost Impact

### Current Monthly Cost: ~$295-360/month

### Post-Separation Estimate:

| Resource | Current | After | Notes |
|---|---|---|---|
| Azure AI Search | $200 | $200 | Shared (Horus-owned, CC reads via SDK) |
| Azure OpenAI | $20-50 | $30-60 | Slightly more overhead from service boundaries |
| Azure Doc Intelligence | $50-100 | $50-100 | No change |
| Azure Blob Storage | $5-10 | $5-10 | No change |
| Azure Cosmos DB | ~$25 | ~$25 | No change |
| Azure Container Apps | $0 | $30-80 | New: 6 microservices (scale-to-zero) |
| Redis (caching) | $0 | $15-30 | New: shared cache for services |
| Vercel (CC) | $0-20 | $0-20 | No change |
| Vercel (Horus Admin) | $0 | $0-20 | New: admin portal |
| Supabase (2 projects) | $25 | $50 | Second project for Horus |
| **Total** | **~$325-435** | **$405-595** | ~25-40% increase |

The cost increase is offset by:
- Independent scaling (don't scale CC infra when Horus is busy)
- B2B revenue from Horus SDK customers
- Better resource utilization per service

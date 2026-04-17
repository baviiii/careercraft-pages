// ============================================================================
// RAG Types - Shared between CareerCraft and Horus SDK
// ============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: EnhancedSource[];
  timestamp: Date;
  isLoading?: boolean;
  isStreaming?: boolean;
  rating?: "helpful" | "not-helpful" | null;
  tokens?: number;
  responseTime?: number;
  followUpQuestions?: string[];
  proactiveInsight?: ProactiveInsight;
  visualData?: VisualChartData;
  confidence?: "high" | "medium" | "low";
  queryIntent?: QueryIntent;
  // Evidence Chain - Government-Grade Traceability
  evidenceChain?: EvidenceChain;
  // Temporal Summary - Policy Version Awareness
  temporalSummary?: TemporalSummary;
  // Agentic-specific fields
  agentPlan?: AgentPlan;
  graphConnections?: GraphConnection[];
  contradictions?: Contradiction[];
  gaps?: Array<{
    topic: string;
    importance: "critical" | "important" | "nice_to_have";
    suggestedQuery?: string;
  }>;
  themes?: Array<{
    theme: string;
    documents: string[];
    confidence: number;
  }>;
}

export interface EnhancedSource {
  title: string;
  documentId: string;
  pageNumber?: number;
  url?: string;
  snippet: string;
  relevance: number;
  category?: string;
  tableData?: any;
  extractionMethod?: "table" | "text" | "metadata";
  sourceIndex?: number;
  // Temporal fields for policy version awareness
  publicationYear?: number;
  effectiveDate?: string;
  expiryDate?: string;
  version?: string;
  supersedes?: string;
  supersededBy?: string;
  amendmentOf?: string;
  temporalStatus?: TemporalStatus;
}

export interface CitationDetail {
  reference: string;
  sourceIndex: number;
  sourceTitle: string;
  documentId: string;
}

export interface EvidenceChain {
  confidence: "high" | "medium" | "low";
  confidenceScore: number;
  confidenceDescription: string;
  breakdown: {
    citationCoverage: number;
    sourceRelevance: number;
    citationValidity: number;
    sourceDiversity: number;
  };
  citations: {
    total: number;
    valid: number;
    invalid: number;
    coverage: number;
    details: CitationDetail[];
  };
  warnings: string[];
  uncitedClaims: string[];
  isReliable: boolean;
  auditMetadata: {
    queryTimestamp: string;
    sourcesEvaluated: number;
    uniqueDocuments: number;
  };
}

export interface TemporalStatus {
  status: "current" | "superseded" | "expired" | "historical" | "aging" | "pending" | "amendment";
  description: string;
  isCurrentVersion: boolean;
  recommendAction: string | null;
  ageYears?: number;
}

export interface TemporalSummary {
  statusCounts: {
    current: number;
    superseded: number;
    expired: number;
    historical: number;
    aging: number;
    pending: number;
    amendment: number;
  };
  yearDistribution: Record<number, number>;
  dateRange: {
    oldest: number;
    newest: number;
  } | null;
  warnings: string[];
  hasFreshnessIssues: boolean;
}

export interface ProactiveInsight {
  type: "trend" | "recommendation" | "warning" | "opportunity";
  title: string;
  description: string;
  actionable: string;
  relatedQuery?: string;
}

export interface VisualChartData {
  type: "funding" | "careers" | "skills";
  sector?: string;
  data: any;
  title: string;
}

export interface QueryIntent {
  category: "jobs" | "training" | "budget" | "general";
  sector?: string;
  confidence: number;
}

export interface ConversationContext {
  messages: ChatMessage[];
  topics: string[];
  sectors: string[];
  intent: QueryIntent | null;
  sessionStart: Date;
}

export interface QueryAnalytics {
  totalQueries: number;
  avgResponseTime: number;
  topTopics: Array<{ topic: string; count: number }>;
  helpfulRate: number;
  cacheHitRate: number;
}

// Agentic-specific types
export interface AgentPlan {
  strategy: string;
  steps: AgentStep[];
  estimatedTime?: number;
  intent?: {
    category: string;
    sectors?: string[];
    entities?: string[];
    timeframe?: string;
  };
  resolvedEntities?: Array<{
    id: string;
    name: string;
    type: string;
    canonicalName: string;
  }>;
  synthesisGuidance?: string;
  contradictionChecks?: string[];
  fromCache?: boolean;
  planningTime?: number;
}

export interface AgentStep {
  step: number;
  query: string;
  purpose?: string;
  method: "graph_traversal" | "hybrid_search" | "entity_lookup" | "filter_search" | "get_impacts";
  startNode?: string;
  traverse?: string[];
  filters?: {
    category?: string;
    sector?: string;
    documentType?: string;
    impactType?: string;
    severity?: string;
    timeframe?: string;
  };
  graphParams?: {
    startEntity?: string;
    startEntityId?: string;
    relationships?: string[];
    depth?: number;
  };
  dependsOn?: number[];
}

export interface GraphConnection {
  type: "same_entity" | "same_document" | "same_sector" | "relationship" | "causal" | "temporal" | "funding_flow" | "policy_link";
  source: string;
  target: string;
  strength: number;
  description?: string;
  evidence?: string;
}

export interface Contradiction {
  type: "policy_conflict" | "funding_mismatch" | "data_inconsistency" | "timeline_conflict" | "priority_conflict";
  source1Document: string;
  source1Text?: string;
  source2Document: string;
  source2Text?: string;
  description: string;
  severity: "high" | "medium" | "low";
  possibleResolution?: string;
}

export interface IntersectionAnalysis {
  connections: GraphConnection[];
  contradictions: Contradiction[];
  gaps: Array<{
    topic: string;
    importance: "critical" | "important" | "nice_to_have";
    suggestedQuery?: string;
  }>;
  themes: Array<{
    theme: string;
    documents: string[];
    confidence: number;
  }>;
  synthesisRecommendation?: string;
  overlapStats?: {
    totalUniqueDocuments: number;
    overlappingDocuments: number;
  };
}

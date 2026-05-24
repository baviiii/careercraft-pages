// Re-export shared types
export type {
  ChatMessage,
  EnhancedSource,
  CitationDetail,
  EvidenceChain,
  TemporalStatus,
  TemporalSummary,
  ProactiveInsight,
  VisualChartData,
  QueryIntent,
  ConversationContext,
  QueryAnalytics,
  AgentPlan,
  AgentStep,
  GraphConnection,
  Contradiction,
  IntersectionAnalysis,
 
} from "@careercraft/shared";

// SDK-specific types
export interface HorusConfig {
  azureFunctionsUrl: string;
  azureFunctionsKey?: string;
  agenticPlannerUrl?: string;
  intersectionReasoningUrl?: string;
  graphQueryUrl?: string;
  /** Max concurrent HTTP requests */
  maxConcurrentRequests?: number;
  /** Min interval between requests in ms */
  minRequestInterval?: number;
}

export interface AzureFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SemanticSearchResult {
  answer: string;
  sources: Array<{
    id: string;
    content: string;
    title: string;
    documentId: string;
    pageNumber?: number;
    category?: string;
    sector?: string;
    score?: number;
    url?: string;
    metadata?: any;
    chunkType?: string;
    hasChart?: boolean;
    chartType?: string;
    chartData?: any;
    chartImageUrl?: string;
    chartConfidence?: number;
    visualDescription?: string;
  }>;
  suggestedQuestions?: string[];
  visualizationData?: any;
}

export interface SearchFilters {
  category?: string;
  sector?: string;
  documentType?: "pdf" | "web" | "all";
  tags?: string[];
}

export interface SearchOptions {
  topK?: number;
  timeAwareRanking?: boolean;
  systemPrompt?: string;
}

export interface RAGStats {
  totalDocuments: number;
  totalChunks: number;
  facets?: {
    category?: Array<{ value: string; count: number }>;
    sector?: Array<{ value: string; count: number }>;
    documentType?: Array<{ value: string; count: number }>;
  };
}

export interface DocumentMetadata {
  documentId: string;
  title: string;
  category?: string;
  sector?: string;
  documentType: string;
  tags?: string[];
  url?: string;
  pageCount?: number;
  chunkCount?: number;
  lastModified?: string;
  score?: number;
  pageNumber?: number;
}

export interface AgenticRAGOptions {
  graphBackend?: 'cosmos' | 'neo4j';
  finalSystemPrompt?: string;
}

export interface StepResult {
  step: number;
  query: string;
  method: string;
  results: any[];
  success: boolean;
  error?: string;
  executionTime: number;
}

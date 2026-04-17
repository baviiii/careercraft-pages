export { HorusClient } from "./client";
export { ChatSession } from "./chat";
export { AgenticSession } from "./agentic";
export { HttpTransport } from "./http";

// Re-export types
export type {
  HorusConfig,
  AzureFunctionResponse,
  SemanticSearchResult,
  SearchFilters,
  SearchOptions,
  RAGStats,
  DocumentMetadata,
  AgenticRAGOptions,
  StepResult,
} from "./types";

// Re-export shared types for convenience
export type {
  ChatMessage,
  EnhancedSource,
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

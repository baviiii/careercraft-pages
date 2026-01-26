/**
 * AGENTIC RAG HOOK - Graph RAG + Agentic Retrieval
 * Features: Multi-step reasoning, relationship discovery, contradiction detection
 * 
 * SEPARATION OF CONCERNS:
 * - This hook handles agentic retrieval with graph RAG
 * - useEnterpriseRAG handles standard hybrid RAG
 * - User can switch between modes in UI
 * 
 * BACKEND INTEGRATION:
 * - agentic-planner Azure Function: Query planning with GPT-4 function calling
 * - intersection-reasoning Azure Function: Analyze overlaps & contradictions
 * - graph-query Azure Function: Cosmos DB (Gremlin) and Neo4j graph queries
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useRAGMetadata } from "./useRAGMetadata";

// Reuse types from useEnterpriseRAG for consistency
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
  method: "graph_traversal" | "hybrid_search" | "entity_lookup" | "filter_search";
  startNode?: string;
  traverse?: string[];
  filters?: {
    category?: string;
    sector?: string;
    documentType?: string;
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

// Azure Function endpoints
const AGENTIC_PLANNER_URL = import.meta.env.VITE_AZURE_AGENTIC_PLANNER_URL || '';
const INTERSECTION_REASONING_URL = import.meta.env.VITE_AZURE_INTERSECTION_REASONING_URL || '';
const GRAPH_QUERY_URL = import.meta.env.VITE_AZURE_GRAPH_QUERY_URL || '';
const AZURE_FUNCTION_KEY = import.meta.env.VITE_AZURE_FUNCTION_KEY || '';

// Step execution result for partial success handling
interface StepResult {
  step: number;
  query: string;
  method: string;
  results: any[];
  success: boolean;
  error?: string;
  executionTime: number;
}

interface AgenticRAGOptions {
  graphBackend?: 'cosmos' | 'neo4j';
}

export function useAgenticRAG(focusArea: string = 'careers', options: AgenticRAGOptions = {}) {
  const { graphBackend = 'cosmos' } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<ConversationContext>({
    messages: [],
    topics: [],
    sectors: [],
    intent: null,
    sessionStart: new Date(),
  });
  const [analytics, setAnalytics] = useState<QueryAnalytics>({
    totalQueries: 0,
    avgResponseTime: 0,
    topTopics: [],
    helpfulRate: 0,
    cacheHitRate: 0,
  });
  const [isStreaming, setIsStreaming] = useState(false);

  const { semanticSearch } = useRAGMetadata();
  const conversationHistory = useRef<string[]>([]);
  const queryCache = useRef<Map<string, any>>(new Map());

  // ========================================================================
  // AGENTIC PLANNER - Calls Azure Function for query planning
  // ========================================================================

  const planQuery = useCallback(async (query: string): Promise<AgentPlan | null> => {
    try {
      console.log("[AgenticRAG] 🧠 Planning query with Azure Function:", query);
      
      // Check if Azure Function is configured
      if (!AGENTIC_PLANNER_URL) {
        console.warn("[AgenticRAG] ⚠️ Agentic planner URL not configured, using fallback");
        return createFallbackPlan(query);
      }

      const response = await fetch(AGENTIC_PLANNER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AZURE_FUNCTION_KEY && { 'x-functions-key': AZURE_FUNCTION_KEY }),
        },
        body: JSON.stringify({
          query,
          focusArea, // Pass specialization to planner
          conversationContext: conversationHistory.current.slice(-5).map(msg => ({
            role: 'user',
            content: msg,
          })),
          useCache: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[AgenticRAG] ❌ Planner API error:", error);
        return createFallbackPlan(query);
      }

      const data = await response.json();
      
      if (!data.plan) {
        console.warn("[AgenticRAG] ⚠️ No plan returned, using fallback");
        return createFallbackPlan(query);
      }

      console.log("[AgenticRAG] ✅ Plan received:", {
        strategy: data.plan.strategy,
        steps: data.plan.steps.length,
        fromCache: data.fromCache,
        planningTime: data.planningTime,
      });

      return {
        ...data.plan,
        fromCache: data.fromCache,
        planningTime: data.planningTime,
      };
    } catch (error) {
      console.error("[AgenticRAG] ❌ Planning error:", error);
      return createFallbackPlan(query);
    }
  }, []);

  // Fallback plan when Azure Function is unavailable
  const createFallbackPlan = useCallback((query: string): AgentPlan => {
    return {
      strategy: "single_query",
      steps: [
        {
          step: 1,
          query: query,
          purpose: "Direct search fallback",
          method: "hybrid_search",
          filters: {}
        }
      ],
      estimatedTime: 2000,
      synthesisGuidance: "Provide a comprehensive answer based on the retrieved documents.",
    };
  }, []);

  // ========================================================================
  // GRAPH TRAVERSAL - Uses Azure Function with Cosmos DB Gremlin
  // ========================================================================

  const traverseGraph = useCallback(async (
    startEntityId: string,
    relationships: string[] = ['related_to'],
    depth: number = 2
  ): Promise<any[]> => {
    try {
      console.log("[AgenticRAG] 🔗 Traversing graph via Azure Function:", { startEntityId, relationships, depth });
      
      // Check if graph query URL is configured
      if (!GRAPH_QUERY_URL) {
        console.warn("[AgenticRAG] ⚠️ Graph query URL not configured, using fallback");
        return await traverseGraphFallback(startEntityId, relationships, depth);
      }

      // Use Azure Function for graph queries (Cosmos DB or Neo4j)
      const response = await fetch(GRAPH_QUERY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AZURE_FUNCTION_KEY && { 'x-functions-key': AZURE_FUNCTION_KEY }),
        },
        body: JSON.stringify({
          action: 'related',
          entityName: startEntityId,
          relationshipType: relationships[0] || null,
          limit: 20,
          backend: graphBackend, // 'cosmos' or 'neo4j'
        }),
      });

      if (!response.ok) {
        console.error("[AgenticRAG] ❌ Graph function error:", response.status);
        return await traverseGraphFallback(startEntityId, relationships, depth);
      }

      const result = await response.json();
      const entities = result?.data || [];
      
      if (entities.length === 0) {
        console.log("[AgenticRAG] ℹ️ No related entities found");
        return [];
      }

      console.log(`[AgenticRAG] ✅ Found ${entities.length} related entities`);
      return entities;
    } catch (error) {
      console.error("[AgenticRAG] ❌ Graph traversal error:", error);
      return await traverseGraphFallback(startEntityId, relationships, depth);
    }
  }, [graphBackend]);

  // Fallback: Return empty array if graph query unavailable
  // No Supabase fallback - use Cosmos DB or Neo4j only
  const traverseGraphFallback = useCallback(async (
    startEntityId: string,
    relationships: string[],
    depth: number
  ): Promise<any[]> => {
    console.warn("[AgenticRAG] ⚠️ Graph query unavailable - no fallback available");
    console.warn("[AgenticRAG] ⚠️ Ensure graph-query Azure Function is configured");
    return [];
  }, []);

  // ========================================================================
  // INTERSECTION REASONING - Call Azure Function for analysis
  // ========================================================================

  const analyzeIntersections = useCallback(async (
    queryResults: Array<{ query: string; results: any[]; method?: string }>,
    originalQuery: string
  ): Promise<IntersectionAnalysis> => {
    try {
      console.log("[AgenticRAG] 🔍 Analyzing intersections:", queryResults.length, "query results");
      
      // Check if Azure Function is configured
      if (!INTERSECTION_REASONING_URL) {
        console.warn("[AgenticRAG] ⚠️ Intersection reasoning URL not configured, using basic analysis");
        return performBasicAnalysis(queryResults);
      }

      const response = await fetch(INTERSECTION_REASONING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AZURE_FUNCTION_KEY && { 'x-functions-key': AZURE_FUNCTION_KEY }),
        },
        body: JSON.stringify({
          queryResults,
          originalQuery,
          saveFindings: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[AgenticRAG] ❌ Intersection API error:", error);
        return performBasicAnalysis(queryResults);
      }

      const analysis = await response.json();
      
      console.log("[AgenticRAG] ✅ Intersection analysis complete:", {
        connections: analysis.connections?.length || 0,
        contradictions: analysis.contradictions?.length || 0,
        gaps: analysis.gaps?.length || 0,
        themes: analysis.themes?.length || 0,
      });

      return analysis;
    } catch (error) {
      console.error("[AgenticRAG] ❌ Intersection analysis error:", error);
      return performBasicAnalysis(queryResults);
    }
  }, []);

  // Basic local analysis when Azure Function unavailable
  const performBasicAnalysis = useCallback((queryResults: Array<{ query: string; results: any[] }>): IntersectionAnalysis => {
    // Find overlapping documents
    const docCounts = new Map<string, number>();
    queryResults.forEach(qr => {
      (qr.results || []).forEach(r => {
        const docId = r.documentId || r.id;
        docCounts.set(docId, (docCounts.get(docId) || 0) + 1);
      });
    });

    const connections: GraphConnection[] = [];
    const overlappingDocs = Array.from(docCounts.entries()).filter(([_, count]) => count > 1);
    
    // Create connections for overlapping docs
    overlappingDocs.forEach(([docId, count]) => {
      connections.push({
        type: 'same_document',
        source: docId,
        target: docId,
        strength: Math.min(count / queryResults.length, 1),
        description: `Document appears in ${count} query results`,
      });
    });

    return {
      connections,
      contradictions: [],
      gaps: [],
      themes: [],
      overlapStats: {
        totalUniqueDocuments: docCounts.size,
        overlappingDocuments: overlappingDocs.length,
      },
    };
  }, []);

  // ========================================================================
  // MAIN QUERY FUNCTION - Agentic Retrieval with Graph RAG
  // ========================================================================

  const sendMessage = useCallback(async (content: string) => {
    const startTime = Date.now();

    // User message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    // Loading message
    const loadingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    conversationHistory.current.push(content);

    try {
      // Step 1: Agent plans the query
      const plan = await planQuery(content);
      
      if (!plan) {
        throw new Error("Failed to create query plan");
      }

      // Update loading message with plan
      setMessages(prev => prev.map(m =>
        m.id === loadingMessage.id
          ? { ...m, agentPlan: plan }
          : m
      ));

      // Step 2: Execute plan steps with dependency handling
      const stepResults = await executeStepsWithDependencies(plan.steps);
      
      // Convert to query results format (filter successful steps)
      const queryResults: Array<{ query: string; results: any[]; method?: string }> = stepResults
        .filter(sr => sr.success || sr.results.length > 0) // Include partial successes
        .map(sr => ({
          query: sr.query,
          results: sr.results,
          method: sr.method,
        }));

      // Log execution summary
      const successCount = stepResults.filter(sr => sr.success).length;
      const totalTime = stepResults.reduce((sum, sr) => sum + sr.executionTime, 0);
      console.log(`[AgenticRAG] 📊 Execution: ${successCount}/${stepResults.length} steps succeeded, ${totalTime}ms total`);

      // Check if we have any results to work with
      if (queryResults.length === 0 || queryResults.every(qr => qr.results.length === 0)) {
        console.warn("[AgenticRAG] ⚠️ All steps failed or returned no results");
        // Continue with fallback search instead of throwing
      }

      // Step 3: Analyze intersections
      const analysis = await analyzeIntersections(queryResults, content);

      // Step 4: Combine results and generate response
      const allSources = queryResults.flatMap(qr => qr.results);
      const uniqueSources = Array.from(
        new Map(allSources.map(s => [s.documentId + s.pageNumber, s])).values()
      );

      // Generate response using GPT-4 with all context
      // For now, use semanticSearch to generate answer
      const finalResult = await semanticSearch(
        content,
        {},
        {
          topK: 30,
          timeAwareRanking: true,
        }
      );

      if (!finalResult) {
        throw new Error("No response from semantic search");
      }

      const responseTime = Date.now() - startTime;

      // Format sources
      const enhancedSources: EnhancedSource[] = (finalResult.sources || []).map(s => ({
        ...s,
        relevance: s.relevance || 85,
      }));

      // Determine confidence
      const avgRelevance = enhancedSources.reduce((sum, s) => sum + s.relevance, 0) / enhancedSources.length;
      const confidence: "high" | "medium" | "low" =
        avgRelevance > 75 ? "high" : avgRelevance > 60 ? "medium" : "low";

      // Remove loading, add response
      setMessages(prev => prev.filter(m => !m.isLoading));

      const responseId = crypto.randomUUID();
      const responseMessage: ChatMessage = {
        id: responseId,
        role: "assistant",
        content: finalResult.answer || "I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        sources: enhancedSources.slice(0, 10),
        confidence,
        responseTime,
        tokens: undefined,
        agentPlan: plan,
        graphConnections: analysis.connections,
        contradictions: analysis.contradictions,
        gaps: analysis.gaps,
        themes: analysis.themes,
      };

      setMessages(prev => [...prev, responseMessage]);

      // Update analytics
      setAnalytics(prev => {
        const newTotal = prev.totalQueries + 1;
        return {
          totalQueries: newTotal,
          avgResponseTime: ((prev.avgResponseTime * prev.totalQueries) + responseTime) / newTotal,
          topTopics: prev.topTopics,
          helpfulRate: prev.helpfulRate,
          cacheHitRate: prev.cacheHitRate,
        };
      });

    } catch (error) {
      console.error("[AgenticRAG] Error:", error);

      setMessages(prev => prev.filter(m => !m.isLoading));
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I encountered an error with agentic retrieval. Let me try a different approach. Could you rephrase your question?",
        timestamp: new Date(),
        confidence: "low",
      }]);
    }
  }, [planQuery, traverseGraph, analyzeIntersections, semanticSearch]);

  // ========================================================================
  // STEP EXECUTION ENGINE - Handles dependencies & parallel execution
  // ========================================================================

  const executeStepsWithDependencies = useCallback(async (steps: AgentStep[]): Promise<StepResult[]> => {
    const results: StepResult[] = [];
    const completedSteps = new Set<number>();

    // Group steps by dependency level for parallel execution
    const getExecutableSteps = (): AgentStep[] => {
      return steps.filter(step => {
        // Already completed?
        if (completedSteps.has(step.step)) return false;
        // No dependencies or all dependencies completed?
        const deps = step.dependsOn || [];
        return deps.length === 0 || deps.every(d => completedSteps.has(d));
      });
    };

    while (completedSteps.size < steps.length) {
      const executableSteps = getExecutableSteps();
      
      if (executableSteps.length === 0) {
        // Circular dependency or all remaining steps have unmet dependencies
        console.warn("[AgenticRAG] ⚠️ No executable steps remaining, breaking loop");
        break;
      }

      // Execute all executable steps in parallel
      console.log(`[AgenticRAG] ▶️ Executing ${executableSteps.length} steps in parallel:`, 
        executableSteps.map(s => s.step));

      const stepPromises = executableSteps.map(step => executeStep(step, results));
      const batchResults = await Promise.allSettled(stepPromises);

      // Process results
      batchResults.forEach((result, idx) => {
        const step = executableSteps[idx];
        completedSteps.add(step.step);

        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Step failed - add error result but continue
          results.push({
            step: step.step,
            query: step.query,
            method: step.method,
            results: [],
            success: false,
            error: result.reason?.message || 'Unknown error',
            executionTime: 0,
          });
          console.error(`[AgenticRAG] ❌ Step ${step.step} failed:`, result.reason);
        }
      });
    }

    return results.sort((a, b) => a.step - b.step);
  }, []);

  // Execute a single step
  const executeStep = useCallback(async (
    step: AgentStep,
    previousResults: StepResult[]
  ): Promise<StepResult> => {
    const startTime = Date.now();
    let results: any[] = [];
    let success = true;
    let error: string | undefined;

    try {
      console.log(`[AgenticRAG] 🛠️ Executing step ${step.step}: ${step.method} - "${step.query.substring(0, 50)}..."`);

      switch (step.method) {
        case 'graph_traversal':
          if (step.graphParams?.startEntityId || step.startNode) {
            results = await traverseGraph(
              step.graphParams?.startEntityId || step.startNode || '',
              step.graphParams?.relationships || [step.traverse?.[0] || 'related_to'],
              step.graphParams?.depth || 2
            );
          }
          break;

        case 'entity_lookup':
          // Search for entities by name via Azure Function
          if (GRAPH_QUERY_URL) {
            try {
              const entityResponse = await fetch(GRAPH_QUERY_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(AZURE_FUNCTION_KEY && { 'x-functions-key': AZURE_FUNCTION_KEY }),
                },
                body: JSON.stringify({
                  action: 'search',
                  query: step.query,
                  limit: 10,
                  backend: graphBackend, // 'cosmos' or 'neo4j'
                }),
              });
              if (entityResponse.ok) {
                const entityResult = await entityResponse.json();
                results = entityResult?.data || [];
              }
            } catch (entityErr) {
              console.error("[AgenticRAG] Entity lookup error:", entityErr);
            }
          }
          break;

        case 'filter_search':
        case 'hybrid_search':
        default:
          const searchResult = await semanticSearch(
            step.query,
            {
              category: step.filters?.category,
              sector: step.filters?.sector,
              documentType: step.filters?.documentType as 'pdf' | 'web' | 'all' | undefined,
            },
            {
              topK: 20,
              timeAwareRanking: true,
            }
          );
          if (searchResult) {
            results = searchResult.sources || [];
          }
          break;
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[AgenticRAG] ❌ Step ${step.step} error:`, err);
    }

    const executionTime = Date.now() - startTime;
    console.log(`[AgenticRAG] ${success ? '✅' : '❌'} Step ${step.step} completed: ${results.length} results in ${executionTime}ms`);

    return {
      step: step.step,
      query: step.query,
      method: step.method,
      results,
      success,
      error,
      executionTime,
    };
  }, [traverseGraph, semanticSearch]);

  // ========================================================================
  // UTILITIES
  // ========================================================================

  const rateMessage = useCallback((messageId: string, rating: "helpful" | "not-helpful") => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, rating } : m
    ));

    setAnalytics(prev => {
      const ratedMessages = messages.filter(m => m.rating).length + 1;
      const helpfulMessages = messages.filter(m => m.rating === "helpful").length +
        (rating === "helpful" ? 1 : 0);

      return {
        ...prev,
        helpfulRate: helpfulMessages / ratedMessages,
      };
    });
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setContext({
      messages: [],
      topics: [],
      sectors: [],
      intent: null,
      sessionStart: new Date(),
    });
    conversationHistory.current = [];
  }, []);

  return {
    messages,
    sendMessage,
    rateMessage,
    clearChat,
    context,
    analytics,
    isStreaming,
    // Expose for testing/debugging
    executeStepsWithDependencies,
  };
}


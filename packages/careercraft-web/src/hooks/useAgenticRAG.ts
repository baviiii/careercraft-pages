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
 * - PRIMARY: Horus (horus-rag edge function) — Postgres knowledge graph and the
 *   Content Understanding corpus. Graph edges carry the sentence they were
 *   extracted from, so relationship claims are auditable.
 * - LEGACY (fallback only, being archived): agentic-planner /
 *   intersection-reasoning / graph-query Azure Functions over Cosmos Gremlin.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useRAGMetadata } from "./useRAGMetadata";
import {
  horusEntityLookup,
  horusTraverse,
  isHorusRagEnabled,
} from "@/lib/horusKnowledge";

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
  /** When set (e.g. HORUS tab prompt), the final semanticSearch uses this + agentic context for structured/parseable output. */
  finalSystemPrompt?: string;
}

// Normalize Azure AI Search @search.score to a 0-100 relevance percentage
// BM25/hybrid scores are typically 0-50+, semantic reranker scores are 0-4
function normalizeSearchScore(score: number): number {
  if (score >= 1) {
    // BM25 score (typically 1-50+), normalize with diminishing returns
    return Math.min(Math.round(50 + (score / (score + 5)) * 50), 99);
  }
  // Vector/semantic score (0-1 range), scale to percentage
  return Math.max(Math.round(score * 100), 10);
}

// Build a text summary of agentic retrieval results to inject as LLM context
function buildAgenticContext(
  plan: AgentPlan,
  stepResults: StepResult[],
  uniqueSources: any[],
  analysis: IntersectionAnalysis
): string | null {
  const parts: string[] = [];

  // Summarize graph entities found
  const graphResults = stepResults.filter(sr => sr.method === 'entity_lookup' || sr.method === 'graph_traversal');
  if (graphResults.some(gr => gr.results.length > 0)) {
    parts.push('**Graph Entities & Relationships Found:**');
    for (const gr of graphResults) {
      if (gr.results.length === 0) continue;
      parts.push(`- Step "${gr.query}" (${gr.method}): ${gr.results.length} results`);
      for (const entity of gr.results.slice(0, 10)) {
        const name = entity.name || entity.label || entity.id || JSON.stringify(entity).substring(0, 100);
        const type = entity.type || entity.category || '';
        const desc = entity.description || entity.snippet || '';
        parts.push(`  * ${name}${type ? ` [${type}]` : ''}${desc ? `: ${desc.substring(0, 200)}` : ''}`);
      }
    }
  }

  // Summarize impact results
  const impactResults = stepResults.filter(sr => sr.method === 'get_impacts' && sr.results.length > 0);
  if (impactResults.length > 0) {
    parts.push('\n**Policy Impacts Found:**');
    for (const ir of impactResults) {
      for (const impact of ir.results.slice(0, 8)) {
        parts.push(`- ${impact.title || impact.description || JSON.stringify(impact).substring(0, 150)}`);
      }
    }
  }

  // Summarize document search results
  const searchResults = stepResults.filter(sr => (sr.method === 'hybrid_search' || sr.method === 'filter_search') && sr.results.length > 0);
  if (searchResults.length > 0) {
    parts.push('\n**Relevant Documents from Agentic Search:**');
    for (const sr of searchResults) {
      parts.push(`- Query "${sr.query}": ${sr.results.length} documents found`);
      for (const doc of sr.results.slice(0, 5)) {
        const title = doc.title || doc.documentId || 'Untitled';
        const snippet = doc.content || doc.snippet || '';
        parts.push(`  * ${title}${snippet ? `: ${snippet.substring(0, 200)}` : ''}`);
      }
    }
  }

  // Summarize connections/contradictions from intersection analysis
  if (analysis.connections.length > 0) {
    parts.push(`\n**Discovered Connections:** ${analysis.connections.length} relationships found between documents/entities`);
    for (const conn of analysis.connections.slice(0, 5)) {
      parts.push(`- ${conn.source} → ${conn.target} (${conn.type}, strength: ${conn.strength})`);
    }
  }

  if (analysis.contradictions.length > 0) {
    parts.push(`\n**Contradictions Detected:** ${analysis.contradictions.length}`);
    for (const c of analysis.contradictions) {
      parts.push(`- [${c.severity}] ${c.description}`);
    }
  }

  if (analysis.themes && analysis.themes.length > 0) {
    parts.push(`\n**Key Themes:** ${analysis.themes.map(t => t.theme).join(', ')}`);
  }

  if (parts.length === 0) return null;

  return parts.join('\n');
}

// Merge sources from semantic search and agentic steps, deduplicating by documentId
function mergeAndDeduplicateSources(
  semanticSources: any[],
  agenticSources: any[]
): any[] {
  const seen = new Map<string, any>();

  // Semantic search sources take priority (they have the answer context)
  for (const s of semanticSources) {
    const key = (s.documentId || s.id || '') + (s.pageNumber || '');
    if (!seen.has(key)) {
      seen.set(key, s);
    }
  }

  // Add agentic sources that aren't already included
  for (const s of agenticSources) {
    const key = (s.documentId || s.id || s.name || '') + (s.pageNumber || '');
    if (key && !seen.has(key)) {
      seen.set(key, s);
    }
  }

  return Array.from(seen.values());
}

export function useAgenticRAG(focusArea: string = 'careers', options: AgenticRAGOptions = {}) {
  const { graphBackend = 'cosmos', finalSystemPrompt } = options;
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
      // PRIMARY: Horus Postgres knowledge graph. Resolves the entity by name
      // (exact → alias → contains) then walks a bounded BFS neighbourhood.
      // Each edge carries the sentence it was extracted from, which is what
      // buildAgenticContext injects so the model reasons from evidence.
      if (isHorusRagEnabled()) {
        try {
          const result = await horusTraverse(startEntityId, depth);
          if (result.notFound) {
            console.log(`[AgenticRAG] ℹ️ Horus graph has no entity matching "${startEntityId}"`);
            return [];
          }
          // Fold edge evidence onto the node rows the planner already consumes,
          // so relationships survive into the context without a shape change.
          const evidenceByNode = new Map<string, string[]>();
          for (const edge of result.edges ?? []) {
            if (!edge.evidence) continue;
            for (const node of [edge.from, edge.to]) {
              const list = evidenceByNode.get(node) ?? [];
              if (list.length < 3) list.push(`${edge.from} —${edge.type}→ ${edge.to}: ${edge.evidence}`);
              evidenceByNode.set(node, list);
            }
          }
          const entities = (result.data ?? []).map((node) => ({
            ...node,
            description: evidenceByNode.get(node.name)?.join(' | '),
          }));
          console.log(`[AgenticRAG] ✅ Horus graph: ${entities.length} entities, ${result.edges?.length ?? 0} edges`);
          return entities;
        } catch (horusErr) {
          console.error("[AgenticRAG] Horus graph traversal failed, falling back:", horusErr);
        }
      }

      console.log("[AgenticRAG] 🔗 Traversing graph via Azure Function:", { startEntityId, relationships, depth });

      // Check if graph query URL is configured
      if (!GRAPH_QUERY_URL) {
        console.warn("[AgenticRAG] ⚠️ Graph query URL not configured, using fallback");
        return await traverseGraphFallback(startEntityId, relationships, depth);
      }

      // Use Azure Function for graph queries (Cosmos DB or Neo4j)
      // action:'traverse' does semantic lookup first then traverses - handles natural language entity names
      const response = await fetch(GRAPH_QUERY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AZURE_FUNCTION_KEY && { 'x-functions-key': AZURE_FUNCTION_KEY }),
        },
        body: JSON.stringify({
          action: 'traverse',
          entityName: startEntityId,
          depth: depth,
          limit: 25,
          backend: graphBackend,
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
    setIsStreaming(true);
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
        new Map(allSources.map(s => [(s.documentId || s.id || s.name) + (s.pageNumber || ''), s])).values()
      );

      // Build enriched context from agentic step results to feed into the final LLM call
      const agenticContext = buildAgenticContext(plan, stepResults, uniqueSources, analysis);

      // Generate response using semanticSearch; combine finalSystemPrompt (e.g. HORUS tab prompt) with agentic context
      const agenticSystemPrompt = agenticContext
        ? `You have access to additional context from an agentic retrieval pipeline. Use this alongside the retrieved documents to give a comprehensive answer.\n\n### Agentic Context\n${agenticContext}`
        : undefined;
      const combinedSystemPrompt = finalSystemPrompt
        ? (agenticSystemPrompt ? `${finalSystemPrompt}\n\n${agenticSystemPrompt}` : finalSystemPrompt)
        : agenticSystemPrompt;

      const finalResult = await semanticSearch(
        content,
        {},
        {
          topK: 30,
          timeAwareRanking: true,
          systemPrompt: combinedSystemPrompt,
        }
      );

      if (!finalResult) {
        throw new Error("No response from semantic search");
      }

      // Merge agentic sources with semantic search sources (deduplicate)
      const mergedSources = mergeAndDeduplicateSources(
        finalResult.sources || [],
        uniqueSources
      );

      const responseTime = Date.now() - startTime;

      // Format sources from merged results (agentic + semantic)
      const enhancedSources: EnhancedSource[] = mergedSources.map(s => ({
        title: s.title || s.name || s.documentId || 'Unknown',
        documentId: s.documentId || s.id || '',
        pageNumber: s.pageNumber,
        url: s.url,
        snippet: s.content || s.snippet || s.description || '',
        relevance: s.relevance
          ? (typeof s.relevance === 'number' ? s.relevance : 70)
          : s.score
            ? normalizeSearchScore(s.score)
            : 70,
        category: s.category || s.type,
        extractionMethod: s.extractionMethod,
      }));

      // Determine confidence (guard against divide-by-zero when no sources)
      const avgRelevance = enhancedSources.length > 0
        ? enhancedSources.reduce((sum, s) => sum + s.relevance, 0) / enhancedSources.length
        : 0;
      const confidence: "high" | "medium" | "low" =
        enhancedSources.length === 0 ? "low" : avgRelevance > 75 ? "high" : avgRelevance > 60 ? "medium" : "low";

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
    } finally {
      setIsStreaming(false);
    }
  }, [planQuery, traverseGraph, analyzeIntersections, semanticSearch, finalSystemPrompt]);

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
      console.log(`[AgenticRAG] 🛠️ Executing step ${step.step}: ${step.method} - "${(step.query || '').substring(0, 50)}..."`);

      switch (step.method) {
        case 'graph_traversal': {
          const startEntity =
            step.graphParams?.startEntity ||
            step.graphParams?.startEntityId ||
            step.startNode ||
            step.query; // fallback: use the step query as entity name
          if (startEntity) {
            console.log(`[AgenticRAG] 🔗 Graph traversal from entity: "${startEntity}"`);
            results = await traverseGraph(
              startEntity,
              step.graphParams?.relationships || ['related_to'],
              step.graphParams?.depth || 2
            );
          } else {
            console.warn('[AgenticRAG] ⚠️ graph_traversal step has no startEntity, skipping');
          }
          break;
        }

        case 'entity_lookup':
          // PRIMARY: Horus careers endpoints. Resolving "nurse" returns the
          // whole profile — skills, qualifications, employers — each with the
          // sentence behind it, not just a bare entity row.
          if (isHorusRagEnabled()) {
            try {
              const lookup = await horusEntityLookup(step.query);
              results = lookup.data ?? [];
              if (results.length > 0) {
                console.log(`[AgenticRAG] ✅ Horus entity lookup: ${results.length} rows for "${step.query}"`);
                break;
              }
            } catch (horusErr) {
              console.error("[AgenticRAG] Horus entity lookup failed, falling back:", horusErr);
            }
          }
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

        case 'get_impacts':
          // PRIMARY: Horus. There is no dedicated "impacts" endpoint — an
          // impact IS an edge in the graph, so a neighbourhood walk returns
          // the same information with evidence attached to each connection.
          if (isHorusRagEnabled()) {
            try {
              const impacts = await horusTraverse(step.query, 2);
              if (!impacts.notFound && (impacts.data?.length ?? 0) > 0) {
                results = (impacts.edges ?? []).map((edge) => ({
                  title: `${edge.from} —${edge.type}→ ${edge.to}`,
                  description: edge.evidence,
                  confidence: edge.confidence,
                }));
                // A resolved entity with no edges is still a real answer:
                // the corpus mentions it but records no connections.
                if (results.length === 0) results = impacts.data ?? [];
                console.log(`[AgenticRAG] ✅ Horus impacts: ${results.length} for "${step.query}"`);
                break;
              }
            } catch (horusErr) {
              console.error("[AgenticRAG] Horus impact query failed, falling back:", horusErr);
            }
          }
          // Query policy impacts via graph-query Azure Function
          if (GRAPH_QUERY_URL) {
            try {
              const impactResponse = await fetch(GRAPH_QUERY_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(AZURE_FUNCTION_KEY && { 'x-functions-key': AZURE_FUNCTION_KEY }),
                },
                body: JSON.stringify({
                  action: 'get_impacts',
                  entityName: step.query, // Entity name from query
                  impactType: step.filters?.impactType,
                  severity: step.filters?.severity,
                  timeframe: step.filters?.timeframe,
                  limit: 50,
                  backend: graphBackend,
                }),
              });
              if (impactResponse.ok) {
                const impactResult = await impactResponse.json();
                results = impactResult?.data || [];
                console.log(`[AgenticRAG] ✅ Found ${results.length} impacts for ${step.query}`);
              } else {
                console.error("[AgenticRAG] Impact query error:", impactResponse.status);
              }
            } catch (impactErr) {
              console.error("[AgenticRAG] Impact query error:", impactErr);
            }
          } else {
            console.warn("[AgenticRAG] ⚠️ Graph query URL not configured for impact queries");
          }
          break;

        case 'filter_search':
        case 'hybrid_search':
        default:
          console.log(`[AgenticRAG] 🔍 Running ${step.method} for: "${step.query.substring(0, 80)}"`);
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
          console.log(`[AgenticRAG] 🔍 Search result:`, {
            hasResult: !!searchResult,
            answerPreview: searchResult?.answer?.substring(0, 100),
            sourceCount: searchResult?.sources?.length || 0,
          });
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
      query: step.query || '',
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


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
import { supabase } from "@/integrations/supabase/client";
import { useRAGMetadata } from "./useRAGMetadata";
import {
  horusEntityLookup,
  horusTraverse,
  isHorusRagEnabled,
} from "@/lib/horusKnowledge";
import {
  routeMessage,
  isRefusalAnswer,
  type ThinkingStep,
  type ThinkingStatus,
} from "@/lib/conversationRouter";

export type { ThinkingStep } from "@/lib/conversationRouter";

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
  /** Live reasoning ledger — what the agent is doing / did, with timings. */
  thinking?: ThinkingStep[];
  /**
   * False when the model answered with a grounded refusal ("the passages do
   * not address…") — the UI must not decorate such answers with confidence
   * badges or source counts.
   */
  grounded?: boolean;
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

// Azure Function endpoints are now proxied through Supabase Edge Functions
// No client-side keys or URLs required

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
  // QUERY PLANNER — local
  //
  // Was an LLM planner in the `agentic-planner` Azure Function. That Function
  // App no longer exists, so every call fell through to a one-step fallback,
  // which quietly made "agentic" mode identical to plain search.
  //
  // Planned here instead. Both step types below run against Horus: the graph
  // lookup resolves named things and returns their edges with evidence, and
  // the search retrieves passages. Running both and letting synthesis combine
  // them is what the remote planner was ultimately arranging anyway, and it
  // costs no round trip.
  // ========================================================================

  /** Words that suggest the question is about a specific named thing. */
  const ENTITY_HINTS = /\b(nurse|engineer|teacher|defence|health|education|mining|construction|tourism|technology|manufacturing|energy|space|agriculture|hydrogen|apprentice|tafe|university)\w*/i;

  const planQuery = useCallback(async (query: string): Promise<AgentPlan | null> => {
    const steps: AgentStep[] = [];

    // Anchor on a graph entity when the question names one — that is the step
    // that yields relationships and their evidence rather than loose passages.
    const named = ENTITY_HINTS.exec(query);
    if (named) {
      steps.push({
        step: steps.length + 1,
        query: named[0],
        purpose: `Resolve "${named[0]}" in the knowledge graph and collect its relationships`,
        method: 'entity_lookup',
      });
    }

    steps.push({
      step: steps.length + 1,
      query,
      purpose: 'Retrieve supporting passages from the corpus',
      method: 'hybrid_search',
      filters: {},
    });

    return {
      strategy: steps.length > 1 ? 'graph_then_search' : 'single_query',
      steps,
      estimatedTime: steps.length * 1500,
      synthesisGuidance:
        'Answer from the retrieved passages and graph relationships. Cite sources. ' +
        'If they do not cover the question, say so rather than filling the gap.',
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
          console.error("[AgenticRAG] Horus graph traversal failed:", horusErr);
        }
      }

      // No second engine to try: the Cosmos Gremlin graph behind the old
      // `graph-query` Function was decommissioned with the rest of that stack.
      return [];
    } catch (error) {
      console.error("[AgenticRAG] ❌ Graph traversal error:", error);
      return [];
    }
  }, []);

  // ========================================================================
  // INTERSECTION REASONING — local
  //
  // Was the `intersection-reasoning` Azure Function, which is gone with the
  // rest of that Function App. It produced contradictions, themes and gaps;
  // the local analysis below produces document-overlap connections only, and
  // reports the other three as empty rather than guessing at them.
  //
  // The real replacement is Horus `intelligence.contradictions`, which is
  // still a stub — but the graph now carries `contradicts` edges and both
  // budget years, so it is buildable. Until then this is honestly thin.
  // ========================================================================

  const analyzeIntersections = useCallback(async (
    queryResults: Array<{ query: string; results: any[]; method?: string }>,
    _originalQuery: string
  ): Promise<IntersectionAnalysis> => performBasicAnalysis(queryResults), []);

  // Document-overlap analysis, computed client side.
  //
  // Counts how many *distinct retrieval steps* each document appears in
  // (repeated chunks of the same document within one step do not count), and
  // reports the overlap under the document's human title — the old version
  // surfaced raw base64 blob ids as "X → X same_document", which read as
  // garbage in the UI.
  const performBasicAnalysis = useCallback((queryResults: Array<{ query: string; results: any[] }>): IntersectionAnalysis => {
    const docSteps = new Map<string, { steps: number; title: string }>();

    queryResults.forEach(qr => {
      const seenInStep = new Set<string>();
      (qr.results || []).forEach(r => {
        const docId = String(r.documentId || r.id || r.name || '');
        if (!docId || seenInStep.has(docId)) return;
        seenInStep.add(docId);
        const entry = docSteps.get(docId) || { steps: 0, title: r.title || r.name || docId };
        entry.steps += 1;
        docSteps.set(docId, entry);
      });
    });

    const connections: GraphConnection[] = [];
    const overlapping = Array.from(docSteps.values()).filter(e => e.steps > 1);

    // Corroboration only means something when there was more than one step.
    if (queryResults.length > 1) {
      overlapping.forEach(({ steps, title }) => {
        connections.push({
          type: 'same_document',
          source: title,
          target: title,
          strength: Math.min(steps / queryResults.length, 1),
          description: `Corroborated by ${steps} independent retrieval steps`,
        });
      });
    }

    return {
      connections,
      contradictions: [],
      gaps: [],
      themes: [],
      overlapStats: {
        totalUniqueDocuments: docSteps.size,
        overlappingDocuments: overlapping.length,
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

    // ── PRE-RETRIEVAL GATE ─────────────────────────────────────────────────
    // Small talk never touches the pipeline. Before this gate, "hey there"
    // paid for two full rag.query round-trips and came back with "the
    // provided passages do not address the query" under a confidence badge.
    const route = routeMessage(content, focusArea);
    if (route.kind !== "retrieve") {
      conversationHistory.current.push(content);
      setMessages(prev => [...prev, userMessage, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: route.reply,
        timestamp: new Date(),
        followUpQuestions: route.followUps.length > 0 ? route.followUps : undefined,
        grounded: true,
        responseTime: Date.now() - startTime,
        thinking: [{ id: "route", label: route.trace, status: "done", ms: Date.now() - startTime }],
      }]);
      return;
    }

    // Loading message — carries the live thinking trace while we work.
    const loadingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
      thinking: [],
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsStreaming(true);
    conversationHistory.current.push(content);

    // ── LIVE THINKING TRACE ────────────────────────────────────────────────
    // Each phase is pushed onto the in-flight message as it starts, and
    // stamped with its elapsed time as it completes, so the UI can render
    // the agent's reasoning in real time instead of a blank spinner.
    const trace: ThinkingStep[] = [];
    const syncTrace = () => {
      const snapshot = trace.map(s => ({ ...s }));
      setMessages(prev => prev.map(m => (m.id === loadingMessage.id ? { ...m, thinking: snapshot } : m)));
    };
    const beginStep = (id: string, label: string, detail?: string): number => {
      trace.push({ id, label, detail, status: "active" });
      syncTrace();
      return Date.now();
    };
    const endStep = (id: string, startedAt: number, detail?: string, status: ThinkingStatus = "done") => {
      const step = trace.find(s => s.id === id);
      if (step) {
        step.status = status;
        step.ms = Date.now() - startedAt;
        if (detail) step.detail = detail;
      }
      syncTrace();
    };

    try {
      // Phase 1: plan the retrieval.
      const tPlan = beginStep("plan", "Reading the question & planning retrieval");
      const plan = await planQuery(content);
      if (!plan) {
        throw new Error("Failed to create query plan");
      }
      endStep(
        "plan",
        tPlan,
        plan.strategy === "graph_then_search" ? "knowledge graph + corpus search" : "direct corpus search",
      );

      setMessages(prev => prev.map(m =>
        m.id === loadingMessage.id
          ? { ...m, agentPlan: plan }
          : m
      ));

      // Phase 2: graph-only steps (entity lookups, traversals, impacts).
      //
      // Passage retrieval is deliberately NOT executed here. It used to run a
      // full generative rag.query per hybrid_search step and then a *second*
      // full rag.query for the final answer — doubling latency and model cost
      // on every message. Passages are now fetched exactly once, in Phase 3.
      const graphSteps = plan.steps.filter(s => s.method !== "hybrid_search" && s.method !== "filter_search");
      let stepResults: StepResult[] = [];
      if (graphSteps.length > 0) {
        const tGraph = beginStep(
          "graph",
          "Consulting the knowledge graph",
          graphSteps.map(s => `“${s.query}”`).join(" · "),
        );
        stepResults = await executeStepsWithDependencies(graphSteps);
        const found = stepResults.reduce((sum, sr) => sum + sr.results.length, 0);
        endStep(
          "graph",
          tGraph,
          found > 0
            ? `${found} linked entit${found === 1 ? "y" : "ies"} with evidence`
            : "no graph matches — continuing with corpus search",
          found > 0 ? "done" : "skipped",
        );
      }

      const graphSources = stepResults.flatMap(sr => sr.results);

      // Build enriched context from graph results to feed into the final call.
      const agenticContext = buildAgenticContext(plan, stepResults, graphSources, {
        connections: [],
        contradictions: [],
        gaps: [],
        themes: [],
      });

      const agenticSystemPrompt = agenticContext
        ? `You have access to additional context from an agentic retrieval pipeline. Use this alongside the retrieved documents to give a comprehensive answer.\n\n### Agentic Context\n${agenticContext}`
        : undefined;
      const combinedSystemPrompt = finalSystemPrompt
        ? (agenticSystemPrompt ? `${finalSystemPrompt}\n\n${agenticSystemPrompt}` : finalSystemPrompt)
        : agenticSystemPrompt;

      // Phase 3: the single generative retrieval — hybrid search + synthesis.
      const tSearch = beginStep("search", "Searching the corpus", "hybrid retrieval · cited synthesis");
      const finalResult = await semanticSearch(
        content,
        {},
        {
          topK: 24,
          timeAwareRanking: true,
          systemPrompt: combinedSystemPrompt,
        }
      );

      if (!finalResult) {
        throw new Error("No response from semantic search");
      }
      endStep("search", tSearch, `${finalResult.sources?.length ?? 0} passages retrieved`);

      // Phase 4: local cross-referencing between graph results and passages.
      const tVerify = beginStep("verify", "Cross-referencing sources & scoring confidence");
      const queryResults: Array<{ query: string; results: any[]; method?: string }> = [
        ...stepResults
          .filter(sr => sr.success || sr.results.length > 0)
          .map(sr => ({ query: sr.query, results: sr.results, method: sr.method })),
        { query: content, results: finalResult.sources || [], method: "hybrid_search" },
      ];
      const analysis = await analyzeIntersections(queryResults, content);

      // Merge graph sources with semantic search sources (deduplicate)
      const mergedSources = mergeAndDeduplicateSources(
        finalResult.sources || [],
        graphSources
      );

      // Format sources from merged results (graph + semantic)
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

      const answer = finalResult.answer || "I couldn't generate a response. Please try again.";

      // Honest confidence: a grounded refusal ("the passages do not address…")
      // is never high-confidence, whatever the retrieval scores said.
      const refusal = isRefusalAnswer(answer);
      const avgRelevance = enhancedSources.length > 0
        ? enhancedSources.reduce((sum, s) => sum + s.relevance, 0) / enhancedSources.length
        : 0;
      const confidence: "high" | "medium" | "low" =
        refusal || enhancedSources.length === 0 ? "low" : avgRelevance > 75 ? "high" : avgRelevance > 60 ? "medium" : "low";

      endStep(
        "verify",
        tVerify,
        refusal
          ? "answer is not grounded in the corpus"
          : `${enhancedSources.length} sources · ${confidence} confidence`,
        refusal ? "failed" : "done",
      );

      const responseTime = Date.now() - startTime;

      // Remove loading, add response
      setMessages(prev => prev.filter(m => !m.isLoading));

      const responseId = crypto.randomUUID();
      const responseMessage: ChatMessage = {
        id: responseId,
        role: "assistant",
        content: answer,
        timestamp: new Date(),
        sources: enhancedSources.slice(0, 10),
        confidence,
        grounded: !refusal,
        responseTime,
        tokens: undefined,
        thinking: trace.map(s => ({ ...s })),
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

      // Mark whatever phase was in flight as failed, keep the trace visible.
      trace.forEach(s => { if (s.status === "active") s.status = "failed"; });

      setMessages(prev => prev.filter(m => !m.isLoading));
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I hit an error while retrieving from the corpus. Could you try again, or rephrase the question?",
        timestamp: new Date(),
        confidence: "low",
        grounded: false,
        thinking: trace.map(s => ({ ...s })),
      }]);
    } finally {
      setIsStreaming(false);
    }
  }, [planQuery, traverseGraph, analyzeIntersections, semanticSearch, finalSystemPrompt, focusArea]);

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
              console.error("[AgenticRAG] Horus entity lookup failed:", horusErr);
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
              console.error("[AgenticRAG] Horus impact query failed:", horusErr);
            }
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


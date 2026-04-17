/**
 * AgenticSession - Plain TypeScript class extracted from useAgenticRAG
 * Handles: multi-step reasoning, graph traversal, intersection analysis, contradiction detection
 */

import type {
  ChatMessage,
  EnhancedSource,
  AgentPlan,
  AgentStep,
  GraphConnection,
  Contradiction,
  IntersectionAnalysis,
  QueryAnalytics,
  ConversationContext,
} from "@careercraft/shared";
import type { HorusConfig, SemanticSearchResult, AgenticRAGOptions, StepResult } from "./types";
import { HttpTransport } from "./http";

export type AgenticSessionListener = (state: AgenticSessionState) => void;

export interface AgenticSessionState {
  messages: ChatMessage[];
  context: ConversationContext;
  analytics: QueryAnalytics;
  isStreaming: boolean;
}

// Normalize Azure AI Search scores to 0-100
function normalizeSearchScore(score: number): number {
  if (score >= 1) {
    return Math.min(Math.round(50 + (score / (score + 5)) * 50), 99);
  }
  return Math.max(Math.round(score * 100), 10);
}

function buildAgenticContext(
  plan: AgentPlan,
  stepResults: StepResult[],
  uniqueSources: any[],
  analysis: IntersectionAnalysis
): string | null {
  const parts: string[] = [];

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

  const impactResults = stepResults.filter(sr => sr.method === 'get_impacts' && sr.results.length > 0);
  if (impactResults.length > 0) {
    parts.push('\n**Policy Impacts Found:**');
    for (const ir of impactResults) {
      for (const impact of ir.results.slice(0, 8)) {
        parts.push(`- ${impact.title || impact.description || JSON.stringify(impact).substring(0, 150)}`);
      }
    }
  }

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

  if (analysis.connections.length > 0) {
    parts.push(`\n**Discovered Connections:** ${analysis.connections.length} relationships found`);
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

function mergeAndDeduplicateSources(semanticSources: any[], agenticSources: any[]): any[] {
  const seen = new Map<string, any>();
  for (const s of semanticSources) {
    const key = (s.documentId || s.id || '') + (s.pageNumber || '');
    if (!seen.has(key)) seen.set(key, s);
  }
  for (const s of agenticSources) {
    const key = (s.documentId || s.id || s.name || '') + (s.pageNumber || '');
    if (key && !seen.has(key)) seen.set(key, s);
  }
  return Array.from(seen.values());
}

export class AgenticSession {
  private messages: ChatMessage[] = [];
  private context: ConversationContext;
  private analytics: QueryAnalytics;
  private isStreaming = false;
  private conversationHistory: string[] = [];
  private listeners: AgenticSessionListener[] = [];
  private http: HttpTransport;
  private focusArea: string;
  private graphBackend: 'cosmos' | 'neo4j';
  private finalSystemPrompt?: string;
  private agenticPlannerUrl: string;
  private intersectionReasoningUrl: string;
  private graphQueryUrl: string;
  private apiKey: string;

  constructor(
    http: HttpTransport,
    config: HorusConfig,
    focusArea: string = 'careers',
    options: AgenticRAGOptions = {}
  ) {
    this.http = http;
    this.focusArea = focusArea;
    this.graphBackend = options.graphBackend || 'cosmos';
    this.finalSystemPrompt = options.finalSystemPrompt;
    this.agenticPlannerUrl = config.agenticPlannerUrl || '';
    this.intersectionReasoningUrl = config.intersectionReasoningUrl || '';
    this.graphQueryUrl = config.graphQueryUrl || '';
    this.apiKey = config.azureFunctionsKey || '';

    this.context = {
      messages: [],
      topics: [],
      sectors: [],
      intent: null,
      sessionStart: new Date(),
    };
    this.analytics = {
      totalQueries: 0,
      avgResponseTime: 0,
      topTopics: [],
      helpfulRate: 0,
      cacheHitRate: 0,
    };
  }

  subscribe(listener: AgenticSessionListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  getState(): AgenticSessionState {
    return {
      messages: [...this.messages],
      context: { ...this.context },
      analytics: { ...this.analytics },
      isStreaming: this.isStreaming,
    };
  }

  private async planQuery(query: string): Promise<AgentPlan | null> {
    try {
      if (!this.agenticPlannerUrl) {
        return this.createFallbackPlan(query);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['x-functions-key'] = this.apiKey;

      const response = await fetch(this.agenticPlannerUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          focusArea: this.focusArea,
          conversationContext: this.conversationHistory.slice(-5).map(msg => ({ role: 'user', content: msg })),
          useCache: true,
        }),
      });

      if (!response.ok) return this.createFallbackPlan(query);

      const data = await response.json();
      if (!data.plan) return this.createFallbackPlan(query);

      return { ...data.plan, fromCache: data.fromCache, planningTime: data.planningTime };
    } catch {
      return this.createFallbackPlan(query);
    }
  }

  private createFallbackPlan(query: string): AgentPlan {
    return {
      strategy: "single_query",
      steps: [{
        step: 1,
        query,
        purpose: "Direct search fallback",
        method: "hybrid_search" as const,
        filters: {}
      }],
      estimatedTime: 2000,
      synthesisGuidance: "Provide a comprehensive answer based on the retrieved documents.",
    };
  }

  private async traverseGraph(startEntityId: string, relationships: string[] = ['related_to'], depth: number = 2): Promise<any[]> {
    try {
      if (!this.graphQueryUrl) return [];

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['x-functions-key'] = this.apiKey;

      const response = await fetch(this.graphQueryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'traverse',
          entityName: startEntityId,
          depth,
          limit: 25,
          backend: this.graphBackend,
        }),
      });

      if (!response.ok) return [];
      const result = await response.json();
      return result?.data || [];
    } catch {
      return [];
    }
  }

  private async analyzeIntersections(
    queryResults: Array<{ query: string; results: any[]; method?: string }>,
    originalQuery: string
  ): Promise<IntersectionAnalysis> {
    try {
      if (!this.intersectionReasoningUrl) {
        return this.performBasicAnalysis(queryResults);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['x-functions-key'] = this.apiKey;

      const response = await fetch(this.intersectionReasoningUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ queryResults, originalQuery, saveFindings: true }),
      });

      if (!response.ok) return this.performBasicAnalysis(queryResults);
      return await response.json();
    } catch {
      return this.performBasicAnalysis(queryResults);
    }
  }

  private performBasicAnalysis(queryResults: Array<{ query: string; results: any[] }>): IntersectionAnalysis {
    const docCounts = new Map<string, number>();
    queryResults.forEach(qr => {
      (qr.results || []).forEach(r => {
        const docId = r.documentId || r.id;
        docCounts.set(docId, (docCounts.get(docId) || 0) + 1);
      });
    });

    const connections: GraphConnection[] = [];
    const overlappingDocs = Array.from(docCounts.entries()).filter(([_, count]) => count > 1);

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
  }

  private async semanticSearch(query: string, systemPrompt?: string): Promise<SemanticSearchResult | null> {
    const result = await this.http.callFunction<SemanticSearchResult>('rag-metadata', {
      type: 'semantic-search',
      query,
      filters: {},
      options: {
        topK: 30,
        timeAwareRanking: true,
        systemPrompt,
      },
    });

    if (!result.success) return null;
    return result.data || null;
  }

  private async executeStep(step: AgentStep): Promise<StepResult> {
    const startTime = Date.now();
    let results: any[] = [];
    let success = true;
    let error: string | undefined;

    try {
      switch (step.method) {
        case 'graph_traversal': {
          const startEntity = step.graphParams?.startEntity || step.graphParams?.startEntityId || step.startNode || step.query;
          if (startEntity) {
            results = await this.traverseGraph(
              startEntity,
              step.graphParams?.relationships || ['related_to'],
              step.graphParams?.depth || 2
            );
          }
          break;
        }

        case 'entity_lookup':
          if (this.graphQueryUrl) {
            try {
              const headers: Record<string, string> = { 'Content-Type': 'application/json' };
              if (this.apiKey) headers['x-functions-key'] = this.apiKey;
              const entityResponse = await fetch(this.graphQueryUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'search', query: step.query, limit: 10, backend: this.graphBackend }),
              });
              if (entityResponse.ok) {
                const entityResult = await entityResponse.json();
                results = entityResult?.data || [];
              }
            } catch {}
          }
          break;

        case 'get_impacts':
          if (this.graphQueryUrl) {
            try {
              const headers: Record<string, string> = { 'Content-Type': 'application/json' };
              if (this.apiKey) headers['x-functions-key'] = this.apiKey;
              const impactResponse = await fetch(this.graphQueryUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  action: 'get_impacts',
                  entityName: step.query,
                  impactType: step.filters?.impactType,
                  severity: step.filters?.severity,
                  timeframe: step.filters?.timeframe,
                  limit: 50,
                  backend: this.graphBackend,
                }),
              });
              if (impactResponse.ok) {
                const impactResult = await impactResponse.json();
                results = impactResult?.data || [];
              }
            } catch {}
          }
          break;

        case 'filter_search':
        case 'hybrid_search':
        default: {
          const searchResult = await this.semanticSearch(step.query);
          if (searchResult) {
            results = searchResult.sources || [];
          }
          break;
        }
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    return {
      step: step.step,
      query: step.query || '',
      method: step.method,
      results,
      success,
      error,
      executionTime: Date.now() - startTime,
    };
  }

  private async executeStepsWithDependencies(steps: AgentStep[]): Promise<StepResult[]> {
    const results: StepResult[] = [];
    const completedSteps = new Set<number>();

    const getExecutableSteps = (): AgentStep[] => {
      return steps.filter(step => {
        if (completedSteps.has(step.step)) return false;
        const deps = step.dependsOn || [];
        return deps.length === 0 || deps.every(d => completedSteps.has(d));
      });
    };

    while (completedSteps.size < steps.length) {
      const executableSteps = getExecutableSteps();
      if (executableSteps.length === 0) break;

      const batchResults = await Promise.allSettled(
        executableSteps.map(step => this.executeStep(step))
      );

      batchResults.forEach((result, idx) => {
        const step = executableSteps[idx];
        completedSteps.add(step.step);

        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            step: step.step,
            query: step.query,
            method: step.method,
            results: [],
            success: false,
            error: result.reason?.message || 'Unknown error',
            executionTime: 0,
          });
        }
      });
    }

    return results.sort((a, b) => a.step - b.step);
  }

  async sendMessage(content: string) {
    const startTime = Date.now();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    this.messages = [...this.messages, userMessage, loadingMessage];
    this.isStreaming = true;
    this.conversationHistory.push(content);
    this.notify();

    try {
      const plan = await this.planQuery(content);
      if (!plan) throw new Error("Failed to create query plan");

      // Update loading message with plan
      this.messages = this.messages.map(m =>
        m.id === loadingMessage.id ? { ...m, agentPlan: plan } : m
      );
      this.notify();

      const stepResults = await this.executeStepsWithDependencies(plan.steps);

      const queryResults = stepResults
        .filter(sr => sr.success || sr.results.length > 0)
        .map(sr => ({ query: sr.query, results: sr.results, method: sr.method }));

      const analysis = await this.analyzeIntersections(queryResults, content);

      const allSources = queryResults.flatMap(qr => qr.results);
      const uniqueSources = Array.from(
        new Map(allSources.map(s => [(s.documentId || s.id || s.name) + (s.pageNumber || ''), s])).values()
      );

      const agenticContext = buildAgenticContext(plan, stepResults, uniqueSources, analysis);

      const agenticSystemPrompt = agenticContext
        ? `You have access to additional context from an agentic retrieval pipeline. Use this alongside the retrieved documents to give a comprehensive answer.\n\n### Agentic Context\n${agenticContext}`
        : undefined;
      const combinedSystemPrompt = this.finalSystemPrompt
        ? (agenticSystemPrompt ? `${this.finalSystemPrompt}\n\n${agenticSystemPrompt}` : this.finalSystemPrompt)
        : agenticSystemPrompt;

      const finalResult = await this.semanticSearch(content, combinedSystemPrompt);
      if (!finalResult) throw new Error("No response from semantic search");

      const mergedSources = mergeAndDeduplicateSources(finalResult.sources || [], uniqueSources);
      const responseTime = Date.now() - startTime;

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

      const avgRelevance = enhancedSources.length > 0
        ? enhancedSources.reduce((sum, s) => sum + s.relevance, 0) / enhancedSources.length
        : 0;
      const confidence: "high" | "medium" | "low" =
        enhancedSources.length === 0 ? "low" : avgRelevance > 75 ? "high" : avgRelevance > 60 ? "medium" : "low";

      this.messages = this.messages.filter(m => !m.isLoading);
      this.messages = [...this.messages, {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: finalResult.answer || "I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        sources: enhancedSources.slice(0, 10),
        confidence,
        responseTime,
        agentPlan: plan,
        graphConnections: analysis.connections,
        contradictions: analysis.contradictions,
        gaps: analysis.gaps,
        themes: analysis.themes,
      }];

      const newTotal = this.analytics.totalQueries + 1;
      this.analytics = {
        totalQueries: newTotal,
        avgResponseTime: ((this.analytics.avgResponseTime * this.analytics.totalQueries) + responseTime) / newTotal,
        topTopics: this.analytics.topTopics,
        helpfulRate: this.analytics.helpfulRate,
        cacheHitRate: this.analytics.cacheHitRate,
      };

    } catch (error) {
      console.error("[AgenticSession] Error:", error);
      this.messages = this.messages.filter(m => !m.isLoading);
      this.messages = [...this.messages, {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: "I encountered an error with agentic retrieval. Could you rephrase your question?",
        timestamp: new Date(),
        confidence: "low" as const,
      }];
    } finally {
      this.isStreaming = false;
    }

    this.notify();
  }

  rateMessage(messageId: string, rating: "helpful" | "not-helpful") {
    this.messages = this.messages.map(m =>
      m.id === messageId ? { ...m, rating } : m
    );
    const ratedMessages = this.messages.filter(m => m.rating).length;
    const helpfulMessages = this.messages.filter(m => m.rating === "helpful").length;
    this.analytics = {
      ...this.analytics,
      helpfulRate: ratedMessages > 0 ? helpfulMessages / ratedMessages : 0,
    };
    this.notify();
  }

  clearChat() {
    this.messages = [];
    this.context = {
      messages: [],
      topics: [],
      sectors: [],
      intent: null,
      sessionStart: new Date(),
    };
    this.conversationHistory = [];
    this.notify();
  }
}

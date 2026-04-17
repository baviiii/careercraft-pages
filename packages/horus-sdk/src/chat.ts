/**
 * ChatSession - Plain TypeScript class extracted from useEnterpriseRAG
 * Handles: streaming, context, analytics, proactive insights, visual charts
 */

import type {
  ChatMessage,
  EnhancedSource,
  ProactiveInsight,
  VisualChartData,
  QueryIntent,
  ConversationContext,
  QueryAnalytics,
  EvidenceChain,
  TemporalSummary,
} from "@careercraft/shared";
import type { HorusConfig, SemanticSearchResult } from "./types";
import { HttpTransport } from "./http";

export type ChatSessionListener = (state: ChatSessionState) => void;

export interface ChatSessionState {
  messages: ChatMessage[];
  context: ConversationContext;
  analytics: QueryAnalytics;
  isStreaming: boolean;
}

export class ChatSession {
  private messages: ChatMessage[] = [];
  private context: ConversationContext;
  private analytics: QueryAnalytics;
  private isStreaming = false;
  private conversationHistory: string[] = [];
  private queryCache = new Map<string, any>();
  private listeners: ChatSessionListener[] = [];
  private http: HttpTransport;
  private focusArea: string;

  constructor(http: HttpTransport, focusArea: string = 'careers') {
    this.http = http;
    this.focusArea = focusArea;
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

  subscribe(listener: ChatSessionListener): () => void {
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

  getState(): ChatSessionState {
    return {
      messages: [...this.messages],
      context: { ...this.context },
      analytics: { ...this.analytics },
      isStreaming: this.isStreaming,
    };
  }

  private detectIntent(message: string): QueryIntent {
    const lowerMsg = message.toLowerCase();
    const jobKeywords = ["job", "career", "position", "role", "hiring", "vacancy", "employment"];
    const trainingKeywords = ["training", "course", "program", "skill", "learn", "education", "study"];
    const budgetKeywords = ["budget", "funding", "allocation", "spending", "investment", "$", "billion", "million"];

    let category: QueryIntent["category"] = "general";
    let confidence = 0.5;

    if (jobKeywords.some(kw => lowerMsg.includes(kw))) {
      category = "jobs"; confidence = 0.8;
    } else if (trainingKeywords.some(kw => lowerMsg.includes(kw))) {
      category = "training"; confidence = 0.8;
    } else if (budgetKeywords.some(kw => lowerMsg.includes(kw))) {
      category = "budget"; confidence = 0.9;
    }

    const sectors = ["healthcare", "health", "education", "technology", "tech", "infrastructure", "transport"];
    const sector = sectors.find(s => lowerMsg.includes(s));

    return { category, sector, confidence };
  }

  private generateFollowUpQuestions(query: string, response: string, intent: QueryIntent): string[] {
    const questions: string[] = [];
    if (intent.category === "jobs") {
      questions.push(
        `What training programs prepare for ${intent.sector || "these"} roles?`,
        `What are the salary ranges for these positions?`,
        `How do I apply for government positions in SA?`
      );
    } else if (intent.category === "budget") {
      questions.push(
        `Which programs are receiving the most funding?`,
        `How has this budget changed over time?`,
        `What job opportunities does this funding create?`
      );
    } else if (intent.category === "training") {
      questions.push(
        `What jobs can I get after this training?`,
        `Are there funding programs to support my training?`,
        `What are the prerequisites for these programs?`
      );
    } else {
      questions.push(
        "What related job opportunities are available?",
        "Tell me more about budget allocations in this area",
        "What training programs are relevant to this?"
      );
    }
    return questions.slice(0, 3);
  }

  private generateProactiveInsight(messages: ChatMessage[], currentQuery: string, intent: QueryIntent): ProactiveInsight | undefined {
    const recentSectors = messages.slice(-3).map(m => m.queryIntent?.sector).filter(Boolean);
    const dominantSector = recentSectors[0];

    if (recentSectors.length >= 2 && recentSectors.every(s => s === dominantSector)) {
      return {
        type: "recommendation",
        title: `${dominantSector} Career Pathway Detected`,
        description: `I notice you're interested in ${dominantSector}. I can provide a comprehensive career pathway analysis.`,
        actionable: `Ask me: "What's the complete ${dominantSector} career pathway in SA?"`,
        relatedQuery: `What's the complete ${dominantSector} career pathway in SA?`
      };
    }

    const hasBudgetQuery = messages.some(m => m.queryIntent?.category === "budget");
    const hasJobQuery = messages.some(m => m.queryIntent?.category === "jobs");
    if (hasBudgetQuery && hasJobQuery && messages.length >= 3) {
      return {
        type: "opportunity",
        title: "Funding-to-Jobs Connection",
        description: "I can show you how budget allocations create specific job opportunities.",
        actionable: "Ask me: \"Which sectors have both growing budgets and high job demand?\"",
        relatedQuery: "Which sectors have both growing budgets and high job demand?"
      };
    }

    return undefined;
  }

  private shouldEmbedChart(query: string, intent: QueryIntent): VisualChartData | undefined {
    if (intent.category === "budget" && intent.sector) {
      return { type: "funding", sector: intent.sector, data: {}, title: `${intent.sector} Budget Allocation` };
    }
    if (intent.category === "jobs" && intent.sector) {
      return { type: "careers", sector: intent.sector, data: {}, title: `${intent.sector} Career Opportunities` };
    }
    return undefined;
  }

  private getCachedResponse(query: string) {
    const cacheKey = `${this.focusArea}:${query.toLowerCase().trim()}`;
    return this.queryCache.get(cacheKey);
  }

  private setCachedResponse(query: string, response: any) {
    const cacheKey = `${this.focusArea}:${query.toLowerCase().trim()}`;
    this.queryCache.set(cacheKey, {
      ...response,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000)
    });
    if (this.queryCache.size > 50) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }
  }

  private async semanticSearch(
    query: string,
    systemPrompt?: string
  ): Promise<SemanticSearchResult | null> {
    const result = await this.http.callFunction<SemanticSearchResult>('rag-metadata', {
      type: 'semantic-search',
      query,
      filters: {},
      options: {
        topK: 20,
        timeAwareRanking: true,
        systemPrompt,
      },
    });

    if (!result.success) return null;
    return result.data || null;
  }

  async sendMessage(content: string, systemPrompt?: string) {
    const startTime = Date.now();
    const intent = this.detectIntent(content);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
      queryIntent: intent,
    };

    const loadingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    this.messages = [...this.messages, userMessage, loadingMessage];
    this.conversationHistory.push(content);

    this.context = {
      ...this.context,
      messages: [...this.context.messages, userMessage],
      topics: [...new Set([...this.context.topics, intent.category])],
      sectors: intent.sector
        ? [...new Set([...this.context.sectors, intent.sector])]
        : this.context.sectors,
      intent,
    };
    this.notify();

    try {
      // Check cache
      const cached = this.getCachedResponse(content);
      if (cached && Date.now() < cached.expiresAt) {
        this.analytics = {
          ...this.analytics,
          cacheHitRate: ((this.analytics.cacheHitRate * this.analytics.totalQueries) + 1) / (this.analytics.totalQueries + 1),
        };

        this.messages = this.messages.filter(m => !m.isLoading);
        const responseId = crypto.randomUUID();
        this.messages = [...this.messages, {
          id: responseId,
          role: "assistant" as const,
          content: cached.response,
          timestamp: new Date(),
          sources: cached.sources,
        }];
        this.notify();
        return;
      }

      const conversationContext = this.conversationHistory.slice(-3).join("\n");
      const enhancedQuery = conversationContext
        ? `Recent conversation:\n${conversationContext}\n\nCurrent question: ${content}`
        : content;

      const result = await this.semanticSearch(enhancedQuery, systemPrompt);
      if (!result) throw new Error("No response");

      const responseTime = Date.now() - startTime;

      const enhancedSources: EnhancedSource[] = (result.sources || []).map((s, idx) => ({
        title: s.title || s.documentId,
        documentId: s.documentId || s.id || '',
        pageNumber: s.pageNumber,
        url: s.url,
        snippet: s.content?.substring(0, 200) || '',
        relevance: s.score ? Math.round(s.score * 100) : 82,
        category: s.category,
        sourceIndex: idx + 1,
      }));

      const followUps = this.generateFollowUpQuestions(content, result.answer, intent);
      const insight = this.generateProactiveInsight(this.messages, content, intent);
      const visualData = this.shouldEmbedChart(content, intent);

      const avgRelevance = enhancedSources.length > 0
        ? enhancedSources.reduce((sum, s) => sum + s.relevance, 0) / enhancedSources.length
        : 0;
      const confidence: "high" | "medium" | "low" =
        enhancedSources.length === 0 ? "low" : avgRelevance > 75 ? "high" : avgRelevance > 60 ? "medium" : "low";

      this.setCachedResponse(content, {
        response: result.answer,
        sources: enhancedSources,
      });

      this.messages = this.messages.filter(m => !m.isLoading);
      this.messages = [...this.messages, {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: result.answer,
        timestamp: new Date(),
        sources: enhancedSources,
        followUpQuestions: followUps,
        proactiveInsight: insight,
        visualData,
        confidence,
        responseTime,
        queryIntent: intent,
      }];

      const newTotal = this.analytics.totalQueries + 1;
      this.analytics = {
        totalQueries: newTotal,
        avgResponseTime: ((this.analytics.avgResponseTime * this.analytics.totalQueries) + responseTime) / newTotal,
        topTopics: this.updateTopTopics(this.analytics.topTopics, intent.category),
        helpfulRate: this.analytics.helpfulRate,
        cacheHitRate: (this.analytics.cacheHitRate * this.analytics.totalQueries) / newTotal,
      };

    } catch (error) {
      console.error("[ChatSession] Error:", error);
      this.messages = this.messages.filter(m => !m.isLoading);
      this.messages = [...this.messages, {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: "I encountered an error. Let me try a different approach. Could you rephrase your question?",
        timestamp: new Date(),
        confidence: "low" as const,
      }];
    }

    this.notify();
  }

  private updateTopTopics(
    current: Array<{ topic: string; count: number }>,
    newTopic: string
  ): Array<{ topic: string; count: number }> {
    const updated = [...current];
    const existing = updated.find(t => t.topic === newTopic);
    if (existing) {
      existing.count++;
    } else {
      updated.push({ topic: newTopic, count: 1 });
    }
    return updated.sort((a, b) => b.count - a.count).slice(0, 5);
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

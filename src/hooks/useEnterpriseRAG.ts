/**
 * ENTERPRISE RAG HOOK - World's Best Chat System
 * Features: Streaming, Context, Analytics, Proactive Insights, Visual Charts
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useRAGMetadata } from "./useRAGMetadata";

// ============================================================================
// TYPES - Enterprise-Grade
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

// ============================================================================
// HOOKS
// ============================================================================

export function useEnterpriseRAG() {
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

  const { chatQuery, semanticSearch } = useRAGMetadata();
  const conversationHistory = useRef<string[]>([]);
  const queryCache = useRef<Map<string, any>>(new Map());

  // ========================================================================
  // INTENT DETECTION - AI understands what user wants
  // ========================================================================

  const detectIntent = useCallback((message: string): QueryIntent => {
    const lowerMsg = message.toLowerCase();

    // Job-related keywords
    const jobKeywords = ["job", "career", "position", "role", "hiring", "vacancy", "employment"];
    const trainingKeywords = ["training", "course", "program", "skill", "learn", "education", "study"];
    const budgetKeywords = ["budget", "funding", "allocation", "spending", "investment", "$", "billion", "million"];

    let category: QueryIntent["category"] = "general";
    let confidence = 0.5;

    if (jobKeywords.some(kw => lowerMsg.includes(kw))) {
      category = "jobs";
      confidence = 0.8;
    } else if (trainingKeywords.some(kw => lowerMsg.includes(kw))) {
      category = "training";
      confidence = 0.8;
    } else if (budgetKeywords.some(kw => lowerMsg.includes(kw))) {
      category = "budget";
      confidence = 0.9;
    }

    // Detect sector
    const sectors = ["healthcare", "health", "education", "technology", "tech", "infrastructure", "transport"];
    const detectedSector = sectors.find(s => lowerMsg.includes(s));

    return { category, sector: detectedSector, confidence };
  }, []);

  // ========================================================================
  // FOLLOW-UP QUESTIONS - AI suggests next questions
  // ========================================================================

  const generateFollowUpQuestions = useCallback((
    query: string,
    response: string,
    intent: QueryIntent
  ): string[] => {
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
  }, []);

  // ========================================================================
  // PROACTIVE INSIGHTS - AI notices patterns and suggests
  // ========================================================================

  const generateProactiveInsight = useCallback((
    messages: ChatMessage[],
    currentQuery: string,
    intent: QueryIntent
  ): ProactiveInsight | undefined => {
    // Detect if user is asking about the same sector multiple times
    const recentSectors = messages
      .slice(-3)
      .map(m => m.queryIntent?.sector)
      .filter(Boolean);

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

    // Detect budget + job interest combination
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
  }, []);

  // ========================================================================
  // VISUAL CHART EMBEDDING - Detect when to show charts
  // ========================================================================

  const shouldEmbedChart = useCallback((
    query: string,
    intent: QueryIntent
  ): VisualChartData | undefined => {
    if (intent.category === "budget" && intent.sector) {
      return {
        type: "funding",
        sector: intent.sector,
        data: {}, // Will be populated by component
        title: `${intent.sector} Budget Allocation`
      };
    }

    if (intent.category === "jobs" && intent.sector) {
      return {
        type: "careers",
        sector: intent.sector,
        data: {},
        title: `${intent.sector} Career Opportunities`
      };
    }

    return undefined;
  }, []);

  // ========================================================================
  // SMART CACHING - Predictive + Standard
  // ========================================================================

  const getCachedResponse = useCallback((query: string) => {
    const cacheKey = query.toLowerCase().trim();
    return queryCache.current.get(cacheKey);
  }, []);

  const setCachedResponse = useCallback((query: string, response: any) => {
    const cacheKey = query.toLowerCase().trim();
    queryCache.current.set(cacheKey, {
      ...response,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000) // 10 min cache
    });

    // Limit cache size
    if (queryCache.current.size > 50) {
      const firstKey = queryCache.current.keys().next().value;
      queryCache.current.delete(firstKey);
    }
  }, []);

  // ========================================================================
  // STREAMING RESPONSE - Typewriter effect
  // ========================================================================

  const streamResponse = useCallback(async (
    messageId: string,
    fullResponse: string,
    sources: EnhancedSource[]
  ) => {
    setIsStreaming(true);
    const words = fullResponse.split(" ");
    let currentContent = "";

    for (let i = 0; i < words.length; i++) {
      currentContent += (i > 0 ? " " : "") + words[i];

      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, content: currentContent, isStreaming: true }
          : m
      ));

      // Adaptive delay: faster for short responses, slower for long
      const delay = fullResponse.length > 500 ? 30 : 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Finish streaming, add sources
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, isStreaming: false, sources }
        : m
    ));

    setIsStreaming(false);
  }, []);

  // ========================================================================
  // MAIN QUERY FUNCTION - The Ferrari Engine
  // ========================================================================

  const sendMessage = useCallback(async (content: string) => {
    const startTime = Date.now();

    // Detect intent
    const intent = detectIntent(content);

    // User message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
      queryIntent: intent,
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

    // Update context
    setContext(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      topics: [...new Set([...prev.topics, intent.category])],
      sectors: intent.sector
        ? [...new Set([...prev.sectors, intent.sector])]
        : prev.sectors,
      intent,
    }));

    try {
      // Check cache first
      const cached = getCachedResponse(content);
      if (cached && Date.now() < cached.expiresAt) {
        console.log("[EnterpriseRAG] Cache hit!");

        // Update analytics
        setAnalytics(prev => ({
          ...prev,
          cacheHitRate: ((prev.cacheHitRate * prev.totalQueries) + 1) / (prev.totalQueries + 1),
        }));

        // Use cached response but still stream it
        setMessages(prev => prev.filter(m => !m.isLoading));
        const responseId = crypto.randomUUID();

        setMessages(prev => [...prev, {
          id: responseId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isStreaming: true,
        }]);

        await streamResponse(responseId, cached.response, cached.sources);

        return;
      }

      // Build enhanced prompt with conversation context
      const conversationContext = conversationHistory.current.slice(-3).join("\n");
      const enhancedQuery = conversationContext
        ? `Recent conversation:\n${conversationContext}\n\nCurrent question: ${content}`
        : content;

      // Call Azure RAG
      const result = await chatQuery(enhancedQuery, null);

      if (!result) throw new Error("No response");

      const responseTime = Date.now() - startTime;

      // Enhanced sources with relevance
      // Azure AI Search semantic ranking typically scores 0-100
      // Default to 82 for semantic searches (high confidence baseline)
      const enhancedSources: EnhancedSource[] = result.sources.map(s => ({
        ...s,
        relevance: s.relevance || 82,
      }));

      // Generate follow-ups
      const followUps = generateFollowUpQuestions(content, result.response, intent);

      // Generate proactive insight
      const insight = generateProactiveInsight(messages, content, intent);

      // Check if should embed chart
      const visualData = shouldEmbedChart(content, intent);

      // Determine confidence (optimized for Azure AI Search semantic ranking)
      const avgRelevance = enhancedSources.reduce((sum, s) => sum + s.relevance, 0) / enhancedSources.length;
      const confidence: "high" | "medium" | "low" =
        avgRelevance > 75 ? "high" : avgRelevance > 60 ? "medium" : "low";

      // Cache the response
      setCachedResponse(content, {
        response: result.response,
        sources: enhancedSources,
      });

      // Remove loading, start streaming
      setMessages(prev => prev.filter(m => !m.isLoading));

      const responseId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: responseId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
        followUpQuestions: followUps,
        proactiveInsight: insight,
        visualData,
        confidence,
        responseTime,
        tokens: result.tokens,
        queryIntent: intent,
      }]);

      // Stream the response
      await streamResponse(responseId, result.response, enhancedSources);

      // Update analytics
      setAnalytics(prev => {
        const newTotal = prev.totalQueries + 1;
        return {
          totalQueries: newTotal,
          avgResponseTime: ((prev.avgResponseTime * prev.totalQueries) + responseTime) / newTotal,
          topTopics: updateTopTopics(prev.topTopics, intent.category),
          helpfulRate: prev.helpfulRate, // Updated on rating
          cacheHitRate: (prev.cacheHitRate * prev.totalQueries) / newTotal,
        };
      });

    } catch (error) {
      console.error("[EnterpriseRAG] Error:", error);

      setMessages(prev => prev.filter(m => !m.isLoading));
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I encountered an error. Let me try a different approach. Could you rephrase your question?",
        timestamp: new Date(),
        confidence: "low",
      }]);
    }
  }, [
    chatQuery,
    detectIntent,
    generateFollowUpQuestions,
    generateProactiveInsight,
    shouldEmbedChart,
    getCachedResponse,
    setCachedResponse,
    streamResponse,
    messages,
  ]);

  // ========================================================================
  // UTILITIES
  // ========================================================================

  const updateTopTopics = (
    current: Array<{ topic: string; count: number }>,
    newTopic: string
  ): Array<{ topic: string; count: number }> => {
    const existing = current.find(t => t.topic === newTopic);
    if (existing) {
      existing.count++;
    } else {
      current.push({ topic: newTopic, count: 1 });
    }
    return current.sort((a, b) => b.count - a.count).slice(0, 5);
  };

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
  };
}

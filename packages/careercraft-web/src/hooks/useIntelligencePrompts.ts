import { useState, useCallback, useMemo } from "react";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import {
  IntelligenceTab,
  InsightOutput,
  SEMANTIC_QUERIES,
  getTabPrompt,
  buildInsightQuery,
  parseInsightResponse,
} from "@/lib/intelligencePrompts";

interface IntelligenceContext {
  selectedSector?: string;
  timeframe?: string;
  comparisonType?: "yoy" | "sector" | "regional";
  searchQuery?: string;
}

interface UseIntelligencePromptsOptions {
  tab: IntelligenceTab;
  context?: IntelligenceContext;
  autoFetch?: boolean;
}

interface IntelligenceResult {
  insights: InsightOutput[];
  rawAnswer: string;
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
    metadata?: unknown;
  }>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for using intelligence prompts in dashboard components
 * 
 * Provides tab-specific semantic search with intelligent prompts
 * that extract meaningful insights from government data.
 */
export function useIntelligencePrompts(options: UseIntelligencePromptsOptions) {
  const { tab, context, autoFetch = false } = options;
  const { semanticSearch, loading: ragLoading, error: ragError } = useRAGMetadata();
  
  const [insights, setInsights] = useState<InsightOutput[]>([]);
  const [rawAnswer, setRawAnswer] = useState<string>("");
  const [sources, setSources] = useState<IntelligenceResult["sources"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the prompt and query configuration for the current tab
  const promptConfig = useMemo(() => ({
    systemPrompt: getTabPrompt(tab),
    query: SEMANTIC_QUERIES[tab],
  }), [tab]);

  /**
   * Fetch insights using the tab-specific prompt
   */
  const fetchInsights = useCallback(async (
    focusArea?: string,
    additionalContext?: Partial<IntelligenceContext>
  ): Promise<IntelligenceResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const mergedContext = { ...context, ...additionalContext };
      const query = buildInsightQuery(tab, focusArea, mergedContext);
      
      // Add search query context if provided
      const fullQuery = mergedContext.searchQuery
        ? `${query} Relevant to: "${mergedContext.searchQuery}"`
        : query;

      const result = await semanticSearch(
        fullQuery,
        promptConfig.query.filters || {},
        { topK: 40, timeAwareRanking: true }
      );

      if (!result) {
        throw new Error("No results returned from semantic search");
      }

      // Parse the answer into structured insights
      const parsedInsights = parseInsightResponse(result.answer || "");
      
      setInsights(parsedInsights);
      setRawAnswer(result.answer || "");
      setSources(result.sources || []);

      return {
        insights: parsedInsights,
        rawAnswer: result.answer || "",
        sources: result.sources || [],
        loading: false,
        error: null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch insights";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tab, context, semanticSearch, promptConfig]);

  /**
   * Fetch multiple insights in parallel for different focus areas
   */
  const fetchMultipleInsights = useCallback(async (
    focusAreas: string[]
  ): Promise<InsightOutput[]> => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        focusAreas.map(area => fetchInsights(area))
      );

      const allInsights: InsightOutput[] = [];
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          allInsights.push(...result.value.insights);
        }
      });

      setInsights(allInsights);
      return allInsights;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch insights";
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchInsights]);

  /**
   * Get contextual follow-up questions based on current insights
   */
  const getFollowUpQuestions = useCallback((): string[] => {
    if (!promptConfig.query.secondary) return [];
    
    // Filter out already answered questions based on insights
    const answeredTopics = insights.map(i => i.title.toLowerCase());
    
    return promptConfig.query.secondary.filter(q => 
      !answeredTopics.some(topic => q.toLowerCase().includes(topic))
    );
  }, [insights, promptConfig.query.secondary]);

  /**
   * Extract structured data from sources based on tab type
   */
  const extractStructuredData = useCallback(<T extends Record<string, unknown>>(
    extractor: (source: IntelligenceResult["sources"][number]) => T | null
  ): T[] => {
    const extracted: T[] = [];
    const seen = new Set<string>();

    for (const source of sources) {
      const data = extractor(source);
      if (data) {
        const key = JSON.stringify(data);
        if (!seen.has(key)) {
          seen.add(key);
          extracted.push(data);
        }
      }
    }

    return extracted;
  }, [sources]);

  /**
   * Get the current tab's semantic context
   */
  const getSemanticContext = useCallback(() => {
    return {
      tab,
      systemPrompt: promptConfig.systemPrompt,
      primaryQuery: promptConfig.query.primary,
      filters: promptConfig.query.filters,
      insightCount: insights.length,
      sourceCount: sources.length,
    };
  }, [tab, promptConfig, insights.length, sources.length]);

  return {
    // State
    insights,
    rawAnswer,
    sources,
    loading: loading || ragLoading,
    error: error || ragError,
    
    // Actions
    fetchInsights,
    fetchMultipleInsights,
    
    // Utilities
    getFollowUpQuestions,
    extractStructuredData,
    getSemanticContext,
    
    // Configuration
    promptConfig,
    tabPrompt: promptConfig.systemPrompt,
  };
}

/**
 * Hook for extracting specific data types from intelligence sources
 */
export function useDataExtractor<T>(
  sources: IntelligenceResult["sources"],
  extractor: (source: IntelligenceResult["sources"][number]) => T | null
): T[] {
  return useMemo(() => {
    const extracted: T[] = [];
    const seen = new Set<string>();

    for (const source of sources) {
      try {
        const data = extractor(source);
        if (data !== null) {
          const key = JSON.stringify(data);
          if (!seen.has(key)) {
            seen.add(key);
            extracted.push(data);
          }
        }
      } catch {
        // Skip invalid sources
      }
    }

    return extracted;
  }, [sources, extractor]);
}

/**
 * Pre-configured extractors for common data types
 */
export const DataExtractors = {
  /**
   * Extract budget allocation data from sources
   */
  budgetAllocation: (source: IntelligenceResult["sources"][number]) => {
    const content = source.content || "";
    const metadata = typeof source.metadata === "string"
      ? JSON.parse(source.metadata)
      : source.metadata;

    // Try to extract from table row metadata
    if (metadata?.chunkType === "table_row" && metadata.rowValues) {
      const headers = metadata.headers || [];
      const values = metadata.rowValues || [];
      
      const sectorIdx = headers.findIndex((h: string) =>
        h.toLowerCase().includes("sector") || h.toLowerCase().includes("department")
      );
      const amountIdx = headers.findIndex((h: string) =>
        h.toLowerCase().includes("amount") || h.toLowerCase().includes("budget")
      );
      
      if (sectorIdx >= 0 && amountIdx >= 0) {
        return {
          sector: String(values[sectorIdx] || ""),
          amount: String(values[amountIdx] || ""),
          source: source.title,
        };
      }
    }

    // Fallback to content extraction
    const sectorMatch = content.match(/(?:sector|department):\s*([^,\n]+)/i);
    const amountMatch = content.match(/\$[\d,]+(?:\.\d+)?\s*(?:million|billion|m|b)/i);

    if (sectorMatch || amountMatch) {
      return {
        sector: sectorMatch?.[1]?.trim() || source.sector || "Unknown",
        amount: amountMatch?.[0] || "N/A",
        source: source.title,
      };
    }

    return null;
  },

  /**
   * Extract career/occupation data from sources
   */
  careerOpportunity: (source: IntelligenceResult["sources"][number]) => {
    const content = source.content || "";
    const metadata = typeof source.metadata === "string"
      ? JSON.parse(source.metadata)
      : source.metadata;

    if (metadata?.chunkType === "table_row" && metadata.rowValues) {
      const headers = metadata.headers || [];
      const values = metadata.rowValues || [];
      
      const occupationIdx = headers.findIndex((h: string) =>
        h.toLowerCase().includes("occupation") || h.toLowerCase().includes("role")
      );
      const growthIdx = headers.findIndex((h: string) =>
        h.toLowerCase().includes("growth") || h.toLowerCase().includes("%")
      );
      
      if (occupationIdx >= 0) {
        return {
          occupation: String(values[occupationIdx] || ""),
          growth: growthIdx >= 0 ? String(values[growthIdx] || "") : undefined,
          sector: source.sector,
          source: source.title,
        };
      }
    }

    const occupationMatch = content.match(/(?:occupation|career|role):\s*([^,\n]+)/i);
    const growthMatch = content.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:growth|increase)/i);

    if (occupationMatch) {
      return {
        occupation: occupationMatch[1].trim(),
        growth: growthMatch?.[1],
        sector: source.sector,
        source: source.title,
      };
    }

    return null;
  },

  /**
   * Extract skill data from sources
   */
  skillDemand: (source: IntelligenceResult["sources"][number]) => {
    const content = source.content || "";
    const metadata = typeof source.metadata === "string"
      ? JSON.parse(source.metadata)
      : source.metadata;

    if (metadata?.chunkType === "table_row" && metadata.rowValues) {
      const headers = metadata.headers || [];
      const values = metadata.rowValues || [];
      
      const skillIdx = headers.findIndex((h: string) =>
        h.toLowerCase().includes("skill") || h.toLowerCase().includes("competency")
      );
      const demandIdx = headers.findIndex((h: string) =>
        h.toLowerCase().includes("demand") || h.toLowerCase().includes("need")
      );
      
      if (skillIdx >= 0) {
        return {
          skill: String(values[skillIdx] || ""),
          demand: demandIdx >= 0 ? String(values[demandIdx] || "") : undefined,
          sector: source.sector,
          source: source.title,
        };
      }
    }

    const skillMatch = content.match(/(?:skill|competency):\s*([^,\n]+)/i);
    const demandMatch = content.match(/(?:high|medium|low)\s*demand/i);

    if (skillMatch) {
      return {
        skill: skillMatch[1].trim(),
        demand: demandMatch?.[0],
        sector: source.sector,
        source: source.title,
      };
    }

    return null;
  },
};

export default useIntelligencePrompts;


import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callRAGMetadata, isAzureFunctionsConfigured } from "@/lib/azureFunctions";
import { getChatPrompt } from "@/lib/promptLoader";

const queryCache = new Map<string, {
  data: unknown;
  timestamp: number;
  expiresAt: number;
}>();

const CACHE_TTL = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of queryCache.entries()) {
    if (now >= value.expiresAt) {
      queryCache.delete(key);
    }
  }
}, 60000);

let requestQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  query: string;
  filters: unknown;
  options: unknown;
}> = [];
let isProcessingQueue = false;
const MIN_REQUEST_INTERVAL = 2000;
let lastRequestTime = 0;
const executeSemanticSearch = async (
  query: string,
  filters?: any,
  options?: any,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<any> => {
  // Check cache first
  const cacheKey = JSON.stringify({ query, filters, options });
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    /**
     * RAG ARCHITECTURE:
     * 
     * PRIMARY: Azure Functions (rag-metadata)
     *   - Used when VITE_AZURE_FUNCTIONS_URL is set
     *   - Accepts systemPrompt parameter (database-driven prompts)
     *   - Better performance and scalability
     * 
     * FALLBACK: Supabase Edge Functions (rag-query)
     *   - Used if Azure Functions not configured
     *   - See supabase/functions/rag-query/index.ts
     *   - Uses hardcoded prompts (not database-driven)
     * 
     * Prompt System:
     *   - Database prompts work with Azure Functions (primary)
     *   - Fallback uses hardcoded prompts
     */
    if (isAzureFunctionsConfigured()) {
      console.log("[semanticSearch] Using Azure Functions (primary)");
      const result = await callRAGMetadata<{
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
      }>("semantic-search", {
        query,
        filters: filters || {},
        options: {
          topK: options?.topK || 30,
          timeAwareRanking: options?.timeAwareRanking !== false,
          systemPrompt: options?.systemPrompt, // Pass tab-specific HORUS prompt
        },
      });

      if (!result.success) {
        throw new Error(result.error || "Semantic search failed");
      }

      // Cache the result
      queryCache.set(cacheKey, {
        data: result.data,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL,
      });

      return result.data;
    }

    // FALLBACK: Use Supabase Edge Functions if Azure not configured
    // Note: Fallback uses hardcoded prompts (not database-driven)
    console.log("[semanticSearch] Using Supabase Edge Functions (fallback)");
    const { data, error: fetchError } = await supabase.functions.invoke("rag-query", {
      body: {
        query,
        filters: filters || {},
        options: {
          topK: options?.topK || 30,
          timeAwareRanking: options?.timeAwareRanking !== false,
        },
      },
    });

    if (fetchError) {
      // Check for rate limiting errors
      const errorMessage = fetchError.message || "";
      const isRateLimit = errorMessage.includes("RateLimitReached") ||
                         errorMessage.includes("INSUFFICIENT_RESOURCES") || 
                         errorMessage.includes("429") ||
                         errorMessage.includes("rate limit") ||
                         fetchError.status === 429 ||
                         fetchError.status === 503;
      
      // Extract retry-after time from error message
      let retryAfterSeconds = 30; // Default for RateLimitReached
      const retryMatch = errorMessage.match(/retry after (\d+) seconds?/i);
      if (retryMatch) {
        retryAfterSeconds = parseInt(retryMatch[1]);
      }
      
      // Retry with proper wait time
      if (isRateLimit && retryCount < maxRetries) {
        const delay = retryAfterSeconds * 1000; // Use Azure's specified wait time
        console.warn(`Rate limited (${errorMessage.substring(0, 100)}), waiting ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeSemanticSearch(query, filters, options, retryCount + 1, maxRetries);
      }
      
      throw fetchError;
    }
    
    if (data?.error) {
      const errorMessage = data.error;
      const isRateLimit = errorMessage.includes("RateLimitReached") ||
                         errorMessage.includes("INSUFFICIENT_RESOURCES") || 
                         errorMessage.includes("429") ||
                         errorMessage.includes("rate limit");
      
      // Extract retry-after time
      let retryAfterSeconds = 30;
      const retryMatch = errorMessage.match(/retry after (\d+) seconds?/i);
      if (retryMatch) {
        retryAfterSeconds = parseInt(retryMatch[1]);
      }
      
      if (isRateLimit && retryCount < maxRetries) {
        const delay = retryAfterSeconds * 1000;
        console.warn(`Rate limited, waiting ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeSemanticSearch(query, filters, options, retryCount + 1, maxRetries);
      }
      
      throw new Error(errorMessage);
    }

    // Cache the result
    queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL,
    });

    return data;
  } catch (err) {
    throw err;
  }
};

// ENTERPRISE: Process request queue with rate limiting
const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    // Wait if needed to respect rate limits (S0 tier = 1 req/sec minimum)
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    
    const request = requestQueue.shift();
    if (!request) continue;
    
    lastRequestTime = Date.now();
    
    try {
      const result = await executeSemanticSearch(request.query, request.filters, request.options);
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }
  }
  
  isProcessingQueue = false;
};

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

export interface CategoryStats {
  category: string;
  count: number;
  documentIds: string[];
}

export function useRAGMetadata() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStats = useCallback(async (filters?: {
    category?: string;
    sector?: string;
    documentType?: "pdf" | "web" | "all";
  }): Promise<RAGStats | null> => {
    setLoading(true);
    setError(null);
    try {
      // Use Azure Functions if configured, otherwise fallback to Supabase
      if (isAzureFunctionsConfigured()) {
        const result = await callRAGMetadata<RAGStats>("stats", {
          filters: filters || {},
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch stats");
        }

        return result.data || null;
      } else {
        // Fallback to Supabase Edge Functions
        const { data, error: fetchError } = await supabase.functions.invoke("rag-metadata", {
          body: {
            type: "stats",
            filters: filters || {},
          },
        });

        if (fetchError) throw fetchError;
        if (data?.error) throw new Error(data.error);

        return data as RAGStats;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - function is stable

  const getCategories = useCallback(async (): Promise<{
    categories: CategoryStats[];
    sectors: Array<{ value: string; count: number }>;
  } | null> => {
    setLoading(true);
    setError(null);
    try {
      // Use Azure Functions if configured, otherwise fallback to Supabase
      if (isAzureFunctionsConfigured()) {
        const result = await callRAGMetadata<{ categories: CategoryStats[]; sectors: Array<{ value: string; count: number }> }>("categories", {});

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch categories");
        }

        return result.data || null;
      } else {
        // Fallback to Supabase Edge Functions
        const { data, error: fetchError } = await supabase.functions.invoke("rag-metadata", {
          body: {
            type: "categories",
          },
        });

        if (fetchError) throw fetchError;
        if (data?.error) throw new Error(data.error);

        return data as { categories: CategoryStats[]; sectors: Array<{ value: string; count: number }> };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch categories");
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - function is stable

  const getDocuments = useCallback(async (
    filters?: {
      category?: string;
      sector?: string;
      documentType?: "pdf" | "web" | "all";
      tags?: string[];
    },
    top: number = 100
  ): Promise<{ documents: DocumentMetadata[]; total: number } | null> => {
    setLoading(true);
    setError(null);
    try {
      // Use Azure Functions if configured, otherwise fallback to Supabase
      if (isAzureFunctionsConfigured()) {
        const result = await callRAGMetadata<{ documents: DocumentMetadata[]; total: number }>("documents", {
          filters: filters || {},
          top,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch documents");
        }

        return result.data || null;
      } else {
        // Fallback to Supabase Edge Functions
        const { data, error: fetchError } = await supabase.functions.invoke("rag-metadata", {
          body: {
            type: "documents",
            filters: filters || {},
            top,
          },
        });

        if (fetchError) throw fetchError;
        if (data?.error) throw new Error(data.error);

        return data as { documents: DocumentMetadata[]; total: number };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - function is stable

  const searchDocuments = useCallback(async (
    query: string,
    filters?: {
      category?: string;
      sector?: string;
      documentType?: "pdf" | "web" | "all";
    },
    top: number = 20
  ): Promise<{ results: DocumentMetadata[]; total: number } | null> => {
    setLoading(true);
    setError(null);
    try {
      // Use Azure Functions if configured, otherwise fallback to Supabase
      if (isAzureFunctionsConfigured()) {
        const result = await callRAGMetadata<{ results: DocumentMetadata[]; total: number }>("search", {
          query,
          filters: filters || {},
          top,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to search documents");
        }

        return result.data || null;
      } else {
        // Fallback to Supabase Edge Functions
        const { data, error: fetchError } = await supabase.functions.invoke("rag-metadata", {
          body: {
            type: "search",
            query,
            filters: filters || {},
            top,
          },
        });

        if (fetchError) throw fetchError;
        if (data?.error) throw new Error(data.error);

        return data as { results: DocumentMetadata[]; total: number };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search documents");
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - function is stable


  // Semantic search using RAG query - leverages vector search and AI to extract structured data
  // ENTERPRISE: Includes caching, request queuing, and proper rate limit handling
  const semanticSearch = useCallback(async (
    query: string,
    filters?: {
      category?: string;
      sector?: string;
      documentType?: "pdf" | "web" | "all";
      tags?: string[];
    },
    options?: {
      topK?: number;
      timeAwareRanking?: boolean;
      systemPrompt?: string;
    }
  ): Promise<{
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
  } | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first
      const cacheKey = JSON.stringify({ query, filters, options });
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        setLoading(false);
        return cached.data as {
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
            metadata?: unknown;
          }>;
          suggestedQuestions?: string[];
        };
      }

      // Queue the request to prevent overwhelming the API
      const result = await new Promise<any>((resolve, reject) => {
        requestQueue.push({
          resolve,
          reject,
          query,
          filters: filters || {},
          options: options || {},
        });
        
        // Process queue asynchronously
        processQueue();
      });

      return result as {
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
        }>;
        suggestedQuestions?: string[];
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to perform semantic search";
      setError(errorMessage);
      
      console.error("Semantic search error:", errorMessage);
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - function is stable

  const getBulk = useCallback(async (operations: ('stats' | 'categories' | 'documents')[], filters?: {
    category?: string;
    sector?: string;
    documentType?: "pdf" | "web" | "all";
    tags?: string[];
  }): Promise<{
    stats?: RAGStats | null;
    categories?: { categories: CategoryStats[]; sectors: Array<{ value: string; count: number }> } | null;
    documents?: any;
  } | null> => {
    setLoading(true);
    setError(null);
    try {
      if (isAzureFunctionsConfigured()) {
        const { callRAGMetadataBulk } = await import('@/lib/azureFunctions');
        const result = await callRAGMetadataBulk(operations, filters);

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch bulk data");
        }

        return (result.data as {
          stats?: RAGStats;
          categories?: { categories: CategoryStats[]; sectors: Array<{ value: string; count: number }> };
          documents?: unknown;
        }) || null;
      } else {
        // Fallback: make individual Supabase calls
        const promises: Promise<any>[] = [];
        const results: any = {};
        
        if (operations.includes('stats')) {
          promises.push(getStats(filters).then(r => ({ type: 'stats', data: r })));
        }
        if (operations.includes('categories')) {
          promises.push(getCategories().then(r => ({ type: 'categories', data: r })));
        }
        if (operations.includes('documents')) {
          promises.push(getDocuments(filters).then(r => ({ type: 'documents', data: r })));
        }
        
        const settled = await Promise.allSettled(promises);
        settled.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results[result.value.type] = result.value.data;
          }
        });
        
        return results;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bulk data");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getStats, getCategories, getDocuments]); // Dependencies for fallback case

  // Chat-specific wrapper around semanticSearch
  // Uses conversational system prompt instead of analytical HORUS prompts
  const chatQuery = useCallback(async (
    message: string,
    sessionId?: string | null,
    focusArea: string = 'careers'
  ): Promise<{
    response: string;
    sources: Array<{
      title: string;
      documentId: string;
      pageNumber?: number;
      url?: string;
      snippet: string;
      relevance?: number;
      category?: string;
    }>;
    sessionId: string;
    tokens?: number;
  } | null> => {
    setLoading(true);
    setError(null);

    try {
      // Load prompt from database (admin-configurable)
      // Falls back to hardcoded prompt if database unavailable
      const systemPrompt = await getChatPrompt(focusArea);
      console.log(`[chatQuery] 📝 Using prompt for "${focusArea}" (first 100 chars):`, systemPrompt.substring(0, 100));

      // Use semantic search with chat-optimized settings
      const result = await semanticSearch(
        message,
        {
          // Prioritize career-relevant content
          category: undefined, // No filter - search all categories
        },
        {
          topK: 20, // More sources for better chat context
          timeAwareRanking: true,
          systemPrompt: systemPrompt

        }
      );

      if (!result) {
        throw new Error("No response from semantic search");
      }

      // Format sources for chat UI
      const formattedSources = result.sources.slice(0, 10).map(source => ({
        title: source.title || source.documentId,
        documentId: source.documentId,
        pageNumber: source.pageNumber,
        url: source.url,
        snippet: source.content?.substring(0, 200) || "",
        relevance: source.score ? Math.round(source.score * 100) : undefined,
        category: source.category,
      }));

      return {
        response: result.answer,
        sources: formattedSources,
        sessionId: sessionId || crypto.randomUUID(),
        tokens: undefined, // Could track if needed
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process chat query";
      setError(errorMessage);
      console.error("Chat query error:", errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [semanticSearch]);

  return {
    loading,
    error,
    getStats,
    getCategories,
    getDocuments,
    searchDocuments,
    semanticSearch,
    getBulk,
    chatQuery, // NEW: Chat-optimized query method
  };
}


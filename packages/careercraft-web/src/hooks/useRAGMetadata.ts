import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { horusMetadata, horusSearch, isHorusRagEnabled } from "@/lib/horusKnowledge";

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

  /**
   * RETRIEVAL: Horus only.
   *
   * Answers come from the Content Understanding corpus via the `horus-rag`
   * edge function, grounded and cited. The former two-tier fallback (Azure
   * Functions over the `sa-gov-documents` index, then a Supabase `rag-query`
   * function) has been removed — that infrastructure is being archived, and a
   * silent fallback to a stale corpus is worse than a visible failure: the
   * user cannot tell that the answer came from documents a year out of date.
   *
   * `VITE_HORUS_RAG=off` still disables the path, which now surfaces the
   * outage rather than hiding it.
   */
  if (!isHorusRagEnabled()) {
    throw new Error(
      "Horus retrieval is disabled (VITE_HORUS_RAG=off) and no fallback engine is configured.",
    );
  }

  const horus = await horusSearch(query, filters || {}, {
    topK: options?.topK || 12,
    systemPrompt: options?.systemPrompt,
  });

  queryCache.set(cacheKey, {
    data: horus,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_TTL,
  });
  return horus;
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
      // Horus reports corpus-wide counts. The legacy `filters` argument is
      // accepted for call-site compatibility but no longer narrows the result —
      // rag.metadata has no filtered-stats operation.
      const data = await horusMetadata("stats") as {
        documents?: number;
        chunks?: number;
      };

      return {
        totalDocuments: data.documents ?? 0,
        totalChunks: data.chunks ?? 0,
      };
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
      const data = await horusMetadata("categories") as {
        categories?: Array<{ category: string; documents: number; chunks: number }>;
      };

      return {
        categories: (data.categories ?? []).map((c) => ({
          category: c.category,
          count: c.documents,
          // Horus aggregates by category and does not return member ids;
          // no caller reads this today.
          documentIds: [],
        })),
        // The corpus has no `sector` facet — that was an old-index concept.
        sectors: [],
      };
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
      const data = await horusMetadata("documents") as {
        documents?: Array<{
          id: string;
          title: string;
          category: string | null;
          chunksCount: number;
          indexedAt: string | null;
        }>;
      };

      let documents = (data.documents ?? []).map((d) => ({
        documentId: d.id,
        title: d.title,
        category: d.category ?? undefined,
        documentType: 'pdf',
        chunkCount: d.chunksCount,
        lastModified: d.indexedAt ?? undefined,
      })) as DocumentMetadata[];

      // Horus returns the whole indexed set; apply the caller's narrowing here.
      if (filters?.category) {
        documents = documents.filter((d) => d.category === filters.category);
      }

      return { documents: documents.slice(0, top), total: documents.length };
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
      const result = await horusSearch(
        query,
        filters?.category ? { category: filters.category } : undefined,
        { topK: Math.min(Math.max(top, 12), 50) },
      );

      // Chunks collapse to documents; keep each document's best-scoring hit.
      const byDocument = new Map<string, DocumentMetadata>();
      for (const source of result.sources) {
        const existing = byDocument.get(source.documentId);
        if (existing) {
          existing.score = Math.max(existing.score ?? 0, source.score ?? 0);
          continue;
        }
        byDocument.set(source.documentId, {
          documentId: source.documentId,
          title: source.title,
          category: source.category,
          documentType: 'pdf',
          url: source.url,
          score: source.score,
          pageNumber: source.pageNumber,
        });
      }

      const results = [...byDocument.values()]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, top);
      return { results, total: results.length };
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
      // The legacy backend had a dedicated bulk endpoint to amortise Azure
      // Function cold starts. Horus has no such cost, so fanning out and
      // settling is simpler and no slower.
      const [stats, categories, documents] = await Promise.all([
        operations.includes('stats') ? getStats(filters) : Promise.resolve(undefined),
        operations.includes('categories') ? getCategories() : Promise.resolve(undefined),
        operations.includes('documents') ? getDocuments(filters) : Promise.resolve(undefined),
      ]);

      return {
        ...(stats !== undefined && { stats }),
        ...(categories !== undefined && { categories }),
        ...(documents !== undefined && { documents }),
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bulk data");
      return null;
    } finally {
      setLoading(false);
    }
    // These three are themselves stable (empty dep arrays), so this callback
    // stays stable too — but declare them rather than relying on that.
  }, [getStats, getCategories, getDocuments]);

  return {
    loading,
    error,
    getStats,
    getCategories,
    getDocuments,
    searchDocuments,
    semanticSearch,
    getBulk,
  };
}

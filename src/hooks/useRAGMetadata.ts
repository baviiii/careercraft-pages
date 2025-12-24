import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  const getStats = async (filters?: {
    category?: string;
    sector?: string;
    documentType?: "pdf" | "web" | "all";
  }): Promise<RAGStats | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.functions.invoke("rag-metadata", {
        body: {
          type: "stats",
          filters: filters || {},
        },
      });

      if (fetchError) throw fetchError;
      if (data?.error) throw new Error(data.error);

      return data as RAGStats;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getCategories = async (): Promise<{
    categories: CategoryStats[];
    sectors: Array<{ value: string; count: number }>;
  } | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.functions.invoke("rag-metadata", {
        body: {
          type: "categories",
        },
      });

      if (fetchError) throw fetchError;
      if (data?.error) throw new Error(data.error);

      return data as { categories: CategoryStats[]; sectors: Array<{ value: string; count: number }> };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch categories");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getDocuments = async (
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const searchDocuments = async (
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search documents");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getStats,
    getCategories,
    getDocuments,
    searchDocuments,
  };
}


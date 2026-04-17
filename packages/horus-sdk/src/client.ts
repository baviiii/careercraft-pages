/**
 * HorusClient - Main entry point for the Horus SDK
 */

import type { HorusConfig, SemanticSearchResult, SearchFilters, SearchOptions, AgenticRAGOptions } from "./types";
import { HttpTransport } from "./http";
import { ChatSession } from "./chat";
import { AgenticSession } from "./agentic";

export class HorusClient {
  private http: HttpTransport;
  private config: HorusConfig;

  constructor(config: HorusConfig) {
    this.config = config;
    this.http = new HttpTransport(config);
  }

  /**
   * Perform a semantic search against the RAG index
   */
  async semanticSearch(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<SemanticSearchResult | null> {
    const result = await this.http.callFunction<SemanticSearchResult>('rag-metadata', {
      type: 'semantic-search',
      query,
      filters: filters || {},
      options: {
        topK: options?.topK || 30,
        timeAwareRanking: options?.timeAwareRanking !== false,
        systemPrompt: options?.systemPrompt,
      },
    });

    if (!result.success) return null;
    return result.data || null;
  }

  /**
   * Get metadata (stats, categories, documents, etc.)
   */
  async getMetadata<T = unknown>(
    type: 'stats' | 'documents' | 'categories' | 'search' | 'bulk' | 'semantic-search' | 'fetch-tables',
    options: Record<string, unknown> = {}
  ): Promise<T | null> {
    const result = await this.http.callFunction<T>('rag-metadata', {
      type,
      ...options,
    });

    if (!result.success) return null;
    return result.data || null;
  }

  /**
   * Create a new chat session (Enterprise RAG)
   */
  createChatSession(focusArea?: string): ChatSession {
    return new ChatSession(this.http, focusArea);
  }

  /**
   * Create a new agentic session (Graph RAG + multi-step reasoning)
   */
  createAgenticSession(focusArea?: string, options?: AgenticRAGOptions): AgenticSession {
    return new AgenticSession(this.http, this.config, focusArea, options);
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return this.http.isConfigured();
  }

  /**
   * Get the underlying HTTP transport (for advanced usage)
   */
  getTransport(): HttpTransport {
    return this.http;
  }
}

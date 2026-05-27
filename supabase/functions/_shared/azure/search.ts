// Azure AI Search REST wrapper.
// Used by RAG functions (rag-query) for hybrid retrieval
// (BM25 + vector + semantic ranking).

import { ProviderError } from "../ai/errors.ts";
import { optEnv, reqEnv } from "../env.ts";

export interface SearchHit {
  id: string;
  content: string;
  title?: string;
  documentId?: string;
  documentType?: string;
  pageNumber?: number;
  chunkIndex?: number;
  category?: string;
  sector?: string;
  tags?: string[];
  url?: string;
  "@search.score"?: number;
  "@search.rerankerScore"?: number;
}

export interface HybridSearchInput {
  query: string;
  embedding?: number[];
  topK?: number;
  filters?: Record<string, string | undefined>;
  /** Custom $select projection. Defaults to the standard fields above. */
  select?: string;
  /** Override the index name (defaults to AZURE_SEARCH_INDEX env or "sa-gov-documents"). */
  index?: string;
  /** Disable semantic re-ranking for cheaper queries. */
  semantic?: boolean;
}

const DEFAULT_SELECT =
  "id,content,title,documentId,documentType,pageNumber,chunkIndex,category,sector,tags,url";

const FILTERABLE_KEYS = new Set([
  "sector",
  "category",
  "documentType",
  "documentId",
]);

function escapeODataString(v: string): string {
  return v.replace(/'/g, "''");
}

export async function hybridSearch(input: HybridSearchInput): Promise<SearchHit[]> {
  const endpoint = reqEnv("AZURE_SEARCH_ENDPOINT");
  const apiKey = reqEnv("AZURE_SEARCH_KEY");
  const index = input.index ?? optEnv("AZURE_SEARCH_INDEX", "sa-gov-documents")!;
  const topK = input.topK ?? 8;
  const useSemantic = input.semantic !== false;

  const body: Record<string, unknown> = {
    search: input.query,
    top: topK,
    select: input.select ?? DEFAULT_SELECT,
  };

  if (useSemantic) {
    body.queryType = "semantic";
    body.semanticConfiguration = "default";
  }

  if (input.embedding && input.embedding.length > 0) {
    body.vectorQueries = [{
      kind: "vector",
      vector: input.embedding,
      fields: "contentVector",
      k: topK,
    }];
  }

  if (input.filters) {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(input.filters)) {
      if (!value || !FILTERABLE_KEYS.has(key)) continue;
      parts.push(`${key} eq '${escapeODataString(value)}'`);
    }
    if (parts.length) body.filter = parts.join(" and ");
  }

  const url = `${endpoint.replace(/\/$/, "")}/indexes/${index}/docs/search?api-version=2023-11-01`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new ProviderError(
      `Azure Search ${resp.status}: ${text.slice(0, 500)}`,
      "azure-search",
      resp.status,
    );
  }

  const data = await resp.json();
  return (data.value ?? []) as SearchHit[];
}

/**
 * Horus knowledge client (browser side).
 *
 * Every call goes to the `horus-rag` Supabase edge function, never to Horus
 * directly. That indirection is deliberate and not negotiable: Vite inlines
 * `VITE_*` variables into the shipped bundle, so a Horus API key placed in
 * frontend env would be readable by anyone who opens devtools — handing out
 * the whole corpus and the ability to spend our tokens. The key stays on the
 * server; the browser authenticates with the user's Supabase session.
 *
 * The edge function also translates Horus's response shapes into the ones this
 * app already renders, so callers here get exactly what the legacy Azure
 * Functions used to return.
 */
import { supabase } from "@/integrations/supabase/client";

const FUNCTION = "horus-rag";

/** Enabled unless explicitly turned off — set `VITE_HORUS_RAG=off` to fall back. */
export function isHorusRagEnabled(): boolean {
  return (import.meta.env.VITE_HORUS_RAG ?? "").toLowerCase() !== "off";
}

export interface HorusLegacySource {
  id: string;
  content: string;
  title: string;
  documentId: string;
  pageNumber?: number;
  category?: string;
  sector?: string;
  score?: number;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface HorusSearchResult {
  answer: string;
  sources: HorusLegacySource[];
  suggestedQuestions?: string[];
  confidence?: number;
  engine: "horus";
}

export interface HorusGraphEntity {
  id?: string;
  name: string;
  type: string;
  relation?: string;
  evidence?: string;
  confidence?: number;
  docCount?: number;
  matchedBy?: string;
  coverage?: string;
  description?: string;
}

export interface HorusGraphResult {
  data: HorusGraphEntity[];
  edges?: Array<{
    from: string;
    to: string;
    type: string;
    confidence?: number;
    evidence?: string;
  }>;
  center?: { id: string; name: string; type: string };
  documents?: Array<{ id: string; title: string; category: string | null; mentions: number }>;
  notFound?: boolean;
}

type Op =
  | "search"
  | "careers-search"
  | "occupation"
  | "sector"
  | "pathway"
  | "skill-gap"
  | "traverse"
  | "entity-lookup"
  | "metadata";

async function callHorus<T>(op: Op, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FUNCTION, {
    body: { op, ...payload },
  });

  if (error) {
    throw new Error(
      `[horus-rag:${op}] ${error.message ?? "edge function call failed"}`,
    );
  }
  // The function returns 200 with an `error` key for handled upstream faults.
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(`[horus-rag:${op}] ${String((data as { error: unknown }).error)}`);
  }
  return data as T;
}

/**
 * Grounded answer over the whole corpus. Direct replacement for the legacy
 * `semantic-search` / `rag-query` call.
 */
export function horusSearch(
  query: string,
  filters?: { category?: string; sector?: string; tags?: string[] },
  options?: { topK?: number; systemPrompt?: string },
): Promise<HorusSearchResult> {
  return callHorus<HorusSearchResult>("search", { query, filters, options });
}

/**
 * Retrieval restricted to careers-relevant categories, so a question about
 * training does not come back with budget appropriation tables.
 */
export function horusCareersSearch(
  query: string,
  filters?: { category?: string },
  options?: { topK?: number },
): Promise<HorusSearchResult> {
  return callHorus<HorusSearchResult>("careers-search", { query, filters, options });
}

/** Entity resolution + its edges, flattened. Replaces graph-query action:'search'. */
export function horusEntityLookup(entity: string): Promise<HorusGraphResult> {
  return callHorus<HorusGraphResult>("entity-lookup", { entity });
}

/** Graph neighbourhood. Replaces graph-query action:'traverse'. */
export function horusTraverse(entity: string, depth = 2): Promise<HorusGraphResult> {
  return callHorus<HorusGraphResult>("traverse", { entity, depth });
}

export function horusOccupation(name: string) {
  return callHorus<Record<string, unknown>>("occupation", { name });
}

export function horusSector(name: string) {
  return callHorus<Record<string, unknown>>("sector", { name });
}

export function horusPathway(from: string, to: string) {
  return callHorus<Record<string, unknown>>("pathway", { from, to });
}

export function horusSkillGap(target: string, have: string[] = []) {
  return callHorus<Record<string, unknown>>("skill-gap", { target, have });
}

export function horusMetadata(operation: "stats" | "documents" | "categories" = "stats") {
  return callHorus<Record<string, unknown>>("metadata", { operation });
}

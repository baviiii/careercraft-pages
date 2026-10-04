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

/* ── Budget ────────────────────────────────────────────────────────────────
   Figures extracted from the budget papers in the corpus.

   Each amount is a single value read out of a single document, carrying the
   document and — where the extraction supports it — the sentence that states
   it. Horus exposes no totals on purpose: `amount_aud` mixes discrete
   measures, portfolio roll-ups and balance-sheet stocks across two budget
   years and two jurisdictions, so any sum would look authoritative while
   corresponding to nothing in any document. Do not add these up in the UI.

   MIRROR: these interfaces are duplicated in
   supabase/functions/_shared/ai/horus-knowledge.ts. horus-rag passes budget
   payloads through untransformed, so the two must agree field for field.
   They are not shared from one module because the edge functions run on Deno
   with URL imports and cannot resolve this package. Change one, change both. */

export interface HorusBudgetPeriod {
  period: string;
  measures: number;
}

export interface HorusBudgetDocumentRef {
  id: string;
  title: string;
  category: string | null;
}

export interface HorusBudgetAllocation {
  id: string;
  name: string;
  type: string;
  amountAud: number;
  period: string | null;
  source: "federal" | "state" | "other";
  evidence: string | null;
  /**
   * Whether `evidence` states `amountAud` itself. When false, the quote
   * evidences the funding relationship only and the figure was read elsewhere
   * in the document — render the two cases differently.
   */
  evidenceStatesAmount: boolean;
  funders: string[];
  documents: HorusBudgetDocumentRef[];
}

export interface HorusBudgetAllocations {
  allocations: HorusBudgetAllocation[];
  period: string | null;
  basis: string;
}

export interface HorusBudgetFunder {
  name: string;
  type: string;
  measureCount: number;
  largestMeasure: { name: string; amountAud: number } | null;
}

export interface HorusBudgetFunders {
  funders: HorusBudgetFunder[];
  basis: string;
}

type Op =
  | "search"
  | "careers-search"
  | "occupation"
  | "sector"
  | "pathway"
  | "skill-gap"
  | "traverse"
  | "metadata"
  | "budget-periods"
  | "budget-allocations"
  | "budget-funders";

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
 * `horusSearch` in the `{ success, data, error }` envelope the legacy
 * `callRAGMetadata("semantic-search", …)` helper returned.
 *
 * This exists so call sites migrate with a one-line change instead of having
 * their control flow rewritten — the components downstream parse `data.answer`
 * and `data.sources`, and none of that needs to know the backend moved.
 * Prefer `horusSearch` directly in new code; it throws, which is easier to
 * reason about than a boolean nobody checks.
 */
export async function horusSemanticSearch(
  query: string,
  options?: { topK?: number; systemPrompt?: string },
  filters?: { category?: string; sector?: string; tags?: string[] },
): Promise<{ success: boolean; data?: HorusSearchResult; error?: string }> {
  try {
    const data = await horusSearch(query, filters, options);
    return { success: true, data };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Horus search failed";
    console.error("[horusSemanticSearch]", error);
    return { success: false, error };
  }
}

/** Graph neighbourhood. Replaces graph-query action:'traverse'. */
export function horusTraverse(entity: string, depth = 2): Promise<HorusGraphResult> {
  return callHorus<HorusGraphResult>("traverse", { entity, depth });
}

export function horusMetadata(operation: "stats" | "documents" | "categories" = "stats") {
  return callHorus<Record<string, unknown>>("metadata", { operation });
}

/** Budget periods the corpus carries extracted figures for, with measure counts. */
export function horusBudgetPeriods(): Promise<{ periods: HorusBudgetPeriod[] }> {
  return callHorus<{ periods: HorusBudgetPeriod[] }>("budget-periods", {});
}

/** Measures ranked by the amount stated for them, each with its provenance. */
export function horusBudgetAllocations(budget: {
  period?: string;
  source?: "federal" | "state" | "other";
  types?: Array<"program" | "funding" | "policy">;
  limit?: number;
}): Promise<HorusBudgetAllocations> {
  return callHorus<HorusBudgetAllocations>("budget-allocations", { budget });
}

/** Bodies the graph records as funding measures, ranked by measure count. */
export function horusBudgetFunders(budget: {
  period?: string;
  limit?: number;
}): Promise<HorusBudgetFunders> {
  return callHorus<HorusBudgetFunders>("budget-funders", { budget });
}

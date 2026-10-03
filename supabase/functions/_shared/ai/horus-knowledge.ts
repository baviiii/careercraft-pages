// Horus knowledge client — CareerCraft's door to the corpus and the graph.
//
// Companion to `horus.ts` (which covers generation via /api/infer). This module
// covers *retrieval*: the RAG corpus, the knowledge graph, and the careers
// vertical endpoints built on top of them.
//
// WHY A HAND-ROLLED CLIENT AND NOT @horus/sdk:
// The published SDK is a tRPC client whose type safety comes from importing
// `AppRouter` from the horus-platform repo. CareerCraft is a separate
// repository and these functions run on Deno, so that type is not reachable
// here. tRPC's HTTP contract, however, is stable and trivial — so we speak it
// directly and validate what comes back. No dependency, no build step.
//
// THE WIRE FORMAT (worth knowing, it is unusual at first glance):
//   queries    → GET  {base}/api/trpc/{path}?input={"json":{...}}
//   mutations  → POST {base}/api/trpc/{path}   body: {"json":{...}}
//   response   → {"result":{"data":{"json": <your value> }}}
//   errors     → {"error":{"json":{"message":..,"data":{"code":..,"httpStatus":..}}}}
// The `json` wrapper is superjson, which Horus enables so Date/BigInt/Map
// survive the round trip. Everything we read back is plain JSON, so unwrapping
// the envelope is all that is required.
//
// Env:
//   HORUS_BASE_URL           — origin of the Horus deployment (no path)
//   HORUS_KNOWLEDGE_API_KEY  — read-only key: rag:read, graph:read,
//                              entities:read, documents:read
//   HORUS_API_KEY            — fallback, and what `horus.ts` uses for /api/infer
//
// The two keys are deliberately separable. The inference key needs
// `intelligence:infer` and nothing else; this module needs the read scopes and
// nothing else. Keeping them apart means widening one never widens the other.
//
// "Read" does not mean free. Horus gates rag.query and /api/sdk/chat on
// `rag:read`, and both generate an answer — so this key does spend model
// tokens, through those two doors and no others. coach-chat and horus-rag's
// search op are where that spend comes from.

import { ConfigError, ProviderError, RateLimitError } from "./errors.ts";
import { optEnv, reqEnv } from "../env.ts";

/** Procedures reachable with the consumer key's read-only scopes. */
export type HorusQueryPath =
  | "careers.occupation"
  | "careers.sector"
  | "careers.pathway"
  | "careers.skillGap"
  | "careers.search"
  | "graph.query"
  | "graph.stats"
  | "entities.list"
  | "rag.metadata"
  | "budget.periods"
  | "budget.allocations"
  | "budget.funders";

export type HorusMutationPath = "rag.query" | "rag.chat";

export function horusKnowledgeConfigured(): boolean {
  return Boolean(
    optEnv("HORUS_BASE_URL") &&
      (optEnv("HORUS_KNOWLEDGE_API_KEY") ?? optEnv("HORUS_API_KEY")),
  );
}

/** Exported for coach-chat, which calls a non-tRPC Horus route. */
export function baseUrl(): string {
  return reqEnv("HORUS_BASE_URL").replace(/\/+$/, "");
}

/** Prefer the read-only knowledge key; fall back to the shared tenant key. */
function apiKey(): string {
  return optEnv("HORUS_KNOWLEDGE_API_KEY") ?? reqEnv("HORUS_API_KEY");
}

/** Exported for coach-chat; carries the Vercel bypass header when set. */
export function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey()}`,
    "Content-Type": "application/json",
    "x-horus-sdk": "careercraft-edge/1.0.0",
  };

  // Vercel preview deployments sit behind Deployment Protection, which answers
  // unauthenticated requests with an SSO redirect rather than the API. This
  // header is the supported machine bypass. Unset in production, where the
  // deployment is public and no bypass is needed.
  const bypass = optEnv("HORUS_BYPASS_TOKEN");
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;

  return headers;
}

interface TrpcEnvelope<T> {
  result?: { data?: { json?: T } };
  error?: {
    json?: {
      message?: string;
      data?: { code?: string; httpStatus?: number };
    };
  };
}

/**
 * A tRPC error we deliberately treat as "the corpus has nothing", not a fault.
 *
 * `careers.*` throws NOT_FOUND when a name does not resolve to a graph entity.
 * For a career question that is an ordinary, expected outcome — the user asked
 * about a job the corpus never mentions — so callers get `null` and can say so,
 * rather than an exception that reads like an outage.
 */
export class HorusNotFound extends Error {}

async function unwrap<T>(res: Response, path: string): Promise<T> {
  const text = await res.text().catch(() => "");

  let envelope: TrpcEnvelope<T> | null = null;
  try {
    envelope = JSON.parse(text) as TrpcEnvelope<T>;
  } catch {
    // Non-JSON body means we did not reach the tRPC handler at all — a bad
    // base URL, an auth redirect, or an edge/proxy error page.
    throw new ProviderError(
      `Horus ${path}: non-JSON response (HTTP ${res.status}) ${text.slice(0, 200)}`,
      "horus",
      res.status,
    );
  }

  if (envelope.error) {
    const message = envelope.error.json?.message ?? "Unknown Horus error";
    const code = envelope.error.json?.data?.code;
    const status = envelope.error.json?.data?.httpStatus ?? res.status;

    if (code === "NOT_FOUND") throw new HorusNotFound(message);
    if (status === 429) throw new RateLimitError(`Horus rate limit: ${message}`);
    if (code === "FORBIDDEN" || status === 403) {
      // Almost always a scope problem on the API key, which is a config fault
      // on our side rather than an upstream failure — say so plainly.
      throw new ConfigError(
        `Horus ${path} denied (${message}). Check the key's scopes.`,
      );
    }
    throw new ProviderError(`Horus ${path}: ${message}`, "horus", status);
  }

  if (!res.ok) {
    throw new ProviderError(`Horus ${path}: HTTP ${res.status}`, "horus", res.status);
  }

  const data = envelope.result?.data?.json;
  if (data === undefined) {
    throw new ProviderError(`Horus ${path}: empty result envelope`, "horus");
  }
  return data;
}

/** Read a tRPC query procedure. Input travels in the URL, superjson-wrapped. */
export async function horusQuery<T>(
  path: HorusQueryPath,
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const encoded = encodeURIComponent(JSON.stringify({ json: input }));
  const url = `${baseUrl()}/api/trpc/${path}?input=${encoded}`;

  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers: authHeaders(), signal });
  } catch (err) {
    throw new ProviderError(
      `Horus ${path} unreachable: ${err instanceof Error ? err.message : err}`,
      "horus",
    );
  }
  return unwrap<T>(res, path);
}

/** Invoke a tRPC mutation procedure. Input travels in the body. */
export async function horusMutate<T>(
  path: HorusMutationPath,
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/api/trpc/${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ json: input }),
      signal,
    });
  } catch (err) {
    throw new ProviderError(
      `Horus ${path} unreachable: ${err instanceof Error ? err.message : err}`,
      "horus",
    );
  }
  return unwrap<T>(res, path);
}

/* ── Response shapes ───────────────────────────────────────────────────────
   Declared from the Horus routers rather than imported. Kept deliberately
   loose: extra fields Horus adds later are ignored instead of breaking. */

export interface HorusRagSource {
  id: string;
  documentId: string;
  title: string;
  pageNumber?: number;
  sourceUrl?: string;
  excerpt: string;
  score: number;
}

export interface HorusRagResponse {
  answer: string;
  sources: HorusRagSource[];
  confidence: number;
  metadata: { tokensUsed: number; latencyMs: number; model: string };
}

export interface HorusLinkedEntity {
  name: string;
  type: string;
  evidence?: string;
  confidence: number;
}

export interface HorusSourceDocument {
  id: string;
  title: string;
  category: string | null;
  mentions: number;
}

export interface HorusOccupationProfile {
  occupation: { name: string; aliases: string[]; matchedBy: string };
  mergedVariants: string[];
  skills: HorusLinkedEntity[];
  qualifications: HorusLinkedEntity[];
  employedBy: HorusLinkedEntity[];
  relatedPrograms: HorusLinkedEntity[];
  documents: HorusSourceDocument[];
  coverage: "strong" | "partial" | "thin";
}

export interface HorusSectorProfile {
  sector: { name: string; aliases: string[]; matchedBy: string };
  occupations: HorusLinkedEntity[];
  /** Money flowing into the sector, with the amount parsed out where stated. */
  funding: Array<HorusLinkedEntity & { amountAud?: number; period?: string }>;
  programs: HorusLinkedEntity[];
  documents: HorusSourceDocument[];
  coverage: "strong" | "partial" | "thin";
}

export interface HorusPathStep {
  from: string;
  fromType: string;
  relation: string;
  to: string;
  toType: string;
  evidence?: string;
}

export interface HorusPathwayResult {
  from: { name: string; type: string };
  to: { name: string; type: string };
  steps: HorusPathStep[];
  found: boolean;
  hops: number;
  note?: string;
}

export interface HorusSkillGapResult {
  target: { name: string; type: string };
  /** Required by the target and already held. */
  have: string[];
  /** Required by the target and missing — the actual gap. */
  missing: Array<{ name: string; evidence?: string }>;
  /** Qualifications the corpus says lead to this occupation. */
  qualifications: Array<{ name: string; evidence?: string }>;
  coverage: "strong" | "partial" | "thin";
}

export interface HorusCareersSearch {
  query: string;
  results: Array<{
    title: string;
    excerpt: string;
    sourceUrl: string;
    score: number;
  }>;
  searchedCategories: string[];
}

export interface HorusGraphNode {
  id: string;
  name: string;
  type: string;
  /** How many corpus documents mention this entity. */
  docCount?: number;
}

export interface HorusGraphEdge {
  id: string;
  /** Entity ids, not names — resolve against `nodes` to render them. */
  fromEntityId: string;
  toEntityId: string;
  type: string;
  confidence: number;
  /** Verbatim sentence the relationship was extracted from. */
  evidence?: string;
}

export interface HorusGraphQuery {
  entity: { id: string; name: string; type: string };
  nodes: HorusGraphNode[];
  edges: HorusGraphEdge[];
}

/* ── Budget ────────────────────────────────────────────────────────────────
   Extracted budget figures from the knowledge graph. Every amount is ONE
   value read out of ONE document — Horus deliberately exposes no summed
   totals, because `amount_aud` mixes discrete measures, portfolio roll-ups
   and balance-sheet stocks across two budget years and two jurisdictions.
   Adding them would produce an authoritative-looking number matching nothing
   in any document. Do not reintroduce that by summing on this side.

   MIRROR: these interfaces are duplicated in
   packages/careercraft-web/src/lib/horusKnowledge.ts. horus-rag passes budget
   payloads through untransformed, so the two must agree field for field.
   They are not shared from one module because this file runs on Deno with URL
   imports and cannot resolve the web package. Change one, change both. */

export interface HorusBudgetPeriod {
  /** As written in the documents: "2026-27", "2025-26 to 2029-30". */
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
  /** Which government published the figure. Never let a federal one read as state. */
  source: "federal" | "state" | "other";
  /** Verbatim sentence behind the `funds` edge into this measure. */
  evidence: string | null;
  /**
   * Whether `evidence` states `amountAud` itself. When false the quote proves
   * the funding relationship only, and the figure came from elsewhere in the
   * document — the UI must say so rather than implying the quote is its source.
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
  /** Distinct funded measures in the graph — a count, never a total. */
  measureCount: number;
  largestMeasure: { name: string; amountAud: number } | null;
}

export interface HorusBudgetFunders {
  funders: HorusBudgetFunder[];
  basis: string;
}

/* ── Embeddings ──────────────────────────────────────────────────────────────
   `POST /api/embed` on the same deployment: a batch of short strings in,
   vectors out. It lives here rather than in horus.ts because it shares this
   file's plumbing — base URL, tenant key, the Vercel protection bypass — and
   shares none of horus.ts's, which is built around generation: tiers, token
   ceilings, system prompts and a mandatory meter.

   Used to rank things by meaning rather than by shared words. Exact matching
   cannot tell that "Enrolled Nurse" and "Patient Care Assistant" describe the
   same job market, and no synonym list ever closes over job titles or the ways
   an advert can phrase a skill.

   Horus meters these against the tenant on its own side (UsageMeter.EMBEDDINGS),
   so this deliberately does not touch CareerCraft's token ledger. That ledger
   exists to enforce plan quotas on generation, which is where the money is; an
   embedding call is a fraction of a cent and must never be the reason a search
   is refused.

   Not batched in chunks on purpose: one request covers the whole page, because
   this runs inside a user's search and sequential sub-batches would add their
   latencies together. Horus caps the batch at 100 inputs and truncates each to
   ~2,000 characters.
   ───────────────────────────────────────────────────────────────────────── */

/** Horus's own ceiling; sending more is a 400. */
export const HORUS_EMBED_MAX_INPUTS = 100;

export interface HorusEmbedOptions {
  /**
   * `small` (default) is text-embedding-3-small on its own deployment. `large`
   * is the model the knowledge index is built on — only use it if comparing
   * against vectors from that index.
   */
  model?: "small" | "large";
  /**
   * Matryoshka truncation. At native width one profile plus fifty jobs is
   * megabytes of JSON; 512 cuts that by roughly two thirds and barely moves
   * the ordering. Omit to get the model's full width.
   */
  dimensions?: number;
  /** Abort budget for the whole call. Horus itself gives up at 8s. */
  timeoutMs?: number;
}

export interface HorusEmbedResult {
  /** One vector per input, in input order. */
  vectors: number[][];
  /** Deployment that produced them — vectors from different models are not comparable. */
  model: string;
  dimensions: number;
  tokens: number;
}

export async function horusEmbed(
  input: string[],
  options: HorusEmbedOptions = {},
): Promise<HorusEmbedResult> {
  if (input.length === 0) {
    throw new ProviderError("horusEmbed: at least one input required", "horus");
  }
  if (input.length > HORUS_EMBED_MAX_INPUTS) {
    throw new ProviderError(
      `horusEmbed: at most ${HORUS_EMBED_MAX_INPUTS} inputs, got ${input.length}`,
      "horus",
    );
  }

  /* Caller-side deadline. Every caller falls back to ranking without
     similarity, so a fast failure is worth more than a slow success — a search
     page that hangs is worse than one ranked slightly less well. */
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/api/embed`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        input,
        model: options.model ?? "small",
        ...(options.dimensions ? { dimensions: options.dimensions } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new ProviderError(
      aborted ? "Horus embed timed out" : `Horus embed failed: ${err instanceof Error ? err.message : err}`,
      "horus",
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new ProviderError(
      `Horus embed: HTTP ${res.status} ${text.slice(0, 200)}`,
      "horus",
      res.status,
    );
  }

  let body: Partial<HorusEmbedResult> | null = null;
  try {
    body = JSON.parse(text) as Partial<HorusEmbedResult>;
  } catch {
    /* A non-JSON body means we never reached the handler — a wrong base URL or
       an auth/SSO redirect page, which is a config problem and not an outage. */
    throw new ProviderError(
      `Horus embed: non-JSON response (HTTP ${res.status}) ${text.slice(0, 200)}`,
      "horus",
      res.status,
    );
  }

  const vectors = body?.vectors;
  if (!Array.isArray(vectors) || vectors.length !== input.length) {
    /* Order and count are the contract — callers index vectors positionally
       against their own items, so a short or reordered response would silently
       attach the wrong score to the wrong job. */
    throw new ProviderError(
      `Horus embed: expected ${input.length} vectors, got ${Array.isArray(vectors) ? vectors.length : "none"}`,
      "horus",
    );
  }

  return {
    vectors,
    model: body?.model ?? "unknown",
    dimensions: body?.dimensions ?? vectors[0]?.length ?? 0,
    tokens: body?.tokens ?? 0,
  };
}

/**
 * Cosine similarity, -1..1 — in practice 0..1 for text embeddings.
 *
 * Here rather than in a caller because every caller needs it and an
 * accidentally different implementation would produce scores that look
 * comparable across surfaces and are not.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

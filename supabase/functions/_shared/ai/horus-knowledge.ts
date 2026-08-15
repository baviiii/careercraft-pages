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
// nothing else. Keeping them apart means widening one never widens the other,
// and a key minted for retrieval can never spend tokens.

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
  | "rag.metadata";

export type HorusMutationPath = "rag.query" | "rag.chat";

export function horusKnowledgeConfigured(): boolean {
  return Boolean(
    optEnv("HORUS_BASE_URL") &&
      (optEnv("HORUS_KNOWLEDGE_API_KEY") ?? optEnv("HORUS_API_KEY")),
  );
}

function baseUrl(): string {
  return reqEnv("HORUS_BASE_URL").replace(/\/+$/, "");
}

/** Prefer the read-only knowledge key; fall back to the shared tenant key. */
function apiKey(): string {
  return optEnv("HORUS_KNOWLEDGE_API_KEY") ?? reqEnv("HORUS_API_KEY");
}

function authHeaders(): HeadersInit {
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

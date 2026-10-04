// horus-rag — CareerCraft's retrieval plane, served by Horus.
//
// Replaces the legacy Azure Functions (`rag-metadata`, `graph-query`,
// `intersection-reasoning`) and the Supabase `rag-query` function. Those read
// the old `sa-gov-documents` index and a Cosmos Gremlin graph, both of which
// belong to the CareerCraft infrastructure being archived. Horus now owns the
// corpus (Content Understanding pipeline, ~84 documents) and the knowledge
// graph (Postgres, ~7.5k entities).
//
// ── WHY THIS FUNCTION EXISTS AT ALL ───────────────────────────────────────
// The browser must never hold the Horus API key. Vite inlines every `VITE_*`
// variable into the client bundle at build time, so anything the frontend can
// read, so can anyone with devtools. The legacy code shipped
// `VITE_AZURE_FUNCTION_KEY` to the browser; repeating that with a Horus tenant
// key would hand out our whole corpus and the ability to spend our tokens.
//
// So the key lives here, server-side, and the browser authenticates to *us*
// with the user's Supabase JWT. Same shape as the existing `infer` function.
//
// ── AND WHY IT ADAPTS SHAPES ──────────────────────────────────────────────
// Horus returns its own response shapes. The React app expects the shapes the
// old Azure Functions returned (`{ answer, sources: [{ id, content, title,
// documentId, pageNumber, url, score, category }] }`). Translating here — in
// one file, on the server — means `useRAGMetadata` and every component below
// it keep working untouched. (The Career Coach chat no longer comes through
// here: it talks to the Horus agent via the coach-chat function.)
// Putting the adapter in the frontend instead would smear it across a dozen
// call sites and make the next backend change a rewrite.

import { z } from "npm:zod@3";

import { handler, json } from "../_shared/http/responses.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { enforcePlanQuota } from "../_shared/db/plan-quota.ts";
import {
  HorusNotFound,
  horusMutate,
  horusQuery,
  type HorusBudgetAllocations,
  type HorusBudgetFunders,
  type HorusBudgetPeriod,
  type HorusCareersSearch,
  type HorusGraphQuery,
  type HorusOccupationProfile,
  type HorusPathwayResult,
  type HorusRagResponse,
  type HorusSectorProfile,
  type HorusSkillGapResult,
} from "../_shared/ai/horus-knowledge.ts";

/* ── Shapes the React app already speaks ───────────────────────────────── */

interface LegacySource {
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

interface LegacySearchResult {
  answer: string;
  sources: LegacySource[];
  suggestedQuestions?: string[];
  confidence?: number;
  /** Present so callers can tell which engine served them while both exist. */
  engine: "horus";
}

/**
 * Content Understanding leaves layout artefacts in chunk text — HTML comments
 * for page furniture and markdown image placeholders for figures. They are
 * useful to the extractor and noise to a reader, so strip them before the text
 * reaches a citation card.
 */
function cleanExcerpt(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Horus scores are hybrid RRF values (~0.01–0.05), not the 0–50 BM25 range the
 * old UI normalised from. Rescaling here keeps relevance bars meaningful
 * instead of every source rendering as 1%.
 */
function relevancePercent(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  // RRF tops out near 1/60 per matched arm; ~0.033 is a strong two-arm hit.
  return Math.max(1, Math.min(99, Math.round((score / 0.04) * 100)));
}

function toLegacySources(sources: HorusRagResponse["sources"]): LegacySource[] {
  return sources.map((s) => ({
    id: s.id,
    documentId: s.documentId,
    title: s.title,
    content: cleanExcerpt(s.excerpt),
    ...(s.pageNumber !== undefined && { pageNumber: s.pageNumber }),
    ...(s.sourceUrl && { url: s.sourceUrl }),
    score: relevancePercent(s.score),
  }));
}

/* ── Operations ────────────────────────────────────────────────────────── */

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

/** Entity types Horus accepts for a budget allocation read. */
const BUDGET_TYPES = ["program", "funding", "policy"] as const;

interface RequestBody {
  op?: Op;
  query?: string;
  name?: string;
  from?: string;
  to?: string;
  target?: string;
  have?: string[];
  entity?: string;
  depth?: number;
  operation?: "stats" | "documents" | "categories";
  filters?: { category?: string; sector?: string; tags?: string[] };
  options?: { topK?: number; systemPrompt?: string };
  budget?: {
    period?: string;
    source?: "federal" | "state" | "other";
    types?: Array<"program" | "funding" | "policy">;
    limit?: number;
  };
}

/**
 * Runtime counterpart to RequestBody.
 *
 * The two must stay in step; the interface alone is erased at compile time and
 * checks nothing about what actually arrives. Bounds are deliberate — `query`
 * and `systemPrompt` are forwarded into a model call, and `topK` into a
 * retrieval fan-out, so all three decide how much a request costs.
 */
const RequestSchema = z.object({
  op: z.enum([
    "search",
    "careers-search",
    "occupation",
    "sector",
    "pathway",
    "skill-gap",
    "traverse",
    "metadata",
    "budget-periods",
    "budget-allocations",
    "budget-funders",
  ]).optional(),
  query: z.string().max(8_000).optional(),
  name: z.string().max(300).optional(),
  from: z.string().max(300).optional(),
  to: z.string().max(300).optional(),
  target: z.string().max(300).optional(),
  have: z.array(z.string().max(200)).max(200).optional(),
  entity: z.string().max(300).optional(),
  depth: z.number().int().min(1).max(5).optional(),
  operation: z.enum(["stats", "documents", "categories"]).optional(),
  filters: z.object({
    category: z.string().max(120).optional(),
    sector: z.string().max(120).optional(),
    tags: z.array(z.string().max(120)).max(50).optional(),
  }).optional(),
  options: z.object({
    /*
     * Clamped, not rejected.
     *
     * This was `.max(50)`, which failed the entire request when a caller
     * asked for more. Every consumer downstream already clamps — runSearch
     * pins maxSources to 50, runCareersSearch pins limit to 20 — so the
     * strict bound bought no safety and cost two whole tabs: the
     * Intelligence page requested topK 120 for funding and 60 for careers
     * and got a 400 on every single load, for months, while the tabs that
     * happened to ask for 40 worked fine. The failure surfaced to the user
     * as empty panels rather than an error, which is why it survived.
     *
     * An over-large topK is a caller being optimistic, not hostile. Give
     * them the maximum and carry on. The upper bound here only exists to
     * reject obvious nonsense before it reaches the clamps.
     */
    topK: z.number().int().min(1).max(10_000).optional()
      .transform((v) => (v === undefined ? undefined : Math.min(v, 50))),
    systemPrompt: z.string().max(8_000).optional(),
  }).optional(),
  budget: z.object({
    period: z.string().max(40).optional(),
    source: z.enum(["federal", "state", "other"]).optional(),
    types: z.array(z.enum(BUDGET_TYPES)).min(1).max(3).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }).optional(),
});

/** Categories Horus's careers endpoints accept; anything else is dropped. */
const CAREERS_CATEGORIES = new Set([
  "jobs-skills",
  "career-guidance",
  "education",
  "industry",
  "workforce",
]);

async function runSearch(body: RequestBody): Promise<LegacySearchResult> {
  const query = (body.query ?? "").trim();
  if (!query) throw new Error("query is required for op=search");

  const result = await horusMutate<HorusRagResponse>("rag.query", {
    query,
    ...(body.filters?.category && {
      filters: { category: body.filters.category },
    }),
    options: {
      // The UI asks for topK 20–30 for its source lists; Horus caps at 50.
      // Below ~12 the retrieved set concentrates on topically-similar
      // documents and misses the one stating the fact, so the floor matters
      // more than the ceiling here.
      maxSources: Math.min(Math.max(body.options?.topK ?? 16, 12), 50),
      includeChunks: true,
      ...(body.options?.systemPrompt && { systemPrompt: body.options.systemPrompt }),
    },
  });

  return {
    answer: result.answer,
    sources: toLegacySources(result.sources),
    confidence: result.confidence,
    engine: "horus",
  };
}

async function runCareersSearch(body: RequestBody): Promise<LegacySearchResult> {
  const query = (body.query ?? "").trim();
  if (!query) throw new Error("query is required for op=careers-search");

  const category = body.filters?.category;
  const result = await horusQuery<HorusCareersSearch>("careers.search", {
    query,
    ...(category && CAREERS_CATEGORIES.has(category) && { category }),
    limit: Math.min(Math.max(body.options?.topK ?? 8, 1), 20),
  });

  return {
    // Retrieval only — this op feeds context to a caller that generates its
    // own prose, so returning an invented answer here would be a lie.
    answer: "",
    sources: result.results.map((r, i) => ({
      id: `${r.sourceUrl}:${i}`,
      documentId: r.sourceUrl,
      title: r.title,
      content: cleanExcerpt(r.excerpt),
      url: r.sourceUrl,
      score: relevancePercent(r.score),
    })),
    engine: "horus",
  };
}

/** Graph neighbourhood — the replacement for action:'traverse'. */
async function runTraverse(body: RequestBody) {
  const entity = (body.entity ?? body.query ?? "").trim();
  if (entity.length < 1) return { data: [] };

  const graph = await horusQuery<HorusGraphQuery>("graph.query", {
    entity,
    depth: Math.min(Math.max(body.depth ?? 2, 1), 3),
  }).catch((err) => {
    if (err instanceof HorusNotFound) return null;
    throw err;
  });
  if (!graph) return { data: [] };

  const nameById = new Map(graph.nodes.map((n) => [n.id, n.name]));

  return {
    data: graph.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      docCount: n.docCount ?? 0,
    })),
    // Edges carry the evidence sentences, which is what makes a graph answer
    // auditable rather than a claim.
    //
    // Horus returns endpoints as entity ids; resolve them to names here so the
    // consumer never has to hold the node table to read a relationship.
    edges: graph.edges.map((e) => ({
      from: nameById.get(e.fromEntityId) ?? e.fromEntityId,
      to: nameById.get(e.toEntityId) ?? e.toEntityId,
      type: e.type,
      confidence: e.confidence,
      evidence: e.evidence,
    })),
    center: graph.entity,
  };
}

/* ── Handler ───────────────────────────────────────────────────────────── */

Deno.serve(
  handler(
    async (req) => {
      // The user's Supabase JWT gates access; the Horus key never leaves this
      // process. An unauthenticated caller gets nothing.
      const { userId } = await requireUser(req);

      // `as RequestBody` was a promise to the compiler, not a check — the
      // fields arrived unexamined. That matters here because `query` reaches a
      // model: an oversized or wrong-typed value became a billed call that
      // failed downstream instead of a cheap 400.
      const rawBody = await req.json().catch(() => null);
      const parsedBody = RequestSchema.safeParse(rawBody);
      if (!parsedBody.success) {
        return json(
          { error: "Invalid request body", details: parsedBody.error.flatten() },
          400,
        );
      }
      const body: RequestBody = parsedBody.data;

      const op: Op = body.op ?? "search";

      // This function had no limit of any kind, which made it the largest open
      // spend hole in the codebase: rag.query and rag.chat are generation-backed
      // on the Horus side, so a "search" here bills for a model call.
      //
      // The generating ops carry a tighter allowance than the graph lookups,
      // which are ordinary reads.
      const generative = op === "search" || op === "careers-search";
      await enforcePlanQuota({
        userId,
        resource: generative ? "horus-rag-search" : "horus-rag",
        resourceLabel: generative ? "career intelligence search" : "career graph lookups",
      });

      try {
        switch (op) {
          case "search":
            return json(await runSearch(body));

          case "careers-search":
            return json(await runCareersSearch(body));

          case "occupation": {
            const name = (body.name ?? body.query ?? "").trim();
            const profile = await horusQuery<HorusOccupationProfile>(
              "careers.occupation",
              { name },
            );
            return json(profile);
          }

          case "sector": {
            const name = (body.name ?? body.query ?? "").trim();
            const profile = await horusQuery<HorusSectorProfile>("careers.sector", {
              name,
            });
            return json(profile);
          }

          case "pathway": {
            const result = await horusQuery<HorusPathwayResult>("careers.pathway", {
              from: (body.from ?? "").trim(),
              to: (body.to ?? "").trim(),
            });
            return json(result);
          }

          case "skill-gap": {
            const result = await horusQuery<HorusSkillGapResult>("careers.skillGap", {
              target: (body.target ?? body.name ?? "").trim(),
              have: (body.have ?? []).slice(0, 50),
            });
            return json(result);
          }

          case "traverse":
            return json(await runTraverse(body));

          case "metadata": {
            const result = await horusQuery("rag.metadata", {
              operation: body.operation ?? "stats",
            });
            return json(result);
          }

          // Budget reads pass straight through. Unlike the retrieval ops above
          // there is no shape to adapt: these procedures were written for this
          // UI, and every field — the evidence quote, the corroboration flag,
          // the source documents — exists so the client can show where a figure
          // came from. Reshaping here could only lose that.
          case "budget-periods": {
            const result = await horusQuery<{ periods: HorusBudgetPeriod[] }>(
              "budget.periods",
              {},
            );
            return json(result);
          }

          case "budget-allocations": {
            const result = await horusQuery<HorusBudgetAllocations>(
              "budget.allocations",
              {
                ...(body.budget?.period && { period: body.budget.period }),
                ...(body.budget?.source && { source: body.budget.source }),
                ...(body.budget?.types && { types: body.budget.types }),
                limit: Math.min(Math.max(body.budget?.limit ?? 25, 1), 100),
              },
            );
            return json(result);
          }

          case "budget-funders": {
            const result = await horusQuery<HorusBudgetFunders>("budget.funders", {
              ...(body.budget?.period && { period: body.budget.period }),
              limit: Math.min(Math.max(body.budget?.limit ?? 12, 1), 50),
            });
            return json(result);
          }

          default:
            return json({ error: `Unknown op "${op}"` }, 400);
        }
      } catch (err) {
        // A name the corpus does not cover is an answer, not an error. Callers
        // render "nothing found" from this rather than an error state.
        if (err instanceof HorusNotFound) {
          return json({ notFound: true, message: err.message, data: [] }, 200);
        }
        throw err;
      }
    },
    { name: "horus-rag" },
  ),
);

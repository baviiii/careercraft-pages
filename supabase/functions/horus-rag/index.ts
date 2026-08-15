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
// one file, on the server — means `useRAGMetadata`, `useEnterpriseRAG`,
// `useAgenticRAG` and every component below them keep working untouched.
// Putting the adapter in the frontend instead would smear it across a dozen
// call sites and make the next backend change a rewrite.

import { handler, json } from "../_shared/http/responses.ts";
import { requireUser } from "../_shared/http/auth.ts";
import {
  HorusNotFound,
  horusMutate,
  horusQuery,
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
  | "entity-lookup"
  | "metadata";

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
}

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

/**
 * Entity lookup for the agentic planner. The old `graph-query` action:'search'
 * returned bare `{ name, type }` rows; the careers endpoints return a whole
 * profile, so flatten the profile's edges back into that row shape.
 */
async function runEntityLookup(body: RequestBody) {
  const name = (body.entity ?? body.query ?? body.name ?? "").trim();
  if (name.length < 2) return { data: [] };

  // An occupation is the likelier intent for a careers product, so try it
  // first and fall back to sector rather than asking the caller to know which.
  const occupation = await horusQuery<HorusOccupationProfile>(
    "careers.occupation",
    { name },
  ).catch((err) => {
    if (err instanceof HorusNotFound) return null;
    throw err;
  });

  if (occupation) {
    return {
      data: [
        {
          name: occupation.occupation.name,
          type: "occupation",
          matchedBy: occupation.occupation.matchedBy,
          coverage: occupation.coverage,
          description:
            occupation.skills
              .slice(0, 5)
              .map((s) => s.name)
              .join(", ") || undefined,
        },
        ...occupation.skills.map((s) => ({ ...s, relation: "requires" })),
        ...occupation.qualifications.map((q) => ({ ...q, relation: "leads_to" })),
        ...occupation.employedBy.map((e) => ({ ...e, relation: "employs" })),
      ],
      documents: occupation.documents,
    };
  }

  const sector = await horusQuery<HorusSectorProfile>("careers.sector", { name }).catch(
    (err) => {
      if (err instanceof HorusNotFound) return null;
      throw err;
    },
  );
  if (!sector) return { data: [] };

  return {
    data: [
      {
        name: sector.sector.name,
        type: "sector",
        matchedBy: sector.sector.matchedBy,
        coverage: sector.coverage,
      },
      ...sector.occupations.map((o) => ({ ...o, relation: "employs" })),
      ...sector.programs.map((p) => ({ ...p, relation: "supports" })),
      ...sector.funding.map((f) => ({ ...f, relation: "funds" })),
    ],
    documents: sector.documents,
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
    // auditable rather than a claim. The planner injects these as context.
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
      await requireUser(req);

      let body: RequestBody;
      try {
        body = (await req.json()) as RequestBody;
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      const op: Op = body.op ?? "search";

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

          case "entity-lookup":
            return json(await runEntityLookup(body));

          case "traverse":
            return json(await runTraverse(body));

          case "metadata": {
            const result = await horusQuery("rag.metadata", {
              operation: body.operation ?? "stats",
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

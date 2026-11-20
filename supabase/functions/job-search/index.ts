// job-search — live job search, and saving one to the tracker.
//
// Replaces job-ingest-adzuna, which kept a jobs_catalog table as a shared
// cache. That design needs traffic to work: each person's search warms the
// catalog for the next. With no users it never warmed — the catalog ended up
// holding 125 rows from three dev-testing pulls months apart, and `list`
// served them with no freshness filter, so a job from May still appeared in
// September. A cache that nobody fills is just a way to show stale jobs.
//
// So searches now go straight to the board and nothing is stored. Every result
// is live by construction, which removes the whole class of "is this job still
// open?" bugs rather than filtering around them. The trade is one API call per
// search, which is the right way round at this size; if traffic ever makes it
// wrong, a short TTL on (query, location) is the fix, and that would be a good
// problem to have.
//
// The Adzuna credentials stay here. The browser never sees them — it asks this
// function, and this function asks the board.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "npm:zod@3";

import { ProviderError, ValidationError } from "../_shared/ai/errors.ts";
import { enforcePlanQuota, refundPlanQuota } from "../_shared/db/plan-quota.ts";
import { adminClient } from "../_shared/db/supabase.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";
import { optEnv } from "../_shared/env.ts";
import { attachSimilarity } from "../_shared/ai/similarity.ts";
import { categoryName } from "./terms.ts";
import { type Board, type BoardPage, type BoardSearch, planSearch } from "./search.ts";
import { dedupeJobs, detectRemote, isSameJob, normalizeJobType, statesPay, stripHtml } from "./normalize.ts";

const RESOURCE = "job-search";
/** The last page a search may ask for. */
const MAX_PAGE = 20;
/** A board category's tag, as the board writes them ("it-jobs"). Only ever narrows a search. */
const CATEGORY_TAG = /^[a-z0-9-]{1,80}$/;

/** The shape the UI renders. Mirrors features/job-tracker/types.ts. */
const JobSchema = z.object({
  id: z.string().max(200),
  source: z.string().max(40),
  source_job_id: z.string().max(200).nullable().optional(),
  canonical_url: z.string().max(2000).nullable().optional(),
  title: z.string().max(500),
  company: z.string().max(300),
  location: z.string().max(300).nullable().optional(),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  job_type: z.string().max(60).nullable().optional(),
  is_remote: z.boolean().optional(),
  /*
   * Both of these were being thrown away.
   *
   * `category` is the board's own classification ("Healthcare & Nursing
   * Jobs"). The match scorer was testing the user's industry against the job
   * TITLE, which almost never contains it, so that signal was nearly dead.
   *
   * `salary_is_predicted` matters more: Adzuna predicts a range for adverts
   * that do not quote one. Dropping the flag meant a prediction was stored and
   * displayed as though the employer had stated it, and scored against the
   * user's real salary floor.
   */
  category: z.string().max(200).nullable().optional(),
  salary_is_predicted: z.boolean().optional(),
  /*
   * One field, because there is only ever one string.
   *
   * This used to be `description_snippet` plus a `full_description` capped at
   * 40,000 characters, and `toJob` filled them from the same value. Adzuna's
   * search API does not return the advert body — their docs say, twice,
   * "we currently only provide a snipped of the job description in the
   * response", and the full text is only behind `redirect_url`, which points
   * back through Adzuna rather than at the employer.
   *
   * So `full_description` was never full: both fields held the same ~200
   * characters. Naming it that way is how it ended up being written into
   * `job_applications.job_description` and treated as analysable input.
   */
  description_snippet: z.string().max(4_000).nullable().optional(),
  posted_at: z.string().max(60).nullable().optional(),
});

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("search"),
    query: z.string().max(300).optional(),
    location: z.string().max(200).optional(),
    // Extra terms from the caller's profile. The board is keyword-matched, so
    // one job title finds one phrasing of a job — "ICU Nurse" misses "Critical
    // Care Registered Nurse". Each term is a separate query, merged and deduped.
    terms: z.array(z.string().max(120)).max(5).optional(),
    limit: z.number().int().min(1).max(50).optional(),
    page: z.number().int().min(1).max(MAX_PAGE).optional(),
    /**
     * Carry on with similar ads when the matches run out (see search.ts).
     * Browse Jobs asks; the home feed and the tracker want matches only.
     */
    widen: z.boolean().optional(),
    /** Carrying on with the similar ads: an earlier response's `next.wider`. */
    wider: z
      .object({
        category: z.string().regex(CATEGORY_TAG),
        words: z.string().max(300),
        page: z.number().int().min(1).max(MAX_PAGE),
      })
      .optional(),
    /** Where the matches on earlier pages are filed: an earlier response's `next.field`. */
    field: z.object({ tag: z.string().regex(CATEGORY_TAG), label: z.string().max(100) }).optional(),
    /** Search what was typed, never a correction of it ("Search for … instead"). */
    exact: z.boolean().optional(),
    /**
     * The caller's profile as a short sentence, for ranking by meaning. Sent
     * by the client, which already has it loaded — see the note in job-news.
     * Only ever an embedding input, never prompt text.
     */
    profileText: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("save_to_tracker"),
    job: JobSchema,
    notes: z.string().max(4000).nullable().optional(),
  }),
]);

type Job = z.infer<typeof JobSchema>;

/**
 * Pay as saved on the application. Some ads put an hourly or daily rate in
 * the salary fields; "$35 - $40" must not become "$0k - $0k". Only an hourly
 * rate is obvious from the number, so other small figures keep no unit.
 * Adzuna's estimates stay marked, because a saved figure gets remembered as
 * the employer's.
 */
function payRange(job: Job): string | null {
  const lo = job.salary_min || job.salary_max;
  const hi = job.salary_max || job.salary_min;
  if (!lo || !hi) return null;
  const est = job.salary_is_predicted ? " (est.)" : "";
  if (hi < 20_000) {
    const $ = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
    const amount = lo === hi ? $(lo) : `${$(lo)} - ${$(hi)}`;
    return `${amount}${hi <= 200 ? " an hour" : ""}${est}`;
  }
  const k = (n: number) => `$${Math.round(n / 1000)}k`;
  return `${lo === hi ? k(lo) : `${k(lo)} - ${k(hi)}`}${est}`;
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Adzuna's payload → the shape the UI renders.
 *
 * `id` is a content hash rather than a database key: nothing is stored, but the
 * UI still needs a stable identity per job for list keys and for saving. The
 * same posting hashes the same way across searches, which also makes it the
 * dedupe key when several terms return overlapping results.
 */
async function toJob(raw: Record<string, unknown>): Promise<Job> {
  const canonicalUrl = (raw.redirect_url as string) || null;
  const title = (raw.title as string) || "Untitled role";
  const company = (raw.company as { display_name?: string })?.display_name || "Unknown company";
  const location = (raw.location as { display_name?: string })?.display_name || null;
  /* Adzuna truncates this; see the schema note above. Named for what it is. */
  const snippet = stripHtml((raw.description as string) || "");

  return {
    id: await sha256(`${canonicalUrl || ""}|${title}|${company}`.toLowerCase()),
    source: "adzuna",
    source_job_id: raw.id ? String(raw.id) : null,
    canonical_url: canonicalUrl,
    title,
    company,
    location,
    salary_min: Number.isFinite(raw.salary_min) ? (raw.salary_min as number) : null,
    salary_max: Number.isFinite(raw.salary_max) ? (raw.salary_max as number) : null,
    currency: "AUD",
    job_type: normalizeJobType(raw.contract_time as string),
    category: (raw.category as { label?: string })?.label || null,
    /* Adzuna sends this as the string "0" or "1", not a boolean. */
    salary_is_predicted: String(raw.salary_is_predicted ?? "") === "1",
    is_remote: detectRemote(title, snippet),
    description_snippet: snippet || null,
    posted_at: (raw.created as string) || null,
  };
}

function adzunaUrl(path: string): URL {
  const appId = optEnv("ADZUNA_APP_ID");
  const appKey = optEnv("ADZUNA_APP_KEY");
  if (!appId || !appKey) {
    throw new ValidationError("Adzuna credentials are not configured");
  }
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/au/${path}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  return url;
}

async function searchAdzuna(
  search: BoardSearch,
  location: string,
  perPage: number,
  page: number,
): Promise<BoardPage<Job>> {
  const url = adzunaUrl(`search/${page}`);
  url.searchParams.set("results_per_page", String(perPage));
  if (search.what) url.searchParams.set("what", search.what);
  // Ads with any of these words rather than all of them.
  if (search.anyOf) url.searchParams.set("what_or", search.anyOf);
  if (search.category) url.searchParams.set("category", search.category);
  if (location) url.searchParams.set("where", location);

  // Throws rather than returning []. One term failing still must not empty the
  // whole result set — that is handled by the caller, which settles each term
  // independently. But the distinction has to survive this far: a board that
  // refused us and a board that genuinely has no matches are different answers,
  // and collapsing them here is what made an exhausted API allowance look like
  // an empty job market.
  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    // Never reached the board. The runtime's own message names the URL, and
    // the URL carries the API key, so it goes no further than here: not into
    // the logs, nor back to the page.
    throw new ProviderError("Could not reach Adzuna", "adzuna");
  }
  if (!res.ok) {
    throw new ProviderError(
      `Adzuna returned ${res.status}`,
      "adzuna",
      res.status,
    );
  }

  const body = (await res.json()) as { results?: Record<string, unknown>[] };
  const results = body.results || [];
  return {
    jobs: await Promise.all(results.map(toJob)),
    categories: results.flatMap((r) => {
      const c = r.category as { tag?: unknown; label?: unknown } | undefined;
      return typeof c?.tag === "string" && typeof c?.label === "string" ? [{ tag: c.tag, label: c.label }] : [];
    }),
  };
}

serve(handler(async (req) => {
  const { userId } = await requireUser(req);

  const raw = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("Invalid request body", parsed.error.flatten());
  }
  const body = parsed.data;

  // ── Search ───────────────────────────────────────────────────────────────
  if (body.action === "search") {
    await enforcePlanQuota({
      userId,
      resource: RESOURCE,
      resourceLabel: "job search",
    });

    const location = body.location?.trim() || "";
    const perPage = body.limit ?? 30;
    const page = body.page ?? 1;

    // Which board searches to make and how to carry on from them: see
    // search.ts. Settled, not all: one term hitting a board error should
    // still let the other terms return their jobs. What must not happen is
    // the whole search failing silently and rendering as "no roles found".
    const board: Board<Job> = { search: (s, n, p) => searchAdzuna(s, location, n, p) };
    const plan = await planSearch(board, {
      query: body.query?.trim() ?? "",
      terms: body.terms ?? [],
      perPage,
      page,
      maxPage: MAX_PAGE,
      widen: Boolean(body.widen),
      wider: body.wider,
      field: body.field,
      exact: body.exact,
    });
    const { wider } = plan;
    const searches = wider ? [...plan.matches, wider] : plan.matches;

    const failures = searches.filter((r) => r.status === "rejected");
    for (const f of failures as PromiseRejectedResult[]) {
      console.warn(`[job-search] search failed: ${f.reason?.message ?? f.reason}`);
    }

    // Every search failed, so we have nothing to say about the job market —
    // only about the board. Refund the unit first: charging someone an
    // allowance for a search that never reached Adzuna is the wrong way round.
    if (failures.length === searches.length) {
      await refundPlanQuota(userId, RESOURCE);
      const first = (failures[0] as PromiseRejectedResult).reason;
      throw first instanceof ProviderError
        ? first
        : new ProviderError("Could not reach the job board", "adzuna");
    }

    // Merge, keeping the first appearance of each job. Terms are ordered by how
    // well they describe the person, so an earlier term's match ranks higher.
    const unique = (rs: typeof searches) => {
      const seen = new Set<string>();
      return rs.flatMap((r) => (r.status === "fulfilled" ? r.value.jobs : [])).filter((j) => {
        if (seen.has(j.id)) return false;
        seen.add(j.id);
        return true;
      });
    };
    // The same ad often arrives more than once, under a second id: an agency's
    // copy, or the board's own repeat (see dedupeJobs).
    const matches = dedupeJobs(unique(plan.matches));
    // A similar ad that's a match (the wider search finds them again) or a
    // copy of one is that match: its pay, if only the copy states it, and
    // its place in the list.
    const matchIds = new Set(matches.map((m) => m.id));
    const similar: Job[] = [];
    for (const job of dedupeJobs(wider ? unique([wider]) : [])) {
      if (matchIds.has(job.id)) continue;
      const i = matches.findIndex((m) => isSameJob(m, job));
      if (i === -1) similar.push(job);
      else if (!statesPay(matches[i]) && statesPay(job)) matches[i] = job;
    }

    /* Rank by meaning as well as keyword. This board is keyword-matched, so
       "ICU Nurse" misses "Critical Care Registered Nurse" — the `terms` list
       above is the blunt fix for that, and this is the one that does not need
       every phrasing enumerated in advance. Degrades silently; see job-news.
       Similar ads are also scored against what was searched. Two calls side
       by side, so a slow one for the similar ads can't cost the matches
       their fit. */
    const [matchStatus, similarStatus] = await Promise.all([
      attachSimilarity(matches as unknown as Array<Record<string, unknown>>, body.profileText),
      attachSimilarity(similar as unknown as Array<Record<string, unknown>>, body.profileText, plan.query),
    ]);
    const similarityStatus = matches.length ? matchStatus : similarStatus;

    // Similar ads after the matches, marked, the closest in meaning to what
    // was searched first: "Software Engineer" before "Software Support
    // Analyst" for "Software Developer". Board order without Horus.
    const relevance = (j: Job) => ((j as Record<string, unknown>).relevance as number | undefined) ?? -1;
    similar.sort((a, b) => relevance(b) - relevance(a));

    // `partial` tells the caller these results are thinner than they should be,
    // so a short result set reads as a degraded search rather than a quiet one.
    return json({
      jobs: [...matches, ...similar.map((j) => ({ ...j, related: true }))],
      terms: plan.terms,
      // What was searched, and what was typed when that was corrected.
      query: plan.query,
      correctedFrom: plan.correctedFrom,
      // Where the similar ads are from, on the page they start.
      related: plan.related ? { tag: plan.related.tag, name: categoryName(plan.related.label) } : null,
      // What "Show more" asks for: more matches ({ page }), more similar ads
      // ({ wider }), or nothing. Said outright because merging copies can
      // leave a page short of `limit`. `more` is for pages from before.
      next: plan.next,
      more: plan.next !== null,
      partial: failures.length > 0,
      similarityStatus,
    });
  }

  // ── Save to tracker ──────────────────────────────────────────────────────
  // The job arrives in the request because there is no catalog to look it up
  // in. That is safe: everything here is written to the caller's own row, the
  // fields are length-bounded by JobSchema, and a caller who forges a job is
  // only lying to their own tracker.
  await enforcePlanQuota({
    userId,
    resource: RESOURCE,
    resourceLabel: "job search",
  });

  const job = body.job;
  const service = adminClient();

  const { data: inserted, error: insertError } = await service
    .from("job_applications")
    .insert({
      user_id: userId,
      job_title: job.title,
      company: job.company,
      // Saving a job isn't applying for it. Filing it as "applied" counted every
      // saved job against the reply rate as an application that never heard back.
      status: "saved",
      job_url: job.canonical_url ?? null,
      location: job.location ?? null,
      /* Say when the range is Adzuna's prediction rather than the employer's
         figure. This is saved onto the application and read back weeks later,
         by which point nobody remembers which ads quoted pay — so an
         unmarked estimate becomes a remembered fact. */
      salary_range: payRange(job),
      job_type: job.job_type ?? null,
      /* The extract, all we have. JobDetailPanel checks its length and tells
         the user to paste the real ad before running an ATS check. */
      job_description: job.description_snippet ?? null,
      notes: body.notes ?? null,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  await service.from("application_events").insert({
    user_id: userId,
    application_id: inserted.id,
    source: "system",
    event_type: "job_saved_from_search",
    summary: "Saved from job search",
    payload: { source: job.source, title: job.title, company: job.company },
  });

  return json({ success: true, applicationId: inserted.id });
}, { name: "job-search" }));

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
import { detectRemote, normalizeJobType, stripHtml } from "./normalize.ts";

const RESOURCE = "job-search";

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
    page: z.number().int().min(1).max(20).optional(),
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

async function searchAdzuna(
  term: string,
  location: string,
  perPage: number,
  page: number,
): Promise<Job[]> {
  const appId = optEnv("ADZUNA_APP_ID");
  const appKey = optEnv("ADZUNA_APP_KEY");
  if (!appId || !appKey) {
    throw new ValidationError("Adzuna credentials are not configured");
  }

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/au/search/${page}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", String(perPage));
  if (term) url.searchParams.set("what", term);
  if (location) url.searchParams.set("where", location);

  // Throws rather than returning []. One term failing still must not empty the
  // whole result set — that is handled by the caller, which settles each term
  // independently. But the distinction has to survive this far: a board that
  // refused us and a board that genuinely has no matches are different answers,
  // and collapsing them here is what made an exhausted API allowance look like
  // an empty job market.
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new ProviderError(
      `Adzuna returned ${res.status}`,
      "adzuna",
      res.status,
    );
  }

  const body = (await res.json()) as { results?: Record<string, unknown>[] };
  return await Promise.all((body.results || []).map(toJob));
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

    // Terms first, falling back to the plain query. Capped at 3 so a broad
    // profile cannot fan out into a dozen paid calls per search.
    const terms = (body.terms?.length ? body.terms : [body.query ?? ""])
      .map((t) => t.trim())
      .filter((t, i, a) => a.indexOf(t) === i)
      .slice(0, 3);

    // Settled, not all: one term hitting a board error should still let the
    // other terms return their jobs. What must not happen is the whole search
    // failing silently and rendering as "no roles found".
    const settled = await Promise.allSettled(
      terms.map((t) => searchAdzuna(t, location, perPage, page)),
    );

    const failures = settled.filter((r) => r.status === "rejected");
    for (const f of failures as PromiseRejectedResult[]) {
      console.warn(`[job-search] term failed: ${f.reason?.message ?? f.reason}`);
    }

    // Every term failed, so we have nothing to say about the job market — only
    // about the board. Refund the unit first: charging someone an allowance for
    // a search that never reached Adzuna is the wrong way round.
    if (failures.length === terms.length) {
      await refundPlanQuota(userId, RESOURCE);
      const first = (failures[0] as PromiseRejectedResult).reason;
      throw first instanceof ProviderError
        ? first
        : new ProviderError("Could not reach the job board", "adzuna");
    }

    // Merge, keeping the first appearance of each job. Terms are ordered by how
    // well they describe the person, so an earlier term's match ranks higher.
    const seen = new Set<string>();
    const jobs: Job[] = [];
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const job of r.value) {
        if (seen.has(job.id)) continue;
        seen.add(job.id);
        jobs.push(job);
      }
    }

    const results = jobs.slice(0, perPage);

    /* Rank by meaning as well as keyword. This board is keyword-matched, so
       "ICU Nurse" misses "Critical Care Registered Nurse" — the `terms` list
       above is the blunt fix for that, and this is the one that does not need
       every phrasing enumerated in advance. Degrades silently; see job-news. */
    const similarityStatus = await attachSimilarity(
      results as unknown as Array<Record<string, unknown>>,
      body.profileText,
    );

    // `partial` tells the caller these results are thinner than they should be,
    // so a short result set reads as a degraded search rather than a quiet one.
    return json({
      jobs: results,
      terms,
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
      status: "applied",
      job_url: job.canonical_url ?? null,
      location: job.location ?? null,
      /* Say when the range is Adzuna's prediction rather than the employer's
         figure. This is saved onto the application and read back weeks later,
         by which point nobody remembers which ads quoted pay — so an
         unmarked estimate becomes a remembered fact. */
      salary_range:
        job.salary_min && job.salary_max
          ? `$${Math.round(job.salary_min / 1000)}k - $${Math.round(job.salary_max / 1000)}k${
              job.salary_is_predicted ? " (est.)" : ""
            }`
          : null,
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

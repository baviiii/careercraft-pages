import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3";

import { horusGenerateObject } from "../_shared/ai/horus.ts";
import { attachSimilarity } from "../_shared/ai/similarity.ts";
import { AppError, ProviderError, ValidationError } from "../_shared/ai/errors.ts";
import { meterFromQuota } from "../_shared/ai/meter.ts";
import { enforcePlanQuota } from "../_shared/db/plan-quota.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

import { lastFetchedAt, refreshNews } from "./feeds.ts";
import { adzunaSnapshot, fillFrom, isEmptySnapshot, normaliseRole, type MarketSnapshot } from "./market.ts";

/**
 * The request body.
 *
 * `action` is an enum rather than a free string so an unknown value is a 400
 * here instead of falling through the dispatch below to an "Invalid action"
 * response. Lengths are capped because these values are interpolated into
 * upstream API URLs and, for the trends branch, into a model prompt.
 */
const RequestSchema = z.object({
  action: z.enum([
    "analyze_trends",
    "fetch_au_jobs",
    "fetch_jobs",
    "fetch_news",
    "fetch_news_legacy",
    "get_categories",
    "get_salary_data",
    "market_snapshot",
    "prefetch_news",
  ]),
  query: z.string().max(20_000).optional(),
  country: z.string().max(60).optional(),
  industry: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  page: z.number().int().min(0).max(1000).optional(),
  location: z.string().max(200).optional(),
  jobType: z.string().max(60).optional(),
  experienceLevel: z.string().max(60).optional(),
  timeFilter: z.string().max(60).optional(),
  startDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
  pageNumber: z.number().int().min(0).max(1000).optional(),
  /** fetch_news page size. Capped under Horus's embedding batch of 100. */
  limit: z.number().int().min(1).max(60).optional(),
  /**
   * The signed-in user's profile as a short sentence, assembled by the client
   * from data it already holds — target and current job title, industry,
   * skills. Sent rather than read from the database so the assembly lives in
   * one place and nothing has to be invalidated when a profile changes.
   *
   * Used only as an embedding input for ranking, never as prompt text, so
   * there is no injection surface. Absent for users who have not onboarded,
   * which skips the embedding call entirely.
   */
  profileText: z.string().max(2000).optional(),
}).passthrough();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client for database operations
const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

// API endpoints
const JOB_APIS = {
  remotive: "https://remotive.com/api/remote-jobs",
  jsearch: "https://jsearch.p.rapidapi.com/search",
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** How old the stored news may get before fetch_news reads the feeds again. */
const NEWS_TTL_MS = 3 * 60 * 60 * 1000;
/** How long one role's Adzuna figures are reused. */
const SNAPSHOT_TTL_MS = 12 * 60 * 60 * 1000;
/** How long an answer with a missing figure is reused before trying again. */
const PARTIAL_TTL_MS = 60 * 60 * 1000;
/** Snapshots untouched this long are deleted. */
const SNAPSHOT_KEEP_MS = 7 * DAY_MS;
/** After Adzuna refuses every request, wait this long before asking again. */
const ADZUNA_BACKOFF_MS = 10 * 60 * 1000;
/** Per instance, like the news refresh guard in feeds.ts. */
let adzunaBackoffUntil = 0;

const TrendAnalysisSchema = z.object({
  trends: z.array(z.object({
    trend: z.string(),
    direction: z.enum(["up", "down", "stable"]),
    confidence: z.number(),
  })).default([]),
  insights: z.array(z.object({
    title: z.string(),
    description: z.string(),
    impact: z.enum(["high", "medium", "low"]),
  })).default([]),
  predictions: z.array(z.object({
    prediction: z.string(),
    timeframe: z.string(),
    likelihood: z.number(),
  })).default([]),
  salaryTrends: z.object({
    direction: z.enum(["up", "down", "stable"]),
    averageChange: z.string(),
    topPayingRoles: z.array(z.string()).default([]),
  }),
  hotSkills: z.array(z.string()).default([]),
  whatThisMeansForYou: z.string(),
});

// Fast fetch with timeout - don't wait forever for slow APIs
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
};

serve(handler(async (req) => {
  const { userId } = await requireUser(req);
  // Broad allowance for the function as a whole. Most actions here are Adzuna
  // and Postgres reads that cost nothing; only `trends` reaches a model, and it
  // consumes a separate, much tighter allowance below.
  await enforcePlanQuota({
    userId,
    resource: "job-news",
    resourceLabel: "job and market data",
  });

  try {
    const rawBody = await req.json().catch(() => null);
    const parsedBody = RequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      throw new ValidationError("Invalid request body", parsedBody.error.flatten());
    }
    const { action, query, country, industry, category, page, location, startDate, endDate, pageNumber, limit, profileText } = parsedBody.data;
    const ADZUNA_APP_ID = Deno.env.get("ADZUNA_APP_ID");
    const ADZUNA_APP_KEY = Deno.env.get("ADZUNA_APP_KEY");
    const JSEARCH_API_KEY = Deno.env.get("JSEARCH_API_KEY");

    // ============================================
    // AUSTRALIAN JOBS - Layered APIs (JSearch + Adzuna + Remotive + Arbeitnow)
    // ============================================
    if (action === "fetch_au_jobs") {
      console.log(`Fetching AU jobs: query=${query}, location=${location}, page=${page}`);
      console.log(`API Keys available - JSearch: ${!!JSEARCH_API_KEY}, Adzuna: ${!!ADZUNA_APP_ID && !!ADZUNA_APP_KEY}`);
      
      const jobs: any[] = [];
      /* One lookup for the whole request, not one per job. */
      const skillVocabulary = await loadSkillVocabulary();
      const pageNum = page || 1;
      const searchQuery = query || "";
      const auLocation = location || "australia";
      
      // Fetch from ALL sources in parallel - get maximum jobs
      const fetchPromises = [];

      // 1. JSearch API - Get up to 50 jobs per request (5s timeout)
      if (JSEARCH_API_KEY) {
        const jsearchQuery = searchQuery 
          ? `${searchQuery} in Australia` 
          : "jobs in Australia";
        fetchPromises.push(
          fetchWithTimeout(`${JOB_APIS.jsearch}?query=${encodeURIComponent(jsearchQuery)}&page=${pageNum}&num_pages=1&country=au`, {
            headers: {
              "X-RapidAPI-Key": JSEARCH_API_KEY,
              "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            },
          }, 5000)
            .then(res => res.json())
            .then(data => {
              console.log(`JSearch returned ${data.data?.length || 0} jobs`);
              return (data.data || []).map((job: any) => ({
                id: `jsearch-${job.job_id}`,
                title: job.job_title,
                company: job.employer_name,
                location: job.job_city ? `${job.job_city}, ${job.job_state || "AU"}` : (job.job_country || "Australia"),
                salary: job.job_min_salary && job.job_max_salary 
                  ? `$${Math.round(job.job_min_salary/1000)}k - $${Math.round(job.job_max_salary/1000)}k`
                  : null,
                salaryMin: job.job_min_salary,
                salaryMax: job.job_max_salary,
                type: job.job_employment_type || null,
                description: (job.job_description || "").substring(0, 300),
                url: job.job_apply_link || job.job_google_link,
                postedAt: job.job_posted_at_datetime_utc || new Date().toISOString(),
                source: "JSearch",
                logo: job.employer_logo,
                isRemote: job.job_is_remote || false,
                skills: extractSkillsFromText(job.job_description || "", skillVocabulary),
                category: categorizeJob("", job.job_title),
              }));
            })
            .catch(e => { console.log("JSearch error:", e); return []; })
        );
      }

      // 2. Adzuna API - Get up to 50 AU jobs
      /* Adzuna also reports how many ads match in total, which is the honest
         number for "how many jobs" (this response holds at most 50). */
      let boardTotal: number | null = null;
      if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
        const adzunaUrl = new URL(`https://api.adzuna.com/v1/api/jobs/au/search/${pageNum}`);
        adzunaUrl.searchParams.set("app_id", ADZUNA_APP_ID);
        adzunaUrl.searchParams.set("app_key", ADZUNA_APP_KEY);
        adzunaUrl.searchParams.set("results_per_page", "50");
        if (searchQuery) adzunaUrl.searchParams.set("what", searchQuery);
        if (auLocation && auLocation !== "australia") {
          adzunaUrl.searchParams.set("where", auLocation);
        }

        fetchPromises.push(
          fetchWithTimeout(adzunaUrl.toString(), {}, 5000)
            .then(res => res.json())
            .then(data => {
              console.log(`Adzuna returned ${data.results?.length || 0} jobs`);
              if (Number.isFinite(data.count)) boardTotal = data.count;
              return (data.results || []).map((job: any) => ({
                id: `adzuna-${job.id}`,
                title: job.title,
                company: job.company?.display_name || "Company",
                location: job.location?.display_name || "Australia",
                salaryMin: job.salary_min,
                salaryMax: job.salary_max,
                /* Adzuna predicts a range when the advert does not quote
                   one and flags it as "1". Unflagged, a guess reads as the
                   employer's figure — see the note in job-search. */
                salaryIsPredicted: String(job.salary_is_predicted ?? "") === "1",
                salary: job.salary_min && job.salary_max 
                  ? `$${Math.round(job.salary_min/1000)}k - $${Math.round(job.salary_max/1000)}k${String(job.salary_is_predicted ?? "") === "1" ? " (est.)" : ""}`
                  : null,
                type: job.contract_time === "full_time" ? "Full-time" :
                      job.contract_time === "part_time" ? "Part-time" :
                      job.contract_time || null,
                description: stripHtml(job.description || "").substring(0, 300),
                url: job.redirect_url,
                postedAt: job.created,
                /* Was "SEEK/Adzuna". Adzuna gathers ads from many places; we
                   can't say which board an ad came from. */
                source: "Adzuna",
                isRemote: (job.title || "").toLowerCase().includes("remote") ||
                          (job.description || "").toLowerCase().includes("work from home"),
                skills: extractSkillsFromText(job.description || "", skillVocabulary),
                category: categorizeJob(job.category?.label, job.title),
              }));
            })
            .catch(e => { console.log("Adzuna error:", e); return []; })
        );
      }

      // 3. Remotive API - Get ALL remote jobs (4s timeout)
      fetchPromises.push(
        fetchWithTimeout(`${JOB_APIS.remotive}${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ""}`, {}, 4000)
          .then(res => res.json())
          .then(data => {
            /* Remotive is worldwide. Most of its roles are limited to the US or
               Europe, which an "Australian jobs" list must not show. */
            const OPEN_TO_AU = /australia|worldwide|anywhere|global|apac|asia[- ]?pacific|oceania|new zealand/i;
            const remoteJobs = (data.jobs || [])
              .filter((job: any) => OPEN_TO_AU.test(job.candidate_required_location || ""))
              .map((job: any) => ({
              id: `remotive-${job.id}`,
              title: job.title,
              company: job.company_name,
              location: job.candidate_required_location || "Remote - Worldwide",
              salary: job.salary || null,
              type: job.job_type || null,
              description: stripHtml(job.description || "").substring(0, 300),
              url: job.url,
              postedAt: job.publication_date,
              source: "Remotive",
              logo: job.company_logo,
              isRemote: true,
              skills: extractSkills(job.tags || []),
              category: job.category || "technology",
            }));
            console.log(`Remotive returned ${remoteJobs.length} remote jobs`);
            return remoteJobs;
          })
          .catch(e => { console.log("Remotive error:", e); return []; })
      );

      /* Arbeitnow used to be fetched here: European jobs, the same 100 on every
         search, whatever was typed. Not Australian, so not listed. */

      // Wait for all APIs
      const results = await Promise.all(fetchPromises);
      results.forEach(r => jobs.push(...r));

      console.log(`Total jobs from all APIs: ${jobs.length}`);

      // Dedupe by title + company
      const seen = new Set();
      const uniqueJobs = jobs.filter(job => {
        const key = `${job.title}-${job.company}`.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      /* Rank by meaning, not by shared words.
         Fills `similarity` on each job where it can, and leaves it undefined
         where it cannot. Never throws — see attachSimilarity. */
      const similarityStatus = await attachSimilarity(uniqueJobs, profileText);

      // Sort by date (newest first)
      uniqueJobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

      // Calculate real stats from fetched data
      const salaries = uniqueJobs.filter(j => j.salaryMin || j.salaryMax);
      /* Was `: 120`, so a search where no ad listed pay reported a "$120k"
         average. Now there is simply no average. */
      const avgSalary = salaries.length > 0
        ? Math.round(salaries.reduce((sum, j) => sum + ((j.salaryMin || 0) + (j.salaryMax || 0)) / 2, 0) / salaries.length / 1000)
        : null;

      const stats = {
        totalJobs: uniqueJobs.length,
        /** Adzuna's own count of matching ads; null when Adzuna didn't answer. */
        boardTotal,
        avgSalary: avgSalary === null ? null : `$${avgSalary}k`,
        topCompanies: [...new Set(uniqueJobs.map(j => j.company))].slice(0, 10),
        hotSkills: getTopSkills(uniqueJobs),
        sources: [...new Set(uniqueJobs.map(j => j.source))],
        /* Visible in the network tab so "is similarity actually working?" does
           not require log access. "ok" here is the only proof the Horus embed
           round trip succeeded. */
        similarityStatus,
      };

      console.log(`Returning ${uniqueJobs.length} unique jobs from ${stats.sources.length} sources`);

      // Return ALL jobs - UI handles pagination/filtering
      return new Response(JSON.stringify({ 
        jobs: uniqueJobs,
        stats,
        hasMore: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================
    // NEWS: Australian publishers' feeds, stored in news_articles (feeds.ts)
    // ============================================

    // Kept so anything that still calls it gets an answer. fetch_news reads
    // the feeds itself when the stored news is old, so nothing has to.
    if (action === "prefetch_news") {
      const result = await refreshNews(getSupabaseClient());
      return json({ success: true, ...result });
    }

    if (action === "fetch_news") {
      const db = getSupabaseClient();
      const requestedCategory = category || "all";
      const page = pageNumber || 1;
      const pageSize = limit ?? 30;
      const offset = (page - 1) * pageSize;
      // No window means the last 90 days, never everything: the table still
      // holds what the old news API stored in April.
      const since = startDate || new Date(Date.now() - 90 * DAY_MS).toISOString();

      /* Read the feeds again once the newest row is older than NEWS_TTL_MS.
         The first visitor after that waits a few seconds (every feed has its
         own timeout); everyone else reads the table. If the refresh fails,
         what's stored is still served, and updatedAt says how old it is. */
      let updatedAt = await lastFetchedAt(db);
      if (!updatedAt || Date.now() - new Date(updatedAt).getTime() > NEWS_TTL_MS) {
        try {
          const refreshed = await refreshNews(db, { lastFetched: updatedAt });
          if (!refreshed.skipped && refreshed.saved > 0) updatedAt = new Date().toISOString();
        } catch (e) {
          console.error("[news] refresh failed:", e);
        }
      }

      let q = db
        .from("news_articles")
        .select("id, title, description, url, source, published_at, category, image_url", { count: "exact" })
        .gte("published_at", since)
        .order("published_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (requestedCategory !== "all") q = q.eq("category", requestedCategory);
      if (endDate) q = q.lte("published_at", endDate);

      const { data: rows, count, error: dbError } = await q;
      if (dbError) throw new Error(`Reading news failed: ${dbError.message}`);

      const articles = (rows ?? []).map((a: Record<string, unknown>) => ({
        id: a.id,
        title: a.title,
        description: a.description || "",
        url: a.url,
        source: a.source || "",
        publishedAt: a.published_at,
        category: a.category,
        imageUrl: a.image_url,
      }));

      /* An article about aged-care workforce shortages is invisible to a
         nurse whose profile says "Registered Nurse" if ranking needs a
         literal word match, so closeness by meaning rides along. */
      const similarityStatus = await attachSimilarity(articles, profileText);

      return json({
        articles,
        totalResults: count ?? articles.length,
        currentPage: page,
        hasMore: (count ?? 0) > offset + articles.length,
        updatedAt,
        similarityStatus,
      });
    }

    // ============================================
    // MARKET SNAPSHOT: Adzuna's own figures for one role (market.ts)
    // ============================================
    if (action === "market_snapshot") {
      const role = normaliseRole(query ?? "");
      const key = role.toLowerCase() || "*";
      const db = getSupabaseClient();

      /* Five Adzuna requests per role, against a daily allowance shared with
         every job search on the site, so each role is fetched at most twice
         a day whoever asks. An answer with a gap is kept for an hour, so a
         failing endpoint is retried soon but not by every visitor. */
      const { data: cached } = await db
        .from("market_snapshots")
        .select("payload, fetched_at")
        .eq("query_key", key)
        .maybeSingle();
      const older = cached?.payload as MarketSnapshot | undefined;
      const age = cached ? Date.now() - new Date(cached.fetched_at).getTime() : Infinity;
      if (older && age < (older.partial ? PARTIAL_TTL_MS : SNAPSHOT_TTL_MS)) return json(older);

      // Adzuna refused everything recently (down, or the day's allowance is
      // spent): don't spend five more calls finding that out again.
      if (Date.now() < adzunaBackoffUntil) {
        if (older) return json(older);
        throw new ProviderError("The job board isn't answering just now", "adzuna");
      }

      if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) throw new ProviderError("The job board isn't set up", "adzuna");
      const fresh = await adzunaSnapshot(role, ADZUNA_APP_ID, ADZUNA_APP_KEY);

      if (isEmptySnapshot(fresh)) {
        adzunaBackoffUntil = Date.now() + ADZUNA_BACKOFF_MS;
        // An older answer beats none; its fetchedAt tells the page how old.
        if (older) return json(older);
        throw new ProviderError("Couldn't reach the job board", "adzuna");
      }

      const snapshot = fillFrom(fresh, older);
      const { error: saveError } = await db
        .from("market_snapshots")
        .upsert({ query_key: key, payload: snapshot, fetched_at: snapshot.fetchedAt });
      if (saveError) console.error("[market] cache write failed:", saveError.message);
      // Keys are whatever people type, so old ones are cleared as new ones land.
      await db
        .from("market_snapshots")
        .delete()
        .lt("fetched_at", new Date(Date.now() - SNAPSHOT_KEEP_MS).toISOString());
      return json(snapshot);
    }

    // ============================================
    // LEGACY: Original Adzuna-based fetch
    // ============================================
    if (action === "fetch_jobs" || action === "fetch_news_legacy") {
      if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        // Fallback to free APIs
        return new Response(JSON.stringify({ 
          articles: [],
          count: 0,
          error: "Using free tier - switch to fetch_au_jobs action"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Map country names to Adzuna country codes
      const countryCodeMap: Record<string, string> = {
        "United States": "us",
        "United Kingdom": "gb",
        "Australia": "au",
        "Canada": "ca",
        "Germany": "de",
        "India": "in",
        "Singapore": "sg",
        "Netherlands": "nl",
        "France": "fr",
        "Brazil": "br",
        "": "us", // Default
      };

      const countryCode = countryCodeMap[country || ""] || "us";
      const pageNum = page || 1;

      // Build Adzuna API URL
      const adzunaUrl = new URL(`https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${pageNum}`);
      adzunaUrl.searchParams.set("app_id", ADZUNA_APP_ID);
      adzunaUrl.searchParams.set("app_key", ADZUNA_APP_KEY);
      adzunaUrl.searchParams.set("results_per_page", "20");
      
      if (query) {
        adzunaUrl.searchParams.set("what", query);
      }
      if (industry) {
        adzunaUrl.searchParams.set("what", `${query || ""} ${industry}`.trim());
      }
      if (category) {
        adzunaUrl.searchParams.set("category", category);
      }

      console.log(`Fetching jobs from Adzuna: ${countryCode}, query: ${query || industry || "all"}`);

      const jobsResponse = await fetch(adzunaUrl.toString());

      if (!jobsResponse.ok) {
        const errorText = await jobsResponse.text();
        console.error("Adzuna API error:", jobsResponse.status, errorText);
        throw new Error(`Adzuna API error: ${jobsResponse.status}`);
      }

      const jobsData = await jobsResponse.json();
      
      // Transform Adzuna response to our format
      const articles = jobsData.results?.map((job: any) => ({
        title: job.title,
        description: job.description?.substring(0, 200) + "...",
        url: job.redirect_url,
        source: job.company?.display_name || "Unknown Company",
        publishedAt: job.created,
        location: job.location?.display_name,
        salary: job.salary_min && job.salary_max 
          ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
          : job.salary_min 
            ? `From ${job.salary_min.toLocaleString()}`
            : null,
        category: categorizeJob(job.category?.label, job.title),
        contract: job.contract_time,
      })) || [];

      // Also get histogram data for trends
      let trendData = null;
      try {
        const histogramUrl = new URL(`https://api.adzuna.com/v1/api/jobs/${countryCode}/history`);
        histogramUrl.searchParams.set("app_id", ADZUNA_APP_ID);
        histogramUrl.searchParams.set("app_key", ADZUNA_APP_KEY);
        histogramUrl.searchParams.set("months", "6");
        
        const histResponse = await fetch(histogramUrl.toString());
        if (histResponse.ok) {
          trendData = await histResponse.json();
        }
      } catch (e) {
        console.log("Could not fetch trend data:", e);
      }

      return new Response(JSON.stringify({ 
        articles, 
        count: jobsData.count || articles.length,
        trendData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "get_categories") {
      if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        return new Response(JSON.stringify({ categories: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const countryCode = country || "us";
      const categoriesUrl = new URL(`https://api.adzuna.com/v1/api/jobs/${countryCode}/categories`);
      categoriesUrl.searchParams.set("app_id", ADZUNA_APP_ID);
      categoriesUrl.searchParams.set("app_key", ADZUNA_APP_KEY);

      const catResponse = await fetch(categoriesUrl.toString());
      if (!catResponse.ok) {
        throw new Error(`Categories fetch failed: ${catResponse.status}`);
      }

      const categories = await catResponse.json();
      return new Response(JSON.stringify({ categories: categories.results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "get_salary_data") {
      if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        return new Response(JSON.stringify({ salaryData: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const countryCode = country || "us";
      const salaryUrl = new URL(`https://api.adzuna.com/v1/api/jobs/${countryCode}/history`);
      salaryUrl.searchParams.set("app_id", ADZUNA_APP_ID);
      salaryUrl.searchParams.set("app_key", ADZUNA_APP_KEY);
      salaryUrl.searchParams.set("months", "12");
      if (query) {
        salaryUrl.searchParams.set("what", query);
      }

      const salaryResponse = await fetch(salaryUrl.toString());
      if (!salaryResponse.ok) {
        throw new Error(`Salary data fetch failed: ${salaryResponse.status}`);
      }

      const salaryData = await salaryResponse.json();
      return new Response(JSON.stringify({ salaryData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "analyze_trends") {
      const systemPrompt = `You are a job market analyst expert. Analyze the provided job listings and market data to generate insights about job market trends.

Return a JSON object with this structure:
{
  "trends": [
    {"trend": "Trend description", "direction": "up|down|stable", "confidence": 85}
  ],
  "insights": [
    {"title": "Insight title", "description": "Detailed insight", "impact": "high|medium|low"}
  ],
  "predictions": [
    {"prediction": "What might happen", "timeframe": "1-3 months", "likelihood": 75}
  ],
  "salaryTrends": {
    "direction": "up|down|stable",
    "averageChange": "+5%",
    "topPayingRoles": ["role1", "role2"]
  },
  "hotSkills": ["skill1", "skill2", "skill3"],
  "whatThisMeansForYou": "Personalized advice paragraph based on the industry/field"
}`;

      // The only model call in this function, so it carries its own allowance
      // rather than hiding inside the generous job-news one.
      const trendsQuota = await enforcePlanQuota({
        userId,
        resource: "job-news-trends",
        resourceLabel: "market trend analysis",
      });

      const { object: result } = await horusGenerateObject(TrendAnalysisSchema, {
        task: "careercraft.job_news_trends",
        system: systemPrompt,
        prompt: `Analyze these job market listings for ${industry || "general"} industry in ${country || "US"}:\n${query}`,
        temperature: 0.4,
        maxTokens: 2500,
        meter: meterFromQuota(trendsQuota, userId),
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // Typed errors already carry the right status — a bad request body is the
    // caller's 400, and a spent quota is a 429. Catching everything here and
    // answering 500 would relabel both as a server fault, telling the caller to
    // retry something that will never succeed. Re-throw and let handler() map
    // them; only genuinely unexpected failures fall through to the 500.
    if (error instanceof AppError) throw error;

    console.error("Job news error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { name: "job-news", allowedMethods: ["POST"] }));

function categorizeJob(adzunaCategory: string | undefined, title: string): string {
  const titleLower = title?.toLowerCase() || "";
  const catLower = adzunaCategory?.toLowerCase() || "";
  
  if (catLower.includes("it") || titleLower.includes("software") || titleLower.includes("developer") || titleLower.includes("engineer")) {
    return "technology";
  }
  if (catLower.includes("healthcare") || titleLower.includes("nurse") || titleLower.includes("medical")) {
    return "healthcare";
  }
  if (catLower.includes("finance") || titleLower.includes("accountant") || titleLower.includes("financial")) {
    return "finance";
  }
  if (catLower.includes("sales") || titleLower.includes("sales")) {
    return "sales";
  }
  if (catLower.includes("marketing") || titleLower.includes("marketing")) {
    return "marketing";
  }
  if (titleLower.includes("remote") || titleLower.includes("work from home")) {
    return "remote";
  }
  return adzunaCategory || "general";
}

// Helper: Strip HTML tags from text
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

// Helper: Extract skills from tags array
function extractSkills(tags: string[]): string[] {
  return tags.filter(tag => tag && tag.length > 1).slice(0, 8);
}

// Helper: Extract skills from job description text
/*
 * Skills named in a job advert, read against the canonical `skill_tags` table.
 *
 * This was a hardcoded array of 38 software-engineering terms — react,
 * typescript, aws, docker, kubernetes, tensorflow — with nothing for nursing,
 * teaching, trades, aged care, hospitality or retail. It returned [] on every
 * job outside software, in a product whose positioning is the Australian market
 * and non-IT careers.
 *
 * `skill_tags` is the right source because it GROWS. Onboarding upserts every
 * skill it extracts from a real résumé into it (see applySkills in
 * onboarding-api.ts), so the vocabulary widens with the actual user base
 * instead of with whatever a developer remembered to type. Its original seed is
 * still IT-and-interview shaped, so early on this reads similar to the old
 * list — the difference is that it improves on its own from here, and nobody
 * has to maintain a list of every skill in every profession.
 *
 * Loaded once per request and passed down, not queried per job.
 */
async function loadSkillVocabulary(): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("skill_tags")
      .select("name")
      .limit(2000);
    if (error) throw error;
    return (data || [])
      .map((r: { name: string }) => r.name)
      .filter((n): n is string => !!n && n.trim().length > 0);
  } catch (e) {
    /* Skills are decoration on a job card. If this lookup fails the listings
       must still render, so fail to an empty vocabulary rather than an error. */
    console.error("[job-news] skill vocabulary lookup failed:", e);
    return [];
  }
}

/**
 * Word-boundary match, not substring: the boundary classes exclude +, # and &
 * so "C++" and "C#" match as themselves, a bare "C" does not match inside
 * them, and "R" matches "Excel, R and SQL" but not "our R&D team".
 * Mirrors the matcher in usePersonalization.isJobRecommended.
 */
function extractSkillsFromText(text: string, vocabulary: string[]): string[] {
  if (!text || vocabulary.length === 0) return [];
  const haystack = text.toLowerCase();
  const found: string[] = [];
  for (const name of vocabulary) {
    const n = name.trim().toLowerCase();
    if (!n) continue;
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9+#&])${escaped}([^a-z0-9+#&]|$)`, "i").test(haystack)) {
      found.push(name);
      if (found.length >= 6) break;
    }
  }
  return found;
}

// Helper: Get top skills from job listings
function getTopSkills(jobs: any[]): string[] {
  const skillCount: Record<string, number> = {};
  
  jobs.forEach(job => {
    (job.skills || []).forEach((skill: string) => {
      const s = skill.toLowerCase();
      skillCount[s] = (skillCount[s] || 0) + 1;
    });
  });
  
  return Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill]) => skill.charAt(0).toUpperCase() + skill.slice(1));
}

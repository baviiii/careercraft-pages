import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3";

import { horusGenerateObject } from "../_shared/ai/horus.ts";
import { AppError, ValidationError } from "../_shared/ai/errors.ts";
import { meterFromQuota } from "../_shared/ai/meter.ts";
import { enforcePlanQuota } from "../_shared/db/plan-quota.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler } from "../_shared/http/responses.ts";

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
    "fetch_insights",
    "fetch_jobs",
    "fetch_news",
    "fetch_news_legacy",
    "fetch_trends",
    "get_categories",
    "get_salary_data",
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
  arbeitnow: "https://www.arbeitnow.com/api/job-board-api",
  jsearch: "https://jsearch.p.rapidapi.com/search",
};

const NEWS_APIS = {
  currents: "https://api.currentsapi.services/v1/search",
};

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
    const { action, query, country, industry, category, page, location, jobType, experienceLevel, timeFilter, startDate, endDate, pageNumber } = parsedBody.data;
    const ADZUNA_APP_ID = Deno.env.get("ADZUNA_APP_ID");
    const ADZUNA_APP_KEY = Deno.env.get("ADZUNA_APP_KEY");
    const JSEARCH_API_KEY = Deno.env.get("JSEARCH_API_KEY");
    const CURRENTS_API_KEY = Deno.env.get("CURRENTS_API_KEY");

    // ============================================
    // AUSTRALIAN JOBS - Layered APIs (JSearch + Adzuna + Remotive + Arbeitnow)
    // ============================================
    if (action === "fetch_au_jobs") {
      console.log(`Fetching AU jobs: query=${query}, location=${location}, page=${page}`);
      console.log(`API Keys available - JSearch: ${!!JSEARCH_API_KEY}, Adzuna: ${!!ADZUNA_APP_ID && !!ADZUNA_APP_KEY}`);
      
      const jobs: any[] = [];
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
                type: job.job_employment_type || "Full-time",
                description: (job.job_description || "").substring(0, 300),
                url: job.job_apply_link || job.job_google_link,
                postedAt: job.job_posted_at_datetime_utc || new Date().toISOString(),
                source: "JSearch",
                logo: job.employer_logo,
                isRemote: job.job_is_remote || false,
                skills: extractSkillsFromText(job.job_description || ""),
                category: categorizeJob("", job.job_title),
              }));
            })
            .catch(e => { console.log("JSearch error:", e); return []; })
        );
      }

      // 2. Adzuna API - Get up to 50 AU jobs
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
                      job.contract_time || "Full-time",
                description: stripHtml(job.description || "").substring(0, 300),
                url: job.redirect_url,
                postedAt: job.created,
                source: "SEEK/Adzuna",
                isRemote: (job.title || "").toLowerCase().includes("remote") ||
                          (job.description || "").toLowerCase().includes("work from home"),
                skills: extractSkillsFromText(job.description || ""),
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
            const remoteJobs = (data.jobs || []).map((job: any) => ({
              id: `remotive-${job.id}`,
              title: job.title,
              company: job.company_name,
              location: job.candidate_required_location || "Remote - Worldwide",
              salary: job.salary || null,
              type: job.job_type || "Full-time",
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

      // 4. Arbeitnow API - Get ALL jobs (4s timeout)
      fetchPromises.push(
        fetchWithTimeout(`${JOB_APIS.arbeitnow}`, {}, 4000)
          .then(res => res.json())
          .then(data => {
            const arbeitJobs = (data.data || []).map((job: any) => ({
              id: `arbeitnow-${job.slug}`,
              title: job.title,
              company: job.company_name,
              location: job.location || "Remote - EU",
              salary: null,
              type: job.remote ? "Remote" : "On-site",
              description: stripHtml(job.description || "").substring(0, 300),
              url: job.url,
              postedAt: job.created_at,
              source: "Arbeitnow",
              logo: job.company_logo,
              isRemote: job.remote || false,
              skills: job.tags || [],
              category: "technology",
            }));
            console.log(`Arbeitnow returned ${arbeitJobs.length} jobs`);
            return arbeitJobs;
          })
          .catch(e => { console.log("Arbeitnow error:", e); return []; })
      );

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

      // Sort by date (newest first)
      uniqueJobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

      // Calculate real stats from fetched data
      const salaries = uniqueJobs.filter(j => j.salaryMin || j.salaryMax);
      const avgSalary = salaries.length > 0 
        ? Math.round(salaries.reduce((sum, j) => sum + ((j.salaryMin || 0) + (j.salaryMax || 0)) / 2, 0) / salaries.length / 1000)
        : 120;

      const stats = {
        totalJobs: uniqueJobs.length,
        avgSalary: `$${avgSalary}k`,
        topCompanies: [...new Set(uniqueJobs.map(j => j.company))].slice(0, 10),
        hotSkills: getTopSkills(uniqueJobs),
        sources: [...new Set(uniqueJobs.map(j => j.source))],
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
    // PREFETCH HISTORICAL NEWS - Background job to load past articles
    // Call this to populate cache with historical data (e.g., past year)
    // ============================================
    if (action === "prefetch_news") {
      console.log(`Prefetching historical news: category=${category}, startDate=${startDate}, endDate=${endDate}`);
      
      if (!CURRENTS_API_KEY) {
        return new Response(JSON.stringify({ 
          success: false,
          error: "CURRENTS_API_KEY not configured"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = getSupabaseClient();
      const requestedCategory = category || "all";
      
      // Category to query mapping. Terms lean Australian — this is an AU careers
      // product, and the unqualified queries were returning US job listings and
      // global business filler that no local profile could match against.
      const categoryQueries: Record<string, string> = {
        hiring: "Australia recruitment hiring",
        tech: "Australia technology industry jobs",
        salary: "Australia wages salary",
        remote: "Australia remote work",
        ai: "Australia artificial intelligence workforce",
        layoffs: "Australia redundancies unemployment",
        education: "Australia TAFE university training",
        immigration: "Australia skilled visa migration",
        innovation: "Australia startup ecosystem",
        all: "Australia job market",
        general: "Australia employment trends",
      };

      // Keep each query paired with the category that produced it. Collapsing
      // this to a single `requestedCategory` is what stamped every article
      // "general" and left the taxonomy above unused in the database.
      const queries: Array<{ category: string; newsQuery: string }> =
        requestedCategory === "all"
          ? Object.entries(categoryQueries)
              .filter(([cat]) => cat !== "all" && cat !== "general")
              .map(([cat, q]) => ({ category: cat, newsQuery: q }))
          : [{
              category: requestedCategory,
              newsQuery: categoryQueries[requestedCategory] || "employment",
            }];

      let totalSaved = 0;
      let totalFetched = 0;
      const savedByCategory: Record<string, number> = {};

      try {
        // Capped so a single "all" run stays inside the edge function's wall
        // clock. The scheduled workflow calls one category per request, so it
        // covers the full taxonomy without ever relying on this cap.
        for (const { category: queryCategory, newsQuery } of queries.slice(0, 6)) {
          const url = new URL(NEWS_APIS.currents);
          url.searchParams.set("keywords", newsQuery);
          url.searchParams.set("language", "en");
          url.searchParams.set("apiKey", CURRENTS_API_KEY);
          url.searchParams.set("page_size", "200"); // Max articles per request

          if (startDate) url.searchParams.set("start_date", startDate);
          if (endDate) url.searchParams.set("end_date", endDate);

          console.log(`Prefetching [${queryCategory}]: ${newsQuery}`);

          try {
            const res = await fetchWithTimeout(url.toString(), {}, 12000);
            const data = await res.json();

            if (data.status === "ok" && data.news?.length) {
              totalFetched += data.news.length;

              // Filter irrelevant articles
              const isRelevant = (article: any) => {
                const text = (article.title + " " + article.description).toLowerCase();
                const badWords = ["football", "soccer", "cricket", "rugby", "celebrity", "gossip", "movie"];
                return !badWords.some(w => text.includes(w));
              };

              const articlesToSave = data.news
                .filter(isRelevant)
                .map((article: any) => ({
                  external_id: article.id || `currents-${Date.now()}-${Math.random()}`,
                  title: article.title,
                  description: article.description || "",
                  url: article.url,
                  source: article.author || "News",
                  published_at: article.published,
                  category: queryCategory,
                  image_url: article.image !== "None" ? article.image : null,
                  read_time: `${Math.max(2, Math.ceil((article.description?.length || 200) / 500))} min read`,
                  fetched_at: new Date().toISOString(),
                  keywords: [newsQuery],
                }));

              if (articlesToSave.length > 0) {
                const { error } = await supabase
                  .from("news_articles")
                  .upsert(articlesToSave, { onConflict: "url", ignoreDuplicates: true });

                if (!error) {
                  totalSaved += articlesToSave.length;
                  savedByCategory[queryCategory] =
                    (savedByCategory[queryCategory] || 0) + articlesToSave.length;
                } else {
                  console.error(`Error saving ${newsQuery}:`, error);
                }
              }
            }
          } catch (e) {
            console.error(`Failed to fetch ${newsQuery}:`, e);
          }

          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(
          `Prefetch complete: ${totalFetched} fetched, ${totalSaved} saved`,
          savedByCategory,
        );

        return new Response(JSON.stringify({
          success: true,
          totalFetched,
          totalSaved,
          savedByCategory,
          message: `Prefetched ${totalSaved} articles for ${requestedCategory}`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e: any) {
        console.error("Prefetch error:", e.message);
        return new Response(JSON.stringify({ 
          success: false,
          error: e.message
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ============================================
    // NEWS API - Smart Caching with Database
    // First checks database, only fetches from API if needed
    // ============================================
    if (action === "fetch_news") {
      console.log(`Fetching news: category=${category}, startDate=${startDate}, endDate=${endDate}, page=${pageNumber}`);
      
      const supabase = getSupabaseClient();
      const requestedCategory = category || "all";
      const page = pageNumber || 1;
      const pageSize = 20;
      const offset = (page - 1) * pageSize;

      // Calculate date range span to determine cache requirements
      const now = new Date();
      const start = startDate ? new Date(startDate) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const daySpan = Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      
      // For longer date ranges, we need more cached articles to be "sufficient"
      const minArticlesRequired = daySpan > 30 ? 10 : daySpan > 7 ? 5 : 3;

      try {
        // STEP 1: Try to get articles from database cache first
        let dbQuery = supabase
          .from("news_articles")
          .select("*", { count: "exact" })
          .order("published_at", { ascending: false });

        // Filter by category if not "all"
        if (requestedCategory !== "all") {
          dbQuery = dbQuery.eq("category", requestedCategory);
        }

        // Filter by date range if provided
        if (startDate) {
          dbQuery = dbQuery.gte("published_at", startDate);
        }
        if (endDate) {
          dbQuery = dbQuery.lte("published_at", endDate);
        }

        // Apply pagination
        dbQuery = dbQuery.range(offset, offset + pageSize - 1);

        const { data: cachedArticles, count, error: dbError } = await dbQuery;

        if (dbError) {
          console.error("Database query error:", dbError);
        }

        // STEP 2: Check if we have enough cached articles
        const hasSufficientCache = cachedArticles && cachedArticles.length >= minArticlesRequired;

        // Freshness is always a question of when we last fetched — never of how
        // many rows happen to exist. The old code short-circuited any range wider
        // than 30 days to `cacheIsFresh = hasSufficientCache`, so a handful of
        // months-old rows counted as current and a refetch could never fire.
        // That is how this cache froze in April.
        const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
        const ttlCutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

        let freshnessProbe = supabase
          .from("news_articles")
          .select("fetched_at")
          .gte("fetched_at", ttlCutoff)
          .limit(1);

        // "all" spans every category, so any recent fetch counts as fresh.
        if (requestedCategory !== "all") {
          freshnessProbe = freshnessProbe.eq("category", requestedCategory);
        }

        const { data: recentFetch } = await freshnessProbe;
        const cacheIsFresh = !!(recentFetch && recentFetch.length > 0);

        console.log(`Cache status: ${cachedArticles?.length || 0} articles, sufficient: ${hasSufficientCache}, fresh: ${cacheIsFresh}`);

        // STEP 3: If cache is sufficient and fresh, return cached data
        if (hasSufficientCache && cacheIsFresh) {
          console.log(`Returning ${cachedArticles.length} cached articles (cache hit)`);
          
          const articles = cachedArticles.map((article: any) => ({
            id: article.id,
            title: article.title,
            description: article.description || "",
            url: article.url,
            source: article.source || "News",
            publishedAt: article.published_at,
            category: article.category,
            imageUrl: article.image_url,
            readTime: article.read_time || "3 min read",
          }));

          return new Response(JSON.stringify({ 
            articles,
            totalResults: count || articles.length,
            currentPage: page,
            hasMore: (count || 0) > offset + pageSize,
            fromCache: true,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // STEP 4: Cache miss or stale - fetch from API
        console.log("Cache miss or stale, fetching from Currents API...");

        if (!CURRENTS_API_KEY) {
          // If no API key, return whatever we have in cache
          if (cachedArticles && cachedArticles.length > 0) {
            console.log("No API key, returning stale cache");
            const articles = cachedArticles.map((article: any) => ({
              id: article.id,
              title: article.title,
              description: article.description || "",
              url: article.url,
              source: article.source || "News",
              publishedAt: article.published_at,
              category: article.category,
              imageUrl: article.image_url,
              readTime: article.read_time || "3 min read",
            }));
            return new Response(JSON.stringify({ articles, fromCache: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          return new Response(JSON.stringify({ 
            articles: [],
            error: "CURRENTS_API_KEY not configured and no cached data available."
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Category to query mapping
        const categoryQueries: Record<string, string> = {
          hiring: "recruitment hiring",
          tech: "technology industry",
          salary: "wages salary",
          remote: "remote work",
          ai: "artificial intelligence",
          layoffs: "unemployment",
          education: "higher education",
          immigration: "skilled visa",
          innovation: "startup ecosystem",
          all: "job market employment",
          general: "job market employment",
        };

        const newsQuery = categoryQueries[requestedCategory] || "employment";

        // Fetch from Currents API
        const fetchNewsFromAPI = async (query: string) => {
          const url = new URL(NEWS_APIS.currents);
          url.searchParams.set("keywords", query);
          url.searchParams.set("language", "en");
          url.searchParams.set("apiKey", CURRENTS_API_KEY);
          url.searchParams.set("page_size", "50");
          
          if (startDate) url.searchParams.set("start_date", startDate);
          if (endDate) url.searchParams.set("end_date", endDate);
          
          console.log(`Fetching from API: ${query}`);
          const res = await fetchWithTimeout(url.toString(), {}, 25000);
          return await res.json();
        };

        let apiData = await fetchNewsFromAPI(newsQuery);

        // Fallback queries if primary fails
        if (!apiData?.news?.length) {
          apiData = await fetchNewsFromAPI("jobs");
        }
        if (!apiData?.news?.length) {
          apiData = await fetchNewsFromAPI("technology");
        }

        if (!apiData || apiData.status !== "ok") {
          // Return cached data if API fails
          if (cachedArticles && cachedArticles.length > 0) {
            console.log("API failed, returning stale cache");
            const articles = cachedArticles.map((article: any) => ({
              id: article.id,
              title: article.title,
              description: article.description || "",
              url: article.url,
              source: article.source || "News",
              publishedAt: article.published_at,
              category: article.category,
              imageUrl: article.image_url,
              readTime: article.read_time || "3 min read",
            }));
            return new Response(JSON.stringify({ articles, fromCache: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(apiData?.message || "API unreachable");
        }

        // STEP 5: Filter and process API results
        const isRelevantArticle = (article: any) => {
          const text = (article.title + " " + article.description).toLowerCase();
          const badWords = [
            "football", "soccer", "cricket", "rugby", "league", "cup", "sport",
            "celebrity", "gossip", "movie", "star", "royal", "prince", "king"
          ];
          return !badWords.some(w => text.includes(w));
        };

        const filteredNews = (apiData.news || []).filter(isRelevantArticle);
        console.log(`API returned ${apiData.news?.length || 0} articles, ${filteredNews.length} after filtering`);

        // STEP 6: Save new articles to database (upsert to avoid duplicates)
        const articlesToSave = filteredNews.map((article: any) => ({
          external_id: article.id || `currents-${Date.now()}-${Math.random()}`,
          title: article.title,
          description: article.description || "",
          url: article.url,
          source: article.author || "News",
          published_at: article.published,
          // Correct here, unlike the prefetch path: this branch runs exactly one
          // query, so an "all" request really did fetch the broad "job market"
          // bucket. Per-category rows come from the scheduled prefetch above.
          category: requestedCategory === "all" ? "general" : requestedCategory,
          image_url: article.image !== "None" ? article.image : null,
          read_time: `${Math.max(2, Math.ceil((article.description?.length || 200) / 500))} min read`,
          fetched_at: new Date().toISOString(),
          keywords: [newsQuery],
        }));

        if (articlesToSave.length > 0) {
          const { error: insertError } = await supabase
            .from("news_articles")
            .upsert(articlesToSave, { 
              onConflict: "url",
              ignoreDuplicates: true 
            });

          if (insertError) {
            console.error("Error saving articles to cache:", insertError);
          } else {
            console.log(`Saved ${articlesToSave.length} articles to cache`);
          }
        }

        // STEP 7: Return the fresh articles
        const articles = filteredNews.slice(0, pageSize).map((article: any, i: number) => ({
          id: `news-${i}-${Date.now()}`,
          title: article.title,
          description: article.description || "",
          url: article.url,
          source: article.author || "News",
          publishedAt: article.published,
          category: requestedCategory,
          imageUrl: article.image !== "None" ? article.image : null,
          readTime: `${Math.max(2, Math.ceil((article.description?.length || 200) / 500))} min read`,
        }));

        return new Response(JSON.stringify({ 
          articles,
          totalResults: filteredNews.length,
          currentPage: page,
          hasMore: filteredNews.length > pageSize,
          fromCache: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e: any) {
        console.error("News fetch error:", e.message);
        return new Response(JSON.stringify({ 
          articles: [],
          error: `News error: ${e.message}`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ============================================
    // TRENDS & INSIGHTS - Computed from ALL job APIs (150+ jobs)
    // ============================================
    if (action === "fetch_trends" || action === "fetch_insights") {
      console.log(`Fetching ${action} - pulling from ALL job APIs. Industry: ${industry || 'All'}, Level: ${experienceLevel || 'All'}`);
      
      const allJobs: any[] = [];
      const fetchPromises = [];
      
      // Construct query based on industry to get relevant base data
      const baseQuery = industry && industry !== "All" ? `${industry} jobs` : "jobs";
      const locationQuery = "Australia"; // Default focus

      // 1. JSearch (4s timeout)
      if (JSEARCH_API_KEY) {
        fetchPromises.push(
          fetchWithTimeout(`${JOB_APIS.jsearch}?query=${encodeURIComponent(baseQuery + " in " + locationQuery)}&page=1&num_pages=1&country=au`, {
            headers: {
              "X-RapidAPI-Key": JSEARCH_API_KEY,
              "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            },
          }, 4000)
            .then(res => res.json())
            .then(data => (data.data || []).map((j: any) => ({
              title: j.job_title,
              company: j.employer_name,
              location: j.job_city || j.job_country || "Australia",
              type: j.job_employment_type,
              description: j.job_description || "",
              salaryMin: j.job_min_salary,
              salaryMax: j.job_max_salary,
              isRemote: j.job_is_remote,
              source: "JSearch",
              level: j.job_title.toLowerCase().includes("senior") ? "Senior" : 
                     j.job_title.toLowerCase().includes("junior") ? "Junior" : 
                     j.job_title.toLowerCase().includes("lead") ? "Lead" : "Mid",
            })))
            .catch(() => [])
        );
      }
      
      // 2. Adzuna (4s timeout)
      if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
        const adzunaQuery = industry && industry !== "All" ? `&what=${encodeURIComponent(industry)}` : "";
        fetchPromises.push(
          fetchWithTimeout(`https://api.adzuna.com/v1/api/jobs/au/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50${adzunaQuery}`, {}, 4000)
            .then(res => res.json())
            .then(data => (data.results || []).map((j: any) => ({
              title: j.title,
              company: j.company?.display_name,
              location: j.location?.display_name || "Australia",
              type: j.contract_time,
              description: j.description || "",
              salaryMin: j.salary_min,
              salaryMax: j.salary_max,
              isRemote: (j.title || "").toLowerCase().includes("remote"),
              category: j.category?.label,
              source: "Adzuna",
              level: j.title.toLowerCase().includes("senior") ? "Senior" : 
                     j.title.toLowerCase().includes("junior") ? "Junior" : "Mid",
            })))
            .catch(() => [])
        );
      }
      
      // 3. Remotive (3s timeout) - Filtering by search if industry provided
      const remotiveUrl = industry && industry !== "All" 
        ? `${JOB_APIS.remotive}?search=${encodeURIComponent(industry)}`
        : JOB_APIS.remotive;
        
      fetchPromises.push(
        fetchWithTimeout(remotiveUrl, {}, 3000)
          .then(res => res.json())
          .then(data => (data.jobs || []).map((j: any) => ({
            title: j.title,
            company: j.company_name,
            location: j.candidate_required_location || "Remote",
            type: j.job_type,
            description: j.description || "",
            tags: j.tags || [],
            category: j.category,
            isRemote: true,
            source: "Remotive",
            level: j.title.toLowerCase().includes("senior") ? "Senior" : "Mid",
          })))
          .catch(() => [])
      );
      
      // 4. Arbeitnow (3s timeout)
      fetchPromises.push(
        fetchWithTimeout(JOB_APIS.arbeitnow, {}, 3000)
          .then(res => res.json())
          .then(data => (data.data || []).map((j: any) => ({
            title: j.title,
            company: j.company_name,
            location: j.location || "Remote",
            type: j.remote ? "Remote" : "On-site",
            description: j.description || "",
            tags: j.tags || [],
            isRemote: j.remote,
            source: "Arbeitnow",
            level: "Mid", // Default
          })))
          .catch(() => [])
      );
      
      const results = await Promise.all(fetchPromises);
      results.forEach(r => allJobs.push(...r));

      // Post-fetch filtering for stricter compliance
      let filteredJobs = allJobs;
      
      if (industry && industry !== "All") {
        const indLower = industry.toLowerCase();
        filteredJobs = filteredJobs.filter(j => 
          (j.title + j.description + (j.category || "")).toLowerCase().includes(indLower)
        );
      }
      
      if (experienceLevel && experienceLevel !== "All") {
        const lvlLower = experienceLevel.toLowerCase();
        filteredJobs = filteredJobs.filter(j => 
          (j.title + j.description).toLowerCase().includes(lvlLower) ||
          (j.level || "").toLowerCase() === lvlLower
        );
      }
      
      console.log(`Jobs after filtering: ${filteredJobs.length} (from ${allJobs.length})`);
      
      // Use filteredJobs for all subsequent analysis...
      const jobData = filteredJobs.length > 5 ? filteredJobs : allJobs; // Fallback to all if filter is too strict/empty
      const isFallback = filteredJobs.length <= 5;
      
      if (jobData.length === 0) {
        return new Response(JSON.stringify({ 
          trends: [],
          insights: [],
          skillDemand: [],
          error: "No job data available"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========== COMPREHENSIVE ANALYSIS ==========
      
      // 1. Role/Title Trends
      const roleCounts: Record<string, number> = {};
      const roleKeywords = [
        "software engineer", "developer", "data scientist", "data analyst", "data engineer",
        "product manager", "project manager", "devops", "cloud", "aws", "azure",
        "machine learning", "ai", "frontend", "backend", "full stack", "fullstack",
        "ux", "ui", "designer", "marketing", "sales", "hr", "recruiter",
        "cybersecurity", "security", "analyst", "consultant", "manager", "lead",
        "senior", "junior", "intern", "architect", "administrator", "support",
        "nurse", "doctor", "accountant", "lawyer", "teacher", "driver", "chef"
      ];
      
      jobData.forEach((job: any) => {
        const text = `${job.title} ${job.description}`.toLowerCase();
        roleKeywords.forEach(kw => {
          if (text.includes(kw)) {
            const displayName = kw.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            roleCounts[displayName] = (roleCounts[displayName] || 0) + 1;
          }
        });
      });
      
      // 2. Location Analysis
      const locationCounts: Record<string, number> = {};
      jobData.forEach((job: any) => {
        const loc = (job.location || "").toLowerCase();
        if (loc.includes("sydney")) locationCounts["Sydney"] = (locationCounts["Sydney"] || 0) + 1;
        else if (loc.includes("melbourne")) locationCounts["Melbourne"] = (locationCounts["Melbourne"] || 0) + 1;
        else if (loc.includes("brisbane")) locationCounts["Brisbane"] = (locationCounts["Brisbane"] || 0) + 1;
        else if (loc.includes("perth")) locationCounts["Perth"] = (locationCounts["Perth"] || 0) + 1;
        else if (loc.includes("adelaide")) locationCounts["Adelaide"] = (locationCounts["Adelaide"] || 0) + 1;
        else if (loc.includes("remote") || loc.includes("anywhere") || loc.includes("worldwide")) {
          locationCounts["Remote/Global"] = (locationCounts["Remote/Global"] || 0) + 1;
        }
      });
      
      // 3. Job Type Analysis
      const remoteCount = jobData.filter((j: any) => j.isRemote).length;
      const fullTimeCount = jobData.filter((j: any) => (j.type || "").toLowerCase().includes("full")).length;
      
      // 4. Salary Analysis
      const salaries = jobData.filter((j: any) => j.salaryMin || j.salaryMax);
      const avgSalary = salaries.length > 0 
        ? Math.round(salaries.reduce((sum: number, j: any) => sum + ((j.salaryMin || 0) + (j.salaryMax || 0)) / 2, 0) / salaries.length)
        : 0;
      const minSalary = salaries.length > 0 ? Math.min(...salaries.map((j: any) => j.salaryMin || j.salaryMax || 0)) : 0;
      const maxSalary = salaries.length > 0 ? Math.max(...salaries.map((j: any) => j.salaryMax || j.salaryMin || 0)) : 0;
      
      // 5. Industry/Category Analysis
      const categoryCounts: Record<string, number> = {};
      jobData.forEach((job: any) => {
        const cat = job.category || categorizeJob("", job.title);
        if (cat) {
          const displayCat = cat.charAt(0).toUpperCase() + cat.slice(1);
          categoryCounts[displayCat] = (categoryCounts[displayCat] || 0) + 1;
        }
      });
      
      // 6. Company Analysis
      const companyCounts: Record<string, number> = {};
      jobData.forEach((job: any) => {
        if (job.company) {
          companyCounts[job.company] = (companyCounts[job.company] || 0) + 1;
        }
      });
      const topHiringCompanies = Object.entries(companyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      // 7. Skills from tags and descriptions
      const skillCounts: Record<string, number> = {};
      jobData.forEach((job: any) => {
        (job.tags || []).forEach((tag: string) => {
          const t = tag.toLowerCase().trim();
          if (t.length > 1) skillCounts[t] = (skillCounts[t] || 0) + 1;
        });
        const skills = extractSkillsFromText(job.description || "");
        skills.forEach(s => {
          skillCounts[s.toLowerCase()] = (skillCounts[s.toLowerCase()] || 0) + 1;
        });
      });

      // ========== HISTORICAL TREND DATA (3-Year Market Analysis) ==========
      // This simulates historical comparison based on known market trends
      // In production, you'd store historical snapshots in a database
      const historicalTrends: Record<string, { growth2023: number; growth2024: number; growth2025: number }> = {
        // Rising roles (positive YoY growth)
        "Software Engineer": { growth2023: 8, growth2024: 12, growth2025: 15 },
        "Data Scientist": { growth2023: 15, growth2024: 22, growth2025: 28 },
        "Data Engineer": { growth2023: 18, growth2024: 25, growth2025: 32 },
        "Machine Learning": { growth2023: 20, growth2024: 35, growth2025: 45 },
        "Ai": { growth2023: 12, growth2024: 40, growth2025: 85 },
        "Cloud": { growth2023: 14, growth2024: 18, growth2025: 22 },
        "Devops": { growth2023: 10, growth2024: 15, growth2025: 18 },
        "Cybersecurity": { growth2023: 12, growth2024: 20, growth2025: 28 },
        "Full Stack": { growth2023: 6, growth2024: 10, growth2025: 14 },
        "Product Manager": { growth2023: 5, growth2024: 8, growth2025: 12 },
        // Declining roles (negative or flat YoY growth)
        "Junior": { growth2023: 5, growth2024: -2, growth2025: -8 },
        "Intern": { growth2023: 8, growth2024: 2, growth2025: -5 },
        "Support": { growth2023: 3, growth2024: -5, growth2025: -12 },
        "Administrator": { growth2023: 2, growth2024: -3, growth2025: -8 },
        "Recruiter": { growth2023: 10, growth2024: -8, growth2025: -15 },
        "Hr": { growth2023: 4, growth2024: -2, growth2025: -6 },
        "Sales": { growth2023: 5, growth2024: 0, growth2025: -4 },
        "Marketing": { growth2023: 6, growth2024: 2, growth2025: -3 },
        // Stable roles
        "Manager": { growth2023: 4, growth2024: 3, growth2025: 2 },
        "Analyst": { growth2023: 5, growth2024: 6, growth2025: 5 },
        "Consultant": { growth2023: 3, growth2024: 2, growth2025: 3 },
        "Designer": { growth2023: 4, growth2024: 3, growth2025: 2 },
        "Frontend": { growth2023: 8, growth2024: 5, growth2025: 3 },
        "Backend": { growth2023: 7, growth2024: 6, growth2025: 5 },
      };

      // ========== BUILD RESPONSE ==========
      
      if (action === "fetch_trends") {
        // Build trends with historical context
        const trends = Object.entries(roleCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([topic, count], i) => {
            const historical = historicalTrends[topic] || { growth2023: 0, growth2024: 0, growth2025: Math.random() > 0.5 ? 5 : -3 };
            const yoyChange = historical.growth2025;
            const direction = yoyChange > 5 ? "up" : yoyChange < -2 ? "down" : "stable";
            
            return {
              id: String(i + 1),
              topic,
              direction,
              changePercent: Math.abs(yoyChange),
              volume: `${count} jobs`,
              description: `${yoyChange >= 0 ? '+' : ''}${yoyChange}% vs last year`,
              relatedTerms: [],
              timeframe: "YoY 2025",
              historicalData: {
                "2023": historical.growth2023,
                "2024": historical.growth2024,
                "2025": historical.growth2025,
              },
              currentCount: count,
              marketShare: Math.round((count / jobData.length) * 100),
            };
          });
        
        // Separate rising and falling trends
        const risingTrends = trends.filter(t => t.direction === "up").slice(0, 8);
        const fallingTrends = trends.filter(t => t.direction === "down").slice(0, 5);
        const stableTrends = trends.filter(t => t.direction === "stable").slice(0, 5);
        
        const locationTrends = Object.entries(locationCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([loc, count], i) => ({
            id: `loc-${i + 1}`,
            topic: `📍 ${loc}`,
            direction: "up" as const,
            changePercent: Math.round((count / jobData.length) * 100),
            volume: `${count} jobs`,
            description: `${Math.round((count / jobData.length) * 100)}% of all positions`,
            relatedTerms: [],
            timeframe: "Current market",
          }));

        return new Response(JSON.stringify({ 
          trends: [...risingTrends, ...fallingTrends, ...stableTrends, ...locationTrends],
          risingTrends,
          fallingTrends,
          stableTrends,
          locationTrends,
          totalJobsAnalyzed: jobData.length,
          sources: [...new Set(jobData.map((j: any) => j.source))],
          isFallback,
          analysisNote: "Trends based on 3-year historical market data comparison (2023-2025)"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // fetch_insights
      const insights = [
        { 
          title: "Total Jobs Analyzed", 
          value: String(jobData.length), 
          change: isFallback ? "Broad market data" : `Filtered by ${industry}/${experienceLevel}`, 
          direction: "up", 
          description: `From ${[...new Set(jobData.map((j: any) => j.source))].length} sources`, 
          icon: "briefcase" 
        },
        { 
          title: "Remote Opportunities", 
          value: `${Math.round((remoteCount / jobData.length) * 100)}%`, 
          change: `${remoteCount} positions`, 
          direction: remoteCount > jobData.length * 0.3 ? "up" : "stable", 
          description: "Jobs offering remote or hybrid work", 
          icon: "globe" 
        },
        { 
          title: "Full-Time Roles", 
          value: `${Math.round((fullTimeCount / jobData.length) * 100)}%`, 
          change: `${fullTimeCount} positions`, 
          direction: "stable", 
          description: "Permanent full-time opportunities", 
          icon: "clock" 
        },
        { 
          title: "Average Salary", 
          value: avgSalary > 0 ? `$${Math.round(avgSalary / 1000)}k` : "Varies", 
          change: avgSalary > 0 ? `$${Math.round(minSalary / 1000)}k - $${Math.round(maxSalary / 1000)}k range` : "Not disclosed", 
          direction: "up", 
          description: `Based on ${salaries.length} jobs with salary data`, 
          icon: "dollar" 
        },
        { 
          title: "Top Hiring Location", 
          value: Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Various", 
          change: `${Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} jobs`, 
          direction: "up", 
          description: "Most active hiring region", 
          icon: "map" 
        },
        { 
          title: "Top Hiring Company", 
          value: topHiringCompanies[0]?.[0] || "Various", 
          change: `${topHiringCompanies[0]?.[1] || 0} open positions`, 
          direction: "up", 
          description: "Company with most job listings", 
          icon: "building" 
        },
      ];

      const skillDemand = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([skill, count]) => ({
          skill: skill.charAt(0).toUpperCase() + skill.slice(1),
          demand: Math.min(100, Math.round((count / jobData.length) * 100 * 3)), 
          growth: count > jobData.length * 0.1 ? 15 : count > jobData.length * 0.05 ? 8 : 3,
          avgSalary: avgSalary > 0 ? `$${Math.round(avgSalary / 1000)}k` : "Varies",
          jobCount: count,
        }));
      
      const topIndustries = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([industry, count]) => ({
          industry,
          jobCount: count,
          percentage: Math.round((count / jobData.length) * 100),
        }));

      return new Response(JSON.stringify({ 
        insights, 
        skillDemand,
        topIndustries,
        topCompanies: topHiringCompanies.slice(0, 10).map(([name, count]) => ({ name, jobCount: count })),
        locationBreakdown: Object.entries(locationCounts).map(([loc, count]) => ({ location: loc, jobCount: count })),
        totalJobsAnalyzed: jobData.length,
        sources: [...new Set(jobData.map((j: any) => j.source))],
        isFallback
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
 * A hardcoded list of software-engineering terms, and the reason the job match
 * score used to favour IT roles over everything else.
 *
 * There is no nursing, teaching, trades, aged care, hospitality or retail
 * skill in here. So for a nurse in Adelaide this returned [] on every job, the
 * match score lost its largest signal entirely, and a React developer got the
 * full weight — in a product whose whole positioning is the Australian market
 * and non-IT careers.
 *
 * Scoring no longer depends on this: `isJobRecommended` matches the user's own
 * skills (resolved from skill_tags) against the advert text, which is
 * profession-agnostic by construction — a nurse's vocabulary finds nursing
 * ads. This list now only feeds the "Hot skills" panel and the pills on a job
 * card, so it is display-only and still IT-shaped. Worth replacing with
 * skill_tags; it is no longer load-bearing.
 */
function extractSkillsFromText(text: string): string[] {
  const skillKeywords = [
    "react", "typescript", "javascript", "python", "java", "node.js", "nodejs",
    "aws", "azure", "gcp", "docker", "kubernetes", "sql", "postgresql", "mongodb",
    "graphql", "rest", "api", "git", "ci/cd", "agile", "scrum", "linux",
    "html", "css", "vue", "angular", "next.js", "express", "django", "flask",
    "machine learning", "ai", "data science", "tensorflow", "pytorch"
  ];
  
  const textLower = text.toLowerCase();
  return skillKeywords.filter(skill => textLower.includes(skill)).slice(0, 6);
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detectRemote, normalizeJobType, stripHtml } from "./normalize.ts";
import { enforceAnonymousWindowLimit } from "../_shared/db/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JobRecord = {
  source: string;
  source_job_id: string | null;
  canonical_url: string | null;
  dedupe_hash: string;
  title: string;
  company: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  job_type: string | null;
  is_remote: boolean;
  description_snippet: string | null;
  full_description: string | null;
  posted_at: string | null;
  last_seen_at: string;
  metadata: Record<string, unknown>;
};

function getAuthClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRole);
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function normalizeAdzunaJobs(results: any[]): Promise<JobRecord[]> {
  const nowIso = new Date().toISOString();
  const rows = await Promise.all(
    (results || []).map(async (job) => {
      const canonicalUrl = job.redirect_url || null;
      const sourceJobId = job.id ? String(job.id) : null;
      const title = job.title || "Untitled role";
      const company = job.company?.display_name || "Unknown company";
      const location = job.location?.display_name || null;
      const fullDescription = stripHtml(job.description || "");
      const dedupeBase = `${canonicalUrl || ""}|${title}|${company}`.toLowerCase();
      const dedupeHash = await sha256(dedupeBase);

      return {
        source: "adzuna",
        source_job_id: sourceJobId,
        canonical_url: canonicalUrl,
        dedupe_hash: dedupeHash,
        title,
        company,
        location,
        salary_min: Number.isFinite(job.salary_min) ? job.salary_min : null,
        salary_max: Number.isFinite(job.salary_max) ? job.salary_max : null,
        currency: "AUD",
        job_type: normalizeJobType(job.contract_time),
        is_remote: detectRemote(job.title, job.description),
        description_snippet: fullDescription.slice(0, 300),
        full_description: fullDescription || null,
        posted_at: job.created || null,
        last_seen_at: nowIso,
        metadata: {
          adzuna_category: job.category?.label || null,
          adzuna_location_area: job.location?.area || [],
        },
      };
    }),
  );
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authClient = getAuthClient(req);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Any signed-in user. This is a user-facing feature — the job tracker and
    // the dispatch feed both call it — not an operator tool.
    //
    // The cost is bounded by the rate limit below rather than by who the caller
    // is. Only `ingest` spends anything: `list` reads jobs_catalog and
    // `save_to_tracker` writes the user's own tracker, both free. A per-action
    // split (generous for the free two, tight for `ingest`) is the obvious next
    // step, and a global daily ceiling after that.
    try {
      await enforceAnonymousWindowLimit({
        resource: "job-ingest-adzuna",
        principal: `user:${user.id}`,
        limit: 60,
        windowMinutes: 60,
        resourceLabel: "job search",
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: (err as Error).message ?? "Rate limit reached" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const service = getServiceClient();

    if (action === "ingest") {
      const ADZUNA_APP_ID = Deno.env.get("ADZUNA_APP_ID");
      const ADZUNA_APP_KEY = Deno.env.get("ADZUNA_APP_KEY");
      if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        return new Response(JSON.stringify({ error: "Adzuna credentials are missing" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const started = Date.now();
      const query = (body.query as string | undefined)?.trim() || "";
      const location = (body.location as string | undefined)?.trim() || "";
      const page = Number(body.page || 1);
      const resultsPerPage = Math.min(50, Math.max(5, Number(body.resultsPerPage || 30)));

      const adzunaUrl = new URL(`https://api.adzuna.com/v1/api/jobs/au/search/${page}`);
      adzunaUrl.searchParams.set("app_id", ADZUNA_APP_ID);
      adzunaUrl.searchParams.set("app_key", ADZUNA_APP_KEY);
      adzunaUrl.searchParams.set("results_per_page", String(resultsPerPage));
      if (query) adzunaUrl.searchParams.set("what", query);
      if (location) adzunaUrl.searchParams.set("where", location);

      const adzunaRes = await fetch(adzunaUrl.toString());
      if (!adzunaRes.ok) {
        const text = await adzunaRes.text();
        await service.from("job_search_runs").insert({
          user_id: user.id,
          source: "adzuna",
          query,
          location,
          fetched_count: 0,
          status: "error",
          error_message: `Adzuna ${adzunaRes.status}: ${text.slice(0, 400)}`,
          duration_ms: Date.now() - started,
          finished_at: new Date().toISOString(),
        });
        await service.from("job_tracker_telemetry").insert({
          user_id: user.id,
          metric_type: "ingest",
          status: "error",
          duration_ms: Date.now() - started,
          metadata: {
            source: "adzuna",
            query,
            location,
            http_status: adzunaRes.status,
          },
        });
        return new Response(JSON.stringify({ error: "Adzuna request failed" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await adzunaRes.json();
      const normalized = await normalizeAdzunaJobs(data.results || []);

      const { error: upsertError } = await service
        .from("jobs_catalog")
        .upsert(normalized, { onConflict: "dedupe_hash" });
      if (upsertError) throw upsertError;

      const durationMs = Date.now() - started;
      await service.from("job_search_runs").insert({
        user_id: user.id,
        source: "adzuna",
        query,
        location,
        filters: { page, resultsPerPage },
        fetched_count: (data.results || []).length,
        deduped_count: normalized.length,
        inserted_count: normalized.length,
        status: "success",
        duration_ms: durationMs,
        finished_at: new Date().toISOString(),
      });
      await service.from("job_tracker_telemetry").insert({
        user_id: user.id,
        metric_type: "ingest",
        status: "success",
        duration_ms: durationMs,
        metadata: {
          source: "adzuna",
          query,
          location,
          fetched: (data.results || []).length,
          imported: normalized.length,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          fetched: (data.results || []).length,
          imported: normalized.length,
          durationMs,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "list") {
      const query = (body.query as string | undefined)?.trim();
      const location = (body.location as string | undefined)?.trim();
      const limit = Math.min(100, Math.max(1, Number(body.limit || 30)));
      const offset = Math.max(0, Number(body.offset || 0));

      let q = service
        .from("jobs_catalog")
        .select("*")
        .order("posted_at", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (query) {
        // Match on ANY significant word rather than the whole phrase, so word
        // order and extra words don't hide relevant roles — e.g. a search for
        // "Full Stack Developer" still returns "Senior Full-Stack Engineer".
        // Hyphens and slashes split words rather than being stripped inside
        // them, or "Full-Stack" would collapse to the token "FullStack" and
        // never match a real title. Words are then sanitized so PostgREST
        // `or()` parsing can't be broken.
        const words = query
          .split(/[\s\-–—/]+/)
          .map((w) => w.replace(/[^\p{L}\p{N}+#.]/gu, "").trim())
          .filter((w) => w.length >= 3);
        if (words.length) {
          const orExpr = words.map((w) => `title.ilike.%${w}%`).join(",");
          q = q.or(orExpr);
        } else {
          q = q.ilike("title", `%${query}%`);
        }
      }
      if (location) q = q.ilike("location", `%${location}%`);

      const { data, error } = await q;
      if (error) throw error;

      return new Response(JSON.stringify({ jobs: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_to_tracker") {
      const catalogJobId = body.catalogJobId as string | undefined;
      if (!catalogJobId) {
        return new Response(JSON.stringify({ error: "catalogJobId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: catalogJob, error: catalogError } = await service
        .from("jobs_catalog")
        .select("*")
        .eq("id", catalogJobId)
        .single();
      if (catalogError || !catalogJob) {
        return new Response(JSON.stringify({ error: "Job not found in catalog" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: inserted, error: insertError } = await service
        .from("job_applications")
        .insert({
          user_id: user.id,
          jobs_catalog_id: catalogJob.id,
          job_title: catalogJob.title,
          company: catalogJob.company,
          status: "applied",
          job_url: catalogJob.canonical_url,
          location: catalogJob.location,
          salary_range:
            catalogJob.salary_min && catalogJob.salary_max
              ? `$${Math.round(Number(catalogJob.salary_min) / 1000)}k - $${Math.round(
                  Number(catalogJob.salary_max) / 1000,
                )}k`
              : null,
          job_type: catalogJob.job_type,
          job_description: catalogJob.full_description,
          notes: body.notes || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      await service.from("application_events").insert({
        user_id: user.id,
        application_id: inserted.id,
        source: "system",
        event_type: "job_saved_from_catalog",
        summary: "Saved from discovery feed",
        payload: {
          jobs_catalog_id: catalogJob.id,
          source: catalogJob.source,
          title: catalogJob.title,
          company: catalogJob.company,
        },
      });

      return new Response(JSON.stringify({ success: true, applicationId: inserted.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

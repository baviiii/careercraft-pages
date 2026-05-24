import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deriveFitScore, summarizeResumeContent, uniqueTop } from "./scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getAuthClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, key);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = getAuthClient(req);
    const {
      data: { user },
      error: userError,
    } = await auth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = getServiceClient();
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "score") {
      const started = Date.now();
      const applicationId = body.applicationId as string | undefined;
      if (!applicationId) {
        return new Response(JSON.stringify({ error: "applicationId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: application, error: appErr } = await service
        .from("job_applications")
        .select("id, user_id, resume_id, jobs_catalog_id, job_description, job_title, company")
        .eq("id", applicationId)
        .single();
      if (appErr || !application || application.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Application not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let resumeContent = "";
      if (application.resume_id) {
        const { data: resume } = await service
          .from("resumes")
          .select("content")
          .eq("id", application.resume_id)
          .single();
        resumeContent = summarizeResumeContent(resume?.content);
      }

      const jobText = `${application.job_title || ""}\n${application.job_description || ""}`;
      const scored = deriveFitScore(resumeContent, jobText);
      const { score, overlap, missing } = scored;

      const strengths = uniqueTop(overlap, 8).map((k) => `Strong alignment on ${k}`);
      const gaps = uniqueTop(missing, 8).map((k) => `Missing mention of ${k}`);
      const nextActions = [
        "Mirror critical keywords from the job posting in your top 3 bullet points.",
        "Quantify impact for at least two achievements tied to this role.",
        "Tailor your summary line to this job title and domain.",
      ];
      const suggestedRewrites = uniqueTop(missing, 3).map(
        (k) => `Add a bullet demonstrating hands-on experience with ${k} and measurable outcomes.`,
      );

      const { data: inserted, error: insertErr } = await service
        .from("job_fit_scores")
        .insert({
          user_id: user.id,
          application_id: application.id,
          jobs_catalog_id: application.jobs_catalog_id,
          resume_id: application.resume_id,
          score,
          strengths,
          gaps,
          next_actions: nextActions,
          suggested_bullet_rewrites: suggestedRewrites,
          model: "heuristic-keyword-v1",
          scoring_version: "v1",
          raw_output: {
            overlapCount: scored.overlapCount,
            jobKeywordCount: scored.jobKeywordCount,
          },
        })
        .select("*")
        .single();
      if (insertErr) throw insertErr;

      await service
        .from("job_applications")
        .update({ fit_score_latest: score })
        .eq("id", application.id);

      await service.from("application_events").insert({
        user_id: user.id,
        application_id: application.id,
        source: "system",
        event_type: "fit_score_generated",
        summary: `Generated fit score ${score}/100`,
        payload: {
          scoreId: inserted.id,
          score,
        },
      });

      await service.from("job_tracker_telemetry").insert({
        user_id: user.id,
        metric_type: "fit_score",
        status: "success",
        duration_ms: Date.now() - started,
        metadata: {
          application_id: application.id,
          score,
          overlap_count: scored.overlapCount,
          keyword_count: scored.jobKeywordCount,
        },
      });

      return new Response(JSON.stringify({ success: true, fit: inserted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_for_application") {
      const applicationId = body.applicationId as string | undefined;
      if (!applicationId) {
        return new Response(JSON.stringify({ error: "applicationId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await service
        .from("job_fit_scores")
        .select("*")
        .eq("user_id", user.id)
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;

      return new Response(JSON.stringify({ fits: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { deriveFitScore, summarizeResumeContent, uniqueTop } from "./scoring.ts";
import { NotFoundError, ValidationError } from "../_shared/ai/errors.ts";
import { adminClient } from "../_shared/db/supabase.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

serve(handler(async (req) => {
  const { userId } = await requireUser(req);
  const service = adminClient();
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "score") {
    const started = Date.now();
    const applicationId = body.applicationId as string | undefined;
    if (!applicationId) {
      throw new ValidationError("applicationId is required");
    }

    const { data: application, error: appErr } = await service
      .from("job_applications")
      .select("id, user_id, resume_id, jobs_catalog_id, job_description, job_title, company")
      .eq("id", applicationId)
      .single();
    if (appErr || !application || application.user_id !== userId) {
      throw new NotFoundError("Application not found");
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
        user_id: userId,
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
      user_id: userId,
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
      user_id: userId,
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

    return json({ success: true, fit: inserted });
  }

  if (action === "list_for_application") {
    const applicationId = body.applicationId as string | undefined;
    if (!applicationId) {
      throw new ValidationError("applicationId is required");
    }

    const { data, error } = await service
      .from("job_fit_scores")
      .select("*")
      .eq("user_id", userId)
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;

    return json({ fits: data || [] });
  }

  throw new ValidationError("Invalid action");
}, { name: "job-fit-score" }));

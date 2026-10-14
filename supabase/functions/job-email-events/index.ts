import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { classifyEmail, statusFromEvent } from "./classifier.ts";
import { NotFoundError, ValidationError } from "../_shared/ai/errors.ts";
import { adminClient } from "../_shared/db/supabase.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

serve(handler(async (req) => {
  const { userId } = await requireUser(req);
  const service = adminClient();
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  /* get_settings / save_settings used to live here, for an "email sync"
     switch, a confidence threshold and auto-apply. Nothing ever read an
     inbox, so they're gone; job_automation_settings is no longer used. */

  if (action === "classify_email") {
    const started = Date.now();
    const applicationId = body.applicationId as string | undefined;
    const emailBody = (body.emailBody as string | undefined)?.trim();
    const subject = (body.subject as string | undefined)?.trim() || "";
    if (!applicationId || !emailBody) {
      throw new ValidationError("applicationId and emailBody are required");
    }

    const { data: app, error: appErr } = await service
      .from("job_applications")
      .select("id, user_id, status")
      .eq("id", applicationId)
      .single();
    if (appErr || !app || app.user_id !== userId) {
      throw new NotFoundError("Application not found");
    }

    const { eventType, confidence, summary } = classifyEmail(`${subject}\n${emailBody}`);
    const targetStatus = statusFromEvent(eventType);

    /* Nothing moves without the person saying so: this suggests a stage and
       confirm_status_update applies it once they agree. */
    const shouldApplyStatus = false;

    const { data: eventInserted, error: eventErr } = await service
      .from("application_events")
      .insert({
        user_id: userId,
        application_id: applicationId,
        source: "email",
        event_type: eventType,
        summary,
        confidence,
        auto_applied: shouldApplyStatus,
        payload: {
          subject,
          excerpt: emailBody.slice(0, 700),
          target_status: targetStatus,
        },
      })
      .select("*")
      .single();
    if (eventErr) throw eventErr;

    await service.from("job_tracker_telemetry").insert({
      user_id: userId,
      metric_type: "email_classification",
      status: "success",
      duration_ms: Date.now() - started,
      metadata: {
        application_id: applicationId,
        event_type: eventType,
        confidence,
        should_apply_status: shouldApplyStatus,
        target_status: targetStatus,
      },
    });

    return json({
      success: true,
      event: eventInserted,
      recommendation: {
        targetStatus,
        shouldApplyStatus,
        requiresUserConfirmation: Boolean(targetStatus),
      },
    });
  }

  if (action === "confirm_status_update") {
    const applicationId = body.applicationId as string | undefined;
    const status = body.status as string | undefined;
    if (!applicationId || !status) {
      throw new ValidationError("applicationId and status are required");
    }
    if (!["applied", "interview", "offer", "rejected"].includes(status)) {
      throw new ValidationError("status must be applied, interview, offer or rejected");
    }

    const { data: app, error: appErr } = await service
      .from("job_applications")
      .select("id, user_id, status")
      .eq("id", applicationId)
      .single();
    if (appErr || !app || app.user_id !== userId) {
      throw new NotFoundError("Application not found");
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await service
      .from("job_applications")
      .update({
        status,
        last_status_change_at: now,
        // A saved job that moves on has now been applied for; the board's
        // own moves stamp this too (useJobTracker's leavingSaved).
        ...(app.status === "saved" ? { applied_date: now } : {}),
      })
      .eq("id", applicationId);
    if (updateErr) throw updateErr;

    await service.from("application_events").insert({
      user_id: userId,
      application_id: applicationId,
      source: "manual",
      event_type: "status_changed",
      summary: `Status updated to ${status}`,
      payload: { status },
    });

    return json({ success: true });
  }

  if (action === "list_events") {
    const applicationId = body.applicationId as string | undefined;
    if (!applicationId) {
      throw new ValidationError("applicationId is required");
    }

    const { data, error } = await service
      .from("application_events")
      .select("*")
      .eq("user_id", userId)
      .eq("application_id", applicationId)
      .order("occurred_at", { ascending: false })
      .limit(40);
    if (error) throw error;

    return json({ events: data || [] });
  }

  throw new ValidationError("Invalid action");
}, { name: "job-email-events" }));

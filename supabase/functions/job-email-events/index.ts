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

  if (action === "get_settings") {
    const { data, error } = await service
      .from("job_automation_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    const defaults = {
      user_id: userId,
      email_sync_enabled: false,
      confidence_threshold: 72,
      auto_apply_non_destructive: true,
    };
    return json({ settings: data || defaults });
  }

  if (action === "save_settings") {
    const settings = {
      user_id: userId,
      email_sync_enabled: Boolean(body.email_sync_enabled),
      confidence_threshold: Math.max(0, Math.min(100, Number(body.confidence_threshold ?? 72))),
      auto_apply_non_destructive: Boolean(body.auto_apply_non_destructive ?? true),
    };

    const { error } = await service
      .from("job_automation_settings")
      .upsert(settings, { onConflict: "user_id" });
    if (error) throw error;

    return json({ success: true, settings });
  }

  if (action === "classify_email") {
    const started = Date.now();
    const applicationId = body.applicationId as string | undefined;
    const emailBody = (body.emailBody as string | undefined)?.trim();
    const subject = (body.subject as string | undefined)?.trim() || "";
    const requireConfirm = Boolean(body.requireConfirm ?? true);
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

    const { data: settings } = await service
      .from("job_automation_settings")
      .select("confidence_threshold, auto_apply_non_destructive, email_sync_enabled")
      .eq("user_id", userId)
      .single();

    const threshold = Number(settings?.confidence_threshold ?? 72);
    const autoApply = Boolean(settings?.auto_apply_non_destructive ?? true);
    const isDestructive = targetStatus === "rejected";
    const shouldApplyStatus =
      Boolean(targetStatus) &&
      confidence >= threshold &&
      autoApply &&
      !requireConfirm &&
      !isDestructive;

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

    if (shouldApplyStatus && targetStatus) {
      await service
        .from("job_applications")
        .update({ status: targetStatus, last_status_change_at: new Date().toISOString() })
        .eq("id", applicationId);
    }

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
        requiresUserConfirmation:
          Boolean(targetStatus) && (!shouldApplyStatus || isDestructive || requireConfirm),
      },
    });
  }

  if (action === "confirm_status_update") {
    const applicationId = body.applicationId as string | undefined;
    const status = body.status as "applied" | "interview" | "offer" | "rejected" | undefined;
    if (!applicationId || !status) {
      throw new ValidationError("applicationId and status are required");
    }

    const { data: app, error: appErr } = await service
      .from("job_applications")
      .select("id, user_id")
      .eq("id", applicationId)
      .single();
    if (appErr || !app || app.user_id !== userId) {
      throw new NotFoundError("Application not found");
    }

    await service
      .from("job_applications")
      .update({ status, last_status_change_at: new Date().toISOString() })
      .eq("id", applicationId);

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { classifyEmail, statusFromEvent } from "./classifier.ts";

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
      error: userErr,
    } = await auth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = getServiceClient();
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "get_settings") {
      const { data, error } = await service
        .from("job_automation_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      const defaults = {
        user_id: user.id,
        email_sync_enabled: false,
        confidence_threshold: 72,
        auto_apply_non_destructive: true,
      };
      return new Response(JSON.stringify({ settings: data || defaults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_settings") {
      const settings = {
        user_id: user.id,
        email_sync_enabled: Boolean(body.email_sync_enabled),
        confidence_threshold: Math.max(0, Math.min(100, Number(body.confidence_threshold ?? 72))),
        auto_apply_non_destructive: Boolean(body.auto_apply_non_destructive ?? true),
      };

      const { error } = await service
        .from("job_automation_settings")
        .upsert(settings, { onConflict: "user_id" });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, settings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "classify_email") {
      const started = Date.now();
      const applicationId = body.applicationId as string | undefined;
      const emailBody = (body.emailBody as string | undefined)?.trim();
      const subject = (body.subject as string | undefined)?.trim() || "";
      const requireConfirm = Boolean(body.requireConfirm ?? true);
      if (!applicationId || !emailBody) {
        return new Response(JSON.stringify({ error: "applicationId and emailBody are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: app, error: appErr } = await service
        .from("job_applications")
        .select("id, user_id, status")
        .eq("id", applicationId)
        .single();
      if (appErr || !app || app.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Application not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { eventType, confidence, summary } = classifyEmail(`${subject}\n${emailBody}`);
      const targetStatus = statusFromEvent(eventType);

      const { data: settings } = await service
        .from("job_automation_settings")
        .select("confidence_threshold, auto_apply_non_destructive, email_sync_enabled")
        .eq("user_id", user.id)
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
          user_id: user.id,
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
        user_id: user.id,
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

      return new Response(
        JSON.stringify({
          success: true,
          event: eventInserted,
          recommendation: {
            targetStatus,
            shouldApplyStatus,
            requiresUserConfirmation:
              Boolean(targetStatus) && (!shouldApplyStatus || isDestructive || requireConfirm),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "confirm_status_update") {
      const applicationId = body.applicationId as string | undefined;
      const status = body.status as "applied" | "interview" | "offer" | "rejected" | undefined;
      if (!applicationId || !status) {
        return new Response(JSON.stringify({ error: "applicationId and status are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: app, error: appErr } = await service
        .from("job_applications")
        .select("id, user_id")
        .eq("id", applicationId)
        .single();
      if (appErr || !app || app.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Application not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await service
        .from("job_applications")
        .update({ status, last_status_change_at: new Date().toISOString() })
        .eq("id", applicationId);

      await service.from("application_events").insert({
        user_id: user.id,
        application_id: applicationId,
        source: "manual",
        event_type: "status_changed",
        summary: `Status updated to ${status}`,
        payload: { status },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_events") {
      const applicationId = body.applicationId as string | undefined;
      if (!applicationId) {
        return new Response(JSON.stringify({ error: "applicationId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await service
        .from("application_events")
        .select("*")
        .eq("user_id", user.id)
        .eq("application_id", applicationId)
        .order("occurred_at", { ascending: false })
        .limit(40);
      if (error) throw error;

      return new Response(JSON.stringify({ events: data || [] }), {
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

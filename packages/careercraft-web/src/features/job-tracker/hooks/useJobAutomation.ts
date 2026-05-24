import { useCallback, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import type { ApplicationEvent, JobAutomationSettings } from "../types";

const defaultSettings: JobAutomationSettings = {
  email_sync_enabled: false,
  confidence_threshold: 72,
  auto_apply_non_destructive: true,
};

export function useJobAutomation() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<JobAutomationSettings>(defaultSettings);
  const [eventsByApplication, setEventsByApplication] = useState<Record<string, ApplicationEvent[]>>({});
  const [isBusy, setIsBusy] = useState(false);

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("job-email-events", {
      body: { action: "get_settings" },
    });
    if (error) throw error;
    setSettings((data?.settings as JobAutomationSettings) || defaultSettings);
  }, []);

  const saveSettings = useCallback(
    async (next: JobAutomationSettings) => {
      try {
        setIsBusy(true);
        const { error } = await supabase.functions.invoke("job-email-events", {
          body: { action: "save_settings", ...next },
        });
        if (error) throw error;
        setSettings(next);
        toast({ title: "Automation settings saved" });
      } catch (e) {
        toast({
          title: "Could not save settings",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsBusy(false);
      }
    },
    [toast],
  );

  const loadEvents = useCallback(async (applicationId: string) => {
    const { data, error } = await supabase.functions.invoke("job-email-events", {
      body: { action: "list_events", applicationId },
    });
    if (error) throw error;
    const events = (data?.events || []) as ApplicationEvent[];
    setEventsByApplication((prev) => ({ ...prev, [applicationId]: events }));
    return events;
  }, []);

  const classifyEmail = useCallback(
    async (applicationId: string, subject: string, emailBody: string, requireConfirm = true) => {
      setIsBusy(true);
      try {
        const { data, error } = await supabase.functions.invoke("job-email-events", {
          body: {
            action: "classify_email",
            applicationId,
            subject,
            emailBody,
            requireConfirm,
          },
        });
        if (error) throw error;
        await loadEvents(applicationId);
        return data;
      } finally {
        setIsBusy(false);
      }
    },
    [loadEvents],
  );

  const confirmStatusUpdate = useCallback(
    async (applicationId: string, status: "applied" | "interview" | "offer" | "rejected") => {
      setIsBusy(true);
      try {
        const { error } = await supabase.functions.invoke("job-email-events", {
          body: { action: "confirm_status_update", applicationId, status },
        });
        if (error) throw error;
        await loadEvents(applicationId);
        toast({ title: "Status updated" });
      } catch (e) {
        toast({
          title: "Status update failed",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsBusy(false);
      }
    },
    [loadEvents, toast],
  );

  return {
    settings,
    setSettings,
    eventsByApplication,
    isBusy,
    loadSettings,
    saveSettings,
    loadEvents,
    classifyEmail,
    confirmStatusUpdate,
  };
}

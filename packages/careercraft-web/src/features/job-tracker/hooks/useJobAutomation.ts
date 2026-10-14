import { useCallback, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import type { ApplicationEvent } from "../types";

/* The email check on a job: suggest a stage from a pasted email, log it,
   and apply it once the person confirms. (Settings for an "email sync" that
   never read an inbox used to live here too.) */
export function useJobAutomation() {
  const { toast } = useToast();
  const [eventsByApplication, setEventsByApplication] = useState<Record<string, ApplicationEvent[]>>({});
  const [isBusy, setIsBusy] = useState(false);

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
    async (applicationId: string, subject: string, emailBody: string) => {
      setIsBusy(true);
      try {
        const { data, error } = await supabase.functions.invoke("job-email-events", {
          body: {
            action: "classify_email",
            applicationId,
            subject,
            emailBody,
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
    eventsByApplication,
    isBusy,
    loadEvents,
    classifyEmail,
    confirmStatusUpdate,
  };
}

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { JobCatalogJob } from "@/features/job-tracker/types";

/* Same key Browse Jobs dedupes by: job-search's save_to_tracker doesn't
   dedupe server-side, and SA Health posts a dozen "Registered Nurse" ads
   at different hospitals, so title + company + place. */
const titleKey = (title: string, company: string, location: string | null | undefined) =>
  `${title}|${company}|${location ?? ""}`.trim().toLowerCase();

/**
 * One-tap "Save to tracker" for the roles on Home. Knows what's already in
 * the tracker so a role saved from Browse Jobs shows as saved here too.
 */
export function useTrackerSaves() {
  const { toast } = useToast();
  const [urls, setUrls] = useState<Set<string>>(new Set());
  const [titles, setTitles] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from("job_applications")
        .select("job_url, job_title, company, location")
        .eq("user_id", session.user.id);
      if (!alive || !data) return;
      setUrls(new Set(data.map((r) => r.job_url).filter(Boolean) as string[]));
      setTitles(new Set(data.map((r) => titleKey(r.job_title, r.company, r.location))));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const isTracked = useCallback(
    (job: JobCatalogJob) =>
      (job.canonical_url ? urls.has(job.canonical_url) : false) ||
      titles.has(titleKey(job.title, job.company, job.location)),
    [urls, titles],
  );

  const save = useCallback(
    async (job: JobCatalogJob) => {
      setSavingId(job.id);
      try {
        const { error } = await supabase.functions.invoke("job-search", {
          body: { action: "save_to_tracker", job },
        });
        if (error) throw error;
        if (job.canonical_url) setUrls((s) => new Set(s).add(job.canonical_url as string));
        setTitles((s) => new Set(s).add(titleKey(job.title, job.company, job.location)));
        toast({ title: "Saved to your tracker", description: `${job.title} is in the Saved lane.` });
      } catch (e) {
        toast({
          title: "Couldn't save that job",
          description: e instanceof Error ? e.message : "Try again in a moment.",
          variant: "destructive",
        });
      } finally {
        setSavingId(null);
      }
    },
    [toast],
  );

  return { isTracked, save, savingId };
}

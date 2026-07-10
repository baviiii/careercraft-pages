import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import type { JobCatalogJob } from "../types";

interface DiscoveryFilters {
  query: string;
  location: string;
}

/** Personalized defaults, seeded into the feed once the profile has loaded. */
interface DiscoveryPersonalization {
  query?: string;
  location?: string;
  /** False while the profile is still loading — hold off the first fetch. */
  ready?: boolean;
}

export function useJobDiscovery(
  onSavedToTracker?: () => Promise<void> | void,
  personalized?: DiscoveryPersonalization,
) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobCatalogJob[]>([]);
  const [filters, setFilters] = useState<DiscoveryFilters>({ query: "", location: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [lastIngestSummary, setLastIngestSummary] = useState<string>("");

  const listJobs = useCallback(
    async (override?: Partial<DiscoveryFilters>): Promise<JobCatalogJob[]> => {
      const query = (override?.query ?? filters.query) || undefined;
      const location = (override?.location ?? filters.location) || undefined;
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("job-ingest-adzuna", {
          body: {
            action: "list",
            query,
            location,
            limit: 40,
            offset: 0,
          },
        });
        if (error) throw error;
        const results = (data?.jobs || []) as JobCatalogJob[];
        setJobs(results);
        return results;
      } catch (e) {
        toast({
          title: "Discovery unavailable",
          description: e instanceof Error ? e.message : "Failed to load discovery jobs.",
          variant: "destructive",
        });
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [filters.location, filters.query, toast],
  );

  const ingest = useCallback(
    async (override?: Partial<DiscoveryFilters>): Promise<JobCatalogJob[]> => {
      const query = (override?.query ?? filters.query) || undefined;
      const location = (override?.location ?? filters.location) || undefined;
      setIsIngesting(true);
      try {
        const { data, error } = await supabase.functions.invoke("job-ingest-adzuna", {
          body: {
            action: "ingest",
            query,
            location,
            page: 1,
            resultsPerPage: 40,
          },
        });
        if (error) throw error;

        const summary = `Ingested ${data?.imported ?? 0} jobs`;
        setLastIngestSummary(summary);
        toast({
          title: "Discovery refreshed",
          description: summary,
        });
        return await listJobs(override);
      } catch (e) {
        toast({
          title: "Ingestion failed",
          description: e instanceof Error ? e.message : "Could not ingest Adzuna jobs.",
          variant: "destructive",
        });
        return [];
      } finally {
        setIsIngesting(false);
      }
    },
    [filters.location, filters.query, listJobs, toast],
  );

  const saveToTracker = useCallback(
    async (catalogJobId: string) => {
      try {
        const { error } = await supabase.functions.invoke("job-ingest-adzuna", {
          body: { action: "save_to_tracker", catalogJobId },
        });
        if (error) throw error;
        toast({
          title: "Saved to tracker",
          description: "Job added to your application pipeline.",
        });
        await onSavedToTracker?.();
      } catch (e) {
        toast({
          title: "Save failed",
          description: e instanceof Error ? e.message : "Could not save job to tracker.",
          variant: "destructive",
        });
      }
    },
    [onSavedToTracker, toast],
  );

  // One-time init: wait for the profile to resolve, then show roles matched to
  // the user's target role + preferred location. The local catalog may not hold
  // that role yet, so if there are no personalized matches we pull fresh roles
  // straight from the market (Adzuna) using the same profile. We deliberately do
  // NOT fall back to generic/unfiltered jobs — a personalized feed should stay
  // personalized (even if that means an honest empty state).
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    if (personalized?.ready === false) return;
    didInit.current = true;

    const q = personalized?.query?.trim() || "";
    const loc = personalized?.location?.trim() || "";

    // No profile signal at all → just show whatever the catalog has.
    if (!q && !loc) {
      void listJobs();
      return;
    }

    setFilters({ query: q, location: loc });

    void (async () => {
      // 1) Personalized match from the local catalog.
      let results = await listJobs({ query: q, location: loc });

      // 2) Same role, drop the (brittle) location filter.
      if (results.length === 0 && q && loc) {
        results = await listJobs({ query: q, location: "" });
        if (results.length > 0) setFilters({ query: q, location: "" });
      }

      // 3) Nothing personalized in the catalog → pull fresh from the market.
      if (results.length === 0) {
        results = await ingest({ query: q, location: loc });
        if (results.length === 0 && q && loc) {
          setFilters({ query: q, location: "" });
          await listJobs({ query: q, location: "" });
        }
      }
    })();
  }, [personalized?.ready, personalized?.query, personalized?.location, listJobs, ingest]);

  return {
    jobs,
    filters,
    setFilters,
    isLoading,
    isIngesting,
    lastIngestSummary,
    ingest,
    listJobs,
    saveToTracker,
  };
}

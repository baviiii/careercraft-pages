import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import type { JobCatalogJob } from "../types";

interface DiscoveryFilters {
  query: string;
  location: string;
}

export function useJobDiscovery(onSavedToTracker?: () => Promise<void> | void) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobCatalogJob[]>([]);
  const [filters, setFilters] = useState<DiscoveryFilters>({ query: "", location: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [lastIngestSummary, setLastIngestSummary] = useState<string>("");

  const listJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("job-ingest-adzuna", {
        body: {
          action: "list",
          query: filters.query || undefined,
          location: filters.location || undefined,
          limit: 40,
          offset: 0,
        },
      });
      if (error) throw error;
      setJobs(data?.jobs || []);
    } catch (e) {
      toast({
        title: "Discovery unavailable",
        description: e instanceof Error ? e.message : "Failed to load discovery jobs.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters.location, filters.query, toast]);

  const ingest = useCallback(async () => {
    setIsIngesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("job-ingest-adzuna", {
        body: {
          action: "ingest",
          query: filters.query || undefined,
          location: filters.location || undefined,
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
      await listJobs();
    } catch (e) {
      toast({
        title: "Ingestion failed",
        description: e instanceof Error ? e.message : "Could not ingest Adzuna jobs.",
        variant: "destructive",
      });
    } finally {
      setIsIngesting(false);
    }
  }, [filters.location, filters.query, listJobs, toast]);

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

  useEffect(() => {
    listJobs();
  }, [listJobs]);

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

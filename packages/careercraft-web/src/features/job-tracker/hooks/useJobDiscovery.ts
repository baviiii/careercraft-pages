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
  /**
   * Alternate phrasings of the same role, from the profile. The board matches
   * on keywords, so one title finds one wording — "ICU Nurse" misses "Critical
   * Care Registered Nurse". Searched together and merged.
   */
  terms?: string[];
  /**
   * The profile as a short sentence, for ranking by meaning. `terms` above is
   * the blunt fix for keyword matching — enumerate every phrasing you can think
   * of — and this is the one that does not need them enumerated in advance.
   */
  profileText?: string;
  /** False while the profile is still loading — hold off the first fetch. */
  ready?: boolean;
}

/**
 * The discovery feed: roles from the market, searched live.
 *
 * This used to read a jobs_catalog table that ingest filled in bulk. The cache
 * only pays off with traffic — one person's search warming the next person's —
 * and with none it just accumulated stale rows, which `list` then served with
 * no freshness filter. Searching the board directly means every result is
 * current by construction, and the three-rung "catalog, then broader catalog,
 * then give up and ingest" ladder collapses into a single call.
 */
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

  /** Results are held here so saveToTracker can resolve a job from its id. */
  const jobsRef = useRef<JobCatalogJob[]>([]);

  const search = useCallback(
    async (
      override?: Partial<DiscoveryFilters>,
      opts?: { terms?: string[] },
    ): Promise<JobCatalogJob[]> => {
      const query = (override?.query ?? filters.query) || undefined;
      const location = (override?.location ?? filters.location) || undefined;
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("job-search", {
          body: {
            action: "search",
            query,
            location,
            terms: opts?.terms ?? personalized?.terms,
            limit: 40,
            profileText: personalized?.profileText,
          },
        });
        if (error) throw error;
        const results = (data?.jobs || []) as JobCatalogJob[];
        setJobs(results);
        jobsRef.current = results;
        return results;
      } catch (e) {
        toast({
          title: "Search unavailable",
          description: e instanceof Error ? e.message : "Could not reach the job board.",
          variant: "destructive",
        });
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [filters.location, filters.query, personalized?.terms, toast],
  );

  /** The explicit refresh button — the same search, but it announces itself. */
  const refresh = useCallback(
    async (
      override?: Partial<DiscoveryFilters>,
      opts?: { silent?: boolean },
    ): Promise<JobCatalogJob[]> => {
      setIsIngesting(true);
      try {
        const results = await search(override);
        const summary = `${results.length} role${results.length === 1 ? "" : "s"} on the wire`;
        setLastIngestSummary(summary);
        if (!opts?.silent) {
          toast({ title: "Search refreshed", description: summary });
        }
        return results;
      } finally {
        setIsIngesting(false);
      }
    },
    [search, toast],
  );

  const saveToTracker = useCallback(
    async (jobId: string) => {
      // Resolved from the results in hand rather than sent as an id: with no
      // catalog there is nothing server-side to look the id up in.
      const job = jobsRef.current.find((j) => j.id === jobId);
      if (!job) {
        toast({
          title: "Save failed",
          description: "That role is no longer in the current results.",
          variant: "destructive",
        });
        return;
      }

      try {
        const { error } = await supabase.functions.invoke("job-search", {
          body: { action: "save_to_tracker", job },
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

  // One-time init: wait for the profile, then search the market for the user's
  // role near them. A personalized feed stays personalized — if there is
  // genuinely nothing, an honest empty state beats generic filler.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    if (personalized?.ready === false) return;
    didInit.current = true;

    const q = personalized?.query?.trim() || "";
    const loc = personalized?.location?.trim() || "";

    if (!q && !loc) {
      void search();
      return;
    }

    setFilters({ query: q, location: loc });

    void (async () => {
      const results = await search({ query: q, location: loc });

      // Adzuna resolves small suburbs poorly — it answers 200 with zero results
      // rather than erroring, so a location miss looks like a healthy empty
      // feed. Widen to the whole country before concluding there is no work.
      if (results.length === 0 && q && loc) {
        setFilters({ query: q, location: "" });
        const widened = await search({ query: q, location: "" });
        setLastIngestSummary(
          widened.length > 0
            ? `No ${q} roles near ${loc} — widened to all of Australia`
            : `No ${q} roles on the wire right now`,
        );
      }
    })();
  }, [personalized?.ready, personalized?.query, personalized?.location, search]);

  return {
    jobs,
    filters,
    setFilters,
    isLoading,
    isIngesting,
    lastIngestSummary,
    // Names kept so JobTrackerPage needs no change: `ingest` is now the
    // refresh button, and `listJobs` is a plain search.
    ingest: refresh,
    listJobs: search,
    saveToTracker,
  };
}

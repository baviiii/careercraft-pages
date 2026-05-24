import { useCallback, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import type { JobFitScore } from "../types";

export function useJobFitScoring() {
  const { toast } = useToast();
  const [isScoring, setIsScoring] = useState(false);
  const [scoresByApplication, setScoresByApplication] = useState<Record<string, JobFitScore[]>>({});

  const refreshScores = useCallback(
    async (applicationId: string) => {
      const { data, error } = await supabase.functions.invoke("job-fit-score", {
        body: { action: "list_for_application", applicationId },
      });
      if (error) throw error;
      const fits = (data?.fits || []) as JobFitScore[];
      setScoresByApplication((prev) => ({ ...prev, [applicationId]: fits }));
      return fits;
    },
    [],
  );

  const generateScore = useCallback(
    async (applicationId: string) => {
      setIsScoring(true);
      try {
        const { error } = await supabase.functions.invoke("job-fit-score", {
          body: { action: "score", applicationId },
        });
        if (error) throw error;
        await refreshScores(applicationId);
        toast({
          title: "Fit score ready",
          description: "Generated a new fit analysis for this application.",
        });
      } catch (e) {
        toast({
          title: "Fit scoring failed",
          description: e instanceof Error ? e.message : "Could not generate fit score.",
          variant: "destructive",
        });
      } finally {
        setIsScoring(false);
      }
    },
    [refreshScores, toast],
  );

  return {
    isScoring,
    scoresByApplication,
    refreshScores,
    generateScore,
  };
}

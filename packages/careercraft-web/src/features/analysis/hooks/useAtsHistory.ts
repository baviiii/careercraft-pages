/* The person's past ATS checks, newest first, for the list under the form.
   Only the light columns load here; the full result loads when one is opened
   (useAnalysis().openCheck). RLS keeps it to their own checks. */

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

import { HELD_CHECK } from "./useAnalysis";

export interface PastCheck {
  id: string;
  created_at: string;
  overall_score: number;
  resume_name: string | null;
  job_label: string | null;
}

const PAGE = 10;

/** `active`: the form is showing, so the list should be fresh. */
export function useAtsHistory(active: boolean) {
  const [checks, setChecks] = useState<PastCheck[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const load = useCallback(async (count: number) => {
    const { data, error } = await supabase
      .from("ats_checks")
      .select("id, created_at, overall_score, resume_name, job_label")
      .order("created_at", { ascending: false })
      .limit(count + 1);
    if (error || !data) return;
    setChecks(data.slice(0, count));
    setHasMore(data.length > count);
  }, []);

  // Each time the form shows, so a check that just finished is in the list.
  useEffect(() => {
    if (active) void load(limit);
  }, [active, limit, load]);

  const remove = useCallback(
    async (id: string) => {
      setChecks((cs) => cs.filter((c) => c.id !== id));
      if (sessionStorage.getItem(HELD_CHECK) === id) sessionStorage.removeItem(HELD_CHECK);
      const { error } = await supabase.from("ats_checks").delete().eq("id", id);
      // Didn't go: put the list back as it is.
      if (error) void load(limit);
    },
    [limit, load]
  );

  const showMore = useCallback(() => setLimit((n) => n + PAGE), []);

  return { checks, hasMore, remove, showMore };
}

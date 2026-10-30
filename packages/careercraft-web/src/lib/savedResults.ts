/**
 * The coach's saved results: a career read, a roadmap, a certification plan or
 * review, a learning pathway, the weekly note, the coach's read of practice
 * patterns.
 *
 * The interview coach saves each one whole (ai_recommendations.payload, the
 * same shape its REST response has) against the job it was for (subject), and
 * expires the older ones. Reading the newest straight from the database shows
 * it at once, with no coach call and no cold start, the way session history is
 * read. A tab only asks the coach again when someone presses Refresh.
 *
 * Anything that goes wrong here (no row, an error, the columns not migrated
 * yet) is "nothing saved yet": the tab still works, it just starts empty.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { supabase } from "@/integrations/supabase/client";

export type SavedResultType =
  | "career_guidance"
  | "roadmap"
  | "certification"
  | "certification_analysis"
  | "pathway"
  | "weekly_insight"
  | "pattern_analysis";

/**
 * How the coach files a subject or level: trimmed, spaces collapsed,
 * lower-cased. Must match interview-coach-mcp `src/context/saved-results.ts`
 * (savedKey) exactly, or nothing is ever found.
 */
export function savedKey(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return s ? s.slice(0, 200) : null;
}

export interface Saved<T> {
  id: string;
  payload: T;
  savedAt: string;
}

/**
 * The newest saved result of a type for a job. `level` filters only when it's
 * given (null means "saved without a level"); leave it undefined for results
 * that don't depend on one.
 */
export async function fetchLatestSaved<T>(
  type: SavedResultType,
  subject: string | null | undefined,
  level?: string | null,
): Promise<Saved<T> | null> {
  const key = savedKey(subject);
  if (!key) return null;
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    let query = supabase
      .from("ai_recommendations")
      .select("id, payload, created_at")
      .eq("user_id", auth.user.id)
      .eq("recommendation_type", type)
      .eq("subject", key)
      .eq("status", "active");
    if (level !== undefined) {
      const lv = savedKey(level);
      query = lv ? query.eq("level", lv) : query.is("level", null);
    }
    const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !data?.payload) return null;
    return { id: data.id, payload: data.payload as T, savedAt: data.created_at };
  } catch {
    return null;
  }
}

export function useLatestSaved<T>(type: SavedResultType, subject: string | null | undefined, level?: string | null) {
  return useQuery({
    queryKey: ["coach-saved", type, savedKey(subject), level === undefined ? "*" : savedKey(level)],
    queryFn: () => fetchLatestSaved<T>(type, subject, level),
    enabled: savedKey(subject) !== null,
    staleTime: 60_000,
  });
}

/** After a fresh result is saved, re-read that type so the tab shows the new one. */
export function useForgetSaved() {
  const queryClient = useQueryClient();
  return (type: SavedResultType) => queryClient.invalidateQueries({ queryKey: ["coach-saved", type] });
}

/** "Saved 3 days ago", for the line above a saved result. */
export function savedAgo(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "Saved earlier" : `Saved ${formatDistanceToNow(at, { addSuffix: true })}`;
}

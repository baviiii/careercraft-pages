/**
 * The learner's study plans.
 *
 * The coach saves every plan it builds (ai_recommendations, type "pathway"):
 * the main plan for each job, and one for each thing they asked to explore.
 * Rebuilding a plan replaces it; a new one sits beside the others. This lists
 * them, remembers which one is open, and deletes one when asked, straight from
 * the database (own rows only, by RLS), the way session history is read.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { LearningPathway } from "@/lib/careerCoach";
import { savedKey } from "@/lib/savedResults";

export interface StudyPlanRow {
  id: string;
  pathway: LearningPathway;
  savedAt: string;
  /** The job it was filed under, lower-cased (and " · explore: …" for an explore plan). */
  subject: string | null;
  /** How the coach described it: "4w · 5 h/week · Software Engineer". */
  description: string | null;
}

export const PLANS_QUERY_KEY = ["study-plans"] as const;

/** Newest first. Nothing saved, an error, or no columns yet all read as "no plans". */
export async function fetchStudyPlans(): Promise<StudyPlanRow[]> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];
    const { data, error } = await supabase
      .from("ai_recommendations")
      .select("id, payload, subject, description, created_at")
      .eq("user_id", auth.user.id)
      .eq("recommendation_type", "pathway")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) return [];
    return (data ?? []).flatMap((row) => {
      const pathway = (row.payload as { pathway?: LearningPathway } | null)?.pathway;
      if (!pathway?.plan) return [];
      return [{ id: row.id, pathway, savedAt: row.created_at, subject: row.subject, description: row.description }];
    });
  } catch {
    return [];
  }
}

/**
 * gcTime 0, like session history: the key isn't per user, so the rows are
 * dropped as soon as nothing shows them and a different sign-in never sees
 * the last person's plans.
 */
export function useStudyPlans() {
  return useQuery({ queryKey: PLANS_QUERY_KEY, queryFn: fetchStudyPlans, staleTime: 30_000, gcTime: 0 });
}

export function useRefreshPlans() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
}

export async function deleteStudyPlan(id: string): Promise<void> {
  const { error } = await supabase.from("ai_recommendations").delete().eq("id", id);
  if (error) throw error;
}

/** What a plan is called on its tab: what it explores, or the job. */
export function planName(p: LearningPathway): string {
  const name = p.explore?.trim() || p.field || "Your plan";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** The main plan for this job (not an explore plan, not another job's). */
export function isMainPlanFor(row: StudyPlanRow, field: string | undefined): boolean {
  return !row.pathway.explore && savedKey(row.subject) !== null && savedKey(row.subject) === savedKey(field);
}

/** Weeks and hours a week, as it was built, so Rebuild asks for the same again. */
export function planSize(row: StudyPlanRow): { weeks: number; hours: number } {
  const desc = row.description ?? "";
  const weeks = Number(/(\d+)\s*w\b/.exec(desc)?.[1]) || row.pathway.plan?.weeks?.length || 4;
  const hours = Number(/(\d+)\s*h\s*\/\s*week/.exec(desc)?.[1]) || 5;
  return { weeks, hours };
}

// Which plan is open: a per-browser convenience, so it can be missing at any time.
const OPEN_KEY = "faircopy.study.openPlan";

export function rememberedPlanId(): string | null {
  try {
    return window.localStorage.getItem(OPEN_KEY);
  } catch {
    return null;
  }
}

export function rememberPlanId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(OPEN_KEY, id);
    else window.localStorage.removeItem(OPEN_KEY);
  } catch {
    /* storage blocked: the newest plan opens next time instead */
  }
}

/**
 * Study drills the learner keeps (study_drills): ones saved to finish later,
 * and every finished one with its answer and marks. Study writes them; History
 * and Home read them. Read and written straight from the database, own rows
 * only, like session history.
 *
 * The site can deploy a few minutes ahead of its migration. Until the table is
 * there, reads come back empty and a failed write only means the drill isn't
 * kept: the drill itself, and the skill level it moves, still work.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Drill, DrillResult, DrillScheduling } from "@/lib/careerCoach";
import { isNotMigratedYet } from "@/lib/schemaLag";

export interface DrillRow {
  id: string;
  skill: string;
  field: string | null;
  exercise: Drill;
  scheduling: DrillScheduling | null;
  status: "saved" | "done";
  answer: string | null;
  score: number | null;
  scoredBy: "coach" | "self" | null;
  result: DrillResult | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export const DRILLS_QUERY_KEY = ["study-drills"] as const;

type Raw = {
  id: string;
  skill: string;
  field: string | null;
  drill: unknown;
  status: string;
  answer: string | null;
  score: number | string | null;
  scored_by: string | null;
  result: unknown;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

function toRow(r: Raw): DrillRow | null {
  const stored = (r.drill ?? {}) as { exercise?: Drill; scheduling?: DrillScheduling | null };
  if (!stored.exercise?.prompt) return null;
  const score = r.score === null ? null : Number(r.score);
  return {
    id: r.id,
    skill: r.skill,
    field: r.field,
    exercise: stored.exercise,
    scheduling: stored.scheduling ?? null,
    status: r.status === "done" ? "done" : "saved",
    answer: r.answer,
    score: score !== null && Number.isFinite(score) ? score : null,
    scoredBy: r.scored_by === "coach" || r.scored_by === "self" ? r.scored_by : null,
    result: (r.result as DrillResult | null) ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at,
  };
}

/** Newest first: the last 200, plenty for progress and history. */
export async function fetchDrills(limit = 200): Promise<DrillRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("study_drills")
    .select("id, skill, field, drill, status, answer, score, scored_by, result, created_at, updated_at, completed_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (isNotMigratedYet(error)) return [];
  if (error) throw error;
  return ((data ?? []) as Raw[]).flatMap((r) => toRow(r) ?? []);
}

/** gcTime 0 for the same reason as session history: the key isn't per user. */
export function useDrills() {
  return useQuery({ queryKey: DRILLS_QUERY_KEY, queryFn: () => fetchDrills(), staleTime: 0, gcTime: 0 });
}

export async function signedInUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function userId(): Promise<string> {
  const id = await signedInUserId();
  if (!id) throw new Error("Sign in to keep drills.");
  return id;
}

const stored = (exercise: Drill, scheduling: DrillScheduling | null) => ({ exercise, scheduling }) as unknown as Json;

/** Put a drill aside, with whatever is written so far. Returns its id. */
export async function saveDrill(args: {
  id?: string | null;
  exercise: Drill;
  scheduling: DrillScheduling | null;
  field?: string;
  answer?: string;
}): Promise<string> {
  const answer = args.answer?.trim() ? args.answer.slice(0, 8000) : null;
  if (args.id) {
    const { error } = await supabase.from("study_drills").update({ answer }).eq("id", args.id);
    if (error) throw error;
    return args.id;
  }
  const { data, error } = await supabase
    .from("study_drills")
    .insert({
      user_id: await userId(),
      skill: (args.scheduling?.skill ?? args.exercise.skill).slice(0, 100),
      field: args.field?.slice(0, 100) || null,
      drill: stored(args.exercise, args.scheduling),
      status: "saved",
      answer,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Keep a finished drill: its answer, mark and what it did to the skill. */
export async function finishDrill(args: {
  id?: string | null;
  exercise: Drill;
  scheduling: DrillScheduling | null;
  field?: string;
  answer?: string;
  result: DrillResult;
}): Promise<void> {
  const done = {
    status: "done",
    answer: args.answer?.trim() ? args.answer.slice(0, 8000) : null,
    score: Math.max(0, Math.min(10, args.result.score)),
    scored_by: args.result.scoredBy,
    result: args.result as unknown as Json,
    completed_at: new Date().toISOString(),
  };
  if (args.id) {
    const { error } = await supabase.from("study_drills").update(done).eq("id", args.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("study_drills").insert({
    user_id: await userId(),
    skill: (args.result.skill || args.scheduling?.skill || args.exercise.skill).slice(0, 100),
    field: args.field?.slice(0, 100) || null,
    drill: stored(args.exercise, args.scheduling),
    ...done,
  });
  if (error) throw error;
}

export async function deleteDrill(id: string): Promise<void> {
  const { error } = await supabase.from("study_drills").delete().eq("id", id);
  if (error) throw error;
}

/** Re-read drills everywhere (Study, History, Home) after a change. */
export function useRefreshDrills() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: DRILLS_QUERY_KEY });
}

/* ── Progress ───────────────────────────────────────────────────────────── */

export interface SkillDrillProgress {
  skill: string;
  attempts: number;
  /** Oldest to newest, the last six. */
  scores: number[];
  last: number;
  /** Last mark minus the one before; null after one attempt. */
  change: number | null;
  lastAt: string;
}

export interface DrillStats {
  done: number;
  thisWeek: number;
  /** Mean of the last ten marks, one decimal. */
  average: number | null;
  saved: number;
  /** Most recently drilled first. */
  skills: SkillDrillProgress[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function finished(rows: DrillRow[]): DrillRow[] {
  return rows.filter((r) => r.status === "done" && r.score !== null);
}

export function drillStats(rows: DrillRow[], now = Date.now()): DrillStats {
  const done = finished(rows).sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
  const recent = done.slice(0, 10).map((r) => r.score!);
  const bySkill = new Map<string, DrillRow[]>();
  for (const r of done) {
    const key = r.skill.trim().toLowerCase();
    bySkill.set(key, [...(bySkill.get(key) ?? []), r]);
  }
  const skills = [...bySkill.values()].map((list): SkillDrillProgress => {
    const scores = list.slice(0, 6).map((r) => r.score!).reverse();
    return {
      skill: list[0]!.skill,
      attempts: list.length,
      scores,
      last: scores[scores.length - 1]!,
      change: scores.length > 1 ? round1(scores[scores.length - 1]! - scores[scores.length - 2]!) : null,
      lastAt: list[0]!.completedAt ?? list[0]!.createdAt,
    };
  });
  return {
    done: done.length,
    thisWeek: done.filter((r) => now - new Date(r.completedAt ?? r.createdAt).getTime() < WEEK_MS).length,
    average: recent.length ? round1(recent.reduce((a, b) => a + b, 0) / recent.length) : null,
    saved: rows.filter((r) => r.status === "saved").length,
    skills,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function scoreTone(score: number): "good" | "mid" | "low" {
  return score >= 8 ? "good" : score >= 5 ? "mid" : "low";
}

/** What a mark means for the skill, in plain words. */
export function markVerdict(score: number): string {
  if (score >= 8) return "Strong. This skill can wait longer before it comes back.";
  if (score >= 5) return "Holding steady. It comes back on the usual schedule.";
  return "Shaky. This skill comes back sooner for another go.";
}

/** "7.5" or "7": marks read as written, without a trailing ".0". */
export function mark(n: number): string {
  return String(round1(n));
}

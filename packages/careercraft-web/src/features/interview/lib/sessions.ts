import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Framework } from "@/lib/interviewCoach";
import { isNotMigratedYet } from "@/lib/schemaLag";

import { parseRoundType, type RoundType } from "./roundTypes";

/**
 * Normalize a raw score to 0–100 for hub/history display.
 * Per-question MCP scores are often 0–10; overall debrief scores are 0–100.
 */
export function normalizeScore100(raw: number | null | undefined): number | null {
  if (raw == null || !(raw > 0)) return null;
  if (raw <= 10) return Math.round(raw * 10);
  return Math.round(Math.min(100, raw));
}

/**
 * A completed session's overall score (raw). Prefer debrief overallScore,
 * fall back to avg_score. Use normalizeScore100 for UI /100 labels.
 */
export function sessionOverallScore(s: {
  avg_score?: number | null;
  ai_insights?: unknown;
  final_evaluation?: unknown;
}): number | null {
  const evalObj = (s.ai_insights ?? s.final_evaluation) as { overallScore?: unknown } | null;
  const raw = evalObj && typeof evalObj === "object" ? evalObj.overallScore : undefined;
  if (typeof raw === "number" && raw > 0) return raw;
  if (typeof s.avg_score === "number" && s.avg_score > 0) return s.avg_score;
  return null;
}

export interface SessionRow {
  id: string;
  field: string;
  seniority: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  question_count: number | null;
  avg_score: number | null;
  ai_insights: unknown;
  duration_seconds: number | null;
  /** Always set: sessions from before round types count as full interviews. */
  round_type: RoundType;
  /** The tracker job it was practice for, when there was one. */
  job_application_id: string | null;
  /** Public-sector framework it practised against, if any. */
  framework: Framework | null;
}

const COLUMNS =
  "id, field, seniority, status, created_at, completed_at, question_count, avg_score, ai_insights, duration_seconds";

/**
 * RLS-scoped session history for the signed-in user, newest first. The most
 * recent 200: enough for progress by type and history; the all-time total
 * comes from useSessionTotal, so it isn't capped by this.
 */
export async function fetchSessionHistory(limit = 200): Promise<SessionRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const read = (columns: string) =>
    supabase
      .from("interview_sessions")
      .select(columns)
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

  // Newest columns first, then step back one migration at a time, so a
  // database that has round_type but not the practice-loop columns still
  // colours sessions by type, and one with neither still loads history
  // (every session then shows as a full interview).
  let res = await read(`${COLUMNS}, round_type, framework, job_application_id`);
  if (isNotMigratedYet(res.error)) res = await read(`${COLUMNS}, round_type`);
  if (isNotMigratedYet(res.error)) res = await read(COLUMNS);
  if (res.error) throw res.error;

  type Raw = Omit<SessionRow, "round_type" | "job_application_id" | "framework"> & {
    round_type?: unknown;
    job_application_id?: string | null;
    framework?: string | null;
  };
  return ((res.data ?? []) as unknown as Raw[]).map((row) => ({
    ...row,
    round_type: parseRoundType(row.round_type),
    job_application_id: row.job_application_id ?? null,
    framework: row.framework === "aps" || row.framework === "nsw" ? row.framework : null,
  }));
}

export const SESSIONS_QUERY_KEY = ["interview-sessions"] as const;

/**
 * One read of the learner's sessions, shared by the round picker, the
 * progress panel and history. staleTime 0: coming back from the interview
 * room must show the session just finished, and readers mounting together
 * still share a single request. gcTime 0: the key isn't per user, so the rows
 * are dropped as soon as nothing on screen shows them — signing out and in as
 * someone else can never flash the last person's sessions.
 */
export function useInterviewSessions() {
  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: () => fetchSessionHistory(),
    staleTime: 0,
    gcTime: 0,
  });
}

/** Every session they've ever started, counted in the database (not capped like the history read). */
export function useSessionTotal(): number | undefined {
  const { data } = useQuery({
    // Under the sessions key, so whatever refreshes sessions refreshes this.
    queryKey: [...SESSIONS_QUERY_KEY, "total"],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return 0;
      const { count, error } = await supabase
        .from("interview_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id);
      if (error) throw error;
      return count ?? 0;
    },
  });
  return data;
}

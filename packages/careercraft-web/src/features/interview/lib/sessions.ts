import { supabase } from "@/integrations/supabase/client";

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
}

/** RLS-scoped session history for the signed-in user, newest first. */
export async function fetchSessionHistory(limit = 30): Promise<SessionRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("interview_sessions")
    .select(
      "id, field, seniority, status, created_at, completed_at, question_count, avg_score, ai_insights",
    )
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SessionRow[];
}

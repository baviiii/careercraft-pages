import { supabase } from "@/integrations/supabase/client";

/**
 * A completed session's overall score, normalized to a 0-100 percentage.
 * The MCP (`finish_interview`) writes the debrief to `ai_insights` and the
 * scalar to `avg_score`; older edge-function sessions used `final_evaluation`.
 * Prefer the debrief's overallScore (always 0-100), fall back to avg_score.
 */
export function sessionOverallScore(s: {
  avg_score?: number | null;
  ai_insights?: unknown;
  final_evaluation?: unknown;
}): number | null {
  const evalObj = (s.ai_insights ?? s.final_evaluation) as { overallScore?: unknown } | null;
  const raw = evalObj && typeof evalObj === "object" ? evalObj.overallScore : undefined;
  if (typeof raw === "number" && raw > 0) return Math.round(raw);
  if (typeof s.avg_score === "number" && s.avg_score > 0) return Math.round(s.avg_score);
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

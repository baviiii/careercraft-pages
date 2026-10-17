/**
 * The practice loop's reads: the story library, recent scored story answers
 * (for STAR habits), and the learner's tracker jobs (practise for a real
 * interview). All RLS-scoped to the signed-in user.
 *
 * Each read treats a missing table or column as "nothing yet" rather than an
 * error: these arrive with migration 20261017010000, and the page should
 * still work, just emptier, if the site ever runs ahead of it.
 */
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { adaptStoredEvaluation, type CoachAnswerEvaluation } from "@/lib/interviewCoach";
import { isNotMigratedYet as missing } from "@/lib/schemaLag";

async function userId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ── stories ──────────────────────────────────────────────────────────── */

export interface Story {
  competency: string;
  title: string;
  bestAnswer: string;
  bestScore: number | null;
  timesPractised: number;
  lastPractisedAt: string;
}

export async function fetchStories(): Promise<Story[]> {
  const uid = await userId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("interview_stories")
    .select("competency, title, best_answer, best_score, times_practised, last_practised_at")
    .eq("user_id", uid)
    .order("last_practised_at", { ascending: false });
  if (missing(error)) return [];
  if (error) throw error;
  return (data ?? []).map((r) => ({
    competency: r.competency,
    title: r.title,
    bestAnswer: r.best_answer,
    bestScore: r.best_score === null ? null : Number(r.best_score),
    timesPractised: r.times_practised,
    lastPractisedAt: r.last_practised_at,
  }));
}

/** Same lifecycle as useInterviewSessions: fresh on mount, dropped when unused. */
export function useStories() {
  return useQuery({ queryKey: ["interview-stories"], queryFn: fetchStories, staleTime: 0, gcTime: 0 });
}

/* ── recent story answers (STAR habits) ───────────────────────────────── */

export interface ScoredAnswer {
  answeredAt: string;
  answer: string;
  evaluation: CoachAnswerEvaluation;
}

/** The last 30 answers that carry a stored evaluation, newest first. */
export async function fetchScoredAnswers(): Promise<ScoredAnswer[]> {
  const uid = await userId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("interview_answers")
    .select("answered_at, answer_text, evaluation")
    .eq("user_id", uid)
    .not("evaluation", "is", null)
    .order("answered_at", { ascending: false })
    .limit(30);
  if (missing(error)) return [];
  if (error) throw error;
  return (data ?? [])
    .map((r) => {
      const evaluation = adaptStoredEvaluation(r.evaluation, r.answer_text.length);
      return evaluation ? { answeredAt: r.answered_at, answer: r.answer_text, evaluation } : null;
    })
    .filter((r): r is ScoredAnswer => r !== null);
}

export function useScoredAnswers() {
  return useQuery({ queryKey: ["interview-scored-answers"], queryFn: fetchScoredAnswers, staleTime: 0, gcTime: 0 });
}

/* ── tracker jobs ─────────────────────────────────────────────────────── */

export interface TrackerJob {
  id: string;
  title: string;
  company: string;
  status: string;
  description: string | null;
  /**
   * The interview date set on the job in the tracker. Not the follow-up
   * date: that's a reminder to chase, and counting down to it as if it were
   * the interview would be wrong.
   */
  interviewDate: string | null;
}

/** Jobs worth practising for: interviews first, then applied and saved. */
export async function fetchTrackerJobs(): Promise<TrackerJob[]> {
  const uid = await userId();
  if (!uid) return [];
  const read = (columns: string) =>
    supabase
      .from("job_applications")
      .select(columns)
      .eq("user_id", uid)
      .in("status", ["interview", "applied", "saved"])
      .order("updated_at", { ascending: false })
      .limit(40);
  const base = "id, job_title, company, status, job_description, updated_at";
  let res = await read(`${base}, interview_date`);
  // Before the interview_date migration the jobs still load, just undated.
  if (missing(res.error)) res = await read(base);
  if (missing(res.error)) return [];
  if (res.error) throw res.error;
  type Raw = {
    id: string;
    job_title: string;
    company: string;
    status: string;
    job_description: string | null;
    interview_date?: string | null;
  };
  const rank: Record<string, number> = { interview: 0, applied: 1, saved: 2 };
  return ((res.data ?? []) as unknown as Raw[])
    .map((r) => ({
      id: r.id,
      title: r.job_title,
      company: r.company,
      status: r.status,
      description: r.job_description,
      interviewDate: r.interview_date ?? null,
    }))
    .sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3));
}

export function useTrackerJobs() {
  return useQuery({ queryKey: ["interview-tracker-jobs"], queryFn: fetchTrackerJobs, staleTime: 0, gcTime: 0 });
}

/**
 * How many practice sessions were for one tracker job — shown on the job in
 * the tracker. Zero (not an error) while the column isn't there yet.
 */
export function usePracticeCount(jobId: string | null): number {
  const { data } = useQuery({
    queryKey: ["interview-practice-count", jobId],
    enabled: Boolean(jobId),
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("interview_sessions")
        .select("id", { count: "exact", head: true })
        .eq("job_application_id", jobId!);
      if (error) return 0;
      return count ?? 0;
    },
  });
  return data ?? 0;
}

/** "Data Analyst at SA Health". */
export function jobLabel(job: Pick<TrackerJob, "title" | "company">): string {
  return job.company ? `${job.title} at ${job.company}` : job.title;
}

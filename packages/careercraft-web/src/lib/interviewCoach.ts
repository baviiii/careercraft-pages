/**
 * interviewCoach — typed client for the Interview Prep surface.
 *
 * Powered by the `interview-ai` Supabase edge function (Gemini via the Lovable
 * AI gateway). Sessions are persisted to `interview_sessions` (RLS-scoped to the
 * signed-in user) so the Progress Dashboard reflects real activity.
 *
 * If the edge function is unreachable / errors, calls throw
 * CoachUnavailableError and the UI shows "not available at the moment" — never
 * fabricated data.
 *
 * NOTE: Source-backed learning resources / proven tips are not provided by the
 * edge function; those helpers resolve to an empty/unavailable state until a
 * dedicated backend exists.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * The interview engine ships with the app as a Supabase edge function, so the
 * coach is always "available" (subject to the function's own AI credentials).
 */
export const COACH_AVAILABLE = true;

export class CoachUnavailableError extends Error {
  constructor(message = "Interview coach is not available at the moment.") {
    super(message);
    this.name = "CoachUnavailableError";
  }
}

/* ── Shared proof type (kept for UI compatibility; edge returns none) ─────── */

export interface Proof {
  kind: string;
  label: string;
  stat: string;
  url: string;
}

/* ── Wire shapes (what the interview-ai edge function returns) ────────────── */

interface WireQuestion {
  id: number;
  question: string;
  type: string;
  difficulty: string;
  category?: string;
  skillsTested?: string[];
  expectedTopics?: string[];
  timeAllocationMinutes?: number;
}

interface WireGenerate {
  sessionId?: string | null;
  questions?: WireQuestion[];
}

type WireBreakdownEntry = { score?: number } | number;

interface WireEvaluation {
  score?: number;
  scoreBreakdown?: Record<string, WireBreakdownEntry>;
  validation?: {
    strengths?: string[];
    correct?: string[];
    missing?: string[];
    redFlags?: string[];
  };
  improvedAnswer?: { rewritten?: string; keyChanges?: string[] };
  faangAnswer?: { example?: string; whyItWorks?: string };
  confidenceAssessment?: { overall?: number };
  coachingTips?: Array<{ priority?: string; tip?: string }>;
  nextQuestionSuggestion?: string;
}

interface WireFinal {
  overallScore?: number;
  grade?: string;
  readiness?: string;
  executiveSummary?: string;
  strengths?: { top?: string[]; notable?: string[]; potential?: string[] };
  developmentAreas?: { critical?: string[]; important?: string[]; minor?: string[] };
  improvementPlan?: { immediate?: Array<{ area: string; action: string; timeline: string }> };
}

/* ── UI-facing shapes (consumed by InterviewPrep.tsx / dashboard) ─────────── */

export interface CoachQuestion {
  id: number;
  question: string;
  type: string;
  difficulty: string;
  expectedTopics: string[];
  category?: string;
  skillsTested?: string[];
}

export interface StartSessionResult {
  sessionId: string;
  questions: CoachQuestion[];
}

export interface CoachAnswerEvaluation {
  score: number;
  scoreBreakdown: Record<string, number>;
  validation: { correct: string[]; missing: string[]; redFlags: string[] };
  bestAnswer: string;
  faangAnswer: string;
  confidence: number;
  tips: string[];
  improvement: string;
  proof: Proof | null;
}

export interface CoachFinalEvaluation {
  overallScore: number;
  grade: string;
  readiness: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  mustFix: string[];
  improvementPlan: Array<{ area: string; action: string; timeline: string }>;
}

export interface CoachResource {
  id: string;
  title: string;
  description: string;
  type: "video" | "article" | "course" | "practice";
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: string;
  url: string;
  skill: string;
  provider: string;
  rating?: number;
  proof: Proof | null;
}

export interface ProvenTip {
  tip: string;
  proof: Proof | null;
  verified: boolean;
}

export interface PatternAnalysis {
  patternSummary?: string;
  strengths?: { consistent?: string[]; improving?: string[]; evidence?: string };
  weaknesses?: { persistent?: string[]; declining?: string[]; evidence?: string };
  recommendations?: Array<{
    priority?: number;
    skill?: string;
    reason?: string;
    suggestedPractice?: string;
    expectedTimeToImprove?: string;
  }>;
}

export interface WeeklyInsight {
  headline?: string;
  summary?: string;
  highlights?: Array<{ type?: string; title?: string; detail?: string; emoji?: string }>;
  motivationalMessage?: string;
  weeklyGoals?: Array<{ goal?: string; reason?: string; howToAchieve?: string }>;
}

/* ── Transport: Supabase edge function ───────────────────────────────────── */

async function callEdge<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  let data: unknown;
  let error: { message?: string } | null = null;
  try {
    const res = await supabase.functions.invoke("interview-ai", {
      body: { action, ...payload },
    });
    data = res.data;
    error = res.error;
  } catch {
    throw new CoachUnavailableError();
  }
  if (error) throw new CoachUnavailableError(error.message);
  if (data && typeof data === "object" && "error" in data) {
    throw new CoachUnavailableError(String((data as { error: unknown }).error));
  }
  return data as T;
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ── Adapters: wire shape → UI shape ─────────────────────────────────────── */

function flatScore(v: WireBreakdownEntry | undefined): number {
  if (typeof v === "number") return v;
  return typeof v?.score === "number" ? v.score : 0;
}

function adaptQuestions(qs: WireQuestion[]): CoachQuestion[] {
  return qs.map((q, i) => ({
    id: typeof q.id === "number" ? q.id : i + 1,
    question: q.question,
    type: q.type,
    difficulty: q.difficulty,
    expectedTopics: q.expectedTopics ?? [],
    category: q.category,
    skillsTested: q.skillsTested,
  }));
}

function adaptEvaluation(ev: WireEvaluation): CoachAnswerEvaluation {
  const breakdown: Record<string, number> = {};
  for (const [k, v] of Object.entries(ev.scoreBreakdown ?? {})) breakdown[k] = flatScore(v);
  const score = typeof ev.score === "number" ? ev.score : 0;
  const confidence =
    typeof ev.confidenceAssessment?.overall === "number"
      ? Math.max(0, Math.min(100, Math.round(ev.confidenceAssessment.overall)))
      : Math.max(0, Math.min(100, Math.round(score * 10)));
  return {
    score,
    scoreBreakdown: breakdown,
    validation: {
      correct: ev.validation?.correct ?? ev.validation?.strengths ?? [],
      missing: ev.validation?.missing ?? [],
      redFlags: ev.validation?.redFlags ?? [],
    },
    bestAnswer: ev.improvedAnswer?.rewritten ?? "",
    faangAnswer: (ev.improvedAnswer?.keyChanges ?? []).join(" · "),
    confidence,
    tips: (ev.coachingTips ?? []).map((t) => t.tip ?? "").filter(Boolean),
    improvement: ev.nextQuestionSuggestion ?? "",
    proof: null,
  };
}

function adaptFinal(ev: WireFinal): CoachFinalEvaluation {
  return {
    overallScore: typeof ev.overallScore === "number" ? ev.overallScore : 0,
    grade: ev.grade ?? "—",
    readiness: ev.readiness ?? "Needs Development",
    summary: ev.executiveSummary ?? "",
    strengths: [...(ev.strengths?.top ?? []), ...(ev.strengths?.notable ?? [])],
    weaknesses: ev.developmentAreas?.important ?? [],
    mustFix: ev.developmentAreas?.critical ?? [],
    improvementPlan: ev.improvementPlan?.immediate ?? [],
  };
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export const interviewCoach = {
  available: COACH_AVAILABLE,

  async startSession(input: {
    field: string;
    seniority?: string;
    questionCount?: number;
    jobDescription?: string;
  }): Promise<StartSessionResult> {
    const raw = await callEdge<WireGenerate>("generate_questions", {
      field: input.field,
      seniority: input.seniority,
      count: input.questionCount,
      jobDescription: input.jobDescription,
    });
    const questions = adaptQuestions(raw.questions ?? []);

    // Persist a session row so the dashboard reflects real activity. A failure
    // here (e.g. signed out) must not block the interview — fall back to a
    // client-side id.
    let sessionId: string = crypto.randomUUID?.() ?? `${Date.now()}`;
    try {
      const uid = await currentUserId();
      if (uid) {
        const { data, error } = await supabase
          .from("interview_sessions")
          .insert({
            user_id: uid,
            field: input.field,
            seniority: input.seniority ?? null,
            job_description: input.jobDescription ?? null,
            questions: questions as unknown as Json,
            status: "in_progress",
            question_count: questions.length,
          })
          .select("id")
          .single();
        if (!error && data?.id) sessionId = data.id;
      }
    } catch {
      /* non-fatal: keep the fallback id */
    }

    return { sessionId, questions };
  },

  async submitAnswer(input: {
    sessionId: string;
    questionText: string;
    questionType?: string;
    answerText: string;
    field: string;
    seniority?: string;
    expectedTopics?: string[];
  }): Promise<CoachAnswerEvaluation> {
    const raw = await callEdge<WireEvaluation>("evaluate_answer", {
      field: input.field,
      seniority: input.seniority,
      question: input.questionText,
      questionType: input.questionType,
      answer: input.answerText,
      expectedTopics: input.expectedTopics,
    });
    return adaptEvaluation(raw ?? {});
  },

  async finish(input: {
    sessionId: string;
    field: string;
    seniority?: string;
    questions?: Array<{ question: string; type: string; difficulty: string }>;
    answers?: string[];
    evaluations?: Array<{ score: number }>;
    durationSeconds?: number;
  }): Promise<CoachFinalEvaluation> {
    const questions = (input.questions ?? []).map((q) => ({
      question: q.question,
      type: q.type,
      difficulty: q.difficulty,
    }));
    const answers = input.answers ?? [];
    const evaluations = (input.evaluations ?? []).map((e) => ({
      score: e.score,
      skillsTested: [] as string[],
    }));

    const raw = await callEdge<WireFinal>("final_evaluation", {
      field: input.field,
      seniority: input.seniority,
      questions,
      answers,
      evaluations,
      sessionDuration: input.durationSeconds
        ? Math.round(input.durationSeconds / 60)
        : undefined,
    });
    const final = adaptFinal(raw ?? {});

    // Persist the completed session so it shows in history / stats.
    try {
      if (input.sessionId) {
        const scores = evaluations.map((e) => e.score);
        const avg =
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null;
        await supabase
          .from("interview_sessions")
          .update({
            answers: answers as unknown as Json,
            scores: scores as unknown as Json,
            final_evaluation: raw as unknown as Json,
            status: "completed",
            avg_score: avg,
            duration_seconds: input.durationSeconds ?? null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", input.sessionId);
      }
    } catch {
      /* non-fatal: the evaluation still returns to the UI */
    }

    return final;
  },

  // Not backed by the edge function yet — resolve to an unavailable/empty state
  // so the UI degrades gracefully rather than showing fabricated data.
  async getResources(_input: {
    skills?: string[];
    goal?: string;
    maxResults?: number;
  }): Promise<CoachResource[]> {
    return [];
  },

  async getProvenTips(_input: {
    skill?: string;
    question?: string;
    count?: number;
  }): Promise<ProvenTip[]> {
    return [];
  },

  async analyzePatterns(input: {
    field?: string;
    seniority?: string;
    recentSessions?: unknown[];
    skillHistory?: unknown[];
  }): Promise<PatternAnalysis> {
    return callEdge<PatternAnalysis>("analyze_patterns", {
      recentSessions: input.recentSessions ?? [],
      skillHistory: input.skillHistory ?? [],
    });
  },

  async weeklyInsight(input: {
    field?: string;
    seniority?: string;
    weekData?: Record<string, unknown>;
  }): Promise<WeeklyInsight> {
    return callEdge<WeeklyInsight>("weekly_insight", {
      weekData: input.weekData,
    });
  },
};

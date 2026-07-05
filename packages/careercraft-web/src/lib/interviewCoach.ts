/**
 * interviewCoach — typed, REAL-ONLY client for the interview-coach-mcp.
 *
 * There is no mock path. If VITE_INTERVIEW_MCP_URL is not set, or the MCP is
 * unreachable / errors, calls throw CoachUnavailableError and the UI shows
 * "not available at the moment" — never fabricated data.
 *
 * Identity is the user's Supabase access token, forwarded as the bearer; the
 * MCP verifies it and scopes every DB read/write by RLS.
 */
import { supabase } from "@/integrations/supabase/client";

const MCP_URL = (import.meta.env.VITE_INTERVIEW_MCP_URL as string | undefined)?.replace(/\/$/, "");

/** True when an MCP endpoint is configured. The UI uses this to decide between live calls and the "not available" state. */
export const COACH_AVAILABLE = Boolean(MCP_URL);

export class CoachUnavailableError extends Error {
  constructor(message = "Interview coach is not available at the moment.") {
    super(message);
    this.name = "CoachUnavailableError";
  }
}

/* ── Wire shapes (what the MCP REST routes return) ───────────────────────── */

export interface Proof {
  kind: string;
  label: string;
  stat: string;
  url: string;
}

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

interface WireEvaluation {
  score?: number;
  scoreBreakdown?: Record<string, { score?: number } | number>;
  validation?: { strengths?: string[]; missing?: string[]; redFlags?: string[] };
  improvedAnswer?: { rewritten?: string; keyChanges?: string[] };
  coachingTips?: Array<{ priority?: string; tip?: string }>;
  suggestedFollowup?: string;
}

interface WireFinal {
  overallScore?: number;
  grade?: string;
  readiness?: string;
  recommendation?: string;
  executiveSummary?: string;
  strengths?: { top?: string[]; notable?: string[] };
  developmentAreas?: { critical?: string[]; important?: string[] };
  competencyMatrix?: Array<{ competency: string; score: number; level: string; developmentNeeded: boolean }>;
  improvementPlan?: { immediate?: Array<{ area: string; action: string; timeline: string }> };
}

interface WireResource {
  title: string;
  provider?: string;
  type?: string;
  url?: string;
  why?: string;
  proof?: Proof;
}

/* ── UI-facing shapes (normalized for InterviewPrep.tsx) ─────────────────── */

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

/* ── Transport ───────────────────────────────────────────────────────────── */

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!MCP_URL) throw new CoachUnavailableError();

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let res: Response;
  try {
    res = await fetch(`${MCP_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new CoachUnavailableError();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new CoachUnavailableError(`Interview coach error (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  return (await res.json()) as T;
}

/* ── Adapters: wire shape → UI shape ─────────────────────────────────────── */

function flatScore(v: { score?: number } | number | undefined): number {
  if (typeof v === "number") return v;
  return typeof v?.score === "number" ? v.score : 0;
}

function adaptEvaluation(ev: WireEvaluation, proof: Proof | null): CoachAnswerEvaluation {
  const breakdown: Record<string, number> = {};
  for (const [k, v] of Object.entries(ev.scoreBreakdown ?? {})) breakdown[k] = flatScore(v);
  const score = typeof ev.score === "number" ? ev.score : 0;
  return {
    score,
    scoreBreakdown: breakdown,
    validation: {
      correct: ev.validation?.strengths ?? [],
      missing: ev.validation?.missing ?? [],
      redFlags: ev.validation?.redFlags ?? [],
    },
    bestAnswer: ev.improvedAnswer?.rewritten ?? "",
    faangAnswer: (ev.improvedAnswer?.keyChanges ?? []).join(" · "),
    confidence: Math.max(0, Math.min(100, Math.round(score * 10))),
    tips: (ev.coachingTips ?? []).map((t) => t.tip ?? "").filter(Boolean),
    improvement: ev.suggestedFollowup ?? "",
    proof,
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

const RESOURCE_TYPES = new Set(["video", "article", "course", "practice"]);
function adaptResource(r: WireResource, i: number, fallbackSkill: string): CoachResource {
  const type = (r.type ?? "article").toLowerCase();
  return {
    id: r.url ?? `res-${i}`,
    title: r.title,
    description: r.why ?? "",
    type: (RESOURCE_TYPES.has(type) ? type : "article") as CoachResource["type"],
    difficulty: "intermediate",
    duration: "Self-paced",
    url: r.url ?? "#",
    skill: fallbackSkill,
    provider: r.provider ?? "Web",
    proof: r.proof ?? null,
  };
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export const interviewCoach = {
  available: COACH_AVAILABLE,

  async startSession(input: {
    field: string;
    seniority?: string;
    questionCount?: number;
  }): Promise<StartSessionResult> {
    const r = await post<{ sessionId: string | null; questions?: WireQuestion[] }>("/api/interview/start", input);
    const sessionId = r.sessionId ?? (crypto.randomUUID?.() ?? `${Date.now()}`);
    const questions = (r.questions ?? []).map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      difficulty: q.difficulty,
      expectedTopics: q.expectedTopics ?? [],
      category: q.category,
      skillsTested: q.skillsTested,
    }));
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
    const r = await post<{ evaluation: WireEvaluation; proof: Proof | null }>("/api/interview/answer", input);
    return adaptEvaluation(r.evaluation ?? {}, r.proof ?? null);
  },

  async finish(input: { sessionId: string; field: string; seniority?: string }): Promise<CoachFinalEvaluation> {
    const r = await post<{ evaluation: WireFinal }>("/api/interview/finish", input);
    return adaptFinal(r.evaluation ?? {});
  },

  async getResources(input: { skills?: string[]; goal?: string; maxResults?: number }): Promise<CoachResource[]> {
    const r = await post<{ skills?: string[]; resources?: WireResource[] }>("/api/resources", input);
    const fallbackSkill = input.skills?.[0] ?? r.skills?.[0] ?? "General";
    return (r.resources ?? []).map((res, i) => adaptResource(res, i, fallbackSkill));
  },

  async getProvenTips(input: { skill?: string; question?: string; count?: number }): Promise<ProvenTip[]> {
    const r = await post<{ tips?: Array<{ tip: string; proof: Proof | null; verified: boolean }> }>(
      "/api/proven-tips",
      input,
    );
    return (r.tips ?? []).map((t) => ({ tip: t.tip, proof: t.proof ?? null, verified: Boolean(t.verified) }));
  },

  async analyzePatterns(input: { field?: string; seniority?: string }): Promise<PatternAnalysis> {
    return post<PatternAnalysis>("/api/analytics/patterns", input);
  },

  async weeklyInsight(input: { field?: string; seniority?: string }): Promise<WeeklyInsight> {
    return post<WeeklyInsight>("/api/analytics/weekly", input);
  },
};

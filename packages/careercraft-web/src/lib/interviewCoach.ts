/**
 * interviewCoach — typed, REAL-ONLY client for the Interview Prep surface.
 *
 * Powered by the `interview-coach-mcp` server (the interview + study "domain
 * brain"): question generation, answer evaluation, final debrief, proof-backed
 * tips/resources and analytics all run through its REST surface, which executes
 * the matching MCP tool in-process. Model generation is Horus's, grounding is
 * real (Hacker News / community sources).
 *
 * There is no mock path. If VITE_INTERVIEW_MCP_URL is not set, or the MCP is
 * unreachable / errors, calls throw CoachUnavailableError and the UI shows "not
 * available at the moment" — never fabricated data. Companion to
 * `careerCoach.ts`, same contract.
 *
 * Identity is the user's Supabase access token, forwarded as the bearer; the
 * MCP verifies it and scopes every DB read/write (sessions, answers, score
 * history, skill signals) by RLS. Persistence lives in the MCP now — this client
 * no longer writes interview_sessions directly.
 */
import { supabase } from "@/integrations/supabase/client";

const MCP_URL = (import.meta.env.VITE_INTERVIEW_MCP_URL as string | undefined)?.replace(/\/$/, "");

/**
 * The coach is "available" only when the MCP is configured. When it isn't, the
 * Interview Prep surface degrades to its "not available" state rather than
 * silently doing nothing.
 */
export const COACH_AVAILABLE = Boolean(MCP_URL);

export class CoachUnavailableError extends Error {
  constructor(message = "Interview coach is not available at the moment.") {
    super(message);
    this.name = "CoachUnavailableError";
  }
}

/* ── Shared proof type ────────────────────────────────────────────────────── */

export interface Proof {
  kind: string;
  label: string;
  stat: string;
  url: string;
}

/* ── Wire shapes (what the MCP REST routes return) ────────────────────────── */

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

interface WireStart {
  sessionId?: string | null;
  analysis?: unknown;
  questions?: WireQuestion[];
}

interface WireRound {
  name?: string;
  minutes?: number;
  weight?: number;
  focusAreas?: string[];
  whyWeighted?: string;
}

interface WirePlan {
  plan?: {
    targetRole?: string;
    company?: string;
    rounds?: WireRound[];
    prepChecklist?: string[];
    predictedHardestRound?: string;
  };
  recommendationId?: string | null;
}

interface WireNext {
  question?: WireQuestion;
  difficulty?: string;
  focusSkill?: string;
}

interface WireHint {
  hint?: string;
  level?: string;
  framework?: string | null;
  followupThought?: string;
  struggleDetected?: boolean;
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
  coachingTips?: Array<{ priority?: string; tip?: string }>;
  suggestedFollowup?: string;
  nextQuestionSuggestion?: string;
}

/** submit_answer wraps the evaluation and attaches a grounded proof chip. */
interface WireAnswer {
  evaluation?: WireEvaluation;
  proof?: Proof | null;
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

/** finish_interview wraps the final evaluation. */
interface WireFinish {
  evaluation?: WireFinal;
}

interface WireResource {
  title?: string;
  provider?: string;
  type?: string;
  difficulty?: string;
  duration?: string;
  url?: string;
  why?: string;
  skill?: string;
  rating?: number;
  proof?: Proof | null;
}

interface WireResources {
  query?: string;
  skills?: string[];
  resources?: WireResource[];
}

interface WireProvenTip {
  tip?: string;
  proof?: Proof | null;
  verified?: boolean;
}

interface WireProvenTips {
  focus?: string;
  tips?: WireProvenTip[];
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
  timeAllocationMinutes?: number;
}

export interface StartSessionResult {
  sessionId: string;
  questions: CoachQuestion[];
}

export interface PlanRound {
  name: string;
  minutes: number;
  /** Relative emphasis of this round in the loop, 0–100. */
  weight: number;
  focusAreas: string[];
  whyWeighted: string;
}

export interface InterviewPlan {
  targetRole: string;
  company: string;
  rounds: PlanRound[];
  prepChecklist: string[];
  predictedHardestRound: string;
}

export interface NextQuestionResult {
  question: CoachQuestion;
  difficulty: string;
  focusSkill?: string;
}

export type HintLevel = "gentle" | "directional" | "structural";

export interface CoachHint {
  hint: string;
  level: HintLevel;
  framework: string | null;
  followupThought: string;
  struggleDetected: boolean;
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

/* ── Transport: interview-coach-mcp REST surface ─────────────────────────── */

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
    throw new CoachUnavailableError(
      `Interview coach error (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

/* ── Adapters: wire shape → UI shape ─────────────────────────────────────── */

function flatScore(v: WireBreakdownEntry | undefined): number {
  if (typeof v === "number") return v;
  return typeof v?.score === "number" ? v.score : 0;
}

function adaptProof(p: Proof | null | undefined): Proof | null {
  if (p && typeof p === "object" && typeof p.url === "string" && p.url) return p;
  return null;
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
    timeAllocationMinutes:
      typeof q.timeAllocationMinutes === "number" && q.timeAllocationMinutes > 0
        ? q.timeAllocationMinutes
        : undefined,
  }));
}

function adaptEvaluation(ev: WireEvaluation, proof: Proof | null | undefined): CoachAnswerEvaluation {
  const breakdown: Record<string, number> = {};
  for (const [k, v] of Object.entries(ev.scoreBreakdown ?? {})) breakdown[k] = flatScore(v);
  const score = typeof ev.score === "number" ? ev.score : 0;
  // The MCP evaluator returns no explicit confidence; derive it from the score.
  const confidence = Math.max(0, Math.min(100, Math.round(score * 10)));
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
    improvement: ev.suggestedFollowup ?? ev.nextQuestionSuggestion ?? "",
    proof: adaptProof(proof),
  };
}

/**
 * Also used by the History surface to re-open a completed session's debrief
 * from the `ai_insights` JSON the MCP persisted at finish time.
 */
export function adaptFinalEvaluation(raw: unknown): CoachFinalEvaluation {
  return adaptFinal((raw ?? {}) as WireFinal);
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

function adaptPlan(raw: WirePlan): InterviewPlan {
  const p = raw.plan ?? {};
  const rounds = (p.rounds ?? [])
    .filter((r) => r && typeof r.name === "string" && r.name)
    .map((r) => {
      // The model reports round weight as either a fraction (0.6) or a
      // percentage (60) — normalize to 0-100.
      const raw = typeof r.weight === "number" && r.weight > 0 ? r.weight : 0;
      const weight = Math.max(0, Math.min(100, Math.round(raw <= 1 ? raw * 100 : raw)));
      return {
        name: r.name!,
        minutes: typeof r.minutes === "number" && r.minutes > 0 ? Math.round(r.minutes) : 30,
        weight,
        focusAreas: (r.focusAreas ?? []).filter(Boolean),
        whyWeighted: r.whyWeighted ?? "",
      };
    });
  return {
    targetRole: p.targetRole ?? "",
    company: p.company ?? "",
    rounds,
    prepChecklist: (p.prepChecklist ?? []).filter(Boolean),
    predictedHardestRound: p.predictedHardestRound ?? "",
  };
}

const HINT_LEVELS: HintLevel[] = ["gentle", "directional", "structural"];

function adaptHint(raw: WireHint): CoachHint {
  const level = HINT_LEVELS.find((l) => l === raw.level) ?? "gentle";
  return {
    hint: raw.hint ?? "",
    level,
    framework: raw.framework ?? null,
    followupThought: raw.followupThought ?? "",
    struggleDetected: Boolean(raw.struggleDetected),
  };
}

const RESOURCE_TYPES: CoachResource["type"][] = ["video", "article", "course", "practice"];

function adaptResourceType(t: string | undefined): CoachResource["type"] {
  const s = (t ?? "").toLowerCase();
  return RESOURCE_TYPES.find((known) => s.includes(known)) ?? "article";
}

function adaptResource(r: WireResource, fallbackSkill: string): CoachResource {
  const url = r.url ?? r.proof?.url ?? "";
  return {
    id: url || (crypto.randomUUID?.() ?? `${Math.random()}`),
    title: r.title ?? "Untitled resource",
    description: r.why ?? "",
    type: adaptResourceType(r.type),
    difficulty: "intermediate",
    duration: r.duration ?? "",
    url,
    skill: r.skill ?? fallbackSkill,
    provider: r.provider ?? (r.proof?.label ?? "Community"),
    rating: r.rating,
    proof: adaptProof(r.proof),
  };
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export const interviewCoach = {
  available: COACH_AVAILABLE,

  /**
   * The structured loop: rounds with weights/focus areas, prep checklist,
   * predicted hardest round. Rounds seed startSession via focusAreas.
   */
  async buildPlan(input: {
    field: string;
    seniority?: string;
    jobDescription?: string;
    timeBudgetMinutes?: number;
  }): Promise<InterviewPlan> {
    const raw = await post<WirePlan>("/api/interview/plan", {
      source: {
        type: input.jobDescription ? "paste" : "role",
        jobDescription: input.jobDescription,
        field: input.field,
        seniority: input.seniority,
      },
      timeBudgetMinutes: input.timeBudgetMinutes,
    });
    const plan = adaptPlan(raw);
    if (!plan.rounds.length) {
      throw new CoachUnavailableError("Could not build an interview plan.");
    }
    return plan;
  },

  async startSession(input: {
    field: string;
    seniority?: string;
    questionCount?: number;
    jobDescription?: string;
    focusAreas?: string[];
  }): Promise<StartSessionResult> {
    const raw = await post<WireStart>("/api/interview/start", {
      field: input.field,
      seniority: input.seniority,
      questionCount: input.questionCount,
      jobDescription: input.jobDescription,
      focusAreas: input.focusAreas?.length ? input.focusAreas : undefined,
    });
    // The MCP opens the session row (RLS-scoped) and returns its id. We need a
    // real id to tie answers + the final debrief to; without it, evaluation and
    // history can't persist, so treat it as unavailable rather than limping on.
    if (!raw.sessionId) {
      throw new CoachUnavailableError("Could not start an interview session.");
    }
    return { sessionId: raw.sessionId, questions: adaptQuestions(raw.questions ?? []) };
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
    const raw = await post<WireAnswer>("/api/interview/answer", {
      sessionId: input.sessionId,
      questionText: input.questionText,
      questionType: input.questionType,
      answerText: input.answerText,
      field: input.field,
      seniority: input.seniority,
      expectedTopics: input.expectedTopics,
    });
    return adaptEvaluation(raw.evaluation ?? {}, raw.proof);
  },

  /**
   * Adaptive branch: the MCP reads this session's running scores, picks the
   * next difficulty, and probes the learner's weakest skill. This is what makes
   * Realistic mode feel like a real interviewer reacting to you.
   */
  async nextQuestion(input: {
    sessionId: string;
    field: string;
    seniority?: string;
    focusAreas?: string[];
  }): Promise<NextQuestionResult> {
    const raw = await post<WireNext>("/api/interview/next", {
      sessionId: input.sessionId,
      field: input.field,
      seniority: input.seniority,
      focusAreas: input.focusAreas?.length ? input.focusAreas : undefined,
    });
    if (!raw.question?.question) {
      throw new CoachUnavailableError("Could not get the next question.");
    }
    return {
      question: adaptQuestions([raw.question])[0],
      difficulty: raw.difficulty ?? raw.question.difficulty ?? "medium",
      focusSkill: raw.focusSkill || undefined,
    };
  },

  /** One calibrated mid-question hint — never the answer. */
  async getHint(input: {
    sessionId?: string;
    questionText: string;
    currentThinking?: string;
    field?: string;
  }): Promise<CoachHint> {
    const raw = await post<WireHint>("/api/interview/hint", {
      sessionId: input.sessionId,
      questionText: input.questionText,
      currentThinking: input.currentThinking?.trim() || undefined,
      field: input.field,
    });
    const hint = adaptHint(raw);
    if (!hint.hint) throw new CoachUnavailableError("Could not get a hint.");
    return hint;
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
    // The MCP rebuilds the transcript from the persisted answers and closes the
    // session (score history, ai_insights, avg_score), so it only needs the id.
    const raw = await post<WireFinish>("/api/interview/finish", {
      sessionId: input.sessionId,
      field: input.field,
      seniority: input.seniority,
    });
    return adaptFinal(raw.evaluation ?? {});
  },

  async getResources(input: {
    skills?: string[];
    goal?: string;
    maxResults?: number;
  }): Promise<CoachResource[]> {
    const raw = await post<WireResources>("/api/resources", {
      skills: input.skills,
      goal: input.goal,
      maxResults: input.maxResults,
    });
    const fallbackSkill = input.skills?.[0] ?? "";
    return (raw.resources ?? []).map((r) => adaptResource(r, fallbackSkill));
  },

  async getProvenTips(input: {
    skill?: string;
    question?: string;
    count?: number;
  }): Promise<ProvenTip[]> {
    const raw = await post<WireProvenTips>("/api/proven-tips", {
      skill: input.skill,
      question: input.question,
      count: input.count,
    });
    return (raw.tips ?? []).map((t) => ({
      tip: t.tip ?? "",
      proof: adaptProof(t.proof),
      verified: Boolean(t.verified),
    }));
  },

  async analyzePatterns(input: {
    field?: string;
    seniority?: string;
    recentSessions?: unknown[];
    skillHistory?: unknown[];
  }): Promise<PatternAnalysis> {
    // Context (skill history, recent scores, behavioral patterns) is assembled
    // server-side from RLS-scoped data — only the field/seniority are needed.
    return post<PatternAnalysis>("/api/analytics/patterns", {
      field: input.field,
      seniority: input.seniority,
    });
  },

  async weeklyInsight(input: {
    field?: string;
    seniority?: string;
    weekData?: Record<string, unknown>;
  }): Promise<WeeklyInsight> {
    return post<WeeklyInsight>("/api/analytics/weekly", {
      field: input.field,
      seniority: input.seniority,
    });
  },
};

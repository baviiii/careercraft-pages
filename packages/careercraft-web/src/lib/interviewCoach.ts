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
  /** Which slot of the deterministic loop blueprint this question fills. */
  stage?: string;
  whyThisQuestion?: string;
  followUps?: string[];
  signalsSought?: string[];
  /** Healthy answer length in words, set by the coach when length is judged. */
  targetWords?: { min?: unknown; max?: unknown };
  /** Story questions: the competency key and name the question tests. */
  competency?: unknown;
  competencyLabel?: unknown;
}

interface WireStart {
  sessionId?: string | null;
  analysis?: unknown;
  questions?: WireQuestion[];
}

interface WireLengthCheck {
  words?: unknown;
  spokenSeconds?: unknown;
  target?: { min?: unknown; max?: unknown };
  verdict?: unknown;
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

type WireBreakdownEntry = { score?: number; note?: string } | number;

interface WireStarBreakdown {
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  /** STARR: what they learned. Absent on answers scored before STARR. */
  reflection?: string;
  note?: string;
}

/** How the coach built the overall score (domain/scoring.ts in interview-coach-mcp). */
interface WireScoring {
  dimensions?: Array<{ key?: unknown; label?: unknown; weight?: unknown; score?: unknown; note?: unknown }>;
  weighted?: unknown;
  cap?: { max?: unknown; reason?: unknown } | null;
  final?: unknown;
  fellBack?: unknown;
}

interface WireStory {
  competency?: unknown;
  label?: unknown;
  title?: unknown;
  outcome?: unknown;
  bestScore?: unknown;
  previousBest?: unknown;
}

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
  /** Which rubric weighting the evaluator used, and why it suits this type. */
  rubricApplied?: string;
  /** Present only for behavioral questions — STAR completeness. */
  starBreakdown?: WireStarBreakdown;
  followUpQuestion?: string;
}

/** submit_answer wraps the evaluation and attaches a grounded proof chip. */
interface WireAnswer {
  evaluation?: WireEvaluation;
  proof?: Proof | null;
  /** Counted by the coach, not the model. Absent when length isn't judged. */
  lengthCheck?: WireLengthCheck | null;
  scoring?: WireScoring | null;
  highlights?: Array<{ part?: unknown; start?: unknown; end?: unknown }>;
  ownership?: { i?: unknown; we?: unknown } | null;
  story?: WireStory | null;
  improvement?: { from?: unknown; to?: unknown; attempt?: unknown } | null;
}

interface WireFinal {
  overallScore?: number;
  grade?: string;
  readiness?: string;
  executiveSummary?: string;
  strengths?: { top?: string[]; notable?: string[]; potential?: string[] };
  developmentAreas?: { critical?: string[]; important?: string[]; minor?: string[] };
  improvementPlan?: { immediate?: Array<{ area: string; action: string; timeline: string }> };
  /** Behavioural rounds. */
  storyBank?: Array<{ competency?: unknown; story?: unknown; verdict?: unknown }>;
  missingStories?: string[];
  /** Technical rounds. */
  depthMap?: Array<{ topic?: unknown; verdict?: unknown; evidence?: unknown }>;
  /** Phone screens. */
  screenVerdict?: unknown;
  recruiterNote?: unknown;
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

/**
 * The kinds of round the coach runs (its `roundType`). The ids are the coach's
 * and are stored on interview_sessions.round_type; features/interview/lib/
 * roundTypes.ts gives them labels, icons and colours.
 */
export type RoundType = "screen" | "behavioral" | "technical" | "full";

/** Public-sector capability frameworks the coach can mark against. */
export type Framework = "aps" | "nsw";

/** NSW capability levels (they describe complexity, not grades). */
export const NSW_LEVELS = ["Foundational", "Intermediate", "Adept", "Advanced", "Highly Advanced"] as const;

/** A question asked exactly as given — practising one again. */
export interface FixedQuestion {
  question: string;
  stage?: string;
  type?: string;
  difficulty?: "easy" | "medium" | "hard" | "expert";
  expectedTopics?: string[];
  competency?: string;
}

/**
 * Spoken answers need Horus voice switched on end to end (Horus, the coach,
 * Azure). Until it is, the flag keeps the microphone button out of the room
 * rather than showing one that can only fail.
 */
export const VOICE_ENABLED = COACH_AVAILABLE && import.meta.env.VITE_INTERVIEW_VOICE === "1";

/** The stages of the MCP's deterministic interview blueprint, in loop order. */
export type InterviewStage = "warmup" | "behavioral" | "domain" | "situational" | "closing" | "screen";

export const INTERVIEW_STAGES: InterviewStage[] = [
  "warmup",
  "behavioral",
  "domain",
  "situational",
  "closing",
  "screen",
];

/** A healthy answer length, in words (the coach works it out from speaking time). */
export interface WordBand {
  min: number;
  max: number;
}

/** The coach's count of an answer's length against its band. */
export interface LengthCheck {
  words: number;
  /** What the answer would take to say out loud, at ~150 words a minute. */
  spokenSeconds: number;
  target: WordBand;
  verdict: "short" | "ok" | "long";
}

export interface CoachQuestion {
  id: number;
  question: string;
  type: string;
  difficulty: string;
  expectedTopics: string[];
  category?: string;
  skillsTested?: string[];
  timeAllocationMinutes?: number;
  /** Which blueprint slot this fills — null when the coach didn't say. */
  stage: InterviewStage | null;
  /** One sentence, to the candidate, on why THEY are being asked this. */
  whyThisQuestion: string;
  /** Probes the interviewer would push with if the answer stays shallow. */
  followUps: string[];
  signalsSought: string[];
  /** Healthy answer length, when length is part of what's judged (screens, stories). */
  targetWords: WordBand | null;
  /** Story questions: the competency it tests (a coach key) and its name. */
  competency?: string;
  competencyLabel?: string;
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

/** How completely one STAR element was covered. */
export type StarCoverage = "present" | "thin" | "missing";

export interface StarBreakdown {
  situation: StarCoverage;
  task: StarCoverage;
  action: StarCoverage;
  result: StarCoverage;
  /** STARR's fifth part. Null on answers scored before STARR. */
  reflection: StarCoverage | null;
  note: string;
}

export const STAR_PARTS = ["situation", "task", "action", "result", "reflection"] as const;
export type StarPart = (typeof STAR_PARTS)[number];

/** Where one STAR part sits in the answer, as character offsets [start, end). */
export interface StarHighlight {
  part: StarPart;
  start: number;
  end: number;
}

export interface ScoreDimension {
  key: string;
  label: string;
  /** 0–1. */
  weight: number;
  /** 0–10. */
  score: number;
  note: string;
}

/** How the overall score was made: weighted dimensions, then any cap. */
export interface ScoreBuild {
  dimensions: ScoreDimension[];
  weighted: number;
  cap: { max: number; reason: string } | null;
  final: number;
  fellBack: boolean;
}

/** What happened to the story library when this answer was scored. */
export interface StoryOutcome {
  competency: string;
  label: string;
  title: string;
  outcome: "new" | "improved" | "kept";
  bestScore: number;
  previousBest: number | null;
}

export interface CoachAnswerEvaluation {
  score: number;
  scoreBreakdown: Record<string, number>;
  /** Per-criterion justification, keyed the same as scoreBreakdown. */
  scoreNotes: Record<string, string>;
  validation: { correct: string[]; missing: string[]; redFlags: string[] };
  bestAnswer: string;
  faangAnswer: string;
  confidence: number;
  tips: string[];
  improvement: string;
  proof: Proof | null;
  /** Which weighting the evaluator applied — behavioral answers differ. */
  rubricApplied: string;
  /** Non-null only for behavioral questions. */
  starBreakdown: StarBreakdown | null;
  /** What a real interviewer would ask next, given this answer. */
  followUpQuestion: string;
  /** Counted answer length vs its band — null when length isn't judged. */
  lengthCheck: LengthCheck | null;
  /** How the score was made. Null on answers scored before the score showed its working. */
  scoring: ScoreBuild | null;
  /** Story answers: each STAR part located in their own words. */
  highlights: StarHighlight[];
  /** Story answers: "I/me/my" vs "we/us/our", counted. */
  ownership: { i: number; we: number } | null;
  /** Story answers: what this did to the story library. */
  story: StoryOutcome | null;
  /** A retry: the score before and now. */
  retryChange: { from: number; to: number; attempt: number } | null;
}

export type StoryVerdict = "strong" | "usable" | "weak";
export type DepthVerdict = "solid" | "shaky" | "gap";

export interface CoachFinalEvaluation {
  overallScore: number;
  grade: string;
  readiness: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  mustFix: string[];
  improvementPlan: Array<{ area: string; action: string; timeline: string }>;
  /** Behavioural rounds: one entry per story told. Empty otherwise. */
  storyBank: Array<{ competency: string; story: string; verdict: StoryVerdict }>;
  /** Behavioural rounds: competencies with no story yet. */
  missingStories: string[];
  /** Technical rounds: what held up and what broke. Empty otherwise. */
  depthMap: Array<{ topic: string; verdict: DepthVerdict; evidence: string }>;
  /** Phone screens: the recruiter's call, e.g. "Put forward with a note". */
  screenVerdict: string;
  /** Phone screens: what the recruiter would tell the hiring manager. */
  recruiterNote: string;
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

interface WireSelectionDraft {
  draft?: unknown;
  wordCount?: unknown;
  wordLimit?: unknown;
  overLimit?: unknown;
  storyUsed?: { competency?: unknown; label?: unknown; title?: unknown } | null;
  starCoverage?: WireStarBreakdown | null;
  gaps?: string[];
  tips?: string[];
  storiesAvailable?: unknown;
}

export interface SelectionDraft {
  /** Empty when none of their stories fits the criterion — `gaps` says what's needed. */
  draft: string;
  wordCount: number;
  wordLimit: number;
  overLimit: boolean;
  storyUsed: { competency: string; label: string; title: string } | null;
  starCoverage: StarBreakdown | null;
  gaps: string[];
  tips: string[];
  storiesAvailable: number;
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

  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new CoachUnavailableError("Please sign in to use the interview coach.");
  }

  let res: Response;
  try {
    res = await fetch(`${MCP_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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

/** Only accept a stage the blueprint actually defines; anything else is null. */
function adaptStage(raw: string | undefined): InterviewStage | null {
  const s = (raw ?? "").toLowerCase().trim();
  return INTERVIEW_STAGES.find((known) => known === s) ?? null;
}

/** Trim, drop blanks, cap — model-authored string lists are never trusted raw. */
function cleanList(raw: string[] | undefined, max: number): string[] {
  return (raw ?? [])
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function adaptBand(raw: { min?: unknown; max?: unknown } | undefined): WordBand | null {
  const min = raw?.min;
  const max = raw?.max;
  return typeof min === "number" && typeof max === "number" && min >= 0 && max > min ? { min, max } : null;
}

const LENGTH_VERDICTS: LengthCheck["verdict"][] = ["short", "ok", "long"];

function adaptLengthCheck(raw: WireLengthCheck | null | undefined): LengthCheck | null {
  if (!raw || typeof raw !== "object") return null;
  const target = adaptBand(raw.target);
  const verdict = LENGTH_VERDICTS.find((v) => v === raw.verdict);
  if (!target || !verdict || typeof raw.words !== "number" || typeof raw.spokenSeconds !== "number") return null;
  return { words: raw.words, spokenSeconds: raw.spokenSeconds, target, verdict };
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
    stage: adaptStage(q.stage),
    whyThisQuestion: (q.whyThisQuestion ?? "").trim(),
    followUps: cleanList(q.followUps, 3),
    signalsSought: cleanList(q.signalsSought, 4),
    targetWords: adaptBand(q.targetWords),
    competency: text(q.competency) || undefined,
    competencyLabel: text(q.competencyLabel) || undefined,
  }));
}

function breakdownNote(v: WireBreakdownEntry | undefined): string {
  if (typeof v === "number" || !v) return "";
  return typeof v.note === "string" ? v.note.trim() : "";
}

const STAR_COVERAGE: StarCoverage[] = ["present", "thin", "missing"];

function starPart(raw: string | undefined): StarCoverage {
  const s = (raw ?? "").toLowerCase().trim();
  // An unrecognized value means the evaluator didn't commit — treat as missing
  // rather than crediting the candidate for something unproven.
  return STAR_COVERAGE.find((known) => known === s) ?? "missing";
}

/**
 * STAR is only meaningful when the evaluator actually ran the behavioral rubric.
 * An absent block means this wasn't a behavioral question — not a failed one.
 */
function adaptStar(raw: WireStarBreakdown | undefined): StarBreakdown | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    situation: starPart(raw.situation),
    task: starPart(raw.task),
    action: starPart(raw.action),
    result: starPart(raw.result),
    reflection: raw.reflection === undefined ? null : starPart(raw.reflection),
    note: (raw.note ?? "").trim(),
  };
}

const finite = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function adaptScoring(raw: WireScoring | null | undefined): ScoreBuild | null {
  if (!raw || !Array.isArray(raw.dimensions)) return null;
  const dimensions = raw.dimensions
    .map((d) => ({
      key: text(d?.key),
      label: text(d?.label),
      weight: finite(d?.weight) ?? 0,
      score: finite(d?.score) ?? 0,
      note: text(d?.note),
    }))
    .filter((d) => d.key && d.weight > 0);
  const final = finite(raw.final);
  if (!dimensions.length || final === null) return null;
  const capMax = finite(raw.cap?.max);
  const capReason = text(raw.cap?.reason);
  return {
    dimensions,
    weighted: finite(raw.weighted) ?? final,
    cap: capMax !== null && capReason ? { max: capMax, reason: capReason } : null,
    final,
    fellBack: raw.fellBack === true,
  };
}

function adaptHighlights(raw: WireAnswer["highlights"], answerLength?: number): StarHighlight[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((h) => ({ part: STAR_PARTS.find((p) => p === h?.part), start: finite(h?.start), end: finite(h?.end) }))
    .filter(
      (h): h is StarHighlight =>
        h.part !== undefined &&
        h.start !== null &&
        h.end !== null &&
        h.start >= 0 &&
        h.end > h.start &&
        (answerLength === undefined || h.end <= answerLength),
    )
    .sort((a, b) => a.start - b.start);
}

const STORY_OUTCOMES: StoryOutcome["outcome"][] = ["new", "improved", "kept"];

function adaptStory(raw: WireStory | null | undefined): StoryOutcome | null {
  const outcome = STORY_OUTCOMES.find((o) => o === raw?.outcome);
  const bestScore = finite(raw?.bestScore);
  if (!raw || !outcome || bestScore === null || !text(raw.competency)) return null;
  return {
    competency: text(raw.competency),
    label: text(raw.label) || text(raw.competency),
    title: text(raw.title),
    outcome,
    bestScore,
    previousBest: finite(raw.previousBest),
  };
}

/** Everything around the model's evaluation that the coach computed or saved. */
interface EvaluationExtras {
  proof?: Proof | null;
  lengthCheck?: WireLengthCheck | null;
  scoring?: WireScoring | null;
  highlights?: WireAnswer["highlights"];
  ownership?: WireAnswer["ownership"];
  story?: WireStory | null;
  improvement?: WireAnswer["improvement"];
  /** Guards highlight offsets against the answer they point into. */
  answerLength?: number;
}

function adaptEvaluation(ev: WireEvaluation, extras: EvaluationExtras = {}): CoachAnswerEvaluation {
  const { proof, lengthCheck } = extras;
  const scoring = adaptScoring(extras.scoring);
  const ownI = finite(extras.ownership?.i);
  const ownWe = finite(extras.ownership?.we);
  const from = finite(extras.improvement?.from);
  const to = finite(extras.improvement?.to);
  const breakdown: Record<string, number> = {};
  const notes: Record<string, string> = {};
  for (const [k, v] of Object.entries(ev.scoreBreakdown ?? {})) {
    breakdown[k] = flatScore(v);
    const note = breakdownNote(v);
    if (note) notes[k] = note;
  }
  // The built score is the one to show: it's the sum of the bars on screen.
  const score = scoring?.final ?? (typeof ev.score === "number" ? ev.score : 0);
  // The MCP evaluator returns no explicit confidence; derive it from the score.
  const confidence = Math.max(0, Math.min(100, Math.round(score * 10)));
  return {
    score,
    scoreBreakdown: breakdown,
    scoreNotes: notes,
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
    rubricApplied: (ev.rubricApplied ?? "").trim(),
    starBreakdown: adaptStar(ev.starBreakdown),
    // The real interviewer's next move is the better line to show; the older
    // suggestedFollowup stays as the fallback for pre-blueprint sessions.
    followUpQuestion: (ev.followUpQuestion ?? ev.suggestedFollowup ?? "").trim(),
    lengthCheck: adaptLengthCheck(lengthCheck),
    scoring,
    highlights: adaptHighlights(extras.highlights, extras.answerLength),
    ownership: ownI !== null && ownWe !== null ? { i: ownI, we: ownWe } : null,
    story: adaptStory(extras.story),
    retryChange:
      from !== null && to !== null ? { from, to, attempt: finite(extras.improvement?.attempt) ?? 2 } : null,
  };
}

/**
 * An answer's evaluation as saved in interview_answers.evaluation — the same
 * shape the coach returned, with its scoring, highlights and counts inside.
 * Null for answers saved before evaluations were stored.
 */
export function adaptStoredEvaluation(raw: unknown, answerLength?: number): CoachAnswerEvaluation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as WireEvaluation & EvaluationExtras;
  return adaptEvaluation(r, {
    lengthCheck: r.lengthCheck,
    scoring: r.scoring,
    highlights: r.highlights,
    ownership: r.ownership,
    answerLength,
  });
}

/** A model-written string field, trimmed; anything else is empty. */
function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const STORY_VERDICTS: StoryVerdict[] = ["strong", "usable", "weak"];
const DEPTH_VERDICTS: DepthVerdict[] = ["solid", "shaky", "gap"];

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
    // Model-authored lists: an entry missing its name or an unrecognised
    // verdict is dropped, not shown half-filled. An unknown story verdict is
    // not credited as strong.
    storyBank: (Array.isArray(ev.storyBank) ? ev.storyBank : [])
      .map((s) => ({
        competency: text(s?.competency),
        story: text(s?.story),
        verdict: STORY_VERDICTS.find((v) => v === text(s?.verdict).toLowerCase()) ?? "weak",
      }))
      .filter((s) => s.competency)
      .slice(0, 10),
    missingStories: cleanList(ev.missingStories, 6),
    depthMap: (Array.isArray(ev.depthMap) ? ev.depthMap : [])
      .map((d) => ({
        topic: text(d?.topic),
        verdict: DEPTH_VERDICTS.find((v) => v === text(d?.verdict).toLowerCase()),
        evidence: text(d?.evidence),
      }))
      .filter((d): d is { topic: string; verdict: DepthVerdict; evidence: string } => Boolean(d.topic && d.verdict))
      .slice(0, 10),
    screenVerdict: text(ev.screenVerdict),
    recruiterNote: text(ev.recruiterNote),
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
    /** How many questions to generate now. */
    questionCount?: number;
    /** The whole round's length, when only the opener is generated now. */
    plannedCount?: number;
    jobDescription?: string;
    focusAreas?: string[];
    roundType?: RoundType;
    framework?: Framework;
    frameworkLevel?: string;
    /** Put this competency's story first (practising one story). */
    competency?: string;
    /** Ask these exact questions instead (practising one question again). */
    fixedQuestions?: FixedQuestion[];
    /** The tracker job this is practice for; the coach reads its ad. */
    jobId?: string;
  }): Promise<StartSessionResult> {
    const raw = await post<WireStart>("/api/interview/start", {
      field: input.field,
      seniority: input.seniority,
      questionCount: input.questionCount,
      plannedCount: input.plannedCount,
      jobDescription: input.jobDescription,
      focusAreas: input.focusAreas?.length ? input.focusAreas : undefined,
      roundType: input.roundType,
      framework: input.framework,
      frameworkLevel: input.framework === "nsw" ? input.frameworkLevel : undefined,
      competency: input.competency,
      fixedQuestions: input.fixedQuestions?.length ? input.fixedQuestions : undefined,
      jobId: input.jobId,
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
    roundType?: RoundType;
    framework?: Framework;
    timeTakenSeconds?: number;
    /** A retry: which attempt this is, and the last attempt to compare against. */
    attempt?: number;
    previousAnswer?: string;
    previousScore?: number;
  }): Promise<CoachAnswerEvaluation> {
    const raw = await post<WireAnswer>("/api/interview/answer", {
      sessionId: input.sessionId,
      questionText: input.questionText,
      questionType: input.questionType,
      answerText: input.answerText,
      field: input.field,
      seniority: input.seniority,
      expectedTopics: input.expectedTopics,
      roundType: input.roundType,
      framework: input.framework,
      timeTakenSeconds:
        typeof input.timeTakenSeconds === "number" ? Math.max(0, Math.round(input.timeTakenSeconds)) : undefined,
      attempt: input.attempt,
      previousAnswer: input.previousAnswer,
      previousScore:
        typeof input.previousScore === "number" ? Math.max(0, Math.min(10, input.previousScore)) : undefined,
    });
    return adaptEvaluation(raw.evaluation ?? {}, { ...raw, answerLength: input.answerText.length });
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
    /** The round's planned length, so the coach picks the slot actually planned next. */
    plannedCount?: number;
    roundType?: RoundType;
    framework?: Framework;
    frameworkLevel?: string;
  }): Promise<NextQuestionResult> {
    const raw = await post<WireNext>("/api/interview/next", {
      sessionId: input.sessionId,
      field: input.field,
      seniority: input.seniority,
      focusAreas: input.focusAreas?.length ? input.focusAreas : undefined,
      plannedCount: input.plannedCount,
      roundType: input.roundType,
      framework: input.framework,
      frameworkLevel: input.framework === "nsw" ? input.frameworkLevel : undefined,
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
    roundType?: RoundType;
    framework?: Framework;
    plannedCount?: number;
    durationSeconds?: number;
  }): Promise<CoachFinalEvaluation> {
    // The MCP rebuilds the transcript from the persisted answers and closes the
    // session (score history, ai_insights, avg_score, duration), so beyond the
    // id it only needs what shapes the debrief: the round and its length.
    const raw = await post<WireFinish>("/api/interview/finish", {
      sessionId: input.sessionId,
      field: input.field,
      seniority: input.seniority,
      roundType: input.roundType,
      framework: input.framework,
      plannedCount: input.plannedCount,
      durationSeconds:
        typeof input.durationSeconds === "number" && input.durationSeconds >= 0
          ? Math.round(input.durationSeconds)
          : undefined,
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

  /**
   * A written response to one key selection criterion, drafted from the
   * learner's own saved stories. The coach counts the words.
   */
  async draftSelectionCriterion(input: {
    criterion: string;
    wordLimit?: number;
    jobDescription?: string;
    framework?: Framework;
    frameworkLevel?: string;
    competency?: string;
  }): Promise<SelectionDraft> {
    const raw = await post<WireSelectionDraft>("/api/interview/selection-criterion", {
      criterion: input.criterion,
      wordLimit: input.wordLimit,
      jobDescription: input.jobDescription?.trim() || undefined,
      framework: input.framework,
      frameworkLevel: input.framework === "nsw" ? input.frameworkLevel : undefined,
      competency: input.competency,
    });
    const used = raw.storyUsed;
    return {
      draft: text(raw.draft),
      wordCount: finite(raw.wordCount) ?? 0,
      wordLimit: finite(raw.wordLimit) ?? input.wordLimit ?? 300,
      overLimit: raw.overLimit === true,
      storyUsed:
        used && typeof used === "object" && text(used.competency)
          ? { competency: text(used.competency), label: text(used.label), title: text(used.title) }
          : null,
      starCoverage: adaptStar(raw.starCoverage ?? undefined),
      gaps: cleanList(raw.gaps, 5),
      tips: cleanList(raw.tips, 5),
      storiesAvailable: finite(raw.storiesAvailable) ?? 0,
    };
  },

  /** A short-lived key for one spoken answer (Horus voice, via the coach). */
  async voiceSession(): Promise<{ ephemeralKey: string; webrtcUrl: string }> {
    const raw = await post<{ ephemeralKey?: string; webrtcUrl?: string }>("/api/voice/session", {});
    if (!raw.ephemeralKey || !raw.webrtcUrl) throw new CoachUnavailableError("Couldn't start a spoken answer.");
    return { ephemeralKey: raw.ephemeralKey, webrtcUrl: raw.webrtcUrl };
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

/**
 * careerCoach — typed, REAL-ONLY client for the career-development surface of
 * interview-coach-mcp (career guidance, certifications, roadmaps, study engine,
 * personalization). Companion to `interviewCoach.ts`, same contract:
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

export const CAREER_COACH_AVAILABLE = Boolean(MCP_URL);

export class CoachUnavailableError extends Error {
  constructor(message = "Career coach is not available at the moment.") {
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

export interface CareerGoal {
  targetField?: string | null;
  targetRole?: string | null;
  seniority?: string | null;
  jobRoleType?: string | null;
  interviewTypes?: string[] | null;
}

/** What a typed job really is, for confirming a role before it's saved. */
export interface FieldPreview {
  input: string;
  /** False when the input isn't a recognisable job — nothing below is invented then. */
  known: boolean;
  /** The standard title employers advertise ("sparky" → "Electrician"). */
  canonicalTitle: string;
  interviewStyle: string | null;
  keySkills: string[];
  /** Required ones first. Model knowledge — confirm with the issuing body. */
  credentials: Array<{ name: string; required: boolean; note: string; source: string }>;
  /** What each stored career level is called in this job, e.g. { entry: "Apprentice" }. */
  levels: Partial<Record<string, string>>;
}

export interface CareerProfile {
  userId: string;
  goal: CareerGoal | null;
  readiness: { level: string; averageRecentScore: number | null; recentScores: number[] };
  skills: {
    tracked: number;
    weakest: Array<{ name: string; proficiency: number; trend: string }>;
    strongest: Array<{ name: string; proficiency: number; trend: string }>;
  };
  certifications: Array<{
    name: string;
    issuer: string | null;
    status: "active" | "expiring_soon" | "expired";
    expiryDate: string | null;
    recognized: boolean;
    skillsVouchedFor: string[];
  }>;
  practice: Record<string, unknown> | null;
  jobPipeline: { total: number; active: number; interviews: number; offers: number; recentTitles: string[] } | null;
  milestonesAchieved: number;
  resumeOnFile: boolean;
  persona: Record<string, unknown> | null;
  missingSignals: string[];
}

export interface CareerGuidance {
  headline?: string;
  assessment?: { whereYouAre?: string; momentum?: string; marketPosition?: string };
  strengthsToSell?: Array<{ strength: string; evidence: string; howToPitch: string }>;
  gapsToClose?: Array<{ gap: string; severity: string; fastestFix: string }>;
  certificationMoves?: Array<{ action: string; certification: string; why: string; timeline: string }>;
  trajectoryOptions?: Array<{
    path: string;
    viability: number;
    whyItFits: string;
    firstMilestone: string;
    timeToCredible: string;
  }>;
  narrative?: { elevatorPitch?: string; linkedinHeadline?: string; storyArc?: string };
  nextActions?: Array<{ action: string; impact: string; due: string }>;
}

export interface CertificationFacts {
  held: Array<{
    name: string;
    issuer: string | null;
    status: string;
    expiryDate: string | null;
    recognized: boolean;
    skillsVouchedFor: string[];
  }>;
  expiringSoon: string[];
  expired: string[];
  certifiedSkills: string[];
}

export interface CertificationAnalysis {
  portfolioVerdict?: string;
  coverage?: { covered?: string[]; missing?: string[]; redundant?: string[] };
  expiryAlerts?: Array<{ certification: string; status: string; action: string }>;
  marketValue?: Array<{ certification: string; value: string; why: string }>;
  interviewTalkingPoints?: Array<{ certification: string; talkingPoint: string }>;
  gapsVsTarget?: string[];
}

export interface CertificationPlan {
  recommendations?: Array<{
    certificationId: string;
    name: string;
    priority: number;
    whyThisOne: string;
    prepPlan: string;
    estimatedWeeks: number;
    examCostUsd: number;
    roi: string;
  }>;
  skipForNow?: Array<{ name: string; why: string }>;
  sequencingNote?: string;
}

export interface RoadmapPhase {
  name: string;
  weeks: string;
  objective: string;
  skillTargets?: Array<{ skill: string; from: number; to: number }>;
  actions?: Array<{ type: string; action: string; cadence: string; doneWhen: string }>;
  checkpoint?: { test: string; passBar: string };
}

export interface CareerRoadmap {
  title?: string;
  northStar?: string;
  phases?: RoadmapPhase[];
  certificationTrack?: Array<{ certification: string; targetWeek: number; why: string }>;
  interviewCadence?: { mocksPerWeek: number; focusRotation: string[] };
  weeklyRhythm?: Array<{ day: string; block: string; minutes: number }>;
  riskFactors?: Array<{ risk: string; mitigation: string }>;
}

export interface StudyPlanWeek {
  week: number;
  theme: string;
  targetSkills: string[];
  sessions: Array<{
    day: string;
    minutes: number;
    method: string;
    activity: string;
    skill: string;
    resourceTitle: string | null;
  }>;
  milestone: string;
}

export interface StudyPlan {
  goal?: string;
  weeks?: StudyPlanWeek[];
  spacedReviewRules?: string[];
  successMetric?: string;
}

export interface Drill {
  skill: string;
  type: string;
  prompt: string;
  difficulty: string;
  timeboxMinutes: number;
  idealAnswerPoints: string[];
  selfCheck: string[];
}

export interface DrillScheduling {
  skill: string;
  proficiency: number;
  difficulty: string;
  whyNow: string;
  nextReviewInDays: number;
}

export interface DrillResult {
  skill: string;
  score: number;
  previousProficiency: number;
  newProficiency: number;
  delta: number;
  nextReviewInDays: number;
  verdict: string;
  persisted: boolean;
}

/** Why a pathway is thinner than ideal — surfaced so "empty" never reads as "broken". */
export interface Degradation {
  degraded: boolean;
  reasons: string[];
}

export interface PathwayTarget {
  skill: string;
  from: number;
  to: number;
}

export interface PathwayResource {
  id: string;
  title: string;
  type: string;
  difficulty?: string;
  provider?: string;
  /** A real catalogue row, or something the community was found recommending. */
  source: "catalog" | "community";
  url?: string;
  stat?: string | null;
  priority: number;
  whyRecommended: string;
}

export interface PathwayDrill {
  skill: string;
  difficulty: string;
  whyNow: string;
  nextReviewInDays: number;
}

/**
 * One call that always returns something to do — targets, a plan, resources, the
 * next drill and the next mock — even for a learner with an empty database.
 */
export interface LearningPathway {
  field: string;
  targetRole: string | null;
  focus: {
    skills: string[];
    /** Where the targets came from: tested matrix, career goal, or research. */
    source: string;
    why: string;
    fromLastInterview: boolean;
  };
  targets: PathwayTarget[];
  plan: StudyPlan;
  resources: PathwayResource[];
  /** True when nothing real backed the resources — model suggestions only. */
  unsourcedResources: boolean;
  nextDrill: PathwayDrill;
  nextMock: {
    field: string;
    seniority: string | null;
    focusAreas: string[];
    questionTypes: string[] | null;
    why: string;
  };
}

export interface ConceptExplanation {
  concept?: string;
  levels?: { intuition?: string; working?: string; interviewGrade?: string };
  workedExample?: string;
  commonPitfalls?: string[];
  interviewAngles?: string[];
  checkYourself?: Array<{ question: string; answerSketch: string }>;
  relatedConcepts?: string[];
  proof?: Proof | null;
}

/* ── Transport ───────────────────────────────────────────────────────────── */

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!MCP_URL) throw new CoachUnavailableError();

  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new CoachUnavailableError("Please sign in to use the career coach.");
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
    throw new CoachUnavailableError(`Career coach error (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  return (await res.json()) as T;
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export const careerCoach = {
  available: CAREER_COACH_AVAILABLE,

  /** Everything the coach knows about this user. Deterministic + instant. */
  async getProfile(): Promise<CareerProfile> {
    return post<CareerProfile>("/api/career/profile", {});
  },

  /** Full personalized career read; optionally answers a specific question. */
  async getGuidance(input: {
    question?: string;
    targetRole?: string;
    targetField?: string;
    horizonMonths?: number;
  }): Promise<{ guidance: CareerGuidance; recommendationId: string | null }> {
    return post("/api/career/guidance", input);
  },

  /** Persist the career goal that all other tools condition on. */
  async setGoal(input: {
    targetField: string;
    targetRole?: string;
    seniority?: string;
    jobRoleType?: string;
    interviewTypes?: string[];
  }): Promise<{
    goal: CareerGoal;
    persisted: { preferences: boolean; targetRole: boolean | null; profile?: boolean };
  }> {
    return post("/api/career/goal", input);
  },

  /** What a typed job really is ("sparky" → Electrician), for confirming a role before saving it. */
  async previewField(field: string): Promise<FieldPreview> {
    return post("/api/career/field-preview", { field });
  },

  /** Analyze the held certification portfolio vs the target role. */
  async analyzeCertifications(input: { targetRole?: string; targetField?: string } = {}): Promise<{
    facts: CertificationFacts;
    analysis: CertificationAnalysis;
  }> {
    return post("/api/career/certifications/analyze", input);
  },

  /** Ranked next-certification plan (vetted catalog, budget/time aware). */
  async recommendCertifications(input: {
    targetField?: string;
    seniority?: string;
    budgetUsd?: number;
    hoursPerWeek?: number;
    count?: number;
  } = {}): Promise<{ plan: CertificationPlan; topPickProof: Proof | null; recommendationId: string | null }> {
    return post("/api/career/certifications/recommend", input);
  },

  /** Record a newly earned certification; credits its skills in the matrix. */
  async logCertification(input: {
    name: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
  }): Promise<{
    certificationId: string | null;
    persisted: boolean;
    status: string;
    recognized: { catalogId: string; name: string; level: string; marketSignal: string } | null;
    skillsCredited: string[];
    note: string;
  }> {
    return post("/api/career/certifications/log", input);
  },

  /** Week-addressed roadmap to a target role. */
  async buildRoadmap(input: {
    targetRole: string;
    targetField?: string;
    horizonWeeks?: number;
    hoursPerWeek?: number;
  }): Promise<{ roadmap: CareerRoadmap; skeleton: unknown; recommendationId: string | null }> {
    return post("/api/career/roadmap", input);
  },

  /** Re-synthesize the coaching persona from all current signals. */
  async refreshPersona(input: { focus?: string } = {}): Promise<{
    persona: Record<string, unknown> | null;
    confidence: number | null;
    basedOn: string[];
    persisted: boolean;
  }> {
    return post("/api/career/persona/refresh", input);
  },

  /**
   * The whole learning pathway in one call. Unlike buildStudyPlan, this never
   * errors on a cold start — it derives targets from the career goal or field
   * research when nothing has been tested yet, and reports what it had to fall
   * back to in `degraded`.
   */
  async getLearningPathway(input: {
    field?: string;
    weeks?: number;
    hoursPerWeek?: number;
  } = {}): Promise<{
    pathway: LearningPathway;
    recommendationId: string | null;
    _meta?: { degraded?: Degradation };
  }> {
    return post("/api/learning/pathway", input);
  },

  /** Sequenced week-by-week study plan over the weakest (or chosen) skills. */
  async buildStudyPlan(input: {
    skills?: string[];
    weeks?: number;
    hoursPerWeek?: number;
    goal?: string;
  } = {}): Promise<{
    plan: StudyPlan;
    targets: Array<{ skill: string; from: number; to: number }>;
    recommendationId: string | null;
  }> {
    return post("/api/study/plan", input);
  },

  /** The next spaced-repetition drill (scheduler picks unless skill given). */
  async nextDrill(input: { skill?: string; field?: string } = {}): Promise<{ drill: Drill; scheduling: DrillScheduling }> {
    return post("/api/study/drill", input);
  },

  /** Score a finished drill 0-10; updates the skill matrix instantly. */
  async recordDrillResult(input: {
    skill: string;
    score: number;
    drillType?: string;
    notes?: string;
  }): Promise<DrillResult> {
    return post("/api/study/drill/result", input);
  },

  /** Layered concept explanation with worked example + interview angles. */
  async explainConcept(input: {
    concept: string;
    level?: "eli5" | "working" | "interview";
    field?: string;
  }): Promise<ConceptExplanation> {
    return post("/api/study/explain", input);
  },

  /** Track learning-resource progress; completion credits linked skills. */
  async trackResourceProgress(input: {
    resourceId: string;
    status: "saved" | "in_progress" | "completed";
    progressPercent?: number;
    rating?: number;
    notes?: string;
  }): Promise<{ resourceId: string; status: string; persisted: boolean; skillsCredited: string[] }> {
    return post("/api/study/resource/progress", input);
  },

};

import type {
  CoachAnswerEvaluation,
  CoachQuestion,
} from "@/lib/interviewCoach";

/**
 * Realistic — no mid-interview feedback, adaptive questioning via the MCP's
 * next_question (difficulty branches off running scores). Everything lands in
 * the debrief, like a real loop.
 * Coached — feedback card after every answer, walk a pre-generated batch.
 */
export type InterviewMode = "realistic" | "coached";

export interface SessionConfig {
  field: string;
  seniority?: string;
  jobDescription?: string;
  mode: InterviewMode;
  /** Total questions to ask before wrapping up. */
  questionCount: number;
  /** Round focus (from the interview plan) — seeds question generation. */
  focusAreas?: string[];
  /** Display name of the round being practiced (e.g. "System Design"). */
  roundName?: string;
}

/** One question asked in the room, with everything gathered around it. */
export interface AnswerRecord {
  question: CoachQuestion;
  answerText: string;
  timeTakenSeconds: number;
  hintsUsed: number;
  skipped: boolean;
  evaluation: CoachAnswerEvaluation | null;
  /** Realistic mode: evaluation fired in the background, not yet resolved. */
  evaluationPending: boolean;
  evaluationFailed: boolean;
}

export type RoomPhase =
  | "boot"
  | "starting"
  | "active"
  | "advancing"
  | "finishing"
  | "debrief"
  | "error";

export function makeRecord(question: CoachQuestion): AnswerRecord {
  return {
    question,
    answerText: "",
    timeTakenSeconds: 0,
    hintsUsed: 0,
    skipped: false,
    evaluation: null,
    evaluationPending: false,
    evaluationFailed: false,
  };
}

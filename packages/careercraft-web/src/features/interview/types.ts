import type {
  CoachAnswerEvaluation,
  CoachQuestion,
  FixedQuestion,
  Framework,
  RoundType,
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
  /** Display name of the round being practised (e.g. "System Design"). */
  roundName?: string;
  /**
   * Which kind of round this is. It decides the questions, how answers are
   * scored and the session's colour. Optional only because a session staged
   * before round types existed may still be sitting in sessionStorage; read
   * it through parseRoundType, which treats missing as a full interview.
   */
  roundType?: RoundType;
  /** Public-sector mode: the capability framework story questions target. */
  framework?: Framework;
  /** NSW level story questions are pitched at. */
  frameworkLevel?: string;
  /** Practising one story: its competency key goes first. */
  competency?: string;
  /** Practising specific questions again, asked exactly as given. */
  fixedQuestions?: FixedQuestion[];
  /** The tracker job this is practice for, and how to name it ("Data Analyst at SA Health"). */
  jobId?: string;
  jobLabel?: string;
}

/**
 * What's being set up on the hub. Held by the hub page so other panels
 * (upcoming interviews, progress) can fill it in; the setup panel edits it.
 */
export interface SetupChoice {
  roundType: RoundType;
  /** A tracker job to practise for: its ad seeds the questions. */
  jobId: string | null;
  /** Public-sector mode, for behavioural and full rounds. */
  framework: Framework | null;
  /** NSW level, when framework is "nsw". */
  frameworkLevel: string;
}

/** How a spoken answer was delivered (voice only), measured in the browser. */
export interface DeliveryMetrics {
  /** Time actually speaking, from the speech detector. */
  speakingSeconds: number;
  wordsPerMinute: number;
  /** Lexical fillers the transcript keeps ("like", "you know", "sort of"…). */
  fillers: number;
  /** Silences over three seconds mid-answer. */
  longPauses: number;
}

/** An earlier go at the same question, kept when they retry. */
export interface AnswerAttempt {
  answerText: string;
  evaluation: CoachAnswerEvaluation | null;
  timeTakenSeconds: number;
  /** Set when that attempt was spoken. Absent on attempts saved before it was kept. */
  delivery?: DeliveryMetrics | null;
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
  /** Earlier attempts when they retried (oldest first); the fields above are the latest. */
  attempts: AnswerAttempt[];
  /** Set when the answer was spoken. */
  delivery: DeliveryMetrics | null;
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
    attempts: [],
    delivery: null,
  };
}

/**
 * useInterviewSession — the interview room's state machine.
 *
 * Owns every coach call for a live session. The hub stages a SessionConfig in
 * sessionStorage and navigates to the room; this hook boots from that (or
 * restores an in-flight session after a refresh), then drives:
 *
 *   boot → starting → active ⇄ advancing → finishing → debrief
 *
 * Realistic mode: submitting an answer fires its evaluation in the BACKGROUND
 * (queue tracked in a ref) and immediately fetches the adaptive next question —
 * the interview never stalls on scoring. finish() drains the queue before the
 * final debrief so nothing is lost. Coached mode: evaluation is awaited and
 * shown after each answer; questions walk the pre-generated batch.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  interviewCoach,
  CoachUnavailableError,
  type CoachAnswerEvaluation,
  type CoachFinalEvaluation,
  type CoachHint,
  type CoachQuestion,
} from "@/lib/interviewCoach";
import { parseRoundType } from "../lib/roundTypes";
import {
  makeRecord,
  type AnswerRecord,
  type DeliveryMetrics,
  type RoomPhase,
  type SessionConfig,
} from "../types";

/**
 * An evaluation restored from sessionStorage may predate the fields the
 * feedback now reads (a tab left open across a deploy). Fill them the way
 * adaptEvaluation in lib/interviewCoach does, so the feedback card never
 * reads undefined.
 */
function evaluationDefaults(e: CoachAnswerEvaluation | null | undefined): CoachAnswerEvaluation | null {
  if (!e) return null;
  return {
    ...e,
    lengthCheck: e.lengthCheck ?? null,
    scoring: e.scoring ?? null,
    highlights: e.highlights ?? [],
    ownership: e.ownership ?? null,
    story: e.story ?? null,
    retryChange: e.retryChange ?? null,
    starBreakdown: e.starBreakdown ? { ...e.starBreakdown, reflection: e.starBreakdown.reflection ?? null } : null,
  };
}

/** Records restored from a session saved before attempts, delivery or the newer evaluation fields existed. */
function withDefaults(r: AnswerRecord): AnswerRecord {
  return {
    ...r,
    evaluation: evaluationDefaults(r.evaluation),
    attempts: (r.attempts ?? []).map((a) => ({ ...a, evaluation: evaluationDefaults(a.evaluation) })),
    delivery: r.delivery ?? null,
  };
}

const PENDING_KEY = "cc-interview-pending";
const ACTIVE_KEY = "cc-interview-active";
const DEBRIEF_KEY = "cc-interview-debrief";

/** Hub → room handoff: stage the config, then navigate to /interview-prep/room. */
export function stageSession(config: SessionConfig): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(config));
    sessionStorage.removeItem(ACTIVE_KEY);
    sessionStorage.removeItem(DEBRIEF_KEY);
  } catch {
    /* storage full/blocked — the room will bounce back to the hub */
  }
}

export function clearStagedSession(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
    sessionStorage.removeItem(ACTIVE_KEY);
    sessionStorage.removeItem(DEBRIEF_KEY);
  } catch {
    /* ignore */
  }
}

interface ActiveSnapshot {
  config: SessionConfig;
  sessionId: string;
  records: AnswerRecord[];
  batch: CoachQuestion[];
  sessionStartedAt: number;
}

interface DebriefSnapshot {
  config: SessionConfig;
  records: AnswerRecord[];
  finalEvaluation: CoachFinalEvaluation;
  totalSeconds: number;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function coachMessage(e: unknown): string {
  return e instanceof CoachUnavailableError
    ? e.message
    : "Interview coach is not available at the moment.";
}

export interface InterviewSession {
  phase: RoomPhase;
  config: SessionConfig | null;
  records: AnswerRecord[];
  /** The question currently on the table (last record) — null outside `active`. */
  current: AnswerRecord | null;
  questionNumber: number;
  sessionStartedAt: number;
  questionStartedAt: number;
  /** Coached mode: evaluation in flight for the current answer. */
  evaluating: boolean;
  /** Coached mode: evaluation arrived — show feedback, wait for Continue. */
  awaitingContinue: boolean;
  hint: CoachHint | null;
  hintLoading: boolean;
  finalEvaluation: CoachFinalEvaluation | null;
  totalSeconds: number;
  error: string | null;

  submit: (answerText: string, delivery?: DeliveryMetrics | null) => Promise<void>;
  continueAfterFeedback: () => void;
  /** Coached mode, after feedback: answer the same question again. */
  retry: () => void;
  skip: () => void;
  requestHint: (draft: string) => Promise<void>;
  wrapUp: () => void;
  retryFinish: () => void;
  /** Start a fresh session from the debrief (e.g. drill weak areas). */
  beginNew: (config: SessionConfig) => void;
}

export function useInterviewSession(): InterviewSession {
  const [phase, setPhase] = useState<RoomPhase>("boot");
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [hint, setHint] = useState<CoachHint | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [finalEvaluation, setFinalEvaluation] = useState<CoachFinalEvaluation | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(0);

  const sessionIdRef = useRef<string | null>(null);
  const batchRef = useRef<CoachQuestion[]>([]);
  const evalQueueRef = useRef<Promise<void>[]>([]);
  const recordsRef = useRef<AnswerRecord[]>([]);
  const configRef = useRef<SessionConfig | null>(null);
  const bootedRef = useRef(false);
  recordsRef.current = records;
  configRef.current = config;

  const openQuestion = useCallback((q: CoachQuestion) => {
    setRecords((prev) => [...prev, makeRecord(q)]);
    setQuestionStartedAt(Date.now());
    setHint(null);
    setAwaitingContinue(false);
  }, []);

  const start = useCallback(
    async (cfg: SessionConfig) => {
      setPhase("starting");
      setConfig(cfg);
      setRecords([]);
      setFinalEvaluation(null);
      setError(null);
      evalQueueRef.current = [];
      try {
        const { sessionId, questions } = await interviewCoach.startSession({
          field: cfg.field,
          seniority: cfg.seniority,
          jobDescription: cfg.jobDescription,
          focusAreas: cfg.focusAreas,
          roundType: parseRoundType(cfg.roundType),
          // Realistic mode goes adaptive after Q1 — only seed the opener, but
          // as slot 1 of the round actually planned.
          questionCount: cfg.mode === "realistic" && !cfg.fixedQuestions?.length ? 1 : cfg.questionCount,
          plannedCount: cfg.questionCount,
          framework: cfg.framework,
          frameworkLevel: cfg.frameworkLevel,
          competency: cfg.competency,
          fixedQuestions: cfg.fixedQuestions,
          jobId: cfg.jobId,
        });
        if (!questions.length) throw new CoachUnavailableError("No questions were returned.");
        sessionIdRef.current = sessionId;
        batchRef.current = questions;
        setSessionStartedAt(Date.now());
        openQuestion(questions[0]);
        setPhase("active");
      } catch (e) {
        setError(coachMessage(e));
        setPhase("error");
      }
    },
    [openQuestion],
  );

  // Boot: restore an in-flight session, or consume a staged config.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const debrief = readJson<DebriefSnapshot>(DEBRIEF_KEY);
    if (debrief) {
      setConfig(debrief.config);
      setRecords(debrief.records.map(withDefaults));
      setFinalEvaluation(debrief.finalEvaluation);
      setTotalSeconds(debrief.totalSeconds);
      setPhase("debrief");
      return;
    }

    const active = readJson<ActiveSnapshot>(ACTIVE_KEY);
    if (active && active.sessionId && active.records.length) {
      // Evaluations that were mid-flight when the page unloaded are gone;
      // their scores are persisted server-side, but the feedback text isn't.
      const restored = active.records.map(withDefaults).map((r) =>
        r.evaluationPending
          ? { ...r, evaluationPending: false, evaluationFailed: !r.evaluation }
          : r,
      );
      setConfig(active.config);
      sessionIdRef.current = active.sessionId;
      batchRef.current = active.batch;
      setRecords(restored);
      setSessionStartedAt(active.sessionStartedAt);
      setQuestionStartedAt(Date.now());
      setPhase("active");
      return;
    }

    const pending = readJson<SessionConfig>(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    if (pending) {
      void start(pending);
    } else {
      setError("No interview session in progress.");
      setPhase("error");
    }
  }, [start]);

  // Mirror the live session so a refresh doesn't kill the interview.
  useEffect(() => {
    if (phase !== "active" && phase !== "advancing") return;
    if (!config || !sessionIdRef.current) return;
    writeJson(ACTIVE_KEY, {
      config,
      sessionId: sessionIdRef.current,
      records,
      batch: batchRef.current,
      sessionStartedAt,
    } satisfies ActiveSnapshot);
  }, [phase, config, records, sessionStartedAt]);

  const patchRecord = useCallback((index: number, patch: Partial<AnswerRecord>) => {
    setRecords((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }, []);

  const finish = useCallback(async () => {
    const cfg = configRef.current;
    const sessionId = sessionIdRef.current;
    if (!cfg || !sessionId) return;
    setPhase("finishing");
    const seconds = Math.round((Date.now() - sessionStartedAt) / 1000);
    setTotalSeconds(seconds);
    // Nothing reaches the debrief until every background evaluation lands.
    await Promise.allSettled(evalQueueRef.current);
    try {
      const evaluation = await interviewCoach.finish({
        sessionId,
        field: cfg.field,
        seniority: cfg.seniority,
        roundType: parseRoundType(cfg.roundType),
        framework: cfg.framework,
        plannedCount: cfg.questionCount,
        durationSeconds: seconds,
      });
      setFinalEvaluation(evaluation);
      setPhase("debrief");
      sessionStorage.removeItem(ACTIVE_KEY);
      writeJson(DEBRIEF_KEY, {
        config: cfg,
        records: recordsRef.current,
        finalEvaluation: evaluation,
        totalSeconds: seconds,
      } satisfies DebriefSnapshot);
    } catch (e) {
      setError(coachMessage(e));
      setPhase("error");
    }
  }, [sessionStartedAt]);

  const advance = useCallback(async () => {
    const cfg = configRef.current;
    const asked = recordsRef.current.length;
    if (!cfg) return;
    if (asked >= cfg.questionCount) {
      void finish();
      return;
    }
    if (cfg.mode === "coached") {
      const next = batchRef.current[asked];
      if (next) openQuestion(next);
      else void finish();
      return;
    }
    // Realistic: the interviewer "decides" the next question live.
    setPhase("advancing");
    try {
      const { question } = await interviewCoach.nextQuestion({
        sessionId: sessionIdRef.current ?? "",
        field: cfg.field,
        seniority: cfg.seniority,
        focusAreas: cfg.focusAreas,
        plannedCount: cfg.questionCount,
        roundType: parseRoundType(cfg.roundType),
        framework: cfg.framework,
        frameworkLevel: cfg.frameworkLevel,
      });
      openQuestion(question);
      setPhase("active");
    } catch {
      // Can't get another question — wrap up with what we have rather than dying.
      if (recordsRef.current.some((r) => r.answerText || r.skipped)) void finish();
      else {
        setError("Interview coach is not available at the moment.");
        setPhase("error");
      }
    }
  }, [finish, openQuestion]);

  const submit = useCallback(
    async (answerText: string, delivery: DeliveryMetrics | null = null) => {
      const cfg = configRef.current;
      const index = recordsRef.current.length - 1;
      const record = recordsRef.current[index];
      if (!cfg || !record || phase !== "active") return;
      const text = answerText.trim();
      if (!text) return;

      const timeTaken = Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));
      // A retry tells the coach what they said last time, so feedback can say
      // what changed — and the score change is shown, not guessed.
      const previous = record.attempts[record.attempts.length - 1];
      const call = () =>
        interviewCoach.submitAnswer({
          sessionId: sessionIdRef.current ?? "",
          questionText: record.question.question,
          questionType: record.question.type,
          answerText: text,
          field: cfg.field,
          seniority: cfg.seniority,
          expectedTopics: record.question.expectedTopics,
          roundType: parseRoundType(cfg.roundType),
          framework: cfg.framework,
          timeTakenSeconds: timeTaken,
          attempt: record.attempts.length + 1,
          previousAnswer: previous?.answerText,
          previousScore: previous?.evaluation?.score,
        });

      if (cfg.mode === "coached") {
        patchRecord(index, { answerText: text, timeTakenSeconds: timeTaken, delivery });
        setEvaluating(true);
        try {
          const evaluation = await call();
          patchRecord(index, { evaluation });
          setAwaitingContinue(true);
        } catch (e) {
          patchRecord(index, { evaluationFailed: true });
          setError(coachMessage(e));
        } finally {
          setEvaluating(false);
        }
        return;
      }

      // Realistic: score in the background, move on immediately.
      patchRecord(index, {
        answerText: text,
        timeTakenSeconds: timeTaken,
        evaluationPending: true,
        delivery,
      });
      evalQueueRef.current.push(
        call()
          .then((evaluation) => patchRecord(index, { evaluation, evaluationPending: false }))
          .catch(() => patchRecord(index, { evaluationPending: false, evaluationFailed: true })),
      );
      void advance();
    },
    [phase, questionStartedAt, advance, patchRecord],
  );

  const continueAfterFeedback = useCallback(() => {
    setAwaitingContinue(false);
    setError(null);
    void advance();
  }, [advance]);

  /**
   * Answer the same question again, straight after its feedback. The attempt
   * just scored is kept (attempts), the composer reopens empty, and the next
   * submit is scored against it. Coached mode only: Realistic hides feedback,
   * so there's nothing yet to retry against.
   */
  const retry = useCallback(() => {
    const cfg = configRef.current;
    const index = recordsRef.current.length - 1;
    const record = recordsRef.current[index];
    if (!cfg || cfg.mode !== "coached" || !record?.evaluation || !awaitingContinue) return;
    patchRecord(index, {
      attempts: [
        ...record.attempts,
        {
          answerText: record.answerText,
          evaluation: record.evaluation,
          timeTakenSeconds: record.timeTakenSeconds,
          delivery: record.delivery,
        },
      ],
      answerText: "",
      evaluation: null,
      evaluationFailed: false,
      delivery: null,
    });
    setAwaitingContinue(false);
    setHint(null);
    setError(null);
    setQuestionStartedAt(Date.now());
  }, [awaitingContinue, patchRecord]);

  const skip = useCallback(() => {
    if (phase !== "active") return;
    const index = recordsRef.current.length - 1;
    const record = recordsRef.current[index];
    const last = record?.attempts[record.attempts.length - 1];
    if (record && last && !record.answerText) {
      // Skipping a retry isn't skipping the question: the answer they already
      // gave (and its score) stands.
      patchRecord(index, {
        answerText: last.answerText,
        evaluation: last.evaluation,
        timeTakenSeconds: last.timeTakenSeconds,
        delivery: last.delivery ?? null,
        attempts: record.attempts.slice(0, -1),
      });
    } else {
      patchRecord(index, {
        skipped: true,
        timeTakenSeconds: Math.round((Date.now() - questionStartedAt) / 1000),
      });
    }
    setAwaitingContinue(false);
    void advance();
  }, [phase, questionStartedAt, advance, patchRecord]);

  const requestHint = useCallback(
    async (draft: string) => {
      const cfg = configRef.current;
      const index = recordsRef.current.length - 1;
      const record = recordsRef.current[index];
      if (!cfg || !record || hintLoading) return;
      setHintLoading(true);
      try {
        const h = await interviewCoach.getHint({
          sessionId: sessionIdRef.current ?? undefined,
          questionText: record.question.question,
          currentThinking: draft,
          field: cfg.field,
        });
        setHint(h);
        patchRecord(index, { hintsUsed: record.hintsUsed + 1 });
      } catch (e) {
        setError(coachMessage(e));
      } finally {
        setHintLoading(false);
      }
    },
    [hintLoading, patchRecord],
  );

  const wrapUp = useCallback(() => {
    if (phase === "active" || phase === "advancing") void finish();
  }, [phase, finish]);

  const retryFinish = useCallback(() => {
    if (phase === "error" && sessionIdRef.current && recordsRef.current.length) {
      setError(null);
      void finish();
    }
  }, [phase, finish]);

  const beginNew = useCallback(
    (cfg: SessionConfig) => {
      clearStagedSession();
      sessionIdRef.current = null;
      batchRef.current = [];
      setTotalSeconds(0);
      void start(cfg);
    },
    [start],
  );

  const current =
    (phase === "active" || phase === "advancing") && records.length
      ? records[records.length - 1]
      : null;

  return {
    phase,
    config,
    records,
    current,
    questionNumber: records.length,
    sessionStartedAt,
    questionStartedAt,
    evaluating,
    awaitingContinue,
    hint,
    hintLoading,
    finalEvaluation,
    totalSeconds,
    error,
    submit,
    continueAfterFeedback,
    retry,
    skip,
    requestHint,
    wrapUp,
    retryFinish,
    beginNew,
  };
}

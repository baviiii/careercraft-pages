import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ChevronRight } from "lucide-react";
import type { CoachQuestion } from "@/lib/interviewCoach";
import type { RoundType } from "../../lib/roundTypes";

/** The parts of a recruiter phone screen, as the meta line names them. */
const SCREEN_PARTS: Record<string, string> = {
  pitch: "Your pitch",
  motivation: "Why this role",
  experience: "Experience check",
  salary: "Salary",
  logistics: "Notice and logistics",
  questions: "Your questions",
};

/** Stage and type keys, as a person would write them (Australian spelling). */
const NAMES: Record<string, string> = {
  behavioral: "Behavioural",
  warmup: "Warm-up",
  system_design: "System design",
};

const nameOf = (key: string) => {
  const named = NAMES[key] ?? key.replace(/_/g, " ");
  return named.charAt(0).toUpperCase() + named.slice(1);
};

const wordsIn = (s: string) => s.trim().split(/\s+/).length;

/**
 * A long question reads better as its ask, then the detail of what the
 * interviewer wants to hear. Split after the first sentence when that
 * sentence is a sensible headline on its own; otherwise keep it whole.
 */
function splitQuestion(text: string): { ask: string; detail: string } {
  if (wordsIn(text) <= 30) return { ask: text, detail: "" };
  const first = text.match(/^(.+?[.?!])\s+(?=[A-Z"“'‘])/);
  if (!first) return { ask: text, detail: "" };
  const n = wordsIn(first[1]);
  if (n < 6 || n > 40) return { ask: text, detail: "" };
  return { ask: first[1], detail: text.slice(first[0].length) };
}

interface QuestionStageProps {
  question: CoachQuestion;
  questionNumber: number;
  /** The round being practised: its own type isn't repeated on every question. */
  roundType?: RoundType;
  advancing: boolean;
}

/**
 * The interviewer's side of the table: who is asking and what kind of
 * question it is, then the question. While the next question is being
 * decided ("advancing"), the stage shows the interviewer thinking.
 */
export function QuestionStage({ question, questionNumber, roundType, advancing }: QuestionStageProps) {
  const blockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!blockRef.current || advancing) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.fromTo(
      blockRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
    );
    return () => {
      tween.kill();
    };
  }, [question.question, advancing]);

  // In a phone screen the stage is always "screen" (the header already says
  // so); the part is news. Elsewhere, skip what the header's round tag
  // already says, and say stage and type once when they agree.
  const descriptors =
    question.stage === "screen"
      ? [SCREEN_PARTS[question.type] ?? nameOf(question.type)]
      : [...new Set([question.stage, question.type].filter((k): k is string => Boolean(k) && k !== roundType))].map(
          nameOf,
        );

  const meta = [
    `Question ${questionNumber}`,
    ...descriptors,
    question.difficulty ? nameOf(question.difficulty) : null,
    question.timeAllocationMinutes ? `About ${question.timeAllocationMinutes} min` : null,
  ].filter(Boolean) as string[];

  const { ask, detail } = splitQuestion(question.question);
  const askSize = detail
    ? "text-xl md:text-[1.7rem]"
    : wordsIn(ask) > 30
      ? "text-lg md:text-[1.45rem]"
      : "text-2xl md:text-[2rem]";

  return (
    <div className="min-h-[160px] md:min-h-[190px]">
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[color:var(--cc-ash)]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[color:var(--cc-ink-soft)]">
          <span aria-hidden className="cc-iv-dot" />
          Interviewer
        </span>
        {advancing ? (
          <span className="cc-blink">is thinking about your answer…</span>
        ) : (
          meta.map((m) => (
            <span key={m} className="inline-flex items-center gap-2">
              <span aria-hidden>·</span>
              {m}
            </span>
          ))
        )}
      </div>

      {advancing ? (
        <p className="cc-font-display text-xl leading-snug text-[color:var(--cc-ash)] md:text-[1.7rem]">
          Deciding where to take this next
          <span className="cc-blink">…</span>
        </p>
      ) : (
        <div ref={blockRef}>
          <p
            className={`cc-font-display ${askSize} leading-snug tracking-tight text-[color:var(--cc-ink)] [text-wrap:pretty]`}
          >
            {ask}
          </p>
          {detail && (
            <p className="mt-3 max-w-[64ch] text-[16px] leading-relaxed text-[color:var(--cc-ink-soft)] md:text-[17px]">
              {detail}
            </p>
          )}
        </div>
      )}

      {/* The coach's reason for aiming this at THIS candidate — there when
          wanted, closed so it doesn't compete with the question. */}
      {!advancing && question.whyThisQuestion && (
        <details className="cc-iv-why mt-4">
          <summary>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            Why this question?
          </summary>
          <p className="mt-2 max-w-[64ch] border-l-2 border-[color:var(--cc-iv-edge,var(--cc-hair-strong))] pl-3 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
            {question.whyThisQuestion}
          </p>
        </details>
      )}
    </div>
  );
}

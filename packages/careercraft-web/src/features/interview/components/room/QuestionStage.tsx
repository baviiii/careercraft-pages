import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { CoachQuestion } from "@/lib/interviewCoach";

interface QuestionStageProps {
  question: CoachQuestion;
  questionNumber: number;
  advancing: boolean;
}

/**
 * The interviewer's side of the table: mono meta line, then the question in
 * large display type with a word-staggered reveal. While the next question is
 * being decided ("advancing"), the stage shows the interviewer thinking.
 */
export function QuestionStage({ question, questionNumber, advancing }: QuestionStageProps) {
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!textRef.current || advancing) return;
    const words = textRef.current.querySelectorAll<HTMLElement>("[data-word]");
    if (!words.length) return;
    const tween = gsap.fromTo(
      words,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.028, ease: "power2.out" },
    );
    return () => {
      tween.kill();
    };
  }, [question.question, advancing]);

  // stage and type often agree ("behavioral"/"behavioral") — dedupe so the meta
  // line reads as a description rather than a stutter.
  const descriptors = [...new Set([question.stage, question.type?.replace(/_/g, " ")].filter(Boolean))];

  const meta = [
    `Question ${String(questionNumber).padStart(2, "0")}`,
    ...descriptors,
    question.difficulty,
    question.timeAllocationMinutes ? `~${question.timeAllocationMinutes} min` : null,
  ].filter(Boolean);

  return (
    <div className="min-h-[180px] md:min-h-[210px]">
      <div className="mb-4 flex items-center gap-3">
        <span className="cc-label text-[color:var(--cc-ash)]">Interviewer</span>
        <span className="cc-rule w-10" />
        {advancing ? (
          <span className="cc-label-sm cc-blink text-[color:var(--cc-rust)]">
            considering your answer…
          </span>
        ) : (
          <span className="cc-label-sm text-[color:var(--cc-ash)]">{meta.join(" · ")}</span>
        )}
      </div>

      {advancing ? (
        <p className="cc-font-display text-2xl leading-snug text-[color:var(--cc-ash)] md:text-[2rem]">
          Deciding where to take this next
          <span className="cc-blink">…</span>
        </p>
      ) : (
        <p
          ref={textRef}
          className="cc-font-display text-2xl leading-snug tracking-tight text-[color:var(--cc-ink)] md:text-[2rem]"
        >
          {question.question.split(/\s+/).map((word, i) => (
            <span key={`${question.question.slice(0, 12)}-${i}`} data-word className="inline-block">
              {word}
              {" "}
            </span>
          ))}
        </p>
      )}

      {/* The coach's reason for aiming this at THIS candidate. Quiet by design —
          it explains the question, it doesn't compete with it. */}
      {!advancing && question.whyThisQuestion && (
        <p className="mt-4 border-l-2 border-[color:var(--cc-hair-strong)] pl-3 text-sm leading-snug text-[color:var(--cc-ash)]">
          <span className="cc-label-sm text-[color:var(--cc-rust)]">Why you</span>{" "}
          {question.whyThisQuestion}
        </p>
      )}
    </div>
  );
}

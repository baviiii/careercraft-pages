import { ArrowRight, RotateCcw } from "lucide-react";
import type { CoachAnswerEvaluation } from "@/lib/interviewCoach";
import type { DeliveryMetrics } from "../../types";
import { AnswerWorking } from "../AnswerFeedback";
import { ProofChip } from "../ProofChip";

interface FeedbackCardProps {
  evaluation: CoachAnswerEvaluation;
  /** The answer this feedback is about — the markup highlights it. */
  answer: string;
  delivery?: DeliveryMetrics | null;
  isLast: boolean;
  onContinue: () => void;
  /** Answer the same question again, scored against this attempt. */
  onRetry?: () => void;
}

function PointList({
  title,
  items,
  tone,
  emptyNote,
}: {
  title: string;
  items: string[];
  tone: "signal" | "wheat" | "rust";
  emptyNote?: string;
}) {
  const toneColor =
    tone === "signal"
      ? "var(--cc-signal-deep)"
      : tone === "wheat"
        ? "var(--cc-wheat-deep)"
        : "var(--cc-rust-deep)";
  return (
    <div>
      <p className="cc-label-sm mb-2" style={{ color: toneColor }}>
        {title}
      </p>
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-[color:var(--cc-ink-soft)]">
              <span aria-hidden style={{ color: toneColor }}>
                —
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[color:var(--cc-ash)]">{emptyNote ?? "None."}</p>
      )}
    </div>
  );
}

/**
 * Coached-mode verdict on one answer — shown before moving on. Leads with how
 * the score was made and where the answer stands against STAR, then what to
 * change, then the two ways forward: try it again, or the next question.
 */
export function FeedbackCard({ evaluation, answer, delivery, isLast, onContinue, onRetry }: FeedbackCardProps) {
  const followUp = evaluation.followUpQuestion || evaluation.improvement;

  return (
    <section className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)]">
      <div className="flex items-center justify-between border-b border-[color:var(--cc-hair)] px-5 py-4">
        <span className="cc-label text-[color:var(--cc-ink)]">Coach feedback</span>
        <p className="cc-font-display text-3xl leading-none text-[color:var(--cc-ink)]">
          {evaluation.score}
          <span className="text-base text-[color:var(--cc-ash)]">/10</span>
        </p>
      </div>

      <div className="space-y-6 p-5">
        <AnswerWorking evaluation={evaluation} answer={answer} delivery={delivery} />

        {evaluation.rubricApplied && (
          <p className="text-xs leading-relaxed text-[color:var(--cc-ash)]">{evaluation.rubricApplied}</p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <PointList title="What landed" items={evaluation.validation.correct} tone="signal" />
          <PointList title="What's missing" items={evaluation.validation.missing} tone="wheat" />
          <PointList
            title="Red flags"
            items={evaluation.validation.redFlags}
            tone="rust"
            emptyNote="None detected."
          />
        </div>

        {evaluation.bestAnswer && (
          <div>
            <p className="cc-label-sm mb-2 text-[color:var(--cc-ink)]">A stronger answer</p>
            <blockquote className="border-l-2 border-[color:var(--cc-iv,var(--cc-rust))] bg-[color:var(--cc-cream)] px-4 py-3 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
              {evaluation.bestAnswer}
            </blockquote>
            {evaluation.faangAnswer && (
              <p className="mt-2 text-xs text-[color:var(--cc-ash)]">
                Key changes: {evaluation.faangAnswer}
              </p>
            )}
          </div>
        )}

        {evaluation.tips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {evaluation.tips.map((tip, i) => (
              <span
                key={i}
                className="border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream)] px-2.5 py-1.5 text-xs text-[color:var(--cc-ink-soft)]"
              >
                {tip}
              </span>
            ))}
          </div>
        )}

        {followUp && (
          <div>
            <p className="cc-label-sm mb-1.5 text-[color:var(--cc-ash)]">
              What they'd ask you next
            </p>
            <p className="text-sm italic leading-relaxed text-[color:var(--cc-ink-soft)]">
              "{followUp}"
            </p>
          </div>
        )}

        {evaluation.proof && <ProofChip proof={evaluation.proof} />}

        <div className="flex flex-col gap-3 sm:flex-row">
          {onRetry && (
            <button onClick={onRetry} className="cc-btn cc-btn-ghost sm:flex-1" type="button">
              <RotateCcw className="h-3.5 w-3.5" />
              Try this answer again
            </button>
          )}
          <button onClick={onContinue} className="cc-btn cc-btn-primary sm:flex-1" type="button">
            {isLast ? "Finish & get your debrief" : "Next question"}
            <ArrowRight className="cc-arrow-right h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

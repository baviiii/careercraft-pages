import { ArrowRight } from "lucide-react";
import type { CoachAnswerEvaluation, StarBreakdown, StarCoverage } from "@/lib/interviewCoach";
import { ProofChip } from "../ProofChip";

interface FeedbackCardProps {
  evaluation: CoachAnswerEvaluation;
  isLast: boolean;
  onContinue: () => void;
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

const STAR_TONE: Record<StarCoverage, string> = {
  present: "var(--cc-signal-deep)",
  thin: "var(--cc-wheat-deep)",
  missing: "var(--cc-rust-deep)",
};

/**
 * STAR completeness, shown only for behavioral answers (the MCP omits the block
 * entirely for technical ones). This is the thing that makes behavioral practice
 * actionable — "missing result" is a concrete fix in a way a score isn't.
 */
function StarRow({ star }: { star: StarBreakdown }) {
  const parts: Array<[string, StarCoverage]> = [
    ["Situation", star.situation],
    ["Task", star.task],
    ["Action", star.action],
    ["Result", star.result],
  ];
  return (
    <div>
      <p className="cc-label-sm mb-2 text-[color:var(--cc-ink)]">STAR coverage</p>
      <div className="flex flex-wrap gap-2">
        {parts.map(([label, coverage]) => (
          <span
            key={label}
            className="cc-label-sm border bg-[color:var(--cc-cream)] px-2.5 py-1.5"
            style={{ color: STAR_TONE[coverage], borderColor: STAR_TONE[coverage] }}
          >
            {label} · {coverage}
          </span>
        ))}
      </div>
      {star.note && (
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--cc-ash)]">{star.note}</p>
      )}
    </div>
  );
}

/** Coached-mode verdict on one answer — shown before moving on. */
export function FeedbackCard({ evaluation, isLast, onContinue }: FeedbackCardProps) {
  const breakdown = Object.entries(evaluation.scoreBreakdown ?? {});
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
        {breakdown.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-2">
              {breakdown.map(([key, value]) => (
                <span
                  key={key}
                  // The evaluator's justification for this criterion, when it gave one.
                  title={evaluation.scoreNotes?.[key] || undefined}
                  className="cc-label-sm border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] px-2.5 py-1.5 text-[color:var(--cc-ink-soft)]"
                >
                  {key.replace(/([a-z])([A-Z])/g, "$1 $2")} · {value}
                </span>
              ))}
            </div>
            {evaluation.rubricApplied && (
              <p className="mt-2 text-xs leading-relaxed text-[color:var(--cc-ash)]">
                {evaluation.rubricApplied}
              </p>
            )}
          </div>
        )}

        {evaluation.starBreakdown && <StarRow star={evaluation.starBreakdown} />}

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
            <blockquote className="border-l-2 border-[color:var(--cc-rust)] bg-[color:var(--cc-cream)] px-4 py-3 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
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

        <button onClick={onContinue} className="cc-btn cc-btn-primary w-full">
          {isLast ? "Finish & get your debrief" : "Next question"}
          <ArrowRight className="cc-arrow-right h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}

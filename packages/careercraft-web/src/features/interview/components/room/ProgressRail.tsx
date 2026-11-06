import type { AnswerRecord, InterviewMode } from "../../types";

interface ProgressRailProps {
  records: AnswerRecord[];
  totalPlanned: number;
  mode: InterviewMode;
}

/**
 * The question strip. Coached mode shows scores as they land; Realistic mode
 * keeps them sealed until the debrief (a real panel doesn't grade you live).
 */
export function ProgressRail({ records, totalPlanned, mode }: ProgressRailProps) {
  // A one-question session has nothing to track.
  if (totalPlanned <= 1) return null;
  const cells = Array.from({ length: totalPlanned }, (_, i) => records[i] ?? null);

  return (
    <div className="border-b border-[color:var(--cc-hair)]">
      <div className="mx-auto flex max-w-[1100px] px-5 md:px-8">
        {cells.map((record, i) => {
          const isCurrent = i === records.length - 1 && record && !record.answerText && !record.skipped;
          const isDone = Boolean(record && (record.answerText || record.skipped));
          const score =
            mode === "coached" && record?.evaluation ? record.evaluation.score : null;

          return (
            <div
              key={i}
              className={[
                "flex h-10 flex-1 items-center justify-center gap-1.5 border-r border-[color:var(--cc-hair)] last:border-r-0",
                // The round's colour (set on the room) marks where you are.
                isCurrent ? "shadow-[inset_0_-3px_0_0_var(--cc-iv,var(--cc-rust))]" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "text-[13px] tabular-nums",
                  isCurrent
                    ? "font-semibold text-[color:var(--cc-ink)]"
                    : isDone
                      ? "text-[color:var(--cc-ink)]"
                      : "text-[color:var(--cc-ash)]",
                ].join(" ")}
              >
                {i + 1}
              </span>
              {record?.skipped && (
                <span className="text-[12px] text-[color:var(--cc-ash)]">· skipped</span>
              )}
              {score !== null && (
                <span className="text-[12px] tabular-nums text-[color:var(--cc-ink-soft)]">
                  · {score}/10
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

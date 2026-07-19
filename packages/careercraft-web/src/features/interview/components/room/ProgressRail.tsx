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
                isCurrent ? "shadow-[inset_0_-2px_0_0_var(--cc-rust)]" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "cc-label-sm",
                  isCurrent
                    ? "text-[color:var(--cc-rust)]"
                    : isDone
                      ? "text-[color:var(--cc-ink)]"
                      : "text-[color:var(--cc-ash)]",
                ].join(" ")}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {record?.skipped && (
                <span className="cc-label-sm text-[color:var(--cc-ash)]">–</span>
              )}
              {score !== null && (
                <span className="cc-font-mono text-[10px] tabular-nums text-[color:var(--cc-ink-soft)]">
                  {score}/10
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

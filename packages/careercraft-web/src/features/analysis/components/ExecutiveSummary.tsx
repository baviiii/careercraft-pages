import { Check, Minus } from "lucide-react";

import { Empty } from "./proof";

interface ExecutiveSummaryProps {
  summary: {
    overallVerdict: string;
    topStrengths: string[];
    topWeaknesses: string[];
    mostImportantFixes: string[];
  };
}

export const ExecutiveSummary = ({ summary }: ExecutiveSummaryProps) => (
  <section className="cc-surface mt-6 p-6 md:p-9">
    <div className="grid gap-9 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
      <div className="min-w-0">
        <h2 className="cc-font-display text-[24px] leading-tight text-[color:var(--cc-ink)]">
          Summary
        </h2>
        <p className="mt-3 max-w-3xl text-[17px] leading-[1.65] text-[color:var(--cc-ink-soft)]">
          {summary.overallVerdict}
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <PointList title="Strengths" items={summary.topStrengths} kind="good" />
          <PointList title="Gaps" items={summary.topWeaknesses} kind="gap" />
        </div>
      </div>

      <aside className="cc-proof-note self-start p-6 md:p-7">
        <h3 className="cc-font-display text-[20px] leading-tight">Fix first</h3>
        {summary.mostImportantFixes.length === 0 ? (
          <div className="mt-4">
            <Empty />
          </div>
        ) : (
          <ol className="mt-5 space-y-5">
            {summary.mostImportantFixes.map((fix, i) => (
              <li key={i} className="flex gap-4">
                <span className="cc-proof-note__num w-5 shrink-0">{i + 1}</span>
                <span className="text-[15px] leading-snug">{fix}</span>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  </section>
);

const PointList = ({
  title,
  items,
  kind,
}: {
  title: string;
  items: string[];
  kind: "good" | "gap";
}) => {
  const Icon = kind === "good" ? Check : Minus;
  const color = kind === "good" ? "var(--pf-good)" : "var(--pf-redpen)";
  return (
    <div>
      <h3 className="cc-label-sm text-[color:var(--cc-ash)]">{title}</h3>
      {items.length === 0 ? (
        <div className="mt-3">
          <Empty />
        </div>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-snug text-[color:var(--cc-ink)]">
              <span
                className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full"
                style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
              >
                <Icon className="h-3 w-3" strokeWidth={3} />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

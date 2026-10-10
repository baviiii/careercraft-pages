import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

import { Empty, FixRow, Mark, Panel } from "./proof";

interface SuggestionsPanelProps {
  analysis: ATSAIAnalysis;
}

export const SuggestionsPanel = ({ analysis }: SuggestionsPanelProps) => {
  const { quickFixes, strongEnhancements, advancedOptimizations } =
    analysis.improvements;

  return (
    <div className="space-y-5">
      <Panel title="Quick fixes" count={quickFixes.length}>
        {quickFixes.length === 0 ? (
          <Empty />
        ) : (
          <div className="divide-y divide-[color:var(--cc-hair)]">
            {quickFixes.map((fix, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0">
                <FixRow issue={fix.issue} fix={fix.fix} />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Before and after" count={strongEnhancements.length}>
        {strongEnhancements.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-6">
            {strongEnhancements.map((enh, i) => (
              <article key={i}>
                {enh.section && <Mark kind="plain">{enh.section}</Mark>}
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-[color:var(--cc-cream-2)] p-4">
                    <div className="cc-label-sm text-[color:var(--cc-ash)]">Before</div>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                      {enh.current}
                    </p>
                  </div>
                  <div className="cc-proof-sheet !rounded-xl !border-l-[3px] !border-l-[color:var(--cc-rust)] p-4">
                    <div className="cc-label-sm text-[color:var(--cc-rust)]">After</div>
                    <p className="mt-2 text-[14.5px] leading-relaxed">{enh.improved}</p>
                  </div>
                </div>
                {enh.impact && (
                  <p className="mt-2.5 text-[13.5px] text-[color:var(--cc-ash)]">
                    <span className="font-semibold text-[color:var(--cc-ink-soft)]">Why:</span>{" "}
                    {enh.impact}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Bigger changes" count={advancedOptimizations.length}>
        {advancedOptimizations.length === 0 ? (
          <Empty />
        ) : (
          <ol className="space-y-3.5">
            {advancedOptimizations.map((opt, i) => (
              <li key={i} className="flex gap-4">
                <span className="cc-metric w-6 shrink-0 text-[20px] !text-[color:var(--cc-rust)]">
                  {i + 1}
                </span>
                <span className="text-[15px] leading-snug text-[color:var(--cc-ink)]">{opt}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
};

import { ChevronRight } from "lucide-react";

import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

interface SuggestionsPanelProps {
  analysis: ATSAIAnalysis;
}

export const SuggestionsPanel = ({ analysis }: SuggestionsPanelProps) => {
  const { quickFixes, strongEnhancements, advancedOptimizations } =
    analysis.improvements;

  return (
    <div className="space-y-8">
      <section className="cc-card p-7">
        <div className="cc-label text-[color:var(--cc-rust)]">§ Quick redlines</div>
        <h3 className="mt-2 cc-font-display text-2xl leading-tight mb-5">
          Small <span className="cc-italic-wonk">corrections</span>.
        </h3>
        {quickFixes.length === 0 ? (
          <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
            Nothing to redline at this pass.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--cc-hair-strong)]">
            {quickFixes.map((fix, i) => (
              <li
                key={i}
                className="py-3 cc-font-editorial text-[17px] leading-snug"
              >
                <span className="cc-strike">{fix.issue}</span>
                <span className="mx-2 text-[color:var(--cc-ash)]">→</span>
                <span className="italic text-[color:var(--cc-rust)]">
                  {fix.fix}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cc-card p-7">
        <div className="cc-label text-[color:var(--cc-rust)]">§ Stronger phrasing</div>
        <h3 className="mt-2 cc-font-display text-2xl leading-tight mb-5">
          Before <span className="cc-italic-wonk">&</span> after.
        </h3>
        <div className="space-y-6">
          {strongEnhancements.map((enh, i) => (
            <article
              key={i}
              className="border border-[color:var(--cc-hair-strong)] p-5"
            >
              <span className="cc-pill">{enh.section}</span>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="border-l-2 border-l-[color:var(--cc-hair-strong)] pl-4">
                  <div className="cc-label text-[color:var(--cc-ash)]">§ Current</div>
                  <p className="mt-2 cc-font-editorial text-[color:var(--cc-ink-soft)]">
                    {enh.current}
                  </p>
                </div>
                <div className="border-l-2 border-l-[color:var(--cc-rust)] pl-4">
                  <div className="cc-label text-[color:var(--cc-rust)]">§ Revised</div>
                  <p className="mt-2 cc-font-editorial italic text-[color:var(--cc-ink)]">
                    {enh.improved}
                  </p>
                </div>
              </div>
              <p className="mt-4 cc-label text-[color:var(--cc-ash)]">
                Impact · {enh.impact}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="cc-card p-7">
        <div className="cc-label text-[color:var(--cc-rust)]">
          § Advanced optimisations
        </div>
        <h3 className="mt-2 cc-font-display text-2xl leading-tight mb-5">
          The <span className="cc-italic-wonk">deeper</span> edits.
        </h3>
        <ul className="space-y-3">
          {advancedOptimizations.map((opt, i) => (
            <li key={i} className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 mt-1 text-[color:var(--cc-rust)] flex-shrink-0" />
              <span className="cc-font-editorial italic text-[17px] text-[color:var(--cc-ink)]">
                {opt}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

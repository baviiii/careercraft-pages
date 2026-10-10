import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

import { SegmentMeter } from "./proof";

interface WritingQualityPanelProps {
  analysis: ATSAIAnalysis;
}

const LABELS: Record<string, { label: string; desc: string }> = {
  grammarScore: { label: "Grammar", desc: "Spelling and punctuation" },
  impactLanguageScore: { label: "Impact", desc: "Achievement-focused wording" },
  metricsUsageScore: { label: "Metrics", desc: "Numbers and results" },
  actionVerbsScore: { label: "Action verbs", desc: "Strong opening words" },
  clarityScore: { label: "Clarity", desc: "Easy to follow" },
  structureScore: { label: "Structure", desc: "Logical order" },
};

export const WritingQualityPanel = ({ analysis }: WritingQualityPanelProps) => (
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {Object.entries(analysis.writingQuality).map(([key, score]) => {
      const info = LABELS[key] ?? { label: key, desc: "" };
      return (
        <section key={key} className="cc-surface p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="cc-font-display text-[19px] leading-tight text-[color:var(--cc-ink)]">
                {info.label}
              </h3>
              {info.desc && (
                <p className="mt-1 text-[13px] text-[color:var(--cc-ash)]">{info.desc}</p>
              )}
            </div>
            <span className="cc-metric shrink-0 text-[36px]">
              {score}
              <span className="ml-0.5 text-[14px] font-medium text-[color:var(--cc-ash)]">/10</span>
            </span>
          </div>
          <SegmentMeter
            value={score}
            max={10}
            segments={10}
            label={`${info.label} ${score} out of 10`}
            className="mt-5"
          />
        </section>
      );
    })}
  </div>
);

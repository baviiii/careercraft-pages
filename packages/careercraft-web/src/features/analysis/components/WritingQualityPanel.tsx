import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

interface WritingQualityPanelProps {
  analysis: ATSAIAnalysis;
}

const LABELS: Record<string, { label: string; desc: string }> = {
  grammarScore: { label: "Grammar", desc: "spelling & punctuation" },
  impactLanguageScore: { label: "Impact", desc: "achievement-focused wording" },
  metricsUsageScore: { label: "Metrics", desc: "quantifiable results" },
  actionVerbsScore: { label: "Action verbs", desc: "strong opening words" },
  clarityScore: { label: "Clarity", desc: "easy to read aloud" },
  structureScore: { label: "Structure", desc: "logical organisation" },
};

export const WritingQualityPanel = ({ analysis }: WritingQualityPanelProps) => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
    {Object.entries(analysis.writingQuality).map(([key, score]) => {
      const info = LABELS[key];
      return (
        <section key={key} className="cc-card p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div>
              <div className="cc-label text-[color:var(--cc-rust)]">§ {info?.label}</div>
              <p className="mt-1 cc-font-editorial italic text-[color:var(--cc-ink-soft)] text-sm">
                {info?.desc}
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="cc-font-display cc-tabular text-4xl text-[color:var(--cc-ink)] leading-none">
                {score}
              </span>
              <span className="cc-font-editorial italic text-sm text-[color:var(--cc-ash)]">
                /10
              </span>
            </div>
          </div>
          <div className="h-[2px] bg-[color:var(--cc-hair-strong)] relative">
            <div
              className="absolute inset-y-0 left-0 bg-[color:var(--cc-rust)]"
              style={{ width: `${Math.max(0, Math.min(100, score * 10))}%` }}
            />
          </div>
        </section>
      );
    })}
  </div>
);

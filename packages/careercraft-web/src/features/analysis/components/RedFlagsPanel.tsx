import { CheckCircle2 } from "lucide-react";

import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

interface RedFlagsPanelProps {
  analysis: ATSAIAnalysis;
}

export const RedFlagsPanel = ({ analysis }: RedFlagsPanelProps) => {
  if (analysis.redFlags.length === 0) {
    return (
      <section className="border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-10 md:p-14 text-center">
        <CheckCircle2 className="w-10 h-10 mx-auto text-[color:var(--cc-rust)]" />
        <div className="cc-label text-[color:var(--cc-rust)] mt-6">
          § Clean pages
        </div>
        <h3 className="mt-3 cc-font-display text-3xl md:text-4xl leading-tight">
          No red flags <span className="cc-italic-wonk">raised</span>.
        </h3>
        <p className="mt-4 cc-font-editorial italic text-[color:var(--cc-ink-soft)] max-w-md mx-auto">
          The draft passes every red-flag check we run against it.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {analysis.redFlags.map((flag, i) => (
        <article
          key={i}
          className="cc-card p-6 border-l-[3px] border-l-[color:var(--cc-rust)]"
        >
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <div className="cc-label text-[color:var(--cc-rust)]">
                § {flag.type}
              </div>
              <h4 className="mt-2 cc-font-display text-xl leading-tight">
                {flag.description}
              </h4>
            </div>
            <span className="cc-pill cc-pill-rust">{flag.severity}</span>
          </div>
          <p className="mt-3 cc-font-editorial italic text-[color:var(--cc-ink-soft)] text-[15px]">
            <span className="cc-label text-[color:var(--cc-ash)] mr-2">
              Location
            </span>
            {flag.location}
          </p>
        </article>
      ))}
    </div>
  );
};

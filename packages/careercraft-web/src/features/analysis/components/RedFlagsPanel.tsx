import type { CSSProperties } from "react";

import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

import { SEVERITY } from "../tone";

interface RedFlagsPanelProps {
  analysis: ATSAIAnalysis;
}

export const RedFlagsPanel = ({ analysis }: RedFlagsPanelProps) => {
  if (analysis.redFlags.length === 0) {
    return (
      <section className="cc-surface grid place-items-center p-14">
        <span
          className="cc-proof-stamp cc-proof-stamp--tilt"
          style={{ "--stamp": "var(--pf-good)" } as CSSProperties}
        >
          No red flags
        </span>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {analysis.redFlags.map((flag, i) => {
        const color = SEVERITY[flag.severity] ?? SEVERITY.minor;
        return (
          <article key={i} className="cc-surface relative overflow-hidden p-6 pl-7 md:p-7 md:pl-8">
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 max-w-3xl">
                {flag.type && (
                  <div className="cc-label-sm text-[color:var(--cc-ash)]">{flag.type}</div>
                )}
                <h3 className="mt-2 text-[16.5px] font-medium leading-snug text-[color:var(--cc-ink)]">
                  {flag.description}
                </h3>
              </div>
              <span
                className="cc-proof-stamp cc-proof-stamp--sm cc-proof-stamp--tilt"
                style={{ "--stamp": color } as CSSProperties}
              >
                {flag.severity}
              </span>
            </div>
            {flag.location && (
              <p className="mt-3 text-[14px] text-[color:var(--cc-ink-soft)]">
                <span className="cc-label-sm mr-2 text-[color:var(--cc-ash)]">Where</span>
                {flag.location}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
};

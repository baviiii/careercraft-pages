import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

interface OverviewPanelProps {
  analysis: ATSAIAnalysis;
}

export const OverviewPanel = ({ analysis }: OverviewPanelProps) => (
  <div className="grid md:grid-cols-2 gap-5">
    <Card kicker="§ Keywords — present" count={analysis.resumeKeywords.matched.length}>
      <div className="flex flex-wrap gap-1.5">
        {analysis.resumeKeywords.matched.slice(0, 15).map((kw, i) => (
          <span key={i} className="cc-pill cc-pill-filled">
            {kw}
          </span>
        ))}
        {analysis.resumeKeywords.matched.length > 15 && (
          <span className="cc-pill">
            +{analysis.resumeKeywords.matched.length - 15} more
          </span>
        )}
      </div>
    </Card>

    <Card kicker="§ Keywords — missing" count={analysis.resumeKeywords.missing.length}>
      <div className="flex flex-wrap gap-1.5">
        {analysis.resumeKeywords.missing.slice(0, 15).map((kw, i) => (
          <span key={i} className="cc-pill cc-pill-rust">
            {kw}
          </span>
        ))}
        {analysis.resumeKeywords.missing.length > 15 && (
          <span className="cc-pill">
            +{analysis.resumeKeywords.missing.length - 15} more
          </span>
        )}
      </div>
    </Card>

    <Card kicker="§ Red flags" count={analysis.redFlags.length}>
      {analysis.redFlags.length === 0 ? (
        <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
          None raised — the draft reads cleanly.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {analysis.redFlags.slice(0, 3).map((flag, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="cc-pill cc-pill-rust mt-0.5">{flag.severity}</span>
              <span className="cc-font-editorial italic text-[color:var(--cc-ink)]">
                {flag.description}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>

    <Card kicker="§ Quick redlines" count={analysis.improvements.quickFixes.length}>
      <ul className="space-y-2.5">
        {analysis.improvements.quickFixes.slice(0, 3).map((fix, i) => (
          <li key={i} className="cc-font-editorial text-[15px] leading-snug">
            <span className="cc-strike">{fix.issue}</span>
            <span className="mx-1.5 text-[color:var(--cc-ash)]">→</span>
            <span className="italic text-[color:var(--cc-rust)]">{fix.fix}</span>
          </li>
        ))}
      </ul>
    </Card>
  </div>
);

const Card = ({
  kicker,
  count,
  children,
}: {
  kicker: string;
  count: number;
  children: React.ReactNode;
}) => (
  <section className="cc-card p-6">
    <div className="flex items-baseline justify-between mb-4">
      <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
      <span className="cc-font-display cc-tabular text-2xl text-[color:var(--cc-ink)]">
        {count}
      </span>
    </div>
    {children}
  </section>
);

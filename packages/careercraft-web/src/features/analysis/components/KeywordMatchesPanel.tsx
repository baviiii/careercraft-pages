import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

interface KeywordMatchesPanelProps {
  analysis: ATSAIAnalysis;
}

export const KeywordMatchesPanel = ({ analysis }: KeywordMatchesPanelProps) => {
  const k = analysis.resumeKeywords;
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Panel
        kicker="§ Keywords — present"
        title="Matched"
        count={k.matched.length}
        items={k.matched}
        pill="filled"
      />
      <Panel
        kicker="§ Keywords — missing"
        title="Absent"
        count={k.missing.length}
        items={k.missing}
        pill="rust"
        italic
      />
      <Panel
        kicker="§ Under-weight"
        title="Under-represented"
        count={k.underRepresented.length}
        items={k.underRepresented}
      />
      <Panel
        kicker="§ Over-weight"
        title="Overused"
        count={k.overused.length}
        items={k.overused}
        strike
      />
    </div>
  );
};

const Panel = ({
  kicker,
  title,
  count,
  items,
  pill,
  italic,
  strike,
}: {
  kicker: string;
  title: string;
  count: number;
  items: string[];
  pill?: "filled" | "rust";
  italic?: boolean;
  strike?: boolean;
}) => (
  <section className="cc-card p-6">
    <div className="flex items-baseline justify-between mb-4">
      <div>
        <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
        <h4 className="mt-1 cc-font-display text-xl leading-tight">{title}</h4>
      </div>
      <span className="cc-font-display cc-tabular text-2xl text-[color:var(--cc-ink)]">
        {count}
      </span>
    </div>
    {items.length === 0 ? (
      <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
        None noted.
      </p>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {items.map((kw, i) =>
          italic ? (
            <span key={i} className="cc-highlight cc-font-editorial italic text-[15px]">
              {kw}
            </span>
          ) : strike ? (
            <span key={i} className="cc-strike cc-font-editorial italic text-[15px]">
              {kw}
            </span>
          ) : (
            <span
              key={i}
              className={`cc-pill ${
                pill === "filled" ? "cc-pill-filled" : pill === "rust" ? "cc-pill-rust" : ""
              }`}
            >
              {kw}
            </span>
          )
        )}
      </div>
    )}
  </section>
);

import { AlertCircle, ChevronRight, Star } from "lucide-react";

interface ExecutiveSummaryProps {
  summary: {
    overallVerdict: string;
    topStrengths: string[];
    topWeaknesses: string[];
    mostImportantFixes: string[];
  };
}

export const ExecutiveSummary = ({ summary }: ExecutiveSummaryProps) => (
  <section className="mt-8 border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-7 md:p-8">
    <div className="flex items-baseline justify-between gap-6 mb-5">
      <div>
        <div className="cc-label text-[color:var(--cc-rust)]">§ The verdict</div>
        <h2 className="mt-2 cc-font-display text-2xl md:text-3xl leading-tight">
          Executive <span className="cc-italic-wonk">reading</span>.
        </h2>
      </div>
    </div>

    <p className="cc-font-editorial text-lg leading-relaxed text-[color:var(--cc-ink)] cc-dropcap max-w-3xl">
      {summary.overallVerdict}
    </p>

    <div className="grid md:grid-cols-3 gap-6 mt-8">
      <Column
        kicker="§ In the draft's favour"
        title="Strengths"
        Icon={Star}
        items={summary.topStrengths}
      />
      <Column
        kicker="§ Where it falters"
        title="Weaknesses"
        Icon={AlertCircle}
        items={summary.topWeaknesses}
      />
      <Column
        kicker="§ Fix first"
        title="Priority edits"
        Icon={ChevronRight}
        items={summary.mostImportantFixes}
      />
    </div>
  </section>
);

const Column = ({
  kicker,
  title,
  Icon,
  items,
}: {
  kicker: string;
  title: string;
  Icon: typeof Star;
  items: string[];
}) => (
  <div className="border-t border-[color:var(--cc-hair-strong)] pt-5">
    <div className="cc-label text-[color:var(--cc-rust)]">{kicker}</div>
    <h4 className="mt-2 cc-font-display text-xl leading-tight">{title}</h4>
    <ul className="mt-4 space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[15px] leading-snug">
          <Icon className="w-3.5 h-3.5 mt-1 flex-shrink-0 text-[color:var(--cc-rust)]" />
          <span className="cc-font-editorial italic text-[color:var(--cc-ink)]">
            {item}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

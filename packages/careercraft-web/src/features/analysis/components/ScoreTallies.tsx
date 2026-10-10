import { ArrowUpRight } from "lucide-react";

import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

import type { ResultTabId } from "../types";

interface ScoreTalliesProps {
  analysis: ATSAIAnalysis;
  onJump: (tab: ResultTabId) => void;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Counts along the scorecard's foot; each one opens its tab. */
export const ScoreTallies = ({ analysis, onJump }: ScoreTalliesProps) => {
  const matched = analysis.resumeKeywords.matched.length;
  const missing = analysis.resumeKeywords.missing.length;
  const flags = analysis.redFlags.length;
  const fixes = analysis.improvements.quickFixes.length;

  const items: Array<{ n: number; label: string; tab: ResultTabId; alert?: boolean }> = [
    { n: matched, label: plural(matched, "keyword matched", "keywords matched"), tab: "keywords" },
    { n: missing, label: plural(missing, "keyword missing", "keywords missing"), tab: "keywords", alert: missing > 0 },
    { n: flags, label: plural(flags, "red flag", "red flags"), tab: "redflags", alert: flags > 0 },
    { n: fixes, label: plural(fixes, "quick fix", "quick fixes"), tab: "improvements" },
  ];

  return (
    <div className="grid grid-cols-2 border-t border-white/[0.08] md:grid-cols-4">
      {items.map((t, i) => (
        <button
          key={t.label}
          onClick={() => onJump(t.tab)}
          className={`cc-proof-tally group flex flex-col items-start px-6 py-5 text-left md:px-8 ${
            i % 2 === 0 ? "border-r" : ""
          } ${i < 2 ? "border-b md:border-b-0" : ""} ${i === 1 ? "md:border-r" : ""}`}
        >
          <span
            className="cc-font-display cc-tabular text-[30px] leading-none"
            style={{ color: t.alert ? "var(--pf-bad)" : "#fff" }}
          >
            {t.n}
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-[13px] text-white/55 transition-colors group-hover:text-white">
            {t.label}
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
        </button>
      ))}
    </div>
  );
};

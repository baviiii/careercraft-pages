import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

import { SEVERITY } from "../tone";
import type { ResultTabId } from "../types";
import { Empty, FixRow, MarkList, Panel, SeeAll } from "./proof";

interface OverviewPanelProps {
  analysis: ATSAIAnalysis;
  onJump: (tab: ResultTabId) => void;
}

export const OverviewPanel = ({ analysis, onJump }: OverviewPanelProps) => {
  const { matched, missing } = analysis.resumeKeywords;
  const { redFlags } = analysis;
  const { quickFixes } = analysis.improvements;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Panel
        title="Keywords you have"
        count={matched.length}
        footer={<SeeAll onClick={() => onJump("keywords")}>All keywords</SeeAll>}
      >
        <MarkList items={matched} kind="hit" limit={15} />
      </Panel>

      <Panel title="Keywords to add" count={missing.length}>
        <MarkList items={missing} kind="insert" limit={15} />
      </Panel>

      <Panel
        title="Red flags"
        count={redFlags.length}
        footer={
          redFlags.length > 3 && (
            <SeeAll onClick={() => onJump("redflags")}>All red flags</SeeAll>
          )
        }
      >
        {redFlags.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-3.5">
            {redFlags.slice(0, 3).map((flag, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
                  style={{ background: SEVERITY[flag.severity] ?? SEVERITY.minor }}
                />
                <span className="text-[15px] leading-snug text-[color:var(--cc-ink)]">
                  {flag.description}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Quick fixes"
        count={quickFixes.length}
        footer={
          quickFixes.length > 3 && (
            <SeeAll onClick={() => onJump("improvements")}>All fixes</SeeAll>
          )
        }
      >
        {quickFixes.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-4">
            {quickFixes.slice(0, 3).map((fix, i) => (
              <FixRow key={i} issue={fix.issue} fix={fix.fix} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

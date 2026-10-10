import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

import { MarkList, Panel } from "./proof";

interface KeywordMatchesPanelProps {
  analysis: ATSAIAnalysis;
}

export const KeywordMatchesPanel = ({ analysis }: KeywordMatchesPanelProps) => {
  const k = analysis.resumeKeywords;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Panel title="On your résumé" count={k.matched.length}>
        <MarkList items={k.matched} kind="hit" />
      </Panel>
      <Panel title="Missing" count={k.missing.length}>
        <MarkList items={k.missing} kind="insert" />
      </Panel>
      <Panel title="Mention more" count={k.underRepresented.length}>
        <MarkList items={k.underRepresented} kind="thin" />
      </Panel>
      <Panel title="Overused" count={k.overused.length}>
        <MarkList items={k.overused} kind="cut" />
      </Panel>
    </div>
  );
};

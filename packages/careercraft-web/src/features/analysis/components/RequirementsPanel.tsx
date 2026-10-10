import type { ATSAIAnalysis } from "@/lib/atsAIAnalyzer";

import { Empty, Mark, Panel } from "./proof";

interface RequirementsPanelProps {
  analysis: ATSAIAnalysis;
}

const norm = (s: string) => s.trim().toLowerCase();

export const RequirementsPanel = ({ analysis }: RequirementsPanelProps) => {
  const r = analysis.jobRequirements;
  // Only exact keyword matches are highlighted — an unmarked item is
  // "not confirmed", not "missing".
  const have = new Set(analysis.resumeKeywords.matched.map(norm));

  const block = (title: string, items: string[], className = "") => (
    <Panel title={title} count={items.length} className={className}>
      {items.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <Mark key={i} kind={have.has(norm(item)) ? "hit" : "plain"}>
              {item}
            </Mark>
          ))}
        </div>
      )}
    </Panel>
  );

  return (
    <div>
      <p className="mb-4 flex items-center gap-2 text-[13px] text-[color:var(--cc-ash)]">
        <Mark kind="hit">Highlighted</Mark>
        on your résumé
      </p>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {block("Must-have", r.mandatorySkills, "md:col-span-2 lg:col-span-2")}
        <Panel title="Experience">
          <p className="text-[16px] leading-relaxed text-[color:var(--cc-ink)]">
            {r.requiredExperience || "—"}
          </p>
        </Panel>
        {block("Nice to have", r.preferredSkills)}
        {block("Technical", r.technicalKeywords)}
        {block("Tools", r.tools)}
        {block("Soft skills", r.softSkills)}
        {r.certifications?.length > 0 && block("Certifications", r.certifications)}
      </div>
    </div>
  );
};

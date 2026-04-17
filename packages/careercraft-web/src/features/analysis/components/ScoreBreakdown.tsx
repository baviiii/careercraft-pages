import { BriefcaseIcon, FileCheck, Search, Target } from "lucide-react";

interface ScoreBreakdownProps {
  subScores: {
    skillsMatch: number;
    experienceMatch: number;
    keywordMatch: number;
    formatCompatibility: number;
  };
}

const ITEMS = [
  { key: "skillsMatch", label: "Skills", icon: Target },
  { key: "experienceMatch", label: "Experience", icon: BriefcaseIcon },
  { key: "keywordMatch", label: "Keywords", icon: Search },
  { key: "formatCompatibility", label: "Format", icon: FileCheck },
] as const;

export const ScoreBreakdown = ({ subScores }: ScoreBreakdownProps) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
    {ITEMS.map(({ key, label, icon: Icon }) => {
      const value = subScores[key];
      return (
        <div
          key={key}
          className="bg-[color:var(--cc-cream)] p-5 md:p-6 text-left"
        >
          <div className="flex items-center gap-2 cc-label text-[color:var(--cc-ash)]">
            <Icon className="w-3.5 h-3.5" />
            {label}
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="cc-font-display cc-tabular text-4xl leading-none text-[color:var(--cc-ink)]">
              {value}
            </span>
            <span className="cc-font-editorial italic text-sm text-[color:var(--cc-ash)]">
              /100
            </span>
          </div>
          <div className="mt-3 h-[2px] bg-[color:var(--cc-hair-strong)] relative">
            <div
              className="absolute inset-y-0 left-0 bg-[color:var(--cc-rust)]"
              style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

import { SegmentMeter } from "./proof";

interface ScoreBreakdownProps {
  subScores: {
    skillsMatch: number;
    experienceMatch: number;
    keywordMatch: number;
    formatCompatibility: number;
  };
}

const ITEMS = [
  { key: "skillsMatch", label: "Skills" },
  { key: "experienceMatch", label: "Experience" },
  { key: "keywordMatch", label: "Keywords" },
  { key: "formatCompatibility", label: "Format" },
] as const;

export const ScoreBreakdown = ({ subScores }: ScoreBreakdownProps) => (
  <div className="flex flex-col justify-center gap-6">
    {ITEMS.map(({ key, label }) => {
      const value = Math.round(subScores[key]);
      return (
        <div key={key}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[14px] font-medium text-white/70">{label}</span>
            <span className="cc-font-display cc-tabular text-[28px] leading-none text-white">
              {value}
            </span>
          </div>
          <SegmentMeter
            value={value}
            max={100}
            segments={20}
            label={`${label} ${value} out of 100`}
            className="mt-2.5"
          />
        </div>
      );
    })}
  </div>
);

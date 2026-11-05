import type { CSSProperties } from "react";

import { useArmed } from "../hooks/useProofMotion";
import { toneFor, toneVar } from "../tone";
import { SCORE_PARTS, weakestArea, type SubScores } from "./scoreParts";

export const ScoreBreakdown = ({ subScores }: { subScores: SubScores }) => {
  const armed = useArmed();
  const weakest = weakestArea(subScores);

  return (
    <div className="flex flex-col justify-center">
      <span className="cc-proof-label">How it breaks down</span>
      <ul className="mt-5 space-y-5">
        {SCORE_PARTS.map(({ key, label, hint }) => {
          const value = Math.max(0, Math.min(100, Math.round(subScores[key])));
          const isWeakest = weakest?.key === key;
          return (
            <li key={key}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[15px] font-medium text-[color:var(--cc-ink)]">
                  {label}
                  {isWeakest && <span className="cc-proof-weakest">start here</span>}
                </span>
                <span className="cc-font-display cc-tabular text-[22px] leading-none text-[color:var(--cc-ink)]">
                  {value}
                </span>
              </div>
              <div
                className="cc-proof-bar mt-2"
                role="meter"
                aria-label={`${label} ${value} out of 100`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={value}
              >
                <span
                  style={{ width: `${armed ? value : 0}%`, "--m": toneVar(toneFor(value)) } as CSSProperties}
                />
              </div>
              <p className="mt-1.5 text-[13px] text-[color:var(--cc-ash)]">{hint}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

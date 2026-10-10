import { motion, useReducedMotion } from "framer-motion";
import { FileText } from "lucide-react";
import type { CSSProperties } from "react";

import { useArmed, useCountUp } from "../hooks/useProofMotion";
import { toneVar, type Tone } from "../tone";
import { scoreTone } from "../types";

interface ScoreGaugeProps {
  score: number;
  fileName?: string;
}

export const ScoreGauge = ({ score, fileName }: ScoreGaugeProps) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const { label } = scoreTone(clamped);
  const shown = useCountUp(clamped);
  const reduce = useReducedMotion();

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="cc-proof-label">ATS match</span>
        {fileName && (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13px] text-white/70">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{fileName}</span>
          </span>
        )}
      </div>

      <div className="mt-7 flex flex-wrap items-end gap-x-5 gap-y-4">
        <div className="flex items-start" aria-label={`${clamped} out of 100`} role="img">
          <span className="cc-proof-score" aria-hidden>
            {shown}
          </span>
          <span
            className="ml-2 mt-2 cc-font-display text-xl text-white/40 md:text-2xl"
            aria-hidden
          >
            /100
          </span>
        </div>

        <motion.span
          className="cc-proof-stamp mb-3"
          initial={reduce ? false : { opacity: 0, scale: 1.9, rotate: -16 }}
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          transition={{ delay: 0.95, type: "spring", stiffness: 420, damping: 17 }}
        >
          {label}
        </motion.span>
      </div>

      <ScoreRuler score={clamped} />
    </div>
  );
};

const ZONES: Array<{ from: number; to: number; tone: Tone }> = [
  { from: 0, to: 40, tone: "bad" },
  { from: 40, to: 60, tone: "warn" },
  { from: 60, to: 80, tone: "ok" },
  { from: 80, to: 100, tone: "good" },
];

const ScoreRuler = ({ score }: { score: number }) => {
  const armed = useArmed();
  return (
    <div className="cc-proof-ruler mt-8" aria-hidden>
      <div className="cc-proof-ruler__ticks" />
      <div className="cc-proof-ruler__track">
        {ZONES.map((z) => {
          const here = score >= z.from && (score < z.to || (z.to === 100 && score === 100));
          return (
            <span
              key={z.from}
              className={`cc-proof-ruler__zone ${here ? "is-here" : ""}`}
              style={{ width: `${z.to - z.from}%`, "--z": toneVar(z.tone) } as CSSProperties}
            />
          );
        })}
      </div>
      <span className="cc-proof-ruler__pin" style={{ left: `${armed ? score : 0}%` }} />
      {[0, 40, 60, 80, 100].map((n) => (
        <span key={n} className="cc-proof-ruler__num" style={{ left: `${n}%` }}>
          {n}
        </span>
      ))}
    </div>
  );
};

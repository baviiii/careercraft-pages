import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, FileText } from "lucide-react";
import type { CSSProperties } from "react";

import { useArmed, useCountUp } from "../hooks/useProofMotion";
import { toneVar, type Tone } from "../tone";
import { scoreTone, type ResultTabId } from "../types";
import { weakestArea, type SubScores } from "./scoreParts";

interface ScoreGaugeProps {
  score: number;
  fileName?: string;
  subScores: SubScores;
  onJump: (tab: ResultTabId) => void;
}

/** What the number means for this job, in a sentence a person would say. */
const MEANING: Record<Tone, string> = {
  good: "This résumé already shows most of what the job asks for.",
  ok: "This résumé shows a good part of what the job asks for. A few targeted changes should make it a strong match.",
  warn: "This résumé shows some of what the job asks for, but it's likely to rank below closer matches.",
  bad: "This résumé doesn't yet show most of what the job asks for, so tailoring it to this ad will make the biggest difference.",
};

export const ScoreGauge = ({ score, fileName, subScores, onJump }: ScoreGaugeProps) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const { tone, label } = scoreTone(clamped);
  const shown = useCountUp(clamped);
  const reduce = useReducedMotion();
  const weakest = weakestArea(subScores);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="cc-proof-label">ATS match</span>
        {fileName && (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13px] text-[color:var(--cc-ash)]">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{fileName}</span>
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className="flex items-start" aria-label={`${clamped} out of 100`} role="img">
          <span className="cc-proof-score" aria-hidden>
            {shown}
          </span>
          <span className="ml-1.5 mt-1.5 cc-font-display text-lg text-[color:var(--cc-ash)] md:text-xl" aria-hidden>
            /100
          </span>
        </div>

        <motion.span
          className="cc-proof-stamp cc-proof-stamp--tilt mb-2"
          style={{ "--stamp": toneVar(tone) } as CSSProperties}
          initial={reduce ? false : { opacity: 0, scale: 1.25, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: -4 }}
          transition={{ delay: 0.9, type: "spring", stiffness: 380, damping: 20 }}
        >
          {label}
        </motion.span>
      </div>

      <p className="mt-5 max-w-xl text-[16px] leading-[1.6] text-[color:var(--cc-ink-soft)]">
        {MEANING[tone]}
        {weakest && (
          <>
            {" "}
            Your weakest area is <strong className="font-semibold text-[color:var(--cc-ink)]">{weakest.label.toLowerCase()}</strong>{" "}
            ({weakest.value}/100), so start there.
          </>
        )}
      </p>

      <ScoreRuler score={clamped} />

      <button
        type="button"
        onClick={() => onJump("improvements")}
        className="cc-action cc-action--sm mt-7"
      >
        See what to fix first
        <ArrowDown className="h-4 w-4" />
      </button>
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
    <div className="cc-proof-ruler mt-6" aria-hidden>
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

import { scoreTone } from "../types";

interface ScoreGaugeProps {
  score: number;
  fileName?: string;
}

export const ScoreGauge = ({ score, fileName }: ScoreGaugeProps) => {
  const clamped = Math.max(0, Math.min(100, score));
  const r = 58;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);
  const tone = scoreTone(clamped);

  return (
    <div className="flex items-center gap-8">
      <div className="relative w-40 h-40 flex-shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="var(--cc-hair-strong)"
            strokeWidth="2"
          />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="var(--cc-rust)"
            strokeWidth="4"
            strokeLinecap="butt"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="cc-font-display cc-tabular text-5xl leading-none text-[color:var(--cc-ink)]">
            {clamped}
          </span>
          <span className="mt-1 cc-label text-[color:var(--cc-ash)]">
            of 100
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="cc-label text-[color:var(--cc-rust)]">§ The reading</div>
        {fileName && (
          <p className="mt-2 cc-font-editorial italic text-[color:var(--cc-ink-soft)] truncate max-w-sm">
            {fileName}
          </p>
        )}
        <h1 className="mt-3 cc-font-display text-4xl md:text-5xl leading-[0.95] tracking-tight">
          <span className="cc-italic-wonk">{tone.label}</span>
          <span className="text-[color:var(--cc-ink-soft)]">.</span>
        </h1>
        <p className="mt-3 cc-font-editorial italic text-lg text-[color:var(--cc-ink-soft)] max-w-md">
          ATS compatibility — how legibly the draft reads for machines and
          recruiters alike.
        </p>
      </div>
    </div>
  );
};

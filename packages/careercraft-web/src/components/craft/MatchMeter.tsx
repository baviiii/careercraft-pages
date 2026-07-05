import { memo } from "react";
import type { MatchBand } from "@/hooks/usePersonalization";

/* ───────────────────────────────────────────────────────────
   MatchMeter — a compact, editorial "likeliness" ring.
   Shows how well an item (job, article, sector) fits the user's
   profile as a 0–100 rating, coloured by band. Reusable across
   jobs / market / news so the rating reads the same everywhere.
   ─────────────────────────────────────────────────────────── */

const STROKE: Record<MatchBand, string> = {
  strong: "var(--cc-signal)",
  good: "var(--cc-signal)",
  fair: "var(--cc-wheat)",
  low: "var(--cc-ash)",
};

const LABEL: Record<MatchBand, string> = {
  strong: "Strong match",
  good: "Good match",
  fair: "Fair match",
  low: "Low match",
};

interface Props {
  match: number; // 0–100
  band: MatchBand;
  size?: number;
  showLabel?: boolean;
  reasons?: string[];
  /** "ink" for light surfaces (default), "light" for dark surfaces. */
  tone?: "ink" | "light";
}

export const MatchMeter = memo(({ match, band, size = 46, showLabel = false, reasons, tone = "ink" }: Props) => {
  const sw = 4;
  const r = size / 2 - sw;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, match));
  const offset = c * (1 - clamped / 100);
  const stroke = STROKE[band];
  const numberColor = tone === "light" ? "#F3EADB" : "var(--cc-ink)";
  const trackColor = tone === "light" ? "rgba(255,255,255,0.22)" : "rgba(14,12,10,0.10)";

  return (
    <div className="inline-flex items-center gap-2" title={reasons?.length ? reasons.join(" · ") : LABEL[band]}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={sw} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)" }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center cc-font-display cc-tabular leading-none"
          style={{ fontSize: Math.round(size * 0.3), color: numberColor }}
        >
          {clamped}
        </span>
      </div>
      {showLabel && (
        <span className="cc-label-sm" style={{ color: stroke }}>
          {LABEL[band]}
        </span>
      )}
    </div>
  );
});

MatchMeter.displayName = "MatchMeter";

export default MatchMeter;

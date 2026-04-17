/* ───────────────────────────────────────────────────────────
   AstralMetricRow — glass tiles w/ morphing readouts.
   Each tile animates up to its target when it enters view,
   and shows a subtle spark trend if provided.
   ─────────────────────────────────────────────────────────── */

import { memo, useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

export interface AstralMetric {
  label: string;
  value: number | string;
  /** Optional secondary note underneath. */
  note?: string;
  /** Optional sparkline series (any scale, min 2 points). */
  spark?: number[];
  /** Optional label accent color. */
  accent?: string;
}

interface AstralMetricRowProps {
  metrics: AstralMetric[];
  /** Count up int values on first view. Default true. */
  countUp?: boolean;
}

export const AstralMetricRow = memo(function AstralMetricRow({
  metrics,
  countUp = true,
}: AstralMetricRowProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {metrics.map((m, i) => (
        <MetricTile key={m.label} metric={m} index={i} countUp={countUp} />
      ))}
    </div>
  );
});

const MetricTile = memo(function MetricTile({
  metric,
  index,
  countUp,
}: {
  metric: AstralMetric;
  index: number;
  countUp: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const isNumber = typeof metric.value === "number";
  const [n, setN] = useState<string | number>(isNumber && countUp ? 0 : metric.value);

  useEffect(() => {
    if (!isNumber || !countUp || !inView) return;
    const to = metric.value as number;
    const dur = 1000;
    const delay = index * 90;
    const start = performance.now() + delay;
    let raf = 0;
    const tick = (now: number) => {
      if (now < start) { raf = requestAnimationFrame(tick); return; }
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isNumber, countUp, inView, metric.value, index]);

  const accent = metric.accent ?? "var(--as-aurora-2)";

  return (
    <div
      ref={ref}
      className="as-panel as-refract"
      onMouseMove={(e) => {
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty("--as-hx", `${x}%`);
        el.style.setProperty("--as-hy", `${y}%`);
      }}
    >
      <div className="as-panel-inner p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div className="as-label-sm" style={{ color: accent }}>
            § {String(index + 1).padStart(2, "0")}
          </div>
          {metric.spark && metric.spark.length >= 2 && (
            <Spark points={metric.spark} color={accent} />
          )}
        </div>

        <div className="mt-5 as-display as-morph text-4xl md:text-5xl leading-none text-white">
          {n}
        </div>

        <div className="mt-3 as-label" style={{ color: "var(--as-ion-soft)" }}>
          {metric.label}
        </div>
        {metric.note && (
          <div className="mt-1 as-italic text-sm text-[color:var(--as-mist)]">
            {metric.note}
          </div>
        )}
      </div>
    </div>
  );
});

const Spark = memo(function Spark({ points, color }: { points: number[]; color: string }) {
  const w = 90, h = 24, pad = 2;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const xStep = (w - pad * 2) / (points.length - 1);
  const scale = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i * xStep} ${scale(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[90px] h-6 block" aria-hidden="true">
      <path d={d} stroke={color} strokeWidth={1.2} fill="none" vectorEffect="non-scaling-stroke" />
      <circle
        cx={pad + (points.length - 1) * xStep}
        cy={scale(points[points.length - 1])}
        r={1.8}
        fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
});

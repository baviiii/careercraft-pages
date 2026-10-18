import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { money, monthLabel } from "../lib/market";

interface Point {
  month: string;
  average: number;
}

const W = 640;
const H = 220;
const PAD = { top: 18, right: 64, bottom: 30, left: 52 };

/** Three round ticks spanning the data, e.g. $85k / $90k / $95k, and their step. */
function ticks(min: number, max: number): { values: number[]; step: number } {
  const span = Math.max(max - min, 1);
  const raw = span / 2;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  return { values: [lo, lo + step, lo + 2 * step], step };
}

/**
 * Mean advertised salary per month: one 2px line, a dot and value at the
 * latest month, and a crosshair that snaps to the nearest month on hover or
 * with the arrow keys. The table under it carries every value without a
 * pointer. The y-axis doesn't start at zero, because this is a line about
 * change, and the ticks say where it starts.
 */
export const SalaryLine = ({ points }: { points: Point[] }) => {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const geo = useMemo(() => {
    const values = points.map((p) => p.average);
    const { values: t, step } = ticks(Math.min(...values), Math.max(...values));
    // A step under $1k, or of $2.5k, needs the decimal or ticks read "$90k / $90k".
    const tickLabel = (v: number) => money(v, step % 1000 !== 0);
    const lo = Math.min(t[0], ...values);
    const hi = Math.max(t[2], ...values);
    const x = (i: number) => PAD.left + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.average).toFixed(1)}`).join(" ");
    const area = `${path} L${x(points.length - 1).toFixed(1)},${H - PAD.bottom} L${x(0).toFixed(1)},${H - PAD.bottom} Z`;
    return { t, tickLabel, x, y, path, area };
  }, [points]);

  const last = points.length - 1;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const sx = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(geo.x(i) - sx) < Math.abs(geo.x(best) - sx)) best = i;
    });
    setActive(best);
  };

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((i) => {
      const from = i ?? last;
      return Math.max(0, Math.min(last, from + (e.key === "ArrowRight" ? 1 : -1)));
    });
  };

  const tipLeft = active === null ? 0 : (geo.x(active) / W) * 100;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-pan-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cc-rust)] rounded-lg"
        role="img"
        tabIndex={0}
        aria-label={`Average advertised salary by month, from ${money(points[0].average, true)} in ${monthLabel(points[0].month)} to ${money(points[last].average, true)} in ${monthLabel(points[last].month)}. Use the arrow keys to read each month.`}
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {geo.t.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={geo.y(v)} y2={geo.y(v)} stroke="var(--cc-hair)" strokeWidth={1} />
            <text x={PAD.left - 8} y={geo.y(v)} dy="0.32em" textAnchor="end" className="cc-axis">
              {geo.tickLabel(v)}
            </text>
          </g>
        ))}
        {[0, Math.floor(last / 2), last]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((i) => (
            <text key={i} x={geo.x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} className="cc-axis">
              {monthLabel(points[i].month)}
            </text>
          ))}

        <path d={geo.area} fill="var(--cc-rust)" opacity={0.08} />
        <path d={geo.path} fill="none" stroke="var(--cc-rust)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {active !== null && (
          <line
            x1={geo.x(active)}
            x2={geo.x(active)}
            y1={PAD.top - 6}
            y2={H - PAD.bottom}
            stroke="var(--cc-ink-soft)"
            strokeWidth={1}
          />
        )}

        {/* The latest month: dot with a surface ring, value at the end. */}
        <circle cx={geo.x(last)} cy={geo.y(points[last].average)} r={4.5} fill="var(--cc-rust)" stroke="#fff" strokeWidth={2} />
        <text x={geo.x(last) + 10} y={geo.y(points[last].average)} dy="0.32em" className="cc-axis cc-axis--strong">
          {money(points[last].average, true)}
        </text>

        {active !== null && active !== last && (
          <circle cx={geo.x(active)} cy={geo.y(points[active].average)} r={4.5} fill="var(--cc-rust)" stroke="#fff" strokeWidth={2} />
        )}
      </svg>

      {active !== null && (
        <div
          className="cc-tip cc-font-sans"
          style={{ left: `${tipLeft}%`, transform: `translateX(${tipLeft > 70 ? "-100%" : tipLeft < 30 ? "0" : "-50%"})` }}
          role="status"
        >
          <strong className="block text-[14px] text-[color:var(--cc-ink)]">{money(points[active].average, true)}</strong>
          <span className="text-[12px] text-[color:var(--cc-ash)]">{monthLabel(points[active].month)}</span>
        </div>
      )}
    </div>
  );
};

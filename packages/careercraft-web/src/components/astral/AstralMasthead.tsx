/* ───────────────────────────────────────────────────────────
   AstralMasthead — observatory hero with slow orbital rings
   and live data nodes. Centered title, aurora gradient, pulse.
   ─────────────────────────────────────────────────────────── */

import { memo, ReactNode } from "react";

export interface OrbitalNode {
  label: string;
  value: string;
  /** Ring index 0..2 (inner -> outer). */
  ring: 0 | 1 | 2;
  /** Degrees (0 = 12 o'clock, clockwise). */
  angle: number;
  color?: string;
}

interface AstralMastheadProps {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Up to ~6 nodes for the orbital display. */
  nodes?: OrbitalNode[];
  /** Trailing actions (buttons, etc.). */
  actions?: ReactNode;
}

const RING_RADII = [140, 210, 290];

export const AstralMasthead = memo(function AstralMasthead({
  kicker,
  title,
  subtitle,
  nodes = [],
  actions,
}: AstralMastheadProps) {
  return (
    <section className="relative">
      <div className="as-panel">
        <div className="as-panel-inner px-6 md:px-10 py-14 md:py-20 relative overflow-hidden">
          {/* SVG orbits (background) */}
          <svg
            viewBox="-320 -320 640 640"
            className="pointer-events-none absolute inset-0 w-full h-full opacity-80"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="core" cx="0" cy="0" r="60" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(124,92,255,0.7)" />
                <stop offset="60%" stopColor="rgba(34,211,238,0.2)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              <linearGradient id="ringGrad" x1="0" x2="1">
                <stop offset="0%" stopColor="rgba(124,92,255,0.45)" />
                <stop offset="50%" stopColor="rgba(34,211,238,0.4)" />
                <stop offset="100%" stopColor="rgba(244,114,182,0.35)" />
              </linearGradient>
            </defs>

            {/* Core glow */}
            <circle r="70" fill="url(#core)" />

            {/* Three rings, each rotating at its own tempo */}
            <g className="as-ring-1">
              <circle
                r={RING_RADII[0]}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="1"
                strokeDasharray="2 6"
              />
            </g>
            <g className="as-ring-2">
              <circle
                r={RING_RADII[1]}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="1"
                strokeDasharray="1 9"
                opacity="0.75"
              />
            </g>
            <g className="as-ring-3">
              <circle
                r={RING_RADII[2]}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="1"
                strokeDasharray="1 14"
                opacity="0.55"
              />
            </g>

            {/* Nodes on rings (counter-rotate in outer <g> later if needed) */}
            {nodes.map((n, i) => {
              const radius = RING_RADII[n.ring];
              const rad = (n.angle - 90) * (Math.PI / 180);
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;
              const c = n.color ?? "rgba(94,234,212,1)";
              return (
                <g key={i} transform={`translate(${x} ${y})`} className="as-node" style={{ color: c }}>
                  <circle r="3.2" fill={c} />
                  <circle r="8" fill="none" stroke={c} strokeOpacity="0.35" />
                </g>
              );
            })}
          </svg>

          {/* Center content */}
          <div className="relative text-center max-w-3xl mx-auto">
            {kicker && (
              <div className="as-label-sm" style={{ color: "var(--as-aurora-2)" }}>
                {kicker}
              </div>
            )}
            <h1 className="mt-4 as-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
              <span className="as-gradient-text-warm">{title}</span>
            </h1>
            {subtitle && (
              <p className="mt-5 as-italic text-xl md:text-2xl text-[color:var(--as-ion-soft)]">
                {subtitle}
              </p>
            )}

            {/* Node readout table (accessible data for the orbital graphic) */}
            {nodes.length > 0 && (
              <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
                {nodes.slice(0, 6).map((n, i) => (
                  <div
                    key={i}
                    className="rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(10,14,32,0.55)",
                      border: "1px solid var(--as-hair-strong)",
                    }}
                  >
                    <div className="as-label-sm" style={{ color: n.color ?? "var(--as-signal)" }}>
                      {n.label}
                    </div>
                    <div className="mt-1 as-display text-xl text-white">
                      {n.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {actions && (
              <div className="mt-10 inline-flex items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

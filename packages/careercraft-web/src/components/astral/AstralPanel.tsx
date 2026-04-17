/* ───────────────────────────────────────────────────────────
   AstralPanel — glass surface with gradient hairline, scan
   line, and cursor-reactive prism refraction on hover.
   ─────────────────────────────────────────────────────────── */

import { memo, MouseEvent, ReactNode, useCallback } from "react";

interface AstralPanelProps {
  children: ReactNode;
  className?: string;
  /** Optional section kicker (mono label). */
  kicker?: ReactNode;
  /** Optional title (renders with as-display). */
  title?: ReactNode;
  /** Optional right-aligned slot in the header row. */
  right?: ReactNode;
  /** Padding preset. */
  pad?: "sm" | "md" | "lg" | "none";
  /** Enable prism refraction on hover (default: true). */
  refract?: boolean;
  /** Compact variant (no scan line, no gradient border). */
  flat?: boolean;
}

const PAD: Record<NonNullable<AstralPanelProps["pad"]>, string> = {
  none: "",
  sm: "p-5",
  md: "p-7 md:p-8",
  lg: "p-9 md:p-12",
};

export const AstralPanel = memo(function AstralPanel({
  children,
  className = "",
  kicker,
  title,
  right,
  pad = "md",
  refract = true,
  flat = false,
}: AstralPanelProps) {
  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!refract) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--as-hx", `${x}%`);
    el.style.setProperty("--as-hy", `${y}%`);
  }, [refract]);

  return (
    <div
      onMouseMove={onMove}
      className={[
        flat ? "as-panel-flat" : "as-panel",
        refract && !flat ? "as-refract" : "",
        className,
      ].join(" ").trim()}
    >
      <div className={`as-panel-inner ${PAD[pad]}`}>
        {(kicker || title || right) && (
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              {kicker && (
                <div
                  className="as-label"
                  style={{ color: "var(--as-aurora-2)" }}
                >
                  {kicker}
                </div>
              )}
              {title && (
                <h3 className="mt-2 as-display text-2xl md:text-3xl leading-tight text-white">
                  {title}
                </h3>
              )}
            </div>
            {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
});

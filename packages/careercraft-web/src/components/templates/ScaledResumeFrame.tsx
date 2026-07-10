/* ───────────────────────────────────────────────────────────
   ScaledResumeFrame — the one way to miniaturise a résumé page.

   Templates always render at their true size (794×1123 = A4 @96dpi).
   This frame measures its own width and applies a single scale so
   the page fills it exactly — no more stacked transforms clipping
   the sheet into a sliver. Children must NOT scale themselves.
   ─────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState, type ReactNode } from "react";

export const RESUME_PAGE_WIDTH = 794;
export const RESUME_PAGE_HEIGHT = 1123;

interface ScaledResumeFrameProps {
  children: ReactNode;
  /** Cap the frame's height (px). Content beyond one page is clipped. */
  maxHeight?: number;
  className?: string;
}

export function ScaledResumeFrame({
  children,
  maxHeight,
  className = "",
}: ScaledResumeFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / RESUME_PAGE_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const naturalHeight = scale * RESUME_PAGE_HEIGHT;
  const height = maxHeight ? Math.min(naturalHeight, maxHeight) : naturalHeight;

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height: height || undefined }}
    >
      <div
        className="resume-paper pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{
          width: RESUME_PAGE_WIDTH,
          transform: `scale(${scale || 0.001})`,
          opacity: scale ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

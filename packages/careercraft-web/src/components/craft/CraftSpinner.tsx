/* ───────────────────────────────────────────────────────────
   CraftSpinner + useElapsedSeconds — "it's working, not stuck".

   The long AI waits (an ATS check, a cover letter) used to show only a
   decorative animation. With the OS "reduce motion" setting on, those
   animations are switched off, so the screen went completely still for half
   a minute and read as frozen.

   A loading spinner is the kind of motion that carries information, so this
   one keeps turning under reduced motion, just slower. The seconds counter
   next to it changes once a second whether motion is on or off, and it's
   honest: it says how long it has been, not a made-up progress bar.
   ─────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";

const SIZES = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-2",
} as const;

interface CraftSpinnerProps {
  size?: keyof typeof SIZES;
  /** Read out by screen readers; not shown. */
  label?: string;
  className?: string;
}

export const CraftSpinner = ({ size = "md", label = "Working", className = "" }: CraftSpinnerProps) => (
  <span role="status" className={`inline-flex ${className}`}>
    <span
      aria-hidden
      className={`${SIZES[size]} inline-block shrink-0 animate-spin motion-reduce:[animation-duration:1.8s] rounded-full border-[color:var(--cc-hair-strong)] border-t-[color:var(--cc-rust)]`}
    />
    <span className="sr-only">{label}</span>
  </span>
);

/** Whole seconds since `active` became true; resets to 0 when it turns off. */
export function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const started = Date.now();
    setSeconds(0);
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return seconds;
}

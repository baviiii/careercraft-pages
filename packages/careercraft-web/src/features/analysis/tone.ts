/* Score bands for the ATS check page. The CSS side is the --pf-* tokens in
   the "ATS CHECK — the proof sheet" section of styles/craft.css. */

export type Tone = "good" | "ok" | "warn" | "bad";

/** 0–100 onto the four bands the ruler and stamp use. */
export const toneFor = (pct: number): Tone =>
  pct >= 80 ? "good" : pct >= 60 ? "ok" : pct >= 40 ? "warn" : "bad";

export const toneVar = (tone: Tone) => `var(--pf-${tone})`;

export const SEVERITY: Record<string, string> = {
  critical: "var(--pf-bad)",
  warning: "var(--pf-warn)",
  minor: "var(--cc-ash)",
};

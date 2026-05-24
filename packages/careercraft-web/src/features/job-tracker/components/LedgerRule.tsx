import type { ReactNode } from "react";

interface LedgerRuleProps {
  /** Section glyph — letter or roman in the engraved badge. */
  mark: ReactNode;
  /** Caption set in JetBrains Mono small-caps. */
  label: string;
  /** Optional right-aligned meta (counts, deadlines, hint). */
  right?: ReactNode;
  /** Whether the badge sits on a tinted plate. */
  accent?: "ink" | "rust" | "signal" | "wheat" | "ash";
}

const ACCENTS: Record<NonNullable<LedgerRuleProps["accent"]>, { bg: string; ink: string }> = {
  ink: { bg: "var(--cc-ink)", ink: "var(--cc-cream)" },
  rust: { bg: "var(--cc-rust)", ink: "var(--cc-cream)" },
  signal: { bg: "var(--cc-signal)", ink: "var(--cc-cream)" },
  wheat: { bg: "var(--cc-wheat-deep)", ink: "var(--cc-cream)" },
  ash: { bg: "var(--cc-cream-2)", ink: "var(--cc-ink)" },
};

/**
 * Labeled hairline divider used to break the tracker into named registers.
 * Reads like a register heading from a printer's ledger:
 *   [ § ] PIPELINE ──────────────── 14 IN TRANSIT
 */
export const LedgerRule = ({ mark, label, right, accent = "ink" }: LedgerRuleProps) => {
  const palette = ACCENTS[accent];
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className="cc-font-sans text-sm font-semibold leading-none px-2.5 h-7 flex items-center justify-center"
        style={{
          background: palette.bg,
          color: palette.ink,
          minWidth: "1.75rem",
          fontVariationSettings: "'SOFT' 100, 'WONK' 1",
        }}
        aria-hidden
      >
        {mark}
      </div>
      <span className="cc-font-sans text-sm font-semibold text-[color:var(--cc-ink)] whitespace-nowrap">
        {label}
      </span>
      <span className="flex-1 h-px bg-[color:var(--cc-hair-strong)]" />
      {right && (
        <span className="cc-font-sans text-xs text-[color:var(--cc-ash)] cc-tabular whitespace-nowrap">
          {right}
        </span>
      )}
    </div>
  );
};

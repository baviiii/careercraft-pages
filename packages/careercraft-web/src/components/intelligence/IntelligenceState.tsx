/* ───────────────────────────────────────────────────────────
   IntelligenceState — what the Observatory says when it has
   nothing to say.

   Every panel on this page used to fill its own silence: a spinner
   captioned "AI is analyzing patterns right now…" with nothing running, a
   header advertising "54+ documents" next to a counter reading 0 (the real
   corpus is 84), a placeholder story titled "Intelligence Loading…" that
   was not loading anything. The page looked busiest exactly when it was
   most broken.

   One component, three honest states, and a deliberate refusal: nothing in
   here pulses, spins or animates on a loop unless work is genuinely in
   flight. Motion reads as activity, and inventing activity is the thing
   this replaces.

   Styling note: this uses the ASTRAL tokens (--as-*), not the Faircopy
   --cc-* set. The Observatory is a separate dark surface and has not been
   migrated to the main theme yet. A cream Faircopy card dropped into this
   page reads as an unstyled bug rather than a designed empty state, so
   until the whole surface moves these follow the page they live on.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import { Loader2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type IntelligenceStateKind =
  /** The corpus is unreachable. Not the reader's fault, not their problem to fix. */
  | "offline"
  /** Connected and answered — there is simply nothing matching. */
  | "empty"
  /** Genuinely in flight. The ONLY state allowed to animate. */
  | "loading";

interface IntelligenceStateProps {
  kind: IntelligenceStateKind;
  /** Short, plain, no adjectives. "Nothing came back." */
  title: string;
  /** One sentence. What is true, and what happens next if anything. */
  detail: string;
  /** Optional recovery. Omit rather than offer a button that cannot help. */
  action?: { label: string; onClick: () => void };
  icon?: LucideIcon;
  className?: string;
  /** Sits inside an existing panel — drop the frame, keep the type. */
  bare?: boolean;
}

const KICKER: Record<IntelligenceStateKind, string> = {
  offline: "§ No signal",
  empty: "§ Nothing filed",
  loading: "§ Reading",
};

export function IntelligenceState({
  kind,
  title,
  detail,
  action,
  icon: Icon,
  className,
  bare = false,
}: IntelligenceStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(!bare && "as-panel", "relative overflow-hidden", className)}
    >
      <div className={cn("relative", bare ? "py-10" : "px-6 py-10 md:px-10 md:py-12")}>
        {/* Kicker + hairline — the masthead device this page already uses,
            so an empty panel still looks like part of the Observatory. */}
        <div className="flex items-center gap-3">
          <span
            className="as-label-sm whitespace-nowrap"
            style={{ color: kind === "loading" ? "var(--as-aurora-2)" : "var(--as-mist)" }}
          >
            {KICKER[kind]}
          </span>
          <span className="h-px flex-1" style={{ background: "var(--as-hair-strong)" }} />
        </div>

        <div className="mt-6 flex items-start gap-4">
          {(Icon || kind === "loading") && (
            <div
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                border: "1px solid var(--as-hair-strong)",
                background: "var(--as-panel-inner, transparent)",
              }}
              aria-hidden
            >
              {kind === "loading" ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  style={{ color: "var(--as-aurora-2)" }}
                />
              ) : (
                Icon && <Icon className="h-4 w-4" style={{ color: "var(--as-ash)" }} />
              )}
            </div>
          )}

          <div className="min-w-0">
            <h3
              className="as-display text-2xl leading-[1.1] tracking-[-0.02em] md:text-[26px]"
              style={{ color: "var(--as-ion)" }}
            >
              {title}
            </h3>
            <p
              className="mt-2.5 max-w-prose text-[15px] leading-relaxed"
              style={{ color: "var(--as-mist)" }}
            >
              {detail}
            </p>

            {action && (
              <button
                onClick={action.onClick}
                className="as-btn mt-5"
                style={{ padding: "0.5rem 0.85rem" }}
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * The status line under a panel heading.
 *
 * Replaces captions like "AI is analyzing patterns right now…" that ran
 * whether or not anything was. It states the count it can actually prove,
 * and says "not connected" when it cannot prove any.
 */
export function IntelligenceStatus({
  connected,
  count,
  noun,
  busy = false,
}: {
  connected: boolean;
  /** Real figure from the corpus. Never a hardcoded headline number. */
  count: number;
  /** Singular; pluralised here. */
  noun: string;
  busy?: boolean;
}) {
  if (busy) {
    return (
      <span
        className="as-label-sm inline-flex items-center gap-1.5"
        style={{ color: "var(--as-mist)" }}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Reading the archive
      </span>
    );
  }

  if (!connected) {
    return (
      <span
        className="as-label-sm inline-flex items-center gap-1.5"
        style={{ color: "var(--as-ash)" }}
      >
        {/* Static. A pulsing dot here would be the same lie in a smaller font. */}
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: "var(--as-ash)" }}
        />
        Not connected
      </span>
    );
  }

  return (
    <span
      className="as-label-sm inline-flex items-center gap-1.5"
      style={{ color: "var(--as-mist)" }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
      <span className="as-mono">{count.toLocaleString()}</span>
      {count === 1 ? noun : `${noun}s`}
    </span>
  );
}

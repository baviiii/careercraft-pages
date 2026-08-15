import { RotateCw, SlidersHorizontal, X } from "lucide-react";

import type { TuningSignal } from "../types";

const KIND_TONE: Record<TuningSignal["kind"], string> = {
  role: "cc-tone-cobalt",
  industry: "cc-tone-cobalt",
  location: "cc-tone-wheat",
  skill: "cc-tone-sage",
  company: "cc-tone-ink",
};

/**
 * The recourse half of the transparency contract: every chip here is a live
 * ranking input, not a label. Switching one off drops its weight and its reason
 * from every card, and the feed reorders immediately.
 */
export const TuningBar = ({
  signals,
  mutedIds,
  onToggle,
  onRefresh,
  isLoading,
}: {
  signals: TuningSignal[];
  mutedIds: Set<string>;
  onToggle: (id: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}) => {
  if (signals.length === 0) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[color:var(--cc-hair)] pt-4">
      <span className="inline-flex items-center gap-1.5 cc-font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--cc-ash)]">
        <SlidersHorizontal className="h-3 w-3" />
        Tuned by
      </span>

      {signals.map((signal) => {
        const muted = mutedIds.has(signal.id);
        return (
          <button
            key={signal.id}
            type="button"
            onClick={() => onToggle(signal.id)}
            aria-pressed={!muted}
            title={muted ? `Use ${signal.label} again` : `Stop ranking by ${signal.label}`}
            className={[
              "group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-all",
              KIND_TONE[signal.kind],
              muted
                ? "border-[color:var(--cc-hair)] bg-transparent text-[color:var(--cc-ash)] line-through decoration-1"
                : "border-[color:var(--cc-t-border,var(--cc-hair))] bg-[color:var(--cc-t-soft,var(--cc-rust-soft))] text-[color:var(--cc-t-deep,var(--cc-rust-deep))] hover:border-[color:var(--cc-t,var(--cc-rust))]",
            ].join(" ")}
          >
            <span className="cc-font-sans font-medium">{signal.label}</span>
            <X
              className={[
                "h-3 w-3 transition-transform",
                muted ? "rotate-45" : "opacity-50 group-hover:opacity-100",
              ].join(" ")}
            />
          </button>
        );
      })}

      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        title="Pull the latest"
        className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cc-hair)] px-2.5 py-1 cc-font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--cc-ash)] transition-colors hover:border-[color:var(--cc-ink)] hover:text-[color:var(--cc-ink)] disabled:opacity-50"
      >
        <RotateCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
};

export default TuningBar;

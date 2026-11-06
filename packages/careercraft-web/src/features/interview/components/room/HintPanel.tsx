import { Lightbulb, X } from "lucide-react";
import type { CoachHint, HintLevel } from "@/lib/interviewCoach";

/** How much the coach chose to give away, from a nudge to an outline. */
const LEVEL: Record<HintLevel, string> = {
  gentle: "a nudge",
  directional: "a direction",
  structural: "an outline",
};

interface HintPanelProps {
  hint: CoachHint;
  onDismiss: () => void;
}

/** One calibrated nudge from the coach — never the answer. */
export function HintPanel({ hint, onDismiss }: HintPanelProps) {
  return (
    <aside className="rounded-[1.25rem] border border-[color:var(--cc-wheat)] bg-[color:var(--cc-wheat-soft)] px-5 py-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--cc-wheat-deep)]">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
            Hint{LEVEL[hint.level] ? `: ${LEVEL[hint.level]}` : ""}
          </span>
          {hint.framework && (
            <span className="rounded-full border border-[color:var(--cc-wheat)] px-2 py-0.5 text-[12px] font-medium text-[color:var(--cc-wheat-deep)]">
              {hint.framework}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss hint"
          className="rounded-full p-1 text-[color:var(--cc-wheat-deep)] transition-opacity hover:opacity-70"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-[15px] leading-relaxed text-[color:var(--cc-ink)]">{hint.hint}</p>
      {hint.followupThought && (
        <p className="mt-2 text-sm text-[color:var(--cc-ink-soft)]">Ask yourself: {hint.followupThought}</p>
      )}
    </aside>
  );
}

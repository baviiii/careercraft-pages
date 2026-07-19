import { X } from "lucide-react";
import type { CoachHint } from "@/lib/interviewCoach";

interface HintPanelProps {
  hint: CoachHint;
  onDismiss: () => void;
}

/** One calibrated nudge from the coach — never the answer. */
export function HintPanel({ hint, onDismiss }: HintPanelProps) {
  return (
    <aside className="border border-[color:var(--cc-wheat)] bg-[color:var(--cc-wheat-soft)] p-4 md:p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="cc-label-sm text-[color:var(--cc-wheat-deep)]">
            Coach · {hint.level} hint
          </span>
          {hint.framework && (
            <span className="cc-label-sm border border-[color:var(--cc-wheat)] px-2 py-0.5 text-[color:var(--cc-wheat-deep)]">
              {hint.framework}
            </span>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss hint"
          className="p-1 text-[color:var(--cc-wheat-deep)] transition-opacity hover:opacity-70"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-sm leading-relaxed text-[color:var(--cc-ink)]">{hint.hint}</p>
      {hint.followupThought && (
        <p className="mt-2 text-sm italic text-[color:var(--cc-ink-soft)]">
          Ask yourself: {hint.followupThought}
        </p>
      )}
    </aside>
  );
}

/**
 * Coach offline — product empty state (no env-var dumps).
 */
import { AlertTriangle } from "lucide-react";

export function CoachOfflineBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-[1rem] border border-[color:var(--cc-wheat)] bg-[color:var(--cc-wheat-soft)] p-4 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cc-wheat-deep)]" />
      <div>
        <p className="text-sm font-semibold text-[color:var(--cc-ink)]">
          Coach is temporarily offline
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
          Live plans and questions are unavailable right now. Your history and notes still work —
          check back shortly to start a session.
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { ChevronRight, X } from "lucide-react";

import type { PastCheck } from "../hooks/useAtsHistory";
import { toneFor, toneVar } from "../tone";

interface RecentChecksProps {
  checks: PastCheck[];
  hasMore: boolean;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onShowMore: () => void;
}

const when = (iso: string) => {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/* Past checks, newest first, under the form. Each one opens exactly as it
   was; removing one asks first, since it can't be undone. */
export const RecentChecks = ({
  checks,
  hasMore,
  onOpen,
  onRemove,
  onShowMore,
}: RecentChecksProps) => {
  const [confirming, setConfirming] = useState<string | null>(null);
  if (!checks.length) return null;

  return (
    <section className="cc-surface mt-10 p-6 md:p-8">
      <h3 className="cc-font-display mb-3 text-[22px] leading-tight text-[color:var(--cc-ink)]">
        Recent checks
      </h3>
      <ul className="divide-y divide-[color:var(--cc-hair)]">
        {checks.map((c) => {
          const color = toneVar(toneFor(c.overall_score));
          const label = c.job_label || "Job ad";
          return (
            <li key={c.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className="group flex min-w-0 flex-1 items-center gap-4 rounded-lg py-3 text-left"
              >
                <span
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 text-[15px] font-semibold tabular-nums"
                  style={{ borderColor: color, color }}
                  aria-label={`Score ${c.overall_score} out of 100`}
                >
                  {c.overall_score}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-[color:var(--cc-ink)] group-hover:underline group-hover:underline-offset-2">
                    {label}
                  </span>
                  <span className="block truncate text-[13px] text-[color:var(--cc-ash)]">
                    {c.resume_name || "Uploaded résumé"} · {when(c.created_at)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-[color:var(--cc-ash)] group-hover:text-[color:var(--cc-ink)]" />
              </button>
              {confirming === c.id ? (
                <span className="flex flex-shrink-0 items-center gap-1 text-[13px]">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(null);
                      onRemove(c.id);
                    }}
                    className="rounded-full px-2.5 py-1 font-medium text-[color:var(--pf-bad)] hover:bg-[color:var(--cc-cream-2)]"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="rounded-full px-2.5 py-1 text-[color:var(--cc-ash)] hover:bg-[color:var(--cc-cream-2)]"
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(c.id)}
                  aria-label={`Remove the check for ${label}`}
                  className="flex-shrink-0 rounded-full p-1.5 text-[color:var(--cc-ash)] transition-colors hover:bg-[color:var(--cc-cream-2)] hover:text-[color:var(--cc-ink)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={onShowMore}
          className="mt-3 text-[13.5px] text-[color:var(--cc-ash)] underline-offset-2 hover:text-[color:var(--cc-ink)] hover:underline"
        >
          Show older checks
        </button>
      )}
    </section>
  );
};

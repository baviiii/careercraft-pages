import { ArrowRight, ListChecks } from "lucide-react";
import type { InterviewPlan, PlanRound } from "@/lib/interviewCoach";

interface PlanCardProps {
  plan: InterviewPlan;
  onPracticeRound: (round: PlanRound) => void;
}

/**
 * The interview loop the coach designed: weighted rounds, why they're
 * weighted, and the prep checklist. Every round is directly practicable.
 */
export function PlanCard({ plan, onPracticeRound }: PlanCardProps) {
  const maxWeight = Math.max(1, ...plan.rounds.map((r) => r.weight));

  return (
    <section className="border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)]">
      <div className="border-b border-[color:var(--cc-hair-strong)] px-5 py-4 md:px-6">
        <p className="cc-label mb-1 text-[color:var(--cc-rust)]">Your interview loop</p>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="cc-font-display text-2xl tracking-tight text-[color:var(--cc-ink)]">
            {plan.targetRole || "The loop"}
            {plan.company ? ` · ${plan.company}` : ""}
          </h3>
          {plan.predictedHardestRound && (
            <span className="cc-label-sm text-[color:var(--cc-wheat-deep)]">
              hardest round: {plan.predictedHardestRound}
            </span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_260px]">
        {/* Rounds */}
        <div className="divide-y divide-[color:var(--cc-hair)]">
          {plan.rounds.map((round, i) => (
            <div key={i} className="px-5 py-4 md:px-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="cc-label-sm text-[color:var(--cc-ash)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="cc-font-display text-lg text-[color:var(--cc-ink)]">
                    {round.name}
                  </span>
                  <span className="cc-font-mono text-xs text-[color:var(--cc-ash)]">
                    {round.minutes} min
                  </span>
                </div>
                <button
                  onClick={() => onPracticeRound(round)}
                  className="cc-label-sm inline-flex items-center gap-1.5 border border-[color:var(--cc-hair-strong)] px-3 py-2 text-[color:var(--cc-ink)] transition-colors hover:border-[color:var(--cc-rust)] hover:text-[color:var(--cc-rust)]"
                >
                  Practice this round
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Weight bar */}
              <div className="mb-2 h-1 w-full bg-[color:var(--cc-cream-3)]">
                <div
                  className="h-full bg-[color:var(--cc-rust)]"
                  style={{ width: `${Math.round((round.weight / maxWeight) * 100)}%` }}
                />
              </div>

              {round.focusAreas.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  {round.focusAreas.map((area, j) => (
                    <span
                      key={j}
                      className="border border-[color:var(--cc-hair)] px-2 py-0.5 text-xs text-[color:var(--cc-ink-soft)]"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}
              {round.whyWeighted && (
                <p className="text-xs leading-relaxed text-[color:var(--cc-ash)]">
                  {round.whyWeighted}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Checklist */}
        {plan.prepChecklist.length > 0 && (
          <aside className="border-t border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-5 md:border-l md:border-t-0">
            <p className="cc-label-sm mb-3 flex items-center gap-2 text-[color:var(--cc-ink)]">
              <ListChecks className="h-3.5 w-3.5" />
              Prep checklist
            </p>
            <ul className="space-y-2">
              {plan.prepChecklist.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-snug text-[color:var(--cc-ink-soft)]">
                  <span className="text-[color:var(--cc-rust)]" aria-hidden>
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </section>
  );
}

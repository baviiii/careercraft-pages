/**
 * Your interviews — tracker jobs at the interview stage (and applied jobs,
 * which are waiting on a phone screen), each with a short plan of rounds to
 * practise before the date, ticked off by practice sessions for that job.
 * Picking a step fills in the setup panel for that job and round.
 */
import { useMemo } from "react";
import { ArrowRight, CalendarDays, Check } from "lucide-react";
import { upcomingPlans } from "../lib/prepPlan";
import { jobLabel, useTrackerJobs } from "../lib/practiceData";
import { roundClass, roundMeta, type RoundType } from "../lib/roundTypes";
import { useInterviewSessions } from "../lib/sessions";
import { RoundTag } from "./RoundMarks";
import "../interview.css";

export function UpcomingInterviews({ onPrepare }: { onPrepare: (jobId: string, type: RoundType) => void }) {
  const { data: jobs } = useTrackerJobs();
  const { data: sessions } = useInterviewSessions();
  const plans = useMemo(() => upcomingPlans(jobs ?? [], sessions ?? []), [jobs, sessions]);
  if (!plans.length) return null;

  return (
    <section aria-labelledby="iv-upcoming">
      <p id="iv-upcoming" className="cc-field-label mb-3">
        Your interviews
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        {plans.map((plan) => {
          const next = plan.next ?? "full";
          return (
            <div key={plan.job.id} className={`cc-iv-typecell ${roundClass(next)}`}>
              <p className="text-sm font-semibold text-[color:var(--cc-ink)]">{jobLabel(plan.job)}</p>
              <p className="flex items-center gap-1.5 text-xs text-[color:var(--cc-ink-soft)]">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {plan.job.status === "applied" ? "Applied — a phone screen is usually next" : plan.when}
              </p>
              <ol className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Practice plan">
                {plan.steps.map((s, i) => (
                  <li key={`${s.type}-${i}`} className="inline-flex items-center gap-1">
                    <RoundTag type={s.type} />
                    {s.done && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[color:var(--cc-ink)]">
                        <Check className="h-3 w-3" aria-hidden />
                        done
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => onPrepare(plan.job.id, next)}
                className="mt-3 inline-flex items-center gap-1 self-start text-sm font-semibold text-[color:var(--cc-ink)] hover:underline"
              >
                {plan.next ? `Set up the ${roundMeta(next).noun}` : "All practised — run it again"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
      {plans.some((p) => p.daysLeft === null && p.job.status === "interview") && (
        <p className="mt-2 text-xs text-[color:var(--cc-ash)]">
          Set the interview date on the job in your tracker and the plan fits itself to the days left.
        </p>
      )}
    </section>
  );
}

/**
 * Study drills on Home: how many this week, the average mark, what's saved
 * for later, and how the most recent skills are going. Links to Study to do
 * one, and to History for every drill.
 */
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { drillStats, mark, useDrills } from "../lib/drills";
import "@/components/career-dev/study.css";

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function DrillProgress({
  onDrill,
  onOpenStudy,
  onOpenAll,
  hideWhenEmpty = false,
}: {
  /** Go to Study and start a drill on this skill, or whatever's due. */
  onDrill: (skill?: string) => void;
  /** Go to Study without starting anything (saved drills wait there). */
  onOpenStudy: () => void;
  onOpenAll: () => void;
  hideWhenEmpty?: boolean;
}) {
  const { data } = useDrills();
  if (!data) return null;
  const stats = drillStats(data);
  const empty = !stats.done && !stats.saved;
  if (empty && hideWhenEmpty) return null;

  return (
    <section className="cc-study cc-surface p-5" aria-labelledby="iv-drills">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p id="iv-drills" className="cc-kicker">
          Study drills
        </p>
        {!empty && (
          <button
            type="button"
            onClick={onOpenAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
          >
            All drills <ArrowUpRight className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>

      {empty ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
            No drills yet. A drill is ten minutes on one skill: you write an answer, the coach marks it, and the skill
            comes back when it's due.
          </p>
          <button type="button" onClick={() => onDrill()} className="cc-action cc-action--sm shrink-0">
            Do a drill
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="st-tallies">
            <div className="st-tally">
              <p className="st-tally__n">{stats.thisWeek}</p>
              <p className="st-tally__label">this week</p>
            </div>
            <div className="st-tally">
              <p className="st-tally__n">
                {stats.average !== null ? mark(stats.average) : "—"}
                {stats.average !== null && <small>/10</small>}
              </p>
              <p className="st-tally__label">average mark</p>
            </div>
            <div className="st-tally">
              <p className="st-tally__n">{stats.saved}</p>
              <p className="st-tally__label">saved for later</p>
            </div>
          </div>

          <ul className="min-w-0 divide-y divide-[color:var(--cc-hair)]">
            {stats.skills.slice(0, 3).map((s) => (
              <li key={s.skill}>
                <button
                  type="button"
                  onClick={() => onDrill(s.skill)}
                  className="group flex w-full items-center justify-between gap-3 py-2 text-left"
                  title={`Drill ${s.skill} again`}
                >
                  <span className="min-w-0 truncate text-sm font-medium text-[color:var(--cc-ink)] group-hover:underline">
                    {s.skill}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="st-bars !h-5" aria-hidden>
                      {s.scores.map((score, i) => (
                        <i key={i} style={{ height: `${Math.max(10, score * 10)}%` }} />
                      ))}
                    </span>
                    <span className="st-mono w-24 whitespace-nowrap text-right text-xs text-[color:var(--cc-ink-soft)]">
                      {mark(s.last)}/10{s.change ? ` ${signed(s.change)}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col items-start gap-2.5">
            <button type="button" onClick={() => onDrill()} className="cc-action cc-action--sm">
              Do today's drill
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {stats.saved > 0 && (
              <button
                type="button"
                onClick={onOpenStudy}
                className="text-xs font-semibold text-[color:var(--cc-ink-soft)] underline underline-offset-4 hover:text-[color:var(--cc-ink)]"
              >
                Finish the {stats.saved} saved for later
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * STAR habits — across their recent story answers, how often each part of
 * STAR(R) was there, thin or missing, and how much they say "I". This is the
 * progress that matters for behavioural interviews: "Result missing in 4 of
 * your last 5" is a habit, and it's the thing to fix.
 *
 * Present / thin / missing is ordinal, so it's one ink ramp with the counts
 * written out — the round colours are for round types, not quality.
 */
import { useMemo } from "react";
import { STAR_PARTS, type StarCoverage, type StarPart } from "@/lib/interviewCoach";
import { useScoredAnswers } from "../lib/practiceData";

const LABEL: Record<StarPart, string> = {
  situation: "Situation",
  task: "Task",
  action: "Action",
  result: "Result",
  reflection: "Reflection",
};

const WINDOW = 10;

export function StarHabits() {
  const { data } = useScoredAnswers();
  const stats = useMemo(() => {
    const stories = (data ?? []).filter((a) => a.evaluation.starBreakdown).slice(0, WINDOW);
    if (stories.length < 2) return null;
    const parts = STAR_PARTS.map((part) => {
      const seen = stories
        .map((s) => s.evaluation.starBreakdown![part])
        .filter((c): c is StarCoverage => c !== null && c !== undefined);
      const count = (c: StarCoverage) => seen.filter((x) => x === c).length;
      return { part, total: seen.length, present: count("present"), thin: count("thin"), missing: count("missing") };
    }).filter((p) => p.total > 0);
    const owned = stories.map((s) => s.evaluation.ownership).filter((o): o is { i: number; we: number } => !!o);
    const i = owned.reduce((n, o) => n + o.i, 0);
    const we = owned.reduce((n, o) => n + o.we, 0);
    const weakest = [...parts].sort((a, b) => a.present / a.total - b.present / b.total)[0];
    return { stories: stories.length, parts, iShare: i + we ? Math.round((i / (i + we)) * 100) : null, weakest };
  }, [data]);

  if (!stats) return null;

  return (
    <section className="cc-surface p-5" aria-labelledby="iv-star-habits">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p id="iv-star-habits" className="cc-kicker">
          STAR habits
        </p>
        <p className="text-xs text-[color:var(--cc-ash)]">Your last {stats.stories} story answers</p>
      </div>
      <div className="space-y-2.5">
        {stats.parts.map((p) => (
          <div key={p.part} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
            <span className="text-sm text-[color:var(--cc-ink)]">{LABEL[p.part]}</span>
            <span
              className="cc-iv-habit"
              role="img"
              aria-label={`${LABEL[p.part]}: there in ${p.present}, thin in ${p.thin}, missing in ${p.missing} of ${p.total}`}
            >
              <span data-c="present" style={{ flexGrow: p.present }} />
              <span data-c="thin" style={{ flexGrow: p.thin }} />
              <span data-c="missing" style={{ flexGrow: p.missing }} />
            </span>
            <span className="cc-font-mono text-xs tabular-nums text-[color:var(--cc-ink-soft)]">
              {p.present}/{p.total}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--cc-ink-soft)]">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="cc-iv-habit-key" data-c="present" /> there
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="cc-iv-habit-key" data-c="thin" /> thin
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="cc-iv-habit-key" data-c="missing" /> missing
        </span>
        {stats.iShare !== null && <span className="ml-auto">“I” in {stats.iShare}% of first-person words</span>}
      </div>
      {stats.weakest && stats.weakest.present < stats.weakest.total && (
        <p className="mt-3 text-sm text-[color:var(--cc-ink)]">
          {LABEL[stats.weakest.part]} is your weakest part: there in {stats.weakest.present} of {stats.weakest.total}.
        </p>
      )}
    </section>
  );
}

/**
 * The coach's read of their practice: the patterns across sessions that a
 * score per session can't show ("Result missing in 4 of your last 6
 * stories", "two phone screens, both under 60"), each with its evidence, and
 * what to practise next.
 *
 * It needs three finished sessions; before that it says how many more. The
 * read is saved with the newest session it was based on, so it's shown from
 * the database and only asked for again once another session is finished.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import { COACH_AVAILABLE, interviewCoach, type PatternAnalysis } from "@/lib/interviewCoach";
import { savedAgo, useLatestSaved } from "@/lib/savedResults";

import { roundTypeFromName, type RoundType } from "../lib/roundTypes";

const NEEDED = 3;

export function CoachRead({
  field,
  seniority,
  finishedCount,
  newestFinishedId,
  onPracticeType,
}: {
  field?: string;
  seniority?: string;
  finishedCount: number;
  /** The newest finished session: a saved read based on it is still current. */
  newestFinishedId: string | null;
  onPracticeType: (type: RoundType) => void;
}) {
  const saved = useLatestSaved<PatternAnalysis>("pattern_analysis", field);
  const [read, setRead] = useState<PatternAnalysis | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // One ask per session and job: a refocus (or React running the effect twice
  // in development) mustn't ask again, and an answer for an older session or
  // another job is dropped rather than shown.
  const key = `${newestFinishedId ?? ""}|${field ?? ""}|${seniority ?? ""}`;
  const askedFor = useRef<string | null>(null);
  const currentKey = useRef(key);
  currentKey.current = key;

  useEffect(() => {
    if (finishedCount < NEEDED || !newestFinishedId) return;
    if (saved.isFetching) return;
    const current = saved.data?.payload;
    const showSaved = () => {
      if (!current?.ready) return;
      setRead(current);
      setSavedAt(saved.data!.savedAt);
      setLoading(false);
    };
    if (current?.ready && current.basedOn === newestFinishedId) {
      showSaved();
      return;
    }
    if (!COACH_AVAILABLE || askedFor.current === key) {
      if (askedFor.current !== key) showSaved();
      return;
    }
    askedFor.current = key;
    setLoading(true);
    interviewCoach
      .analyzePatterns({ field, seniority })
      .then((r) => {
        if (currentKey.current !== key) return;
        setRead(r);
        setSavedAt(null);
      })
      .catch(() => {
        // An older read is better than none while the coach is unreachable.
        if (currentKey.current === key) showSaved();
      })
      .finally(() => {
        if (currentKey.current === key) setLoading(false);
      });
    // Re-read only when a session is finished or the job changes.
  }, [key, newestFinishedId, finishedCount, field, seniority, saved.isFetching, saved.data]);

  if (finishedCount < NEEDED) {
    const more = NEEDED - finishedCount;
    return (
      <section className="cc-surface p-5" aria-labelledby="iv-coach-read">
        <p id="iv-coach-read" className="cc-kicker">Coach's read</p>
        <p className="mt-2 text-sm text-[color:var(--cc-ink-soft)]">
          Finish {more} more session{more === 1 ? "" : "s"} and the coach will read the patterns across your practice:
          what keeps coming up, with the evidence, and what to practise next.
        </p>
      </section>
    );
  }

  if (loading && !read) {
    return (
      <section className="cc-surface p-5" aria-busy="true" aria-labelledby="iv-coach-read">
        <p id="iv-coach-read" className="cc-kicker">Coach's read</p>
        <div className="mt-3 space-y-2">
          <div className="h-5 w-2/3 animate-pulse bg-[color:var(--cc-cream-3)]" />
          <div className="h-4 w-full animate-pulse bg-[color:var(--cc-cream-3)]" />
          <div className="h-4 w-5/6 animate-pulse bg-[color:var(--cc-cream-3)]" />
        </div>
      </section>
    );
  }

  if (!read?.ready || !read.patternSummary) return null;

  const persistent = read.weaknesses?.persistent ?? [];
  const consistent = read.strengths?.consistent ?? [];
  const recommendations = [...(read.recommendations ?? [])]
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .slice(0, 2);

  return (
    <section className="cc-surface p-5" aria-labelledby="iv-coach-read">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p id="iv-coach-read" className="cc-kicker">Coach's read</p>
        <p className="cc-label-sm text-[color:var(--cc-ash)]">
          {savedAt ? savedAgo(savedAt) : "New"} · from {read.finished ?? finishedCount} finished sessions
        </p>
      </div>
      <p className="mt-3 cc-font-display text-lg leading-snug text-[color:var(--cc-ink)]">{read.patternSummary}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {persistent.length > 0 && (
          <div>
            <p className="cc-field-label">Keeps coming up</p>
            <ul className="mt-1 space-y-1 text-sm text-[color:var(--cc-ink-soft)]">
              {persistent.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            {read.weaknesses?.evidence && (
              <p className="mt-2 text-xs text-[color:var(--cc-ash)]">{read.weaknesses.evidence}</p>
            )}
          </div>
        )}
        {consistent.length > 0 && (
          <div>
            <p className="cc-field-label">Holding up</p>
            <ul className="mt-1 space-y-1 text-sm text-[color:var(--cc-ink-soft)]">
              {consistent.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            {read.strengths?.evidence && (
              <p className="mt-2 text-xs text-[color:var(--cc-ash)]">{read.strengths.evidence}</p>
            )}
          </div>
        )}
      </div>

      {(read.riskAreas ?? []).length > 0 && (
        <p className="mt-4 text-sm text-[color:var(--cc-ink-soft)]">
          <span className="font-semibold text-[color:var(--cc-ink)]">Watch:</span> {read.riskAreas!.join("; ")}
        </p>
      )}

      {recommendations.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="cc-field-label">Practise next</p>
          {recommendations.map((r, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-[color:var(--cc-hair)] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[color:var(--cc-ink)]">{r.skill}</p>
                {r.suggestedPractice && <p className="text-sm text-[color:var(--cc-ink-soft)]">{r.suggestedPractice}</p>}
                {r.reason && <p className="mt-0.5 text-xs text-[color:var(--cc-ash)]">{r.reason}</p>}
              </div>
              <button
                type="button"
                onClick={() => onPracticeType(roundTypeFromName(`${r.suggestedPractice ?? ""} ${r.skill ?? ""}`))}
                className="cc-action cc-action--sm shrink-0"
              >
                Practise <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

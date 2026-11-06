/**
 * How a drill was marked: a grade stamp, the coach's ticks point by point with
 * the words from the answer that show each one, and what to try next. Shown in
 * Study straight after a drill, and in the drill log. Renders inside .cc-study.
 */
import type { DrillResult } from "@/lib/careerCoach";
import { mark, markVerdict, scoreTone } from "../lib/drills";
import "@/components/career-dev/study.css";

export function GradeStamp({ score, by }: { score: number; by?: "coach" | "self" | null }) {
  return (
    <div
      className={`st-grade st-grade--${scoreTone(score)}`}
      role="img"
      aria-label={`${mark(score)} out of 10${by === "self" ? ", rated by you" : ""}`}
    >
      <div>
        <b>{mark(score)}</b>
        <small>{by === "self" ? "SELF" : "/ 10"}</small>
      </div>
    </div>
  );
}

const SYMBOL = { covered: "✓", partial: "½", missing: "–" } as const;
const WORD = { covered: "Covered", partial: "Partly covered", missing: "Missing" } as const;

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function DrillMarks({ result }: { result: DrillResult }) {
  const e = result.evaluation;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <GradeStamp score={result.score} by={result.scoredBy} />
        <div className="min-w-0 flex-1">
          <p className="st-label">{result.scoredBy === "coach" ? "The coach's mark" : "Your own rating"}</p>
          <p className="st-h mt-1.5 text-[17px] leading-snug">{markVerdict(result.score)}</p>
          <p className="st-small mt-1.5">
            {result.skill}: level {result.previousProficiency} → {result.newProficiency} ({signed(result.delta)}) · due
            again in {result.nextReviewInDays} {result.nextReviewInDays === 1 ? "day" : "days"}
          </p>
        </div>
      </div>

      {e?.cap && (
        <div className="st-note st-note--warn">
          <span>
            Capped at {e.cap.max}: {e.cap.reason}
          </span>
        </div>
      )}

      {e?.points?.length ? (
        <ul className="st-marks" aria-label="Point by point">
          {e.points.map((p, i) => (
            <li key={i} className={`st-mark st-mark--${p.mark}`}>
              <span className="st-mark__sym" aria-hidden>
                {SYMBOL[p.mark]}
              </span>
              <div className="min-w-0">
                <p className="st-mark__point">
                  <span className="sr-only">{WORD[p.mark]}: </span>
                  {p.point}
                </p>
                {p.quote && (
                  <p className="st-mark__quote">
                    “<span className={p.mark === "covered" ? "st-hl" : undefined}>{p.quote.text}</span>”
                  </p>
                )}
                {p.note && <p className="st-mark__note">{p.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {e && (e.whatWorked || e.whatsMissing || e.oneThingToTry) && (
        <div className="st-split">
          {e.whatWorked && (
            <div>
              <p className="st-label st-label--muted">What worked</p>
              <p>{e.whatWorked}</p>
            </div>
          )}
          {e.whatsMissing && (
            <div>
              <p className="st-label st-label--muted">What's missing</p>
              <p>{e.whatsMissing}</p>
            </div>
          )}
          {e.oneThingToTry && (
            <div>
              <p className="st-label st-label--muted">Next time</p>
              <p>{e.oneThingToTry}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

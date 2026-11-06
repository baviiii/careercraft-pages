/**
 * Finished drills: how each skill is going, then every drill as a ledger line
 * that opens to show the question, what they wrote and how it was marked.
 * Used in Study (the drill log) and in History (Drills). Renders inside
 * .cc-study.
 */
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteDrill, drillStats, finished, mark, scoreTone, useRefreshDrills, type DrillRow } from "../lib/drills";
import { DrillMarks } from "./DrillMarks";
import "@/components/career-dev/study.css";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** One card per skill: its last few marks as bars, and the latest. */
export function SkillProgressCards({ rows, max = 8 }: { rows: DrillRow[]; max?: number }) {
  const skills = drillStats(rows).skills.slice(0, max);
  if (!skills.length) return null;
  return (
    <div className="st-skills">
      {skills.map((s) => (
        <div key={s.skill} className="st-skillcard">
          <p className="st-skillcard__name" title={s.skill}>
            {s.skill}
          </p>
          <div className="mt-2.5 flex items-end justify-between gap-3">
            <span className="st-bars" aria-hidden>
              {s.scores.map((score, i) => (
                <i key={i} style={{ height: `${Math.max(10, score * 10)}%` }} />
              ))}
            </span>
            <span className="text-right">
              <span className="st-mono block text-[15px] font-semibold text-[color:var(--cc-ink)]">
                {mark(s.last)}
                <span className="text-[11px] text-[color:var(--cc-ash)]">/10</span>
              </span>
              <span className="st-mono block text-[11px] text-[color:var(--cc-ash)]">
                {s.change ? `${signed(s.change)} · ` : ""}
                {s.attempts} {s.attempts === 1 ? "drill" : "drills"}
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LogEntry({ row, onPractise }: { row: DrillRow; onPractise?: (skill: string) => void }) {
  const { toast } = useToast();
  const refresh = useRefreshDrills();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const score = row.score ?? 0;

  const remove = async () => {
    setBusy(true);
    try {
      await deleteDrill(row.id);
      await refresh();
      toast({ title: "Drill deleted" });
    } catch {
      setBusy(false);
      toast({ title: "Couldn't delete it", description: "Try again in a moment.", variant: "destructive" });
    }
  };

  return (
    <details className="st-entry">
      <summary>
        <span className="st-entry__date">{shortDate(row.completedAt ?? row.createdAt)}</span>
        <span className="min-w-0">
          <span className="st-entry__skill block">{row.skill}</span>
          <span className="st-small block truncate">{row.exercise.prompt}</span>
        </span>
        <span className="st-entry__by">{row.scoredBy === "coach" ? "Marked by the coach" : "Rated yourself"}</span>
        <span className={`st-score is-${scoreTone(score)}`}>
          {mark(score)}
          <small>/10</small>
        </span>
      </summary>

      <div className="st-entry__body space-y-5">
        <div>
          <p className="st-label st-label--muted">The drill</p>
          <p className="st-h mt-1.5 text-[17px] leading-snug">{row.exercise.prompt}</p>
        </div>
        {row.answer && (
          <div>
            <p className="st-label st-label--muted">What you wrote</p>
            <p className="st-ruled st-ruled--read mt-1">{row.answer}</p>
          </div>
        )}
        {row.result && <DrillMarks result={row.result} />}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {onPractise && (
            <button type="button" onClick={() => onPractise(row.skill)} className="cc-action cc-action--ghost cc-action--sm">
              Practise {row.skill} again
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {confirming ? (
            <div className="st-confirm" role="group" aria-label="Delete this drill?">
              <span>Delete this drill from your log? Your skill level stays as it is.</span>
              <button type="button" onClick={() => void remove()} disabled={busy} className="cc-action cc-action--danger cc-action--sm">
                {busy ? "Deleting…" : "Delete"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="st-textbtn">
                Keep it
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="st-textbtn st-textbtn--danger">
              Delete
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

export function DrillLog({ rows, onPractise }: { rows: DrillRow[]; onPractise?: (skill: string) => void }) {
  const [shown, setShown] = useState(15);
  const done = finished(rows).sort((a, b) =>
    (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt),
  );
  if (!done.length) return null;
  return (
    <div>
      <div className="st-ledger">
        {done.slice(0, shown).map((r) => (
          <LogEntry key={r.id} row={r} onPractise={onPractise} />
        ))}
      </div>
      {done.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + 15)} className="st-textbtn mt-4">
          Show older drills ({done.length - shown} more)
        </button>
      )}
    </div>
  );
}

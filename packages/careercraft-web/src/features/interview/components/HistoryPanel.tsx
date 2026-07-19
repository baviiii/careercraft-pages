/**
 * Session history — every sit-down, newest first. Completed sessions re-open
 * their stored debrief (the ai_insights JSON the MCP wrote at finish time),
 * so past verdicts are always one click away, no server round-trip.
 */
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { adaptFinalEvaluation } from "@/lib/interviewCoach";
import { fetchSessionHistory, sessionOverallScore, type SessionRow } from "../lib/sessions";

function StoredDebrief({ insights }: { insights: unknown }) {
  const ev = adaptFinalEvaluation(insights);
  if (!ev.overallScore && !ev.summary) {
    return (
      <p className="text-sm text-[color:var(--cc-ash)]">
        No debrief was stored for this session.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="cc-font-display text-4xl leading-none text-[color:var(--cc-ink)]">
          {ev.grade}
        </span>
        <div>
          <p className="cc-font-mono text-lg tabular-nums text-[color:var(--cc-ink)]">
            {ev.overallScore}
            <span className="text-xs text-[color:var(--cc-ash)]">/100</span>
          </p>
          <p className="cc-label-sm text-[color:var(--cc-ash)]">{ev.readiness}</p>
        </div>
      </div>
      {ev.summary && (
        <p className="text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">{ev.summary}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {ev.strengths.length > 0 && (
          <div>
            <p className="cc-label-sm mb-1.5 text-[color:var(--cc-signal-deep)]">Strengths</p>
            <ul className="space-y-1 text-sm text-[color:var(--cc-ink-soft)]">
              {ev.strengths.slice(0, 4).map((s, i) => (
                <li key={i}>— {s}</li>
              ))}
            </ul>
          </div>
        )}
        {(ev.mustFix.length > 0 || ev.weaknesses.length > 0) && (
          <div>
            <p className="cc-label-sm mb-1.5 text-[color:var(--cc-wheat-deep)]">Work on</p>
            <ul className="space-y-1 text-sm text-[color:var(--cc-ink-soft)]">
              {[...ev.mustFix, ...ev.weaknesses].slice(0, 4).map((s, i) => (
                <li key={i}>— {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {ev.improvementPlan.length > 0 && (
        <div>
          <p className="cc-label-sm mb-1.5 text-[color:var(--cc-ink)]">Plan</p>
          <ul className="space-y-1.5 text-sm text-[color:var(--cc-ink-soft)]">
            {ev.improvementPlan.map((item, i) => (
              <li key={i}>
                <span className="font-medium text-[color:var(--cc-ink)]">{item.area}:</span>{" "}
                {item.action}
                {item.timeline ? ` (${item.timeline})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function HistoryPanel() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setLoading(true);
    setFailed(false);
    fetchSessionHistory()
      .then(setRows)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]" />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-10 text-center">
        <p className="cc-label mb-2 text-[color:var(--cc-ink)]">Couldn't load your history</p>
        <button onClick={load} className="cc-btn cc-btn-ghost mt-4">
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-10 text-center">
        <p className="cc-label mb-2 text-[color:var(--cc-ink)]">No sessions yet</p>
        <p className="text-sm text-[color:var(--cc-ash)]">
          Your first debrief will land here once you've sat an interview.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const score = sessionOverallScore(row);
        const completed = row.status === "completed";
        const date = new Date(row.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        return (
          <details
            key={row.id}
            className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 items-baseline gap-3">
                <span className="cc-font-mono shrink-0 text-xs text-[color:var(--cc-ash)]">
                  {date}
                </span>
                <span className="truncate text-sm font-medium text-[color:var(--cc-ink)]">
                  {row.field}
                  {row.seniority ? ` · ${row.seniority}` : ""}
                </span>
                {row.question_count ? (
                  <span className="cc-label-sm hidden shrink-0 text-[color:var(--cc-ash)] sm:inline">
                    {row.question_count} q
                  </span>
                ) : null}
              </div>
              {completed ? (
                <span className="cc-font-mono shrink-0 text-sm tabular-nums text-[color:var(--cc-ink)]">
                  {score !== null ? `${score}/100` : "done"}
                </span>
              ) : (
                <span className="cc-label-sm shrink-0 text-[color:var(--cc-wheat-deep)]">
                  unfinished
                </span>
              )}
            </summary>
            <div className="border-t border-[color:var(--cc-hair)] px-5 py-5">
              {completed ? (
                <StoredDebrief insights={row.ai_insights} />
              ) : (
                <p className="text-sm text-[color:var(--cc-ash)]">
                  This session was never wrapped up, so there's no debrief on file.
                </p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

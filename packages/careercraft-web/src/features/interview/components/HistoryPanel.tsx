/**
 * Session history — reopen stored debriefs; practice again; empty CTA.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { adaptFinalEvaluation } from "@/lib/interviewCoach";
import { stageSession } from "../hooks/useInterviewSession";
import {
  fetchSessionHistory,
  normalizeScore100,
  sessionOverallScore,
  type SessionRow,
} from "../lib/sessions";

function StoredDebrief({
  insights,
  row,
  onPracticeAgain,
}: {
  insights: unknown;
  row: SessionRow;
  onPracticeAgain: () => void;
}) {
  const ev = adaptFinalEvaluation(insights);
  const score = normalizeScore100(ev.overallScore || sessionOverallScore(row));

  if (!score && !ev.summary) {
    return (
      <p className="text-sm text-[color:var(--cc-ash)]">
        No debrief was stored for this session.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="cc-font-display text-4xl leading-none text-[color:var(--cc-ink)]">
          {ev.grade || "—"}
        </span>
        <div>
          {score != null && (
            <p className="cc-font-mono text-lg tabular-nums text-[color:var(--cc-ink)]">
              {score}
              <span className="text-xs text-[color:var(--cc-ash)]">/100</span>
            </p>
          )}
          <p className="cc-label-sm text-[color:var(--cc-ash)]">{ev.readiness}</p>
        </div>
      </div>
      {ev.summary && (
        <p className="text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">{ev.summary}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {ev.strengths.length > 0 && (
          <div className="rounded-xl border border-[color:var(--cc-hair)] bg-[color:var(--cc-signal-soft)]/40 p-4">
            <p className="cc-label-sm mb-1.5 text-[color:var(--cc-signal-deep)]">Strengths</p>
            <ul className="space-y-1 text-sm text-[color:var(--cc-ink-soft)]">
              {ev.strengths.slice(0, 4).map((s, i) => (
                <li key={i}>— {s}</li>
              ))}
            </ul>
          </div>
        )}
        {(ev.mustFix.length > 0 || ev.weaknesses.length > 0) && (
          <div className="rounded-xl border border-[color:var(--cc-hair)] bg-[color:var(--cc-wheat-soft)]/40 p-4">
            <p className="cc-label-sm mb-1.5 text-[color:var(--cc-wheat-deep)]">Improve</p>
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
      <button type="button" onClick={onPracticeAgain} className="cc-action cc-action--sm">
        Practice this again
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface HistoryPanelProps {
  highlightId?: string | null;
  onStartPractice?: () => void;
}

export function HistoryPanel({ highlightId, onStartPractice }: HistoryPanelProps) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const highlightRef = useRef<HTMLDetailsElement | null>(null);

  const load = () => {
    setLoading(true);
    setFailed(false);
    fetchSessionHistory()
      .then(setRows)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!highlightId || loading) return;
    const el = highlightRef.current;
    if (el) {
      el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, loading, rows]);

  const practiceAgain = (row: SessionRow) => {
    stageSession({
      field: row.field,
      seniority: row.seniority || undefined,
      mode: "realistic",
      questionCount: Math.min(8, Math.max(4, row.question_count || 6)),
      roundName: "Practice again",
    });
    navigate("/interview-prep/room");
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-[1.25rem] border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]"
          />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <div className="cc-surface p-10 text-center">
        <p className="cc-kicker mb-2">Couldn't load your history</p>
        <button type="button" onClick={load} className="cc-action cc-action--ghost mt-4">
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="cc-tint cc-tone-cobalt px-6 py-12 text-center">
        <p className="cc-kicker mb-2">No sessions yet</p>
        <p className="mx-auto max-w-md text-sm text-[color:var(--cc-ink-soft)]">
          Your first debrief lands here once you've sat an interview.
        </p>
        {onStartPractice && (
          <button type="button" onClick={onStartPractice} className="cc-action mt-6">
            Practice your first interview
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const score = normalizeScore100(sessionOverallScore(row));
        const completed = row.status === "completed";
        const date = new Date(row.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        const isHighlight = highlightId === row.id;

        return (
          <details
            key={row.id}
            ref={isHighlight ? highlightRef : undefined}
            open={isHighlight || undefined}
            className={`cc-surface overflow-hidden ${
              isHighlight ? "ring-2 ring-[color:var(--cc-rust)]" : ""
            }`}
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
                  {score !== null ? (
                    <>
                      {score}
                      <span className="text-xs text-[color:var(--cc-ash)]">/100</span>
                    </>
                  ) : (
                    "done"
                  )}
                </span>
              ) : (
                <span className="cc-label-sm shrink-0 text-[color:var(--cc-wheat-deep)]">
                  unfinished
                </span>
              )}
            </summary>
            <div className="border-t border-[color:var(--cc-hair)] px-5 py-5">
              {completed ? (
                <StoredDebrief
                  insights={row.ai_insights}
                  row={row}
                  onPracticeAgain={() => practiceAgain(row)}
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[color:var(--cc-ash)]">
                    This session was never wrapped up, so there's no debrief on file.
                  </p>
                  <button
                    type="button"
                    onClick={() => practiceAgain(row)}
                    className="cc-action cc-action--ghost cc-action--sm"
                  >
                    Start a fresh session
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/**
 * Session history — every session, tagged and filterable by round type;
 * reopen a stored debrief, practise the same round again.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { adaptFinalEvaluation } from "@/lib/interviewCoach";
import { stageSession } from "../hooks/useInterviewSession";
import { jobLabel, useTrackerJobs } from "../lib/practiceData";
import { rowScore, scoreChange, signed } from "../lib/progress";
import { ROUND_TYPES, roundClass, roundMeta, type RoundType } from "../lib/roundTypes";
import { normalizeScore100, sessionOverallScore, useInterviewSessions, type SessionRow } from "../lib/sessions";
import { RoundDebriefExtras } from "./RoundDebriefExtras";
import { RoundDot, RoundTag } from "./RoundMarks";
import "../interview.css";

function StoredDebrief({
  row,
  onPracticeAgain,
}: {
  row: SessionRow;
  onPracticeAgain: () => void;
}) {
  const ev = adaptFinalEvaluation(row.ai_insights);
  const score = normalizeScore100(ev.overallScore || sessionOverallScore(row));

  if (!score && !ev.summary) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[color:var(--cc-ash)]">No debrief was stored for this session.</p>
        <button type="button" onClick={onPracticeAgain} className="cc-action cc-action--sm">
          Practise this again
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
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

      <RoundDebriefExtras roundType={row.round_type} evaluation={ev} compact />

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
        Practise this again
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface HistoryPanelProps {
  highlightId?: string | null;
  onStartPractice?: () => void;
  /** Pick a round type in the setup panel (on the Home tab) and go there. */
  onPracticeType?: (type: RoundType) => void;
}

type Filter = RoundType | "all";

export function HistoryPanel({ highlightId, onStartPractice, onPracticeType }: HistoryPanelProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useInterviewSessions();
  const rows = useMemo(() => data ?? [], [data]);
  const [filter, setFilter] = useState<Filter>("all");
  const highlightRef = useRef<HTMLDetailsElement | null>(null);

  const counts = useMemo(() => {
    const c: Record<RoundType, number> = { screen: 0, behavioral: 0, technical: 0, full: 0 };
    for (const r of rows) c[r.round_type] += 1;
    return c;
  }, [rows]);
  const shown = filter === "all" ? rows : rows.filter((r) => r.round_type === filter);

  useEffect(() => {
    if (!highlightId || isLoading) return;
    const el = highlightRef.current;
    if (el) {
      el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, isLoading, rows]);

  // Practising again for a job aims at the same ad and counts on that job.
  const { data: jobs } = useTrackerJobs();
  const practiceAgain = (row: SessionRow) => {
    const meta = roundMeta(row.round_type);
    const [shortest, , longest] = meta.lengths;
    const job = row.job_application_id ? jobs?.find((j) => j.id === row.job_application_id) : undefined;
    stageSession({
      field: row.field,
      seniority: row.seniority || undefined,
      roundType: row.round_type,
      mode: meta.defaultMode,
      questionCount: Math.min(longest, Math.max(shortest, row.question_count || meta.lengths[1])),
      roundName: meta.label,
      framework: row.framework ?? undefined,
      jobId: row.job_application_id ?? undefined,
      jobLabel: job ? jobLabel(job) : undefined,
      jobDescription: job?.description || undefined,
    });
    navigate("/interview-prep/room");
  };

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading your history">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-[1.25rem] border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="cc-surface p-10 text-center">
        <p className="cc-kicker mb-2">Couldn't load your history</p>
        <button type="button" onClick={() => void refetch()} className="cc-action cc-action--ghost mt-4">
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="cc-surface px-6 py-12 text-center">
        <p className="cc-kicker mb-2">No sessions yet</p>
        <p className="mx-auto max-w-md text-sm text-[color:var(--cc-ink-soft)]">
          Your first debrief lands here once you've sat an interview.
        </p>
        {onStartPractice && (
          <button type="button" onClick={onStartPractice} className="cc-action mt-6">
            Practise your first interview
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  const filterButton = (id: Filter, label: string, count: number) => (
    <button
      key={id}
      type="button"
      aria-pressed={filter === id}
      onClick={() => setFilter(id)}
      className={`cc-iv-filter inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        id !== "all" ? roundClass(id) : ""
      } ${
        filter === id
          ? "border-[color:var(--cc-ink)] bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
          : "border-[color:var(--cc-hair-strong)] bg-white text-[color:var(--cc-ink-soft)] hover:border-[color:var(--cc-ink)] hover:text-[color:var(--cc-ink)]"
      }`}
    >
      {id !== "all" && <span aria-hidden className="cc-iv-dot" />}
      {label}
      <span className="cc-tabular opacity-70">{count}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter by round type" className="flex flex-wrap gap-2">
        {filterButton("all", "All", rows.length)}
        {ROUND_TYPES.map((t) => filterButton(t.id, t.label, counts[t.id]))}
      </div>

      {shown.length === 0 && filter !== "all" && (
        <div className={`cc-surface flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between ${roundClass(filter)}`}>
          <p className="flex items-center gap-2 text-sm text-[color:var(--cc-ink-soft)]">
            <RoundDot type={filter} />
            No {roundMeta(filter).noun}s yet.
          </p>
          {onPracticeType && (
            <button type="button" onClick={() => onPracticeType(filter)} className="cc-action cc-action--sm">
              Set one up
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {shown.map((row) => {
          const score = rowScore(row);
          const change = scoreChange(rows, row);
          const completed = row.status === "completed";
          const date = new Date(row.created_at).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const isHighlight = highlightId === row.id;

          return (
            <details
              key={row.id}
              ref={isHighlight ? highlightRef : undefined}
              open={isHighlight || undefined}
              // .cc-surface owns box-shadow, so a ring (a box-shadow) would
              // never show; the highlight is an outline.
              className={`cc-surface cc-iv-row overflow-hidden ${roundClass(row.round_type)} ${
                isHighlight ? "outline outline-2 outline-offset-2 outline-[color:var(--cc-ink)]" : ""
              }`}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 pl-6 pr-5 [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <RoundTag type={row.round_type} className="shrink-0" />
                  <span className="truncate text-sm font-medium text-[color:var(--cc-ink)]">
                    {row.field}
                    {row.seniority ? ` · ${row.seniority}` : ""}
                  </span>
                  <span className="cc-font-mono shrink-0 text-xs text-[color:var(--cc-ash)]">
                    {date}
                    {row.question_count ? ` · ${row.question_count} q` : ""}
                  </span>
                </div>
                {completed ? (
                  <span className="shrink-0 text-right">
                    <span className="cc-font-mono block text-sm tabular-nums text-[color:var(--cc-ink)]">
                      {score !== null ? (
                        <>
                          {score}
                          <span className="text-xs text-[color:var(--cc-ash)]">/100</span>
                        </>
                      ) : (
                        "Done"
                      )}
                    </span>
                    {change !== null && (
                      <span className="cc-font-mono block text-[11px] tabular-nums text-[color:var(--cc-ink-soft)]">
                        {signed(change)} vs last
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="cc-label-sm shrink-0 text-[color:var(--cc-ash)]">Unfinished</span>
                )}
              </summary>
              <div className="border-t border-[color:var(--cc-hair)] py-5 pl-6 pr-5">
                {completed ? (
                  <StoredDebrief row={row} onPracticeAgain={() => practiceAgain(row)} />
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
                      Start a fresh {roundMeta(row.round_type).noun}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

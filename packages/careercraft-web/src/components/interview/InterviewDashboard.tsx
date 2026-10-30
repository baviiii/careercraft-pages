/**
 * Interview Home — the practice record below the setup panel.
 *
 * Everything is coloured by round type, the same colours as the round picker,
 * so "what have I practised" reads at a glance: a cell per type with its
 * latest score and trend, a week of sessions as coloured segments, and recent
 * sessions tagged by type. Scores are numbers, never colours, and a type is
 * never colour alone. Real DB rows only; the weekly note and the coach's read
 * of their patterns come from the coach, saved, and are only asked for again
 * once there's a newer session.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRateLimit } from "@/hooks/useSecurity";
import { RATE_LIMITS } from "@/lib/security/rateLimiter";
import { auditLog } from "@/lib/security/auditLog";
import { interviewCoach, COACH_AVAILABLE, type WeeklyInsight } from "@/lib/interviewCoach";
import { RoundDot, RoundTag } from "@/features/interview/components/RoundMarks";
import { CoachRead } from "@/features/interview/components/CoachRead";
import { StarHabits } from "@/features/interview/components/StarHabits";
import { useLatestSaved } from "@/lib/savedResults";
import {
  lastSevenDays,
  overallAverage,
  practiceStreak,
  progressByType,
  relativeDay,
  rowScore,
  scoreChange,
  sessionsThisWeek,
  shortDate,
  signed,
  type DaySessions,
  type TypeProgress,
} from "@/features/interview/lib/progress";
import { ROUND_TYPES, roundClass, roundMeta, type RoundType } from "@/features/interview/lib/roundTypes";
import { useInterviewSessions, useSessionTotal, type SessionRow } from "@/features/interview/lib/sessions";
import "@/features/interview/interview.css";

interface InterviewHomeProps {
  field?: string;
  seniority?: string;
  onOpenHistory: (sessionId?: string) => void;
  onStartPractice: () => void;
  /** Pick a round type in the setup panel and scroll up to it. */
  onPracticeType: (type: RoundType) => void;
}

/* ── By type ────────────────────────────────────────────────────────────── */

/**
 * Finished scores, oldest to newest, as a small line. The y range fits the
 * scores (at least 20 points tall, so a 2-point wobble doesn't look like a
 * cliff); on a fixed 0–100 range every line came out flat. The end dot is
 * HTML over the stretched SVG, so it stays round at any width.
 */
function Sparkline({ scores, label }: { scores: number[]; label: string }) {
  if (scores.length < 2) return <div className="h-[28px]" aria-hidden />;
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const span = Math.max(20, hi - lo);
  const floor = Math.max(0, Math.min(lo - (span - (hi - lo)) / 2, 100 - span));
  const xPct = (i: number) => 4 + (i / (scores.length - 1)) * 92;
  const yPct = (s: number) => 88 - ((s - floor) / span) * 76;
  const last = scores.length - 1;
  return (
    <div
      className="relative h-[28px]"
      role="img"
      aria-label={`${label} scores, oldest to newest: ${scores.join(", ")}`}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="cc-iv-spark absolute inset-0 h-full" aria-hidden>
        <polyline points={scores.map((s, i) => `${xPct(i)},${yPct(s)}`).join(" ")} vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        aria-hidden
        className="cc-iv-spark-dot"
        style={{ left: `${xPct(last)}%`, top: `${yPct(scores[last]!)}%` }}
      />
    </div>
  );
}

function TypeCell({ p, onPractice }: { p: TypeProgress; onPractice: () => void }) {
  const meta = roundMeta(p.type);
  const Icon = meta.icon;
  const change = p.latest !== null && p.previous !== null ? p.latest - p.previous : null;
  return (
    <button
      type="button"
      onClick={onPractice}
      className={`cc-iv-typecell ${roundClass(p.type)}`}
      aria-label={`${meta.label}: ${
        p.latest !== null ? `latest score ${p.latest} out of 100` : p.count ? `${p.count} started, none finished` : "not tried yet"
      }. Practise a ${meta.noun}.`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-[color:var(--cc-ink)]">
        <Icon className="h-3.5 w-3.5 text-[color:var(--cc-iv)]" aria-hidden />
        {meta.label}
      </span>

      {p.latest !== null ? (
        <span className="flex items-baseline gap-2">
          <span className="cc-font-display text-3xl tracking-tight cc-tabular text-[color:var(--cc-ink)]">
            {p.latest}
            <span className="ml-0.5 text-sm text-[color:var(--cc-ash)]">/100</span>
          </span>
          <span className="cc-font-mono text-xs cc-tabular text-[color:var(--cc-ink-soft)]">
            {change !== null ? `${signed(change)} since last` : "first score"}
          </span>
        </span>
      ) : (
        <span className="cc-font-display text-3xl tracking-tight text-[color:var(--cc-ash)]">—</span>
      )}

      <Sparkline scores={p.scores} label={meta.label} />

      <span className="flex items-center justify-between gap-2 text-xs text-[color:var(--cc-ink-soft)]">
        <span>
          {p.count === 0
            ? "Not tried yet"
            : `${p.finished} done${p.average !== null ? ` · avg ${p.average}` : ""}`}
        </span>
        <span className="inline-flex items-center gap-0.5 font-semibold text-[color:var(--cc-ink)]">
          {p.count === 0 ? "Try it" : "Practise"}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </span>
      </span>
    </button>
  );
}

/* ── Last 7 days ────────────────────────────────────────────────────────── */

const MAX_SEGMENTS = 8;

function dayName(d: Date, style: "short" | "long") {
  return d.toLocaleDateString("en-AU", { weekday: style });
}

function sessionWord(s: DaySessions["sessions"][number]): string {
  return s.score !== null ? `${s.score}/100` : s.finished ? "done" : "unfinished";
}

function WeekChart({ days }: { days: DaySessions[] }) {
  return (
    <div className="cc-iv-week" role="list" aria-label="Sessions in the last seven days, by type">
      {days.map((day) => {
        const long = `${dayName(day.date, "long")} ${shortDate(day.date)}`;
        const shown = day.sessions.slice(-MAX_SEGMENTS);
        const summary = day.sessions.length
          ? day.sessions.map((s) => `${roundMeta(s.type).label} ${sessionWord(s)}`).join(", ")
          : "no practice";
        return (
          <div
            key={day.date.getTime()}
            role="listitem"
            // Focusable so keyboard users get the same detail as the hover.
            tabIndex={0}
            aria-label={`${long}: ${summary}`}
            className="cc-iv-day"
            data-today={day.isToday || undefined}
          >
            <div className="cc-iv-stack" data-empty={day.sessions.length === 0}>
              {shown.map((s) => (
                <span
                  key={s.id}
                  className={`cc-iv-seg ${roundClass(s.type)}`}
                  data-open={!s.finished || undefined}
                />
              ))}
            </div>
            <span className="cc-iv-daylabel flex flex-col items-center leading-tight text-[color:var(--cc-ash)]">
              <span className="cc-label-sm">{dayName(day.date, "short")}</span>
              <span className="text-xs cc-tabular">{day.date.getDate()}</span>
            </span>
            <span className="cc-iv-tip" aria-hidden>
              <span className="block font-semibold">{long}</span>
              {day.sessions.length ? (
                <span className="mt-1 block space-y-0.5">
                  {day.sessions.map((s) => (
                    <span key={s.id} className={`flex items-center gap-1.5 ${roundClass(s.type)}`}>
                      <span className="cc-iv-dot" />
                      <span className="flex-1">{roundMeta(s.type).label}</span>
                      <span className="cc-tabular opacity-80">{sessionWord(s)}</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="mt-0.5 block opacity-75">No practice</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Round types">
      {ROUND_TYPES.map((t) => (
        <li key={t.id} className="flex items-center gap-1.5 text-xs text-[color:var(--cc-ink-soft)]">
          <RoundDot type={t.id} />
          {t.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5 text-xs text-[color:var(--cc-ash)]">
        {/* Neutral, so the key for "unfinished" doesn't look like one type. */}
        <span
          aria-hidden
          className="cc-iv-seg inline-block h-2 w-3"
          data-open
          style={{ ["--cc-iv" as string]: "var(--cc-ash)", ["--cc-iv-wash" as string]: "transparent" }}
        />
        Unfinished
      </li>
    </ul>
  );
}

/* ── Recent sessions ────────────────────────────────────────────────────── */

function RecentRow({ row, all, onOpen }: { row: SessionRow; all: SessionRow[]; onOpen: () => void }) {
  const score = rowScore(row);
  const change = scoreChange(all, row);
  const finished = row.status === "completed";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`cc-iv-row ${roundClass(row.round_type)} flex w-full items-center justify-between gap-3 bg-white py-3 pl-5 pr-4 text-left transition-colors hover:bg-[color:var(--cc-cream-2)]`}
    >
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <RoundTag type={row.round_type} className="shrink-0" />
          <span className="truncate text-sm font-medium text-[color:var(--cc-ink)]">
            {row.field}
            {row.seniority ? ` · ${row.seniority}` : ""}
          </span>
        </span>
        <span className="cc-label-sm mt-1 block text-[color:var(--cc-ash)]">
          {row.question_count ? `${row.question_count} q · ` : ""}
          {relativeDay(row.created_at)}
        </span>
      </span>
      {score !== null ? (
        <span className="shrink-0 text-right">
          <span className="cc-font-mono block text-sm cc-tabular text-[color:var(--cc-ink)]">
            {score}
            <span className="text-xs text-[color:var(--cc-ash)]">/100</span>
          </span>
          {change !== null && (
            <span className="cc-font-mono block text-[11px] cc-tabular text-[color:var(--cc-ink-soft)]">
              {signed(change)}
            </span>
          )}
        </span>
      ) : (
        <span className="cc-label-sm shrink-0 text-[color:var(--cc-ash)]">{finished ? "Done" : "Unfinished"}</span>
      )}
    </button>
  );
}

/* ── The panel ──────────────────────────────────────────────────────────── */

export default function InterviewHome({
  field,
  seniority,
  onOpenHistory,
  onStartPractice,
  onPracticeType,
}: InterviewHomeProps) {
  const { toast } = useToast();
  const { data: rows, isLoading, isError, refetch } = useInterviewSessions();
  const total = useSessionTotal();
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const audited = useRef(false);

  const { checkLimit, isLimited } = useRateLimit({
    key: "interview-dashboard",
    config: RATE_LIMITS.API,
    onLimitExceeded: () => {
      toast({
        title: "Too many requests",
        description: "Please wait a moment before trying again.",
        variant: "destructive",
      });
    },
  });

  const sessions = useMemo(() => rows ?? [], [rows]);
  const byType = useMemo(() => progressByType(sessions), [sessions]);
  const days = useMemo(() => lastSevenDays(sessions), [sessions]);
  const streak = useMemo(() => practiceStreak(sessions), [sessions]);
  const average = useMemo(() => overallAverage(sessions), [sessions]);
  const thisWeek = useMemo(() => sessionsThisWeek(sessions), [sessions]);
  const newestId = sessions[0]?.id;
  // The coach's read waits for finished sessions, and is current while the
  // newest finished one is the one it read.
  const finishedRows = useMemo(
    () =>
      sessions
        .filter((r) => r.status === "completed")
        .sort((a, b) => (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at)),
    [sessions],
  );

  // The weekly note the coach saved after the newest session, if there is one.
  const savedWeekly = useLatestSaved<WeeklyInsight & { basedOn?: string | null }>("weekly_insight", field);
  const weeklyAskedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!rows || audited.current) return;
    audited.current = true;
    auditLog({
      type: "DATA_ACCESS",
      action: "interview_dashboard_view",
      success: true,
      resource: "interview_sessions",
      details: { sessionsCount: rows.length },
    });
  }, [rows]);

  // The coach reads the learner's own records server-side (including the mix
  // of round types), so it only needs to know which job this is for.
  useEffect(() => {
    if (!newestId || savedWeekly.isFetching) return;
    const saved = savedWeekly.data?.payload;
    if (saved?.headline && (saved.basedOn === newestId || !COACH_AVAILABLE)) {
      setWeeklyInsight(saved);
      setLoadingInsight(false);
      return;
    }
    if (!COACH_AVAILABLE) return;
    // Once per newest session and job, even if the save didn't land.
    const asked = `${newestId}|${field ?? ""}|${seniority ?? ""}`;
    if (weeklyAskedFor.current === asked) return;
    weeklyAskedFor.current = asked;
    let cancelled = false;
    setLoadingInsight(true);
    interviewCoach
      .weeklyInsight({ field, seniority })
      .then((insight) => {
        if (!cancelled) setWeeklyInsight(insight);
      })
      .catch(() => {
        if (!cancelled) setWeeklyInsight(saved?.headline ? saved : null);
      })
      .finally(() => {
        if (!cancelled) setLoadingInsight(false);
      });
    return () => {
      cancelled = true;
      // Let the next run ask again (React runs effects twice in development).
      weeklyAskedFor.current = null;
    };
    // Keyed on the newest session, not the rows: re-ask when a session is
    // added, not on every background refetch that returns the same sessions.
    // (Not the count either: the history read is capped, so past the cap the
    // count stops changing.)
  }, [newestId, field, seniority, savedWeekly.isFetching, savedWeekly.data]);

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading your practice record">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[1.25rem] border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]"
            />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-[1.25rem] border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="cc-surface p-10 text-center">
        <p className="cc-kicker mb-2">Couldn't load your practice record</p>
        <p className="text-sm text-[color:var(--cc-ink-soft)]">Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => {
            if (checkLimit().allowed) void refetch();
          }}
          disabled={isLimited}
          className="cc-action cc-action--ghost mt-5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="cc-surface px-6 py-10 text-center md:px-10">
        <p className="cc-kicker">Your record</p>
        <p className="mt-3 cc-font-display text-2xl text-[color:var(--cc-ink)]">No sessions yet.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--cc-ink-soft)]">
          Pick a type above and start. Your scores show up here, by type, in the same colours.
        </p>
        <div className="mt-5 flex justify-center">
          <Legend />
        </div>
        <button type="button" onClick={onStartPractice} className="cc-action mt-6">
          Practise your first interview
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const lastPractised = sessions[0]?.created_at;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Sessions", value: String(Math.max(total ?? 0, sessions.length)), sub: `${byType.filter((p) => p.count).length} of 4 types tried` },
          { label: "Last 7 days", value: String(thisWeek), sub: thisWeek === 1 ? "session" : "sessions" },
          {
            label: "Average",
            value: average.average !== null ? String(average.average) : "—",
            hint: average.average !== null ? "/100" : undefined,
            sub: average.from ? `from ${average.from} finished` : "finish one to score",
          },
          { label: "Streak", value: `${streak.current}d`, sub: streak.longest > streak.current ? `best ${streak.longest}d` : "days in a row" },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => onOpenHistory()}
            className="cc-surface cc-lift p-5 text-left"
          >
            <p className="cc-label-sm text-[color:var(--cc-ash)]">{stat.label}</p>
            <p className="mt-1.5 cc-font-display text-2xl tracking-tight cc-tabular text-[color:var(--cc-ink)]">
              {stat.value}
              {stat.hint && <span className="ml-1 text-sm text-[color:var(--cc-ash)]">{stat.hint}</span>}
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--cc-ink-soft)]">{stat.sub}</p>
          </button>
        ))}
      </div>

      <section aria-labelledby="iv-by-type">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p id="iv-by-type" className="cc-kicker">
            By type
          </p>
          <p className="text-xs text-[color:var(--cc-ash)]">Latest score, and the change since your last one of the same type</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {byType.map((p) => (
            <TypeCell key={p.type} p={p} onPractice={() => onPracticeType(p.type)} />
          ))}
        </div>
      </section>

      <StarHabits />

      <CoachRead
        field={field}
        seniority={seniority}
        finishedCount={finishedRows.length}
        newestFinishedId={finishedRows[0]?.id ?? null}
        onPracticeType={onPracticeType}
      />

      {/* grid-cols-1 (minmax(0,1fr)) on small screens: an implicit auto
          column grows to the week chart's content and pushes off the screen. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="cc-surface min-w-0 p-5 lg:col-span-2" aria-labelledby="iv-week">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p id="iv-week" className="cc-kicker">
              Last 7 days
            </p>
            {lastPractised && (
              <p className="cc-label-sm text-[color:var(--cc-ash)]">Last practised {shortDate(lastPractised)}</p>
            )}
          </div>

          <WeekChart days={days} />
          <div className="mt-4">
            <Legend />
          </div>

          <div className="mb-2 mt-6 flex items-center justify-between">
            <p className="cc-field-label !mb-0">Recent sessions</p>
            <button
              type="button"
              onClick={() => onOpenHistory()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
            >
              All history <ArrowUpRight className="h-3 w-3" aria-hidden />
            </button>
          </div>
          <div className="divide-y divide-[color:var(--cc-hair)] overflow-hidden rounded-xl border border-[color:var(--cc-hair)]">
            {sessions.slice(0, 5).map((row) => (
              <RecentRow key={row.id} row={row} all={sessions} onOpen={() => onOpenHistory(row.id)} />
            ))}
          </div>
        </section>

        <section className="cc-tint cc-tone-wheat self-start p-5">
          <p className="cc-kicker">Coach's note</p>
          {loadingInsight ? (
            <div className="mt-3 space-y-2" aria-busy="true">
              <div className="h-5 w-2/3 animate-pulse bg-[color:var(--cc-cream-3)]" />
              <div className="h-4 w-full animate-pulse bg-[color:var(--cc-cream-3)]" />
            </div>
          ) : weeklyInsight?.headline ? (
            <div className="mt-3 space-y-3">
              <p className="cc-font-display text-lg leading-snug text-[color:var(--cc-ink)]">
                {weeklyInsight.headline}
              </p>
              {weeklyInsight.summary && (
                <p className="text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">{weeklyInsight.summary}</p>
              )}
              {(weeklyInsight.weeklyGoals ?? []).slice(0, 2).map((g, i) => (
                <p key={i} className="border-l-2 border-[color:var(--cc-ink)] pl-3 text-sm text-[color:var(--cc-ink-soft)]">
                  {g.goal}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--cc-ash)]">
              {COACH_AVAILABLE
                ? "No note this week. Keep practising and patterns will show up here."
                : "Coach is offline, so weekly notes are paused. History still works."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

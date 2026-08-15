/**
 * Interview Home — progress strip below practice setup.
 * Real DB queries only; weekly insight from MCP when connected.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRateLimit } from "@/hooks/useSecurity";
import { RATE_LIMITS } from "@/lib/security/rateLimiter";
import { auditLog } from "@/lib/security/auditLog";
import { interviewCoach, COACH_AVAILABLE, type WeeklyInsight } from "@/lib/interviewCoach";
import { normalizeScore100, sessionOverallScore } from "@/features/interview/lib/sessions";

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  totalQuestions: number;
  avgScore: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  weeklySessionCount: number;
}

interface RecentSession {
  id: string;
  field: string;
  seniority: string | null;
  score: number | null;
  questionsCount: number;
  createdAt: string;
  status: string;
}

interface WeeklyActivity {
  day: string;
  practiced: boolean;
  sessionCount: number;
}

const DEFAULT_STATS: DashboardStats = {
  totalSessions: 0,
  completedSessions: 0,
  totalQuestions: 0,
  avgScore: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPracticeDate: null,
  weeklySessionCount: 0,
};

interface InterviewHomeProps {
  onOpenHistory: (sessionId?: string) => void;
  onStartPractice: () => void;
}

export default function InterviewHome({ onOpenHistory, onStartPractice }: InterviewHomeProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([]);
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const { checkLimit, isLimited } = useRateLimit({
    key: "interview-dashboard",
    config: RATE_LIMITS.API,
    onLimitExceeded: () => {
      toast({
        title: "Too Many Requests",
        description: "Please wait before refreshing again.",
        variant: "destructive",
      });
    },
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const calculateStreak = (sessions: Array<{ created_at: string }>) => {
    if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const practiceDates = new Set(
      sessions.map((s) => {
        const date = new Date(s.created_at);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      }),
    );

    const sortedDates = Array.from(practiceDates).sort((a, b) => b - a);

    let currentStreak = 0;
    let checkDate = today.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (practiceDates.has(checkDate) || practiceDates.has(checkDate - oneDay)) {
      if (!practiceDates.has(checkDate)) checkDate -= oneDay;
      while (practiceDates.has(checkDate)) {
        currentStreak++;
        checkDate -= oneDay;
      }
    }

    let longestStreak = 0;
    let tempStreak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      if (sortedDates[i] - sortedDates[i + 1] === oneDay) tempStreak++;
      else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { currentStreak, longestStreak };
  };

  const calculateWeeklyActivity = (sessions: Array<{ created_at: string }>) => {
    const today = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const activity: WeeklyActivity[] = [];
    let weeklyCount = 0;

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const sessionsOnDay = sessions.filter((s) => {
        const sessionDate = new Date(s.created_at);
        return sessionDate >= date && sessionDate < nextDate;
      });

      const sessionCount = sessionsOnDay.length;
      weeklyCount += sessionCount;

      activity.push({
        day: dayNames[date.getDay()],
        practiced: sessionCount > 0,
        sessionCount,
      });
    }

    return { activity, count: weeklyCount };
  };

  const fetchDashboardData = useCallback(async () => {
    const rateLimitResult = checkLimit();
    if (!rateLimitResult.allowed) return;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError) throw new Error("Authentication error. Please sign in again.");
      if (!session?.user?.id) {
        navigate("/auth");
        return;
      }

      const userId = session.user.id;

      const { data: sessions, error: sessionsError } = await supabase
        .from("interview_sessions")
        .select(
          "id, field, seniority, questions, scores, final_evaluation, ai_insights, avg_score, status, created_at, updated_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (sessionsError) {
        throw new Error("Failed to load your interview data.");
      }

      const sessionsList = sessions || [];
      const completedSessions = sessionsList.filter((s) => s.status === "completed");

      const totalQuestions = sessionsList.reduce((acc, s) => {
        const questions = Array.isArray(s.questions) ? s.questions : [];
        return acc + questions.length;
      }, 0);

      const scores = completedSessions
        .map((s) => normalizeScore100(sessionOverallScore(s)))
        .filter((score): score is number => score !== null && score > 0);

      const avgScore =
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      const { currentStreak, longestStreak } = calculateStreak(sessionsList);
      const weeklyData = calculateWeeklyActivity(sessionsList);
      setWeeklyActivity(weeklyData.activity);

      const lastSession = sessionsList[0];
      const lastPracticeDate = lastSession
        ? new Date(lastSession.created_at).toLocaleDateString()
        : null;

      setStats({
        totalSessions: sessionsList.length,
        completedSessions: completedSessions.length,
        totalQuestions,
        avgScore,
        currentStreak,
        longestStreak,
        lastPracticeDate,
        weeklySessionCount: weeklyData.count,
      });

      setRecentSessions(
        sessionsList.slice(0, 5).map((s) => {
          const questions = Array.isArray(s.questions) ? s.questions : [];
          return {
            id: s.id,
            field: s.field || "Unknown",
            seniority: s.seniority || null,
            score: normalizeScore100(sessionOverallScore(s)),
            questionsCount: questions.length,
            createdAt: s.created_at,
            status: s.status || "in_progress",
          };
        }),
      );

      auditLog({
        type: "DATA_ACCESS",
        action: "interview_dashboard_view",
        success: true,
        resource: "interview_sessions",
        details: { sessionsCount: sessionsList.length },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
      toastRef.current({
        title: "Error Loading Dashboard",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [checkLimit, navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!COACH_AVAILABLE || loading) return;
    if (stats.totalSessions === 0) return;
    let cancelled = false;
    setLoadingInsight(true);
    interviewCoach
      .weeklyInsight({
        weekData: {
          sessionsCompleted: stats.completedSessions,
          questionsAnswered: stats.totalQuestions,
          avgScore: stats.avgScore,
          previousWeekAvgScore: 0,
          topSkills: [],
          weakSkills: [],
          streakDays: stats.currentStreak,
          totalPracticeMinutes: 0,
        },
      })
      .then((insight) => {
        if (!cancelled) setWeeklyInsight(insight);
      })
      .catch(() => {
        if (!cancelled) setWeeklyInsight(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingInsight(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    loading,
    stats.totalSessions,
    stats.completedSessions,
    stats.totalQuestions,
    stats.avgScore,
    stats.currentStreak,
  ]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[1.25rem] border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cc-surface p-10 text-center">
        <p className="cc-kicker mb-2">Couldn't load the record</p>
        <p className="text-sm text-[color:var(--cc-ink-soft)]">{error}</p>
        <button
          type="button"
          onClick={fetchDashboardData}
          disabled={isLimited}
          className="cc-action cc-action--ghost mt-5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    );
  }

  if (stats.totalSessions === 0) {
    return (
      <div className="cc-tint cc-tone-cobalt px-6 py-10 text-center md:px-10">
        <p className="cc-kicker">Your record</p>
        <p className="mt-3 cc-font-display text-2xl text-[color:var(--cc-ink)]">
          Quiet so far — your first debrief starts the story.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--cc-ink-soft)]">
          Pick a situation above and run a quick drill. History and coach notes will appear here.
        </p>
        <button type="button" onClick={onStartPractice} className="cc-action mt-6">
          Practice your first interview
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: "Sessions",
            value: String(stats.totalSessions),
            onClick: () => onOpenHistory(),
          },
          {
            label: "This week",
            value: String(stats.weeklySessionCount),
            onClick: () => onOpenHistory(),
          },
          {
            label: "Avg score",
            value: stats.avgScore ? `${stats.avgScore}` : "—",
            hint: stats.avgScore ? "/100" : undefined,
            onClick: () => onOpenHistory(),
          },
          {
            label: "Streak",
            value: `${stats.currentStreak}d`,
            onClick: onStartPractice,
          },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            className="cc-surface cc-lift p-5 text-left"
          >
            <p className="cc-label-sm text-[color:var(--cc-ash)]">{stat.label}</p>
            <p className="mt-1.5 cc-font-display text-2xl tracking-tight cc-tabular text-[color:var(--cc-ink)]">
              {stat.value}
              {stat.hint && (
                <span className="ml-1 text-sm text-[color:var(--cc-ash)]">{stat.hint}</span>
              )}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="cc-surface p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="cc-kicker">This week</p>
            <p className="cc-label-sm text-[color:var(--cc-ash)]">
              {stats.lastPracticeDate ? `Last ${stats.lastPracticeDate}` : ""}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-7 gap-1.5">
            {weeklyActivity.map((day, i) => (
              <div key={i} className="text-center">
                <div
                  className={[
                    "aspect-square w-full rounded-md border",
                    day.practiced
                      ? day.sessionCount > 1
                        ? "border-[color:var(--cc-rust)] bg-[color:var(--cc-rust)]"
                        : "border-[color:var(--cc-rust)] bg-[color:var(--cc-rust-soft)]"
                      : "border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]",
                  ].join(" ")}
                  title={day.practiced ? `${day.sessionCount} session(s)` : "No practice"}
                />
                <span className="cc-label-sm text-[color:var(--cc-ash)]">{day.day}</span>
              </div>
            ))}
          </div>

          <p className="cc-field-label mb-2">Recent sessions</p>
          <div className="divide-y divide-[color:var(--cc-hair)] overflow-hidden rounded-xl border border-[color:var(--cc-hair)]">
            {recentSessions.slice(0, 4).map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onOpenHistory(session.id)}
                className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left transition-colors hover:bg-[color:var(--cc-cream-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[color:var(--cc-ink)]">
                    {session.field}
                    {session.seniority ? ` · ${session.seniority}` : ""}
                  </p>
                  <p className="cc-label-sm mt-0.5 text-[color:var(--cc-ash)]">
                    {session.questionsCount} q · {formatDate(session.createdAt)}
                  </p>
                </div>
                {session.status === "completed" && session.score !== null ? (
                  <span className="cc-font-mono shrink-0 text-sm tabular-nums text-[color:var(--cc-ink)]">
                    {session.score}
                    <span className="text-xs text-[color:var(--cc-ash)]">/100</span>
                  </span>
                ) : session.status === "completed" ? (
                  <span className="cc-label-sm shrink-0 text-[color:var(--cc-signal-deep)]">done</span>
                ) : (
                  <span className="cc-label-sm shrink-0 text-[color:var(--cc-wheat-deep)]">open</span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="cc-tint cc-tone-wheat p-5">
          <p className="cc-kicker">Coach's note</p>
          {loadingInsight ? (
            <div className="mt-3 space-y-2">
              <div className="h-5 w-2/3 animate-pulse bg-[color:var(--cc-cream-3)]" />
              <div className="h-4 w-full animate-pulse bg-[color:var(--cc-cream-3)]" />
            </div>
          ) : weeklyInsight?.headline ? (
            <div className="mt-3 space-y-3">
              <p className="cc-font-display text-lg leading-snug text-[color:var(--cc-ink)]">
                {weeklyInsight.headline}
              </p>
              {weeklyInsight.summary && (
                <p className="text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
                  {weeklyInsight.summary}
                </p>
              )}
              {(weeklyInsight.weeklyGoals ?? []).slice(0, 2).map((g, i) => (
                <p
                  key={i}
                  className="border-l-2 border-[color:var(--cc-rust)] pl-3 text-sm text-[color:var(--cc-ink-soft)]"
                >
                  {g.goal}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--cc-ash)]">
              {COACH_AVAILABLE
                ? "No note this week — keep practicing and patterns will show up here."
                : "Coach is offline, so weekly notes are paused. History still works."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Interview overview — the record of your practice. Real database queries
 * only (RLS-scoped); the weekly insight comes from the MCP when connected.
 * Rendered inside the Interview Prep hub.
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
import { sessionOverallScore } from "@/features/interview/lib/sessions";
import { gsap } from "gsap";

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  totalQuestions: number;
  avgScore: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  weeklySessionCount: number;
  weeklyGoal: number;
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
  weeklyGoal: 5,
};

export default function InterviewDashboard() {
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
        console.error("Sessions fetch error:", sessionsError);
        throw new Error("Failed to load your interview data.");
      }

      const sessionsList = sessions || [];
      const completedSessions = sessionsList.filter((s) => s.status === "completed");

      const totalQuestions = sessionsList.reduce((acc, s) => {
        const questions = Array.isArray(s.questions) ? s.questions : [];
        return acc + questions.length;
      }, 0);

      const scores = completedSessions
        .map(sessionOverallScore)
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
        weeklyGoal: 5,
      });

      setRecentSessions(
        sessionsList.slice(0, 5).map((s) => {
          const questions = Array.isArray(s.questions) ? s.questions : [];
          return {
            id: s.id,
            field: s.field || "Unknown",
            seniority: s.seniority || null,
            score: sessionOverallScore(s),
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
      console.error("Dashboard fetch error:", err);
      toastRef.current({
        title: "Error Loading Dashboard",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [checkLimit, navigate]);

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
  }, [loading, stats.totalSessions, stats.completedSessions, stats.totalQuestions, stats.avgScore, stats.currentStreak]);

  useEffect(() => {
    if (loading || error || !rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        rootRef.current!.children,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: "power2.out" },
      );
    }, rootRef);
    return () => ctx.revert();
  }, [loading, error]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const weeklyProgress =
    stats.weeklyGoal > 0 ? Math.min((stats.weeklySessionCount / stats.weeklyGoal) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-px md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]" />
          ))}
        </div>
        <div className="h-72 animate-pulse border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-10 text-center">
        <p className="cc-label mb-2 text-[color:var(--cc-rust)]">Couldn't load the record</p>
        <p className="text-sm text-[color:var(--cc-ink-soft)]">{error}</p>
        <button onClick={fetchDashboardData} disabled={isLimited} className="cc-btn cc-btn-ghost mt-5">
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-6">
      {/* Top line + CTA */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="cc-label-sm text-[color:var(--cc-ash)]">
            {stats.lastPracticeDate
              ? `Last practice ${stats.lastPracticeDate}`
              : "No sessions on record yet"}
            {stats.currentStreak > 0 && ` · ${stats.currentStreak}-day streak`}
          </p>
        </div>
        <button
          onClick={() => navigate("/interview-prep?tab=practice")}
          className="cc-btn cc-btn-primary"
        >
          Sit an interview
          <ArrowRight className="cc-arrow-right h-3.5 w-3.5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-hair-strong)] md:grid-cols-4">
        {[
          { label: "Sessions", value: String(stats.totalSessions) },
          { label: "Questions answered", value: String(stats.totalQuestions) },
          { label: "Average score", value: stats.avgScore ? `${stats.avgScore}%` : "—" },
          { label: "Current streak", value: `${stats.currentStreak}d` },
        ].map((stat) => (
          <div key={stat.label} className="bg-[color:var(--cc-cream)] p-5">
            <p className="cc-font-mono text-2xl tabular-nums text-[color:var(--cc-ink)]">
              {stat.value}
            </p>
            <p className="cc-label-sm mt-1 text-[color:var(--cc-ash)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Week + insight */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="cc-label text-[color:var(--cc-ink)]">This week</p>
            <p className="cc-label-sm text-[color:var(--cc-ash)]">
              {stats.weeklySessionCount}/{stats.weeklyGoal} sessions
            </p>
          </div>

          <div className="mb-1 h-1 w-full bg-[color:var(--cc-cream-3)]">
            <div
              className="h-full bg-[color:var(--cc-rust)] transition-all"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
          <p className="mb-5 text-xs text-[color:var(--cc-ash)]">
            {weeklyProgress >= 100
              ? "Weekly goal met."
              : `${stats.weeklyGoal - stats.weeklySessionCount} more to hit your goal.`}
          </p>

          <div className="mb-6 grid grid-cols-7 gap-1.5">
            {weeklyActivity.map((day, i) => (
              <div key={i} className="text-center">
                <div
                  className={[
                    "aspect-square w-full border",
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

          <p className="cc-label-sm mb-2 text-[color:var(--cc-ash)]">Recent sessions</p>
          {recentSessions.length > 0 ? (
            <div className="divide-y divide-[color:var(--cc-hair)] border-t border-[color:var(--cc-hair)]">
              {recentSessions.slice(0, 4).map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate("/interview-prep?tab=history")}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-[color:var(--cc-cream-2)]"
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
                      {session.score}/100
                    </span>
                  ) : session.status === "completed" ? (
                    <span className="cc-label-sm shrink-0 text-[color:var(--cc-signal-deep)]">done</span>
                  ) : (
                    <span className="cc-label-sm shrink-0 text-[color:var(--cc-wheat-deep)]">open</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-[color:var(--cc-ash)]">
              Nothing on the record yet — your first session will show up here.
            </p>
          )}
        </section>

        {/* Coach's note (real MCP data only) */}
        <section className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-5">
          <p className="cc-label mb-3 text-[color:var(--cc-ink)]">Coach's note</p>
          {loadingInsight ? (
            <div className="space-y-2">
              <div className="h-5 w-2/3 animate-pulse bg-[color:var(--cc-cream-3)]" />
              <div className="h-4 w-full animate-pulse bg-[color:var(--cc-cream-3)]" />
            </div>
          ) : weeklyInsight?.headline ? (
            <div className="space-y-3">
              <p className="cc-font-display text-lg leading-snug text-[color:var(--cc-ink)]">
                {weeklyInsight.headline}
              </p>
              {weeklyInsight.summary && (
                <p className="text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
                  {weeklyInsight.summary}
                </p>
              )}
              {(weeklyInsight.weeklyGoals ?? []).slice(0, 2).map((g, i) => (
                <p key={i} className="border-l-2 border-[color:var(--cc-rust)] pl-3 text-sm text-[color:var(--cc-ink-soft)]">
                  {g.goal}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[color:var(--cc-ash)]">
              {stats.totalSessions === 0
                ? "Sit your first interview and the coach will start tracking patterns in how you answer."
                : "No note this week."}
            </p>
          )}
        </section>
      </div>

      {/* Milestones */}
      <div className="grid grid-cols-2 gap-px border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-hair-strong)] md:grid-cols-4">
        {[
          {
            name: "First session",
            achieved: stats.totalSessions > 0,
            progress: stats.totalSessions > 0 ? 100 : 0,
          },
          {
            name: "3-day streak",
            achieved: stats.longestStreak >= 3,
            progress: Math.min((stats.currentStreak / 3) * 100, 100),
          },
          {
            name: "70% average",
            achieved: stats.avgScore >= 70,
            progress: Math.min((stats.avgScore / 70) * 100, 100),
          },
          {
            name: "7-day streak",
            achieved: stats.longestStreak >= 7,
            progress: Math.min((stats.longestStreak / 7) * 100, 100),
          },
        ].map((m) => (
          <div key={m.name} className="bg-[color:var(--cc-cream)] p-4">
            <p
              className={[
                "cc-label-sm",
                m.achieved ? "text-[color:var(--cc-signal-deep)]" : "text-[color:var(--cc-ash)]",
              ].join(" ")}
            >
              {m.achieved ? "achieved" : "open"}
            </p>
            <p className="mt-1 text-sm font-medium text-[color:var(--cc-ink)]">{m.name}</p>
            <div className="mt-2 h-0.5 w-full bg-[color:var(--cc-cream-3)]">
              <div
                className={[
                  "h-full",
                  m.achieved ? "bg-[color:var(--cc-signal)]" : "bg-[color:var(--cc-rust)]",
                ].join(" ")}
                style={{ width: `${m.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

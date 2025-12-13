/**
 * Interview Dashboard Component
 * Production-ready with real database queries and security measures
 * No mock data - all data comes from authenticated database queries
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRateLimit } from "@/hooks/useSecurity";
import { RATE_LIMITS } from "@/lib/security/rateLimiter";
import { auditLog } from "@/lib/security/auditLog";
import { gsap } from "gsap";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Flame,
  Calendar,
  ChevronRight,
  Play,
  BarChart3,
  Sparkles,
  BookOpen,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Trophy,
  Star,
  RefreshCw,
  AlertCircle,
  Award,
} from "lucide-react";

// ============================================
// TYPE DEFINITIONS
// ============================================

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

// Default stats to avoid undefined errors
const DEFAULT_STATS: DashboardStats = {
  totalSessions: 0,
  completedSessions: 0,
  totalQuestions: 0,
  avgScore: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPracticeDate: null,
  weeklySessionCount: 0,
  weeklyGoal: 5, // Default weekly goal
};

export default function InterviewDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([]);
  
  // Rate limiting for data fetching
  const { checkLimit, isLimited } = useRateLimit({
    key: 'interview-dashboard',
    config: RATE_LIMITS.API,
    onLimitExceeded: () => {
      toast({
        title: "Too Many Requests",
        description: "Please wait before refreshing again.",
        variant: "destructive",
      });
    },
  });

  // GSAP refs
  const statsCardsRef = useRef<HTMLDivElement[]>([]);
  const progressCardRef = useRef<HTMLDivElement>(null);
  const contentCardRef = useRef<HTMLDivElement>(null);

  // ============================================
  // DATA FETCHING
  // ============================================
  
  const fetchDashboardData = useCallback(async () => {
    // Check rate limit before fetching
    const rateLimitResult = checkLimit();
    if (!rateLimitResult.allowed) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get authenticated session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        throw new Error("Authentication error. Please sign in again.");
      }
      
      if (!session?.user?.id) {
        navigate("/auth");
        return;
      }

      const userId = session.user.id;

      // Fetch interview sessions with RLS protection
      const { data: sessions, error: sessionsError } = await supabase
        .from("interview_sessions")
        .select("id, field, seniority, questions, scores, final_evaluation, status, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50); // Limit for performance

      if (sessionsError) {
        console.error("Sessions fetch error:", sessionsError);
        throw new Error("Failed to load your interview data.");
      }

      // Process sessions data
      const sessionsList = sessions || [];
      const completedSessions = sessionsList.filter(s => s.status === "completed");
      
      // Calculate total questions answered
      const totalQuestions = sessionsList.reduce((acc, s) => {
        const questions = Array.isArray(s.questions) ? s.questions : [];
        return acc + questions.length;
      }, 0);

      // Calculate average score from completed sessions
      const scores = completedSessions
        .filter(s => s.final_evaluation && typeof s.final_evaluation === 'object')
        .map(s => {
          const evaluation = s.final_evaluation as Record<string, unknown>;
          const score = evaluation?.overallScore;
          return typeof score === 'number' ? score : 0;
        })
        .filter(score => score > 0);
      
      const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0;

      // Calculate streak
      const { currentStreak, longestStreak } = calculateStreak(sessionsList);

      // Calculate weekly activity
      const weeklyData = calculateWeeklyActivity(sessionsList);
      setWeeklyActivity(weeklyData.activity);

      // Get last practice date
      const lastSession = sessionsList[0];
      const lastPracticeDate = lastSession 
        ? new Date(lastSession.created_at).toLocaleDateString() 
        : null;

      // Update stats
      setStats({
        totalSessions: sessionsList.length,
        completedSessions: completedSessions.length,
        totalQuestions,
        avgScore,
        currentStreak,
        longestStreak,
        lastPracticeDate,
        weeklySessionCount: weeklyData.count,
        weeklyGoal: 5, // Could be fetched from user_preferences
      });

      // Map recent sessions
      setRecentSessions(sessionsList.slice(0, 5).map(s => {
        const evaluation = s.final_evaluation as Record<string, unknown> | null;
        const score = evaluation?.overallScore;
        const questions = Array.isArray(s.questions) ? s.questions : [];
        
        return {
          id: s.id,
          field: s.field || "Unknown",
          seniority: s.seniority || null,
          score: typeof score === 'number' ? score : null,
          questionsCount: questions.length,
          createdAt: s.created_at,
          status: s.status || "in_progress",
        };
      }));

      // Log successful dashboard load
      auditLog({
        type: 'DATA_ACCESS',
        action: 'interview_dashboard_view',
        success: true,
        resource: 'interview_sessions',
        details: { sessionsCount: sessionsList.length },
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
      console.error("Dashboard fetch error:", err);
      
      toast({
        title: "Error Loading Dashboard",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [checkLimit, navigate, toast]);

  // ============================================
  // STREAK CALCULATION
  // ============================================
  
  const calculateStreak = (sessions: Array<{ created_at: string }>) => {
    if (sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique practice dates
    const practiceDates = new Set(
      sessions.map(s => {
        const date = new Date(s.created_at);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    const sortedDates = Array.from(practiceDates).sort((a, b) => b - a);
    
    // Calculate current streak
    let currentStreak = 0;
    let checkDate = today.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    // Check if practiced today or yesterday to start streak
    if (practiceDates.has(checkDate) || practiceDates.has(checkDate - oneDay)) {
      if (!practiceDates.has(checkDate)) {
        checkDate -= oneDay;
      }
      
      while (practiceDates.has(checkDate)) {
        currentStreak++;
        checkDate -= oneDay;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < sortedDates.length - 1; i++) {
      if (sortedDates[i] - sortedDates[i + 1] === oneDay) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { currentStreak, longestStreak };
  };

  // ============================================
  // WEEKLY ACTIVITY CALCULATION
  // ============================================
  
  const calculateWeeklyActivity = (sessions: Array<{ created_at: string }>) => {
    const today = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const activity: WeeklyActivity[] = [];
    let weeklyCount = 0;

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const sessionsOnDay = sessions.filter(s => {
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

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // GSAP animations
  useEffect(() => {
    if (loading || error) return;

    const ctx = gsap.context(() => {
      // Stats cards stagger animation
      if (statsCardsRef.current.length > 0) {
        gsap.fromTo(
          statsCardsRef.current.filter(Boolean),
          { y: 30, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "power3.out" }
        );
      }

      // Progress card
      if (progressCardRef.current) {
        gsap.fromTo(
          progressCardRef.current,
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6, ease: "power2.out", delay: 0.3 }
        );
      }

      // Content card
      if (contentCardRef.current) {
        gsap.fromTo(
          contentCardRef.current,
          { x: 30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6, ease: "power2.out", delay: 0.3 }
        );
      }
    });

    return () => ctx.revert();
  }, [loading, error]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-500/10";
    if (score >= 60) return "bg-amber-500/10";
    return "bg-red-500/10";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const weeklyProgress = stats.weeklyGoal > 0 
    ? Math.min((stats.weeklySessionCount / stats.weeklyGoal) * 100, 100) 
    : 0;

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unable to Load Dashboard</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchDashboardData} disabled={isLimited}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Start */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Your Interview Journey
          </h2>
          <p className="text-muted-foreground">
            {stats.currentStreak > 0 
              ? `🔥 ${stats.currentStreak} day streak! Keep it going!`
              : "Start practicing to build your streak!"}
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={() => navigate("/interview-prep?tab=setup")}
          className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:shadow-xl transition-all"
        >
          <Play className="w-5 h-5" />
          Start Practice Session
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: "Total Sessions", 
            value: stats.totalSessions, 
            icon: Brain, 
            color: "text-blue-500",
            bgColor: "bg-blue-500/10"
          },
          { 
            label: "Questions Answered", 
            value: stats.totalQuestions, 
            icon: Target, 
            color: "text-purple-500",
            bgColor: "bg-purple-500/10"
          },
          { 
            label: "Average Score", 
            value: `${stats.avgScore}%`, 
            icon: BarChart3, 
            color: getScoreColor(stats.avgScore),
            bgColor: stats.avgScore >= 70 ? "bg-green-500/10" : "bg-amber-500/10"
          },
          { 
            label: "Current Streak", 
            value: `${stats.currentStreak} days`, 
            icon: Flame, 
            color: "text-orange-500",
            bgColor: "bg-orange-500/10"
          },
        ].map((stat, i) => (
          <Card 
            key={stat.label}
            ref={(el) => { if (el) statsCardsRef.current[i] = el; }}
            className="p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Progress */}
        <Card ref={progressCardRef} className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Weekly Progress
            </h3>
            {stats.weeklySessionCount > 0 && (
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                {stats.weeklySessionCount} sessions
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Practice Goal ({stats.weeklySessionCount}/{stats.weeklyGoal})</span>
                <span className="font-medium">{Math.round(weeklyProgress)}%</span>
              </div>
              <Progress value={weeklyProgress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {weeklyProgress >= 100 
                  ? "🎉 Weekly goal achieved!" 
                  : `${stats.weeklyGoal - stats.weeklySessionCount} more sessions to reach your goal`}
              </p>
            </div>

            {/* Weekly Activity Heatmap */}
            <div className="grid grid-cols-7 gap-1 mt-4">
              {weeklyActivity.map((day, i) => (
                <div key={i} className="text-center">
                  <div 
                    className={`w-full aspect-square rounded-md transition-colors ${
                      day.practiced 
                        ? day.sessionCount > 1 
                          ? "bg-primary" 
                          : "bg-primary/70"
                        : "bg-muted"
                    }`}
                    title={day.practiced ? `${day.sessionCount} session(s)` : "No practice"}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {day.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Recent Sessions</h4>
            <div className="space-y-2">
              {recentSessions.length > 0 ? recentSessions.slice(0, 3).map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => navigate(`/interview-prep?session=${session.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{session.field}</p>
                      <p className="text-xs text-muted-foreground">{session.questionsCount} questions • {formatDate(session.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.status === "completed" && session.score !== null ? (
                      <Badge className={session.score >= 70 ? "bg-green-500" : "bg-amber-500"}>
                        {session.score}%
                      </Badge>
                    ) : session.status === "completed" ? (
                      <Badge variant="secondary">Completed</Badge>
                    ) : (
                      <Badge variant="outline">In Progress</Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No sessions yet. Start your first practice!</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Quick Tips & Next Steps */}
        <Card ref={contentCardRef} className="p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Tips
          </h3>

          <div className="space-y-4">
            {/* Dynamic tips based on user data */}
            {stats.totalSessions === 0 && (
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Start Your First Practice</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Begin with a mock interview to see where you stand.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.totalSessions > 0 && stats.avgScore < 70 && (
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Focus on Fundamentals</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your average score is {stats.avgScore}%. Practice more to improve.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.currentStreak === 0 && stats.totalSessions > 0 && (
              <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="flex items-start gap-3">
                  <Flame className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Build Your Streak</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Practice daily to build momentum and improve faster.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.currentStreak >= 3 && (
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Great Progress!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You're on a {stats.currentStreak}-day streak. Keep it up!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.avgScore >= 80 && (
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Excellent Performance!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your {stats.avgScore}% average shows strong interview skills.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button 
            variant="outline" 
            className="w-full mt-4 gap-2" 
            size="sm"
            onClick={() => navigate("/interview-prep?tab=setup")}
          >
            <Play className="w-4 h-4" />
            Start New Practice
          </Button>
        </Card>
      </div>

      {/* Milestones Preview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Milestones
          </h3>
          <p className="text-xs text-muted-foreground">
            {stats.longestStreak > 0 && `Best streak: ${stats.longestStreak} days`}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { 
              name: "First Steps", 
              description: "Complete your first session",
              icon: Play, 
              progress: stats.totalSessions > 0 ? 100 : 0, 
              achieved: stats.totalSessions > 0 
            },
            { 
              name: "3-Day Streak", 
              description: "Practice 3 days in a row",
              icon: Flame, 
              progress: Math.min((stats.currentStreak / 3) * 100, 100), 
              achieved: stats.longestStreak >= 3 
            },
            { 
              name: "Rising Star", 
              description: "Achieve 70% average score",
              icon: Star, 
              progress: Math.min((stats.avgScore / 70) * 100, 100), 
              achieved: stats.avgScore >= 70 
            },
            { 
              name: "Week Warrior", 
              description: "Practice 7 days in a row",
              icon: Calendar, 
              progress: Math.min((stats.longestStreak / 7) * 100, 100), 
              achieved: stats.longestStreak >= 7 
            },
          ].map((milestone) => (
            <div 
              key={milestone.name}
              className={`p-4 rounded-xl border-2 transition-all ${
                milestone.achieved 
                  ? "border-primary bg-primary/5" 
                  : "border-dashed border-muted-foreground/30"
              }`}
              title={milestone.description}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                milestone.achieved ? "bg-primary text-white" : "bg-muted"
              }`}>
                <milestone.icon className="w-5 h-5" />
              </div>
              <p className="font-medium text-sm">{milestone.name}</p>
              {!milestone.achieved && milestone.progress > 0 && (
                <Progress value={milestone.progress} className="h-1 mt-2" />
              )}
              {milestone.achieved && (
                <Badge className="mt-2 bg-green-500">Achieved!</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

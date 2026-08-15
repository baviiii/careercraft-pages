/* ───────────────────────────────────────────────────────────
   CareerCraft — Dashboard (Atelier)
   Editorial command center: one hero, one primary move,
   supporting paths, living color. Data wiring unchanged.
   ─────────────────────────────────────────────────────────── */

import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  BarChart3,
  Sparkles,
  Mail,
  Briefcase,
  LogOut,
  Brain,
  Newspaper,
  MessageSquareText,
  TrendingUp,
  Search,
  Zap,
  ArrowUpRight,
  ArrowRight,
  Menu,
  Bell,
  CheckCircle2,
  FileText,
  Compass,
} from "lucide-react";
import { CraftSidebar, CRAFT_SIDEBAR_LINKS } from "@/components/craft/CraftSidebar";
import { DispatchFeed } from "@/features/dispatch/DispatchFeed";
import { OnboardingBanner } from "@/features/onboarding/OnboardingBanner";
import { usePersonalization } from "@/hooks/usePersonalization";
import { clearAccent } from "@/lib/personaTheme";

interface ResumeStats {
  totalResumes: number;
  totalCoverLetters: number;
  totalApplications: number;
  recentActivity: { type: string; name: string; date: string }[];
}

interface Dispatch {
  id: string;
  kind: "insight" | "success" | "warning" | "info";
  title: string;
  body: string;
  when: Date;
  read: boolean;
  actionLabel?: string;
  actionPath?: string;
}

type Tone = "cobalt" | "sage" | "wheat" | "ink";

const ease = [0.2, 0.8, 0.2, 1] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ResumeStats>({
    totalResumes: 0,
    totalCoverLetters: 0,
    totalApplications: 0,
    recentActivity: [],
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);

  const {
    profile: perso,
    loading: persoLoading,
    hasPersonalizationData: personalized,
  } = usePersonalization();
  const persona = perso.aiPersona;
  const targetRole = perso.targetJobTitles[0] || perso.currentJobTitle || null;

  useEffect(() => {
    if (persoLoading) return;
    const now = new Date();
    const next: Dispatch[] = [];
    if (personalized) {
      if (persona?.narrative) {
        next.push({
          id: "persona",
          kind: "insight",
          title: `Our read: ${persona.archetype}`,
          body: persona.narrative,
          when: now,
          read: false,
          actionLabel: "Review your profile",
          actionPath: "/settings",
        });
      }
      if (perso.jobChangeTimeline === "immediately" || perso.jobChangeTimeline === "1-3_months") {
        next.push({
          id: "tracker-nudge",
          kind: "info",
          title: "Keep applications moving",
          body: `You're targeting a move ${
            perso.jobChangeTimeline === "immediately" ? "now" : "within 1–3 months"
          } — log each application so nothing slips.`,
          when: now,
          read: false,
          actionLabel: "Open tracker",
          actionPath: "/tracker",
        });
      }
    } else {
      next.push({
        id: "onboard",
        kind: "insight",
        title: "Personalise CareerCraft",
        body: "Two minutes of questions — jobs, news and interview prep tune to your profile.",
        when: now,
        read: false,
        actionLabel: "Start onboarding",
        actionPath: "/onboarding?redo=1",
      });
    }
    setDispatches(next);
  }, [persoLoading, personalized, persona, perso.jobChangeTimeline]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) navigate("/auth");
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.user) return;
      try {
        const [resumesRes, coverLettersRes, applicationsRes] = await Promise.all([
          supabase
            .from("resumes")
            .select("id, name, created_at")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("cover_letters")
            .select("id, created_at")
            .eq("user_id", session.user.id),
          supabase
            .from("job_applications")
            .select("id")
            .eq("user_id", session.user.id),
        ]);

        const resumes = resumesRes.data || [];
        const coverLetters = coverLettersRes.data || [];
        const applications = applicationsRes.data || [];

        setStats({
          totalResumes: resumes.length,
          totalCoverLetters: coverLetters.length,
          totalApplications: applications.length,
          recentActivity: resumes.slice(0, 4).map((r) => ({
            type: "resume",
            name: r.name,
            date: new Date(r.created_at).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
            }),
          })),
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, [session]);

  const handleSignOut = useCallback(async () => {
    try {
      localStorage.removeItem("horus_session_token");
      clearAccent();
      await supabase.auth.signOut({ scope: "global" });
      setSession(null);
      setTimeout(() => navigate("/auth", { replace: true }), 100);
    } catch (error) {
      console.error("Sign out error:", error);
      navigate("/auth", { replace: true });
    }
  }, [navigate]);

  const markDispatchRead = useCallback((id: string) => {
    setDispatches((prev) => prev.map((d) => (d.id === id ? { ...d, read: true } : d)));
  }, []);

  const clearDispatches = useCallback(() => setDispatches([]), []);

  const fullName =
    perso.fullName ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "friend";
  const userName = fullName.split(" ")[0];

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const todayStamp = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    []
  );

  const heroCopy = useMemo(() => {
    if (personalized && targetRole) {
      return {
        eyebrow: persona?.archetype || "Your workspace",
        title: (
          <>
            Ready for your next{" "}
            <em className="cc-italic-wonk not-italic text-[color:var(--cc-rust)]">{targetRole}</em>{" "}
            move.
          </>
        ),
        body: "Profile tuned. Build the résumé, chase the roles, keep the pipeline honest.",
        primary: {
          label: stats.totalResumes > 0 ? "Sharpen résumé" : "Build résumé",
          path: "/builder",
        },
        secondary: { label: `Find ${targetRole} roles`, path: "/au-jobs" },
      };
    }
    if (stats.totalResumes > 0) {
      return {
        eyebrow: "Your workspace",
        title: (
          <>
            {greeting},{" "}
            <em className="cc-italic-wonk not-italic text-[color:var(--cc-rust)]">{userName}</em>.
          </>
        ),
        body: "Pick up where you left off — résumés, applications, and market signals in one calm place.",
        primary: { label: "Create new résumé", path: "/builder" },
        secondary: { label: "Open job tracker", path: "/tracker" },
      };
    }
    return {
      eyebrow: "Welcome to CareerCraft",
      title: (
        <>
          Start with one{" "}
          <em className="cc-italic-wonk not-italic text-[color:var(--cc-rust)]">strong résumé</em>.
        </>
      ),
      body: "Everything else — ATS, cover letters, interviews — builds on that first draft.",
      primary: { label: "Create my first résumé", path: "/builder" },
      secondary: { label: "Browse career insights", path: "/intelligence" },
    };
  }, [personalized, targetRole, persona, stats.totalResumes, greeting, userName]);

  const featuredMoves = useMemo(() => {
    const role = targetRole || persona?.function || "your field";
    const loc = perso.preferredLocations[0] || perso.location || "Australia";
    if (personalized) {
      return [
        {
          tone: "cobalt" as Tone,
          icon: Zap,
          kicker: "Do this next",
          title: stats.totalResumes > 0 ? "Polish your résumé" : `Craft a ${role} résumé`,
          body:
            stats.totalResumes > 0
              ? "Tailor bullets and layout for the roles you're chasing."
              : "Start from a template — your profile fills most of it in.",
          path: "/builder",
          cta: "Open builder",
        },
        {
          tone: "sage" as Tone,
          icon: Search,
          kicker: "Jobs",
          title: `${role} openings`,
          body: `Live listings near ${loc}.`,
          path: "/au-jobs",
          cta: "Browse",
        },
        {
          tone: "wheat" as Tone,
          icon: Briefcase,
          kicker: "Pipeline",
          title: "Job tracker",
          body: `${stats.totalApplications} in motion.`,
          path: "/tracker",
          cta: "Open",
        },
        {
          tone: "ink" as Tone,
          icon: MessageSquareText,
          kicker: "Practice",
          title: "Interview prep",
          body: `Rehearse ${persona?.function || "role"} questions.`,
          path: "/interview-prep",
          cta: "Practice",
        },
      ];
    }
    return [
      {
        tone: "cobalt" as Tone,
        icon: Zap,
        kicker: "Do this next",
        title: "Build your first résumé",
        body: "Templates, guided editing, and a clean PDF export.",
        path: "/builder",
        cta: "Start building",
      },
      {
        tone: "sage" as Tone,
        icon: BarChart3,
        kicker: "Score",
        title: "ATS analysis",
        body: "See how tracking systems read your résumé.",
        path: "/analysis",
        cta: "Analyse",
      },
      {
        tone: "wheat" as Tone,
        icon: TrendingUp,
        kicker: "Market",
        title: "Career insights",
        body: "Skills, funding and growth signals for SA.",
        path: "/intelligence",
        cta: "Explore",
      },
      {
        tone: "ink" as Tone,
        icon: Brain,
        kicker: "Coach",
        title: "Career coach",
        body: "Ask anything — grounded in local market data.",
        path: "/career-coach",
        cta: "Ask",
      },
    ];
  }, [
    personalized,
    targetRole,
    persona,
    perso.preferredLocations,
    perso.location,
    stats.totalResumes,
    stats.totalApplications,
  ]);

  const toolGrid = useMemo(
    () => [
      { icon: Upload, title: "My Résumés", path: "/my-resumes", tone: "cobalt" as Tone, meta: stats.totalResumes ? `${stats.totalResumes}` : undefined },
      { icon: Sparkles, title: "Bullet Rewrite", path: "/rewrite", tone: "cobalt" as Tone },
      { icon: Mail, title: "Cover Letters", path: "/cover-letter", tone: "wheat" as Tone, meta: stats.totalCoverLetters ? `${stats.totalCoverLetters}` : undefined },
      { icon: Newspaper, title: "Market News", path: "/job-market-news", tone: "sage" as Tone },
      { icon: Search, title: "Browse Jobs", path: "/au-jobs", tone: "sage" as Tone },
    ],
    [stats.totalResumes, stats.totalCoverLetters]
  );

  if (loading) {
    return (
      <div className="cc-root cc-font-sans flex min-h-screen items-center justify-center bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-[color:var(--cc-hair-strong)]" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[color:var(--cc-rust)]" />
          </div>
          <p className="cc-font-editorial text-lg text-[color:var(--cc-ink-soft)]">Opening your atelier…</p>
        </div>
      </div>
    );
  }

  const unread = dispatches.filter((d) => !d.read).length;
  const featured = featuredMoves[0];
  const sideMoves = featuredMoves.slice(1);
  const lastResume = stats.recentActivity[0];

  return (
    <main className="cc-root cc-font-sans min-h-screen overflow-x-hidden bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] antialiased">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -right-20 -top-28 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(42,82,204,0.08), transparent 70%)" }}
        />
        <div
          className="absolute left-[-6%] top-[42%] h-[22rem] w-[22rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(63,122,92,0.06), transparent 70%)" }}
        />
        <div className="cc-grain absolute inset-0 opacity-[0.025]" />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-[color:var(--cc-ink)]/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <CraftSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        links={CRAFT_SIDEBAR_LINKS}
        currentPath={location.pathname}
        userName={userName}
        userEmail={session?.user?.email || ""}
        onSignOut={handleSignOut}
        navigate={navigate}
      />

      <div className="relative z-10 flex min-h-screen flex-col lg:pl-[272px]">
        <header className="sticky top-0 z-30 border-b border-[color:var(--cc-hair)] bg-[color:var(--cc-cream)]/80 backdrop-blur-2xl">
          <div className="flex h-16 items-center justify-between px-5 md:px-8">
            <div className="flex items-center gap-3">
              <button
                className="rounded-xl p-2 transition-colors hover:bg-[color:var(--cc-cream-2)] lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--cc-ash)]">
                  Atelier
                </div>
                <div className="text-sm text-[color:var(--cc-ink-soft)]">{todayStamp}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {personalized && targetRole && (
                <button
                  onClick={() => navigate("/settings")}
                  className="hidden max-w-[220px] items-center gap-2 rounded-full border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]/80 px-3 py-1.5 text-left transition-colors hover:border-[color:var(--cc-hair-strong)] md:inline-flex"
                >
                  <Compass className="h-3.5 w-3.5 shrink-0 text-[color:var(--cc-rust)]" />
                  <span className="truncate text-xs font-medium text-[color:var(--cc-ink-soft)]">
                    {targetRole}
                  </span>
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setBellOpen((v) => !v)}
                  className="relative rounded-xl border border-transparent p-2.5 transition-colors hover:border-[color:var(--cc-hair-strong)] hover:bg-[color:var(--cc-cream-2)]"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4 text-[color:var(--cc-ink-soft)]" />
                  {unread > 0 && (
                    <span className="absolute right-2 top-2 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--cc-rust)] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--cc-rust)]" />
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {bellOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] shadow-[0_28px_70px_-30px_rgba(20,22,26,0.5)]"
                    >
                      <div className="flex items-center justify-between border-b border-[color:var(--cc-hair)] px-4 py-3">
                        <span className="text-sm font-semibold">Notifications</span>
                        {dispatches.length > 0 && (
                          <button
                            onClick={clearDispatches}
                            className="text-xs text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {dispatches.length === 0 ? (
                          <div className="p-8 text-center">
                            <CheckCircle2 className="mx-auto h-5 w-5 text-[color:var(--cc-signal)]" />
                            <p className="mt-3 text-sm text-[color:var(--cc-ink-soft)]">You're all caught up.</p>
                          </div>
                        ) : (
                          dispatches.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => {
                                markDispatchRead(d.id);
                                if (d.actionPath) {
                                  setBellOpen(false);
                                  navigate(d.actionPath);
                                }
                              }}
                              className={`w-full border-b border-[color:var(--cc-hair)] px-4 py-3.5 text-left transition-colors hover:bg-[color:var(--cc-cream-2)] ${
                                d.read ? "opacity-55" : ""
                              }`}
                            >
                              <div className="text-[13px] font-semibold leading-snug">{d.title}</div>
                              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                                {d.body}
                              </p>
                              {d.actionLabel && (
                                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--cc-rust)]">
                                  {d.actionLabel} <ArrowRight className="h-3 w-3" />
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => navigate("/builder")}
                className="cc-action cc-action--sm hidden md:inline-flex"
              >
                New résumé <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 px-5 py-7 md:px-8 md:py-9">
          <div className="mx-auto max-w-[1120px]">
            <OnboardingBanner />

            {/* Hero — light paper composition */}
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="cc-hero text-[color:var(--cc-ink)]"
            >
              <div className="relative px-6 pb-0 pt-9 md:px-11 md:pt-11">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.5, ease }}
                  className="cc-eyebrow cc-tone-cobalt"
                >
                  {heroCopy.eyebrow}
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.55, ease }}
                  className="mt-5 max-w-2xl cc-font-display text-[2.6rem] leading-[0.96] tracking-[-0.035em] text-[color:var(--cc-ink)] md:text-[3.4rem]"
                >
                  {heroCopy.title}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.5, ease }}
                  className="mt-4 max-w-xl cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)] md:text-[1.3rem]"
                >
                  {heroCopy.body}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.45, ease }}
                  className="mt-8 flex flex-wrap items-center gap-3"
                >
                  <button
                    onClick={() => navigate(heroCopy.primary.path)}
                    className="cc-action cc-action--lg"
                  >
                    {heroCopy.primary.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(heroCopy.secondary.path)}
                    className="cc-action cc-action--ghost cc-action--lg"
                  >
                    {heroCopy.secondary.label}
                  </button>
                </motion.div>

                {lastResume && (
                  <motion.button
                    type="button"
                    onClick={() => navigate("/my-resumes")}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="mt-6 inline-flex items-center gap-2 text-sm text-[color:var(--cc-ash)] transition-colors hover:text-[color:var(--cc-ink)]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Continue <span className="font-medium text-[color:var(--cc-ink-soft)]">{lastResume.name}</span>
                    <span className="text-[color:var(--cc-ash)]">· {lastResume.date}</span>
                  </motion.button>
                )}
              </div>

              <div className="relative mt-9 grid grid-cols-3 border-t border-[color:var(--cc-hair)] bg-white/40">
                <Metric
                  label="Résumés"
                  value={stats.totalResumes}
                  onClick={() => navigate("/my-resumes")}
                  delay={0.35}
                />
                <Metric
                  label="Applications"
                  value={stats.totalApplications}
                  onClick={() => navigate("/tracker")}
                  delay={0.4}
                  border
                />
                <Metric
                  label="Letters"
                  value={stats.totalCoverLetters}
                  onClick={() => navigate("/cover-letter")}
                  delay={0.45}
                  border
                />
              </div>
            </motion.section>

            {/* Next moves */}
            <section className="mt-10">
              <SectionHead
                kicker={personalized ? "For you" : "Start here"}
                title="Your next moves"
                sub="One primary action. Three supporting paths."
              />

              <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
                <FeaturedCard
                  tone={featured.tone}
                  icon={featured.icon}
                  kicker={featured.kicker}
                  title={featured.title}
                  body={featured.body}
                  cta={featured.cta}
                  onClick={() => navigate(featured.path)}
                />
                <div className="flex flex-col gap-3">
                  {sideMoves.map((m, i) => (
                    <MoveRow
                      key={m.path}
                      index={i}
                      tone={m.tone}
                      icon={m.icon}
                      kicker={m.kicker}
                      title={m.title}
                      body={m.body}
                      cta={m.cta}
                      onClick={() => navigate(m.path)}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Dispatch — personalized news + live roles */}
            <DispatchFeed />

            {/* Workshop + pulse */}
            <section className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <SectionHead kicker="Workshop" title="All tools" sub="Everything else, one tap away." />
                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {toolGrid.map((t, i) => (
                    <ToolChip
                      key={t.path}
                      index={i}
                      icon={t.icon}
                      title={t.title}
                      tone={t.tone}
                      meta={t.meta}
                      onClick={() => navigate(t.path)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <SectionHead kicker="Pulse" title="Recent" sub="What moved in your workspace." />
                <div className="cc-surface mt-5 overflow-hidden">
                  {stats.recentActivity.length === 0 && dispatches.length === 0 ? (
                    <div className="px-5 py-11 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--cc-rust-soft)] text-[color:var(--cc-rust)]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="mt-4 cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)]">
                        Quiet so far. Your first résumé starts the story.
                      </p>
                      <button
                        onClick={() => navigate("/builder")}
                        className="mt-4 text-sm font-semibold text-[color:var(--cc-rust)] hover:underline"
                      >
                        Open builder →
                      </button>
                    </div>
                  ) : (
                    <ul className="relative">
                      <span
                        aria-hidden
                        className="absolute bottom-4 left-[1.4rem] top-4 w-px bg-[color:var(--cc-hair)]"
                      />
                      {stats.recentActivity.map((a, i) => (
                        <li key={`r-${a.name}-${i}`}>
                          <button
                            onClick={() => navigate("/my-resumes")}
                            className="group relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[color:var(--cc-cream-2)]"
                          >
                            <span className="relative z-10 mt-1.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-[color:var(--cc-cream)] ring-2 ring-[color:var(--cc-rust)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cc-rust)]" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-semibold">{a.name}</span>
                              <span className="mt-0.5 block text-[12px] text-[color:var(--cc-ash)]">
                                Résumé · {a.date}
                              </span>
                            </span>
                            <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 text-[color:var(--cc-ash)] opacity-0 transition-opacity group-hover:opacity-100" />
                          </button>
                        </li>
                      ))}
                      {dispatches.slice(0, 2).map((d) => (
                        <li key={d.id}>
                          <button
                            onClick={() => {
                              markDispatchRead(d.id);
                              if (d.actionPath) navigate(d.actionPath);
                            }}
                            className="group relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[color:var(--cc-cream-2)]"
                          >
                            <span className="relative z-10 mt-1.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-[color:var(--cc-cream)] ring-2 ring-[color:var(--cc-signal)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cc-signal)]" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[14px] font-semibold leading-snug">{d.title}</span>
                              <span className="mt-0.5 block line-clamp-2 text-[12px] text-[color:var(--cc-ash)]">
                                {d.body}
                              </span>
                            </span>
                            <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 text-[color:var(--cc-ash)] opacity-0 transition-opacity group-hover:opacity-100" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => navigate("/career-coach")}
                    className="flex w-full items-center justify-between border-t border-[color:var(--cc-hair)] bg-gradient-to-r from-[color:var(--cc-rust-soft)] via-transparent to-transparent px-4 py-3.5 text-left text-sm font-semibold text-[color:var(--cc-rust-deep)] transition-colors hover:from-[rgba(42,82,204,0.2)]"
                  >
                    Ask the career coach
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            <footer className="mt-14 flex items-center justify-between border-t border-[color:var(--cc-hair)] pt-6">
              <p className="text-xs text-[color:var(--cc-ash)]">© 2026 CareerCraft · Adelaide</p>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs text-[color:var(--cc-ash)] transition-colors hover:text-[color:var(--cc-ink)]"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ────────────────────────── pieces ────────────────────── */

function SectionHead({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub: string;
}) {
  return (
    <div>
      <div className="cc-kicker">{kicker}</div>
      <h2 className="mt-1.5 cc-font-display text-2xl tracking-tight md:text-[1.85rem]">{title}</h2>
      <p className="mt-1 text-sm text-[color:var(--cc-ash)]">{sub}</p>
    </div>
  );
}

const Metric = memo(function Metric({
  label,
  value,
  onClick,
  delay,
  border,
}: {
  label: string;
  value: number;
  onClick: () => void;
  delay: number;
  border?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`group px-4 py-4 text-left transition-colors hover:bg-white/70 md:px-6 md:py-5 ${
        border ? "border-l border-[color:var(--cc-hair)]" : ""
      }`}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--cc-ash)]">
        {label}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className="cc-metric text-3xl md:text-[2.35rem]">{value}</span>
        <ArrowUpRight className="mb-1 h-3.5 w-3.5 text-[color:var(--cc-ash)] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[color:var(--cc-rust)]" />
      </div>
    </motion.button>
  );
});

const FeaturedCard = memo(function FeaturedCard({
  tone,
  icon: Icon,
  kicker,
  title,
  body,
  cta,
  onClick,
}: {
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease }}
      className={`cc-tint cc-lift group min-h-[280px] p-7 text-left lg:min-h-full cc-tone-${tone}`}
    >
      <div
        aria-hidden
        className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-80 blur-3xl transition-transform duration-700 group-hover:scale-110"
        style={{ background: "var(--cc-t-wash)" }}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span className="cc-icon-chip h-12 w-12">
            <Icon className="h-5 w-5" />
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ background: "var(--cc-t-soft)", color: "var(--cc-t-deep)" }}
          >
            {kicker}
          </span>
        </div>
        <h3 className="relative mt-8 cc-font-display text-[1.75rem] leading-[1.08] tracking-tight text-[color:var(--cc-ink)] md:text-[2rem]">
          {title}
        </h3>
        <p className="relative mt-3 max-w-sm text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">
          {body}
        </p>
        <div
          className="relative mt-auto flex items-center gap-2 pt-8 text-sm font-semibold"
          style={{ color: "var(--cc-t-deep)" }}
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </motion.button>
  );
});

const MoveRow = memo(function MoveRow({
  index,
  tone,
  icon: Icon,
  kicker,
  title,
  body,
  cta,
  onClick,
}: {
  index: number;
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: 10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.06 + index * 0.05, duration: 0.4, ease }}
      className={`cc-surface cc-lift group relative flex flex-1 items-center gap-4 overflow-hidden px-4 py-4 pl-5 text-left cc-tone-${tone}`}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 opacity-80"
        style={{ background: "var(--cc-t)" }}
      />
      <span className="cc-icon-chip h-11 w-11 rounded-xl">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--cc-t)" }}>
          {kicker}
        </span>
        <span className="mt-0.5 block truncate text-[15px] font-semibold leading-snug">{title}</span>
        <span className="mt-0.5 block truncate text-[13px] text-[color:var(--cc-ink-soft)]">{body}</span>
      </span>
      <span
        className="hidden shrink-0 items-center gap-1 text-xs font-semibold sm:inline-flex"
        style={{ color: "var(--cc-t-deep)" }}
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </motion.button>
  );
});

const ToolChip = memo(function ToolChip({
  index,
  icon: Icon,
  title,
  tone,
  meta,
  onClick,
}: {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: Tone;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className={`cc-surface cc-lift group flex items-center gap-3 px-3.5 py-3.5 text-left cc-tone-${tone}`}
    >
      <span className="cc-icon-chip h-9 w-9 rounded-xl transition-transform group-hover:scale-105">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold leading-tight">{title}</span>
        {meta != null && (
          <span className="mt-0.5 block text-[11px] text-[color:var(--cc-ash)]">{meta} saved</span>
        )}
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--cc-ash)] opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.button>
  );
});

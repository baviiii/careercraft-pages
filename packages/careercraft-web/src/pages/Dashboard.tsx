/* ───────────────────────────────────────────────────────────
   CareerCraft — The Atelier (Dashboard)
   Editorial, cream/ink/rust, Fraunces + Instrument Serif.
   Keeps the same data wiring: session, stats, tools, activity.
   ─────────────────────────────────────────────────────────── */

import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  FileText,
  Upload,
  BarChart3,
  Sparkles,
  Mail,
  Briefcase,
  Layout,
  LogOut,
  Home,
  Brain,
  Newspaper,
  MessageSquareText,
  Settings as SettingsIcon,
  TrendingUp,
  Search,
  Zap,
  ArrowUpRight,
  ArrowRight,
  Menu,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { CraftSidebar, CRAFT_SIDEBAR_LINKS } from "@/components/craft/CraftSidebar";
import { OnboardingBanner } from "@/features/onboarding/OnboardingBanner";

/* ────────────────────────────── types ─────────────────────────── */

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

/* ──────────────────────── small hook: count-up ─────────────────── */

const useCountUp = (target: number, durationMs = 900) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30% 0px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const from = 0;
    const to = target;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, durationMs]);

  return { ref, value };
};

/* ────────────────────────────── page ──────────────────────────── */

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
  const [dispatches, setDispatches] = useState<Dispatch[]>([
    {
      id: "1",
      kind: "insight",
      title: "New career insight available",
      body: "We've analysed your résumé. View your personalised notes in Career Insights.",
      when: new Date(Date.now() - 300000),
      read: false,
      actionLabel: "View insights",
      actionPath: "/intelligence",
    },
    {
      id: "2",
      kind: "success",
      title: "Résumé saved",
      body: "Your résumé ‘Senior Software Engineer’ was saved at 14:02.",
      when: new Date(Date.now() - 3600000),
      read: false,
    },
  ]);

  /* session ---------------------------------------------------- */

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

  /* stats ------------------------------------------------------ */

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
          recentActivity: resumes.slice(0, 3).map((r: any) => ({
            type: "resume",
            name: r.name,
            date: new Date(r.created_at).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          })),
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, [session]);

  /* handlers --------------------------------------------------- */

  const handleSignOut = useCallback(async () => {
    try {
      localStorage.removeItem("horus_session_token");
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

  /* copy ------------------------------------------------------- */

  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "friend";

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const todayStamp = useMemo(() => {
    const d = new Date();
    return d
      .toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
      .toUpperCase();
  }, []);

  /* nav + tools ------------------------------------------------ */

  const sidebarLinks = CRAFT_SIDEBAR_LINKS;

  const statPlates = useMemo(
    () => [
      {
        n: "i.",
        label: "Résumés",
        value: stats.totalResumes,
        path: "/my-resumes",
        note: "saved",
      },
      {
        n: "ii.",
        label: "Cover letters",
        value: stats.totalCoverLetters,
        path: "/cover-letter",
        note: "written",
      },
      {
        n: "iii.",
        label: "Applications",
        value: stats.totalApplications,
        path: "/tracker",
        note: "sent",
      },
    ],
    [stats.totalResumes, stats.totalCoverLetters, stats.totalApplications]
  );

  const sections = useMemo(
    () => [
      {
        id: "resume",
        section: "Resume",
        title: "Build a resume that gets interviews.",
        sub: "Write, polish, and score your resume with practical tools in one place.",
        tools: [
          { icon: Zap, tag: "Build", title: "Résumé Builder", description: "Start from a template and fill in your details.", path: "/builder" },
          { icon: Upload, tag: "Library", title: "My Résumés", description: "View and edit every résumé you've saved.", path: "/my-resumes", badge: stats.totalResumes > 0 ? `${stats.totalResumes}` : undefined },
          { icon: BarChart3, tag: "ATS Check", title: "ATS Analysis", description: "See how well your résumé scores with applicant tracking systems.", path: "/analysis" },
          { icon: Sparkles, tag: "Rewrite", title: "Bullet Rewrite", description: "Improve weak bullet points into stronger impact statements.", path: "/rewrite" },
          { icon: Layout, tag: "Templates", title: "Template Builder", description: "Design your own custom résumé template.", path: "/templates" },
        ],
      },
      {
        id: "career",
        section: "Career",
        title: "Understand what the market is saying.",
        sub: "Use trusted career signals and local market data to make better decisions.",
        tools: [
          { icon: Brain, tag: "Coach", title: "Career Coach", description: "Get personalised career advice based on South Australian data.", path: "/career-coach" },
          { icon: TrendingUp, tag: "Insights", title: "Career Insights", description: "In-demand skills, funding opportunities and industry growth.", path: "/intelligence" },
          { icon: Newspaper, tag: "News", title: "Market News", description: "This week's job market news and hiring trends.", path: "/job-market-news" },
        ],
      },
      {
        id: "applications",
        section: "Applications",
        title: "Apply with confidence and stay organized.",
        sub: "Write cover letters, apply for jobs and keep track of every application you send.",
        tools: [
          { icon: Mail, tag: "Letter", title: "Cover Letters", description: "Write a tailored cover letter for any job.", path: "/cover-letter", badge: stats.totalCoverLetters > 0 ? `${stats.totalCoverLetters}` : undefined },
          { icon: Briefcase, tag: "Track", title: "Job Tracker", description: "Track the status of every application you send.", path: "/tracker", badge: stats.totalApplications > 0 ? `${stats.totalApplications}` : undefined },
          { icon: MessageSquareText, tag: "Practice", title: "Interview Prep", description: "Practice interviews with AI feedback and coaching.", path: "/interview-prep" },
          { icon: Search, tag: "Jobs", title: "Browse Jobs", description: "Find live jobs from SEEK, Indeed and other sources.", path: "/au-jobs" },
        ],
      },
    ],
    [stats.totalResumes, stats.totalCoverLetters, stats.totalApplications]
  );

  /* loading ---------------------------------------------------- */

  if (loading) {
    return (
      <div className="ds-shell cc-root cc-font-sans min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-[color:var(--cc-ink)] border-t-[color:var(--cc-rust)] animate-spin" />
          <div className="cc-label-sm text-[color:var(--cc-ash)]">Loading your workspace…</div>
        </div>
      </div>
    );
  }

  const unread = dispatches.filter((d) => !d.read).length;

  /* ────────────────────────── render ──────────────────────────── */

  return (
    <main className="ds-shell cc-root cc-font-sans min-h-screen text-[color:var(--cc-ink)] overflow-x-hidden antialiased" data-ds-tokenized="true">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-[color:var(--cc-ink)]/40 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ────────────── Sidebar ────────────── */}
      <CraftSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        links={sidebarLinks}
        currentPath={location.pathname}
        userName={userName}
        userEmail={session?.user?.email || ""}
        onSignOut={handleSignOut}
        navigate={navigate}
      />

      {/* ────────────── Main ────────────── */}
      <div className="lg:pl-[300px] relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 ds-nav">
          <div className="flex items-center justify-between px-6 md:px-10 h-16">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden -ml-2 p-2"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="cc-label-sm text-[color:var(--cc-ash)]">
                <span className="cc-tabular">{todayStamp}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Bell */}
              <div className="relative">
                <button
                  onClick={() => setBellOpen((v) => !v)}
                  className="relative p-2.5 rounded-xl border border-[color:var(--cc-hair)] bg-[color:var(--ds-surface)] hover:border-[color:var(--cc-hair-strong)] transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[color:var(--cc-rust)]" />
                  )}
                </button>
                <AnimatePresence>
                  {bellOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 mt-3 w-[22rem] ds-surface rounded-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-[color:var(--cc-hair)] flex items-center justify-between">
                        <div>
                          <div className="cc-label text-[color:var(--cc-rust)]">Notifications</div>
                          <div className="mt-1 text-base font-medium text-[color:var(--cc-ink)]">Latest updates</div>
                        </div>
                        {dispatches.length > 0 && (
                          <button
                            onClick={clearDispatches}
                            className="cc-label-sm text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {dispatches.length === 0 ? (
                          <div className="p-8 text-center">
                            <CheckCircle2 className="w-5 h-5 mx-auto text-[color:var(--cc-ash)]" />
                            <p className="mt-3 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)]">
                              You're all caught up.
                            </p>
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
                              className={`w-full text-left p-4 border-b border-[color:var(--cc-hair)] hover:bg-[color:var(--cc-cream-2)] transition-colors ${
                                d.read ? "opacity-70" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{
                                    background:
                                      d.kind === "insight" || d.kind === "success"
                                        ? "var(--cc-rust)"
                                        : "var(--cc-ash)",
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="cc-label-sm text-[color:var(--cc-ash)]">
                                    {d.when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                  <div className="mt-1 text-[15px] font-semibold leading-tight">{d.title}</div>
                                  <p className="mt-1.5 cc-font-editorial text-[15px] leading-snug text-[color:var(--cc-ink-soft)]">
                                    {d.body}
                                  </p>
                                  {d.actionLabel && (
                                    <span className="mt-2 inline-flex items-center gap-1 cc-label text-[color:var(--cc-ink)] cc-link">
                                      {d.actionLabel} <ArrowUpRight className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                              </div>
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
                className="cc-btn cc-btn-primary hidden md:inline-flex"
                style={{ padding: "0.8rem 1.1rem" }}
              >
                New résumé <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 px-6 md:px-10 py-12 md:py-16">
          <div className="max-w-[1400px] mx-auto">
            <OnboardingBanner />
            {/* ─────────────── Masthead ─────────────── */}
            <section>
              <div className="grid grid-cols-12 gap-6 md:gap-8 items-start pb-6">
                <div className="col-span-12 md:col-span-8">
                  <div className="cc-label text-[color:var(--cc-rust)]">
                    Dashboard
                  </div>
                  <h1 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[1.02] tracking-tight">
                    {greeting}, {userName}
                  </h1>
                  <p className="mt-5 text-lg md:text-xl leading-[1.45] text-[color:var(--cc-ink-soft)] max-w-2xl">
                    {stats.totalResumes > 0 ? (
                      <>
                        You have{" "}
                        <span className="cc-font-display italic text-[color:var(--cc-ink)]">
                          {stats.totalResumes}{" "}
                          {stats.totalResumes === 1 ? "résumé" : "résumés"}
                        </span>{" "}
                        saved and{" "}
                        <span className="cc-font-display italic text-[color:var(--cc-ink)]">
                          {stats.totalApplications}
                        </span>{" "}
                        {stats.totalApplications === 1 ? "application" : "applications"} sent.
                      </>
                    ) : (
                      <>
                        Let's get started. Build your first résumé, or browse the job
                        market to see what's out there.
                      </>
                    )}
                  </p>

                  <div className="mt-10 flex flex-wrap items-center gap-3">
                    <button onClick={() => navigate("/builder")} className="cc-btn cc-btn-primary">
                      {stats.totalResumes > 0 ? "Create new résumé" : "Create my first résumé"}
                      <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
                    </button>
                    {stats.totalResumes > 0 ? (
                      <button onClick={() => navigate("/my-resumes")} className="cc-btn cc-btn-ghost">
                        View my résumés <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
                      </button>
                    ) : (
                      <button onClick={() => navigate("/intelligence")} className="cc-btn cc-btn-ghost">
                        Browse career insights <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: workshop ticket */}
                <div className="col-span-12 md:col-span-4">
                  <div className="ds-panel p-6 md:p-7">
                    <div className="flex items-center justify-between">
                      <div className="cc-label text-[color:var(--cc-rust)]">Today</div>
                      <div className="cc-label-sm text-[color:var(--cc-ash)]">Quick summary</div>
                    </div>
                    <div className="mt-4 text-lg font-semibold leading-tight">
                      Welcome back, {userName}.
                    </div>
                    <div className="mt-6 space-y-3 cc-label-sm">
                      <Row k="Session" v="Active" dot />
                      <Row k="Tools available" v="9" />
                      <Row k="Notifications" v={`${unread} new`} />
                    </div>
                    <div className="mt-6 pt-5 border-t border-[color:var(--cc-hair-strong)]">
                      <div className="cc-font-mono text-[10px] tracking-[0.28em] uppercase text-[color:var(--cc-ash)]">
                        Need help?
                      </div>
                      <button
                        onClick={() => navigate("/career-coach")}
                        className="mt-1 cc-font-display italic text-xl text-[color:var(--cc-ink)] cc-link"
                      >
                        Ask the career coach →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ─────────────── Figures ─────────────── */}
            <section className="mt-16 md:mt-24">
              <div className="mb-10 flex items-end justify-between gap-6">
                <div>
                  <div className="cc-label text-[color:var(--cc-rust)]">Your numbers</div>
                  <h2 className="mt-2 cc-font-display text-3xl md:text-4xl leading-[1.05] tracking-tight">
                    Progress so far
                  </h2>
                </div>
                <div className="hidden md:block cc-label-sm text-[color:var(--cc-ash)] text-right max-w-xs">
                  Counts update automatically.<br />Click any tile to view details.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statPlates.map((p, i) => (
                  <FigurePlate
                    key={p.label}
                    index={i}
                    n={p.n}
                    label={p.label}
                    note={p.note}
                    value={p.value}
                    onClick={() => navigate(p.path)}
                  />
                ))}
              </div>
            </section>

            {/* ─────────────── Toolkit sections ─────────────── */}
            {sections.map((sec, si) => (
              <section key={sec.id} className="mt-16 md:mt-24">
                <div className="grid grid-cols-12 gap-6 md:gap-8 items-end pb-3 mb-8">
                  <div className="col-span-12 md:col-span-5">
                    <div className="cc-label text-[color:var(--cc-rust)]">{sec.section}</div>
                    <h2 className="mt-2 cc-font-display text-3xl md:text-4xl leading-[1.05] tracking-tight">
                      {sec.title}
                    </h2>
                  </div>
                  <div className="col-span-12 md:col-span-7 md:pl-6">
                    <p className="text-lg leading-snug text-[color:var(--cc-ink-soft)] max-w-xl">
                      {sec.sub}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sec.tools.map((t, ti) => (
                    <ToolFold
                      key={t.path}
                      index={ti + si * 10}
                      icon={t.icon}
                      tag={t.tag}
                      title={t.title}
                      description={t.description}
                      badge={t.badge}
                      onClick={() => navigate(t.path)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* ─────────────── Dispatches (recent activity) ─────────────── */}
            {(stats.recentActivity.length > 0 || dispatches.length > 0) && (
              <section className="mt-16 md:mt-24">
                <div className="mb-10">
                  <div className="cc-label text-[color:var(--cc-rust)]">Recent activity</div>
                  <h2 className="mt-2 cc-font-display text-3xl md:text-4xl leading-[1.05] tracking-tight">
                    What changed recently
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Activity column */}
                  {stats.recentActivity.length > 0 && (
                    <div className="space-y-4">
                      <div className="cc-label-sm text-[color:var(--cc-ash)] border-b border-[color:var(--cc-hair)] pb-3">
                        Recent résumés
                      </div>
                      {stats.recentActivity.map((a, i) => (
                        <motion.button
                          key={`${a.name}-${i}`}
                          initial={{ opacity: 0, y: 8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-20%" }}
                          transition={{ delay: i * 0.06 }}
                          onClick={() => navigate("/my-resumes")}
                          className="ds-surface w-full text-left group p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="cc-label-sm text-[color:var(--cc-ash)]">Resume updated</div>
                              <div className="mt-1 text-xl font-semibold leading-tight">
                                {a.name}
                              </div>
                              <div className="mt-1 cc-label-sm text-[color:var(--cc-ash)]">
                                Saved <span className="cc-tabular">{a.date}</span>
                              </div>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-[color:var(--cc-ash)] group-hover:text-[color:var(--cc-rust)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Dispatches column */}
                  {dispatches.length > 0 && (
                    <div className="space-y-4">
                      <div className="cc-label-sm text-[color:var(--cc-ash)] border-b border-[color:var(--cc-hair)] pb-3">
                        Notifications
                      </div>
                      {dispatches.map((d, i) => (
                        <motion.button
                          key={d.id}
                          initial={{ opacity: 0, y: 8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-20%" }}
                          transition={{ delay: i * 0.06 }}
                          onClick={() => {
                            markDispatchRead(d.id);
                            if (d.actionPath) navigate(d.actionPath);
                          }}
                          className="ds-surface w-full text-left group p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="cc-label-sm text-[color:var(--cc-ash)]">
                                {d.kind === "success"
                                  ? "Saved"
                                  : d.kind === "insight"
                                  ? "Insight"
                                  : d.kind === "warning"
                                  ? "Warning"
                                  : "Info"}
                              </div>
                              <div className="mt-1 text-xl font-semibold leading-tight">
                                {d.title}
                              </div>
                              <p className="mt-2 cc-font-editorial text-[17px] leading-snug text-[color:var(--cc-ink-soft)]">
                                {d.body}
                              </p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-[color:var(--cc-ash)] group-hover:text-[color:var(--cc-rust)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ─────────────── Footer meta ─────────────── */}
            <section className="mt-20 border-t border-[color:var(--cc-hair)] pt-8">
              <div className="grid grid-cols-12 gap-6 md:gap-10">
                <div className="col-span-12 md:col-span-5">
                  <div className="cc-label text-[color:var(--cc-rust)]">About</div>
                  <p className="mt-4 text-lg leading-[1.6] text-[color:var(--cc-ink-soft)]">
                    CareerCraft is built for people looking for work in South Australia.
                    Every tool and every insight here is grounded in real market data —
                    designed to help you get noticed and get hired.
                  </p>
                </div>
                <div className="col-span-12 md:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-8">
                  <Meta k="Based in" v="Adelaide" />
                  <Meta k="Set in" v="Fraunces" />
                  <Meta k="Version" v="1.0" />
                  <Meta k="Signed in as" v={session?.user?.email?.split("@")[0] || "—"} />
                </div>
              </div>

              <div className="mt-12 flex items-center justify-between">
                <div className="cc-label-sm text-[color:var(--cc-ash)]">
                  © 2026 · CareerCraft · Adelaide, SA
                </div>
                <button
                  onClick={handleSignOut}
                  className="cc-label text-[color:var(--cc-ink)] cc-link inline-flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ────────────────────────── subcomponents ────────────────────── */

/* — FigurePlate — */

interface FigurePlateProps {
  index: number;
  n: string;
  label: string;
  note: string;
  value: number;
  onClick: () => void;
}

const FigurePlate = memo(function FigurePlate({
  index,
  n,
  label,
  note,
  value,
  onClick,
}: FigurePlateProps) {
  const { ref, value: counted } = useCountUp(value, 900 + index * 60);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.6 }}
      className="ds-surface hover:bg-[color:var(--cc-cream-2)] transition-colors p-7 md:p-8 text-left group"
    >
      <div className="flex items-start justify-between">
        <div className="cc-font-display text-2xl text-[color:var(--cc-rust)] leading-none">
          {n}
        </div>
        <ArrowUpRight className="w-5 h-5 text-[color:var(--cc-ash)] group-hover:text-[color:var(--cc-rust)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
      </div>

      <div className="mt-10">
        <span
          ref={ref}
          className="cc-font-display text-5xl md:text-6xl leading-none tracking-tight cc-tabular text-[color:var(--cc-ink)] block"
        >
          {String(counted).padStart(2, "0")}
        </span>
        <div className="mt-4 cc-label text-[color:var(--cc-ink)]">{label}</div>
        <div className="mt-1 text-[15px] text-[color:var(--cc-ink-soft)]">
          {note}
        </div>
      </div>
    </motion.button>
  );
});

/* — ToolFold — */

interface ToolFoldProps {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}

const ToolFold = memo(function ToolFold({
  index,
  icon: Icon,
  tag,
  title,
  description,
  badge,
  onClick,
}: ToolFoldProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ delay: (index % 6) * 0.05, duration: 0.55 }}
      className="ds-surface hover:bg-[color:var(--cc-cream-2)] p-7 text-left group relative"
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl border border-[color:var(--cc-hair-strong)] flex items-center justify-center bg-[color:var(--ds-surface)] group-hover:border-[color:var(--cc-rust)] transition-colors">
          <Icon className="w-4 h-4" />
        </div>
        {badge && (
          <span className="cc-label-sm px-2 py-1 rounded-full border border-[color:var(--cc-hair-strong)] text-[color:var(--cc-ink)] bg-[color:var(--ds-surface)]">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-8">
        <div className="cc-label text-[color:var(--cc-rust)]">{tag}</div>
        <h3 className="mt-3 cc-font-display text-2xl leading-[1.1] tracking-tight text-[color:var(--cc-ink)]">
          {title}
        </h3>
        <p className="mt-3 text-[15px] leading-snug text-[color:var(--cc-ink-soft)]">
          {description}
        </p>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <span className="cc-label-sm text-[color:var(--cc-ash)]">Open</span>
        <ArrowUpRight className="w-4 h-4 text-[color:var(--cc-ash)] group-hover:text-[color:var(--cc-rust)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
      </div>
    </motion.button>
  );
});

/* — tiny row for the Bench ticket — */

const Row = ({ k, v, dot = false }: { k: string; v: string; dot?: boolean }) => (
  <div className="flex items-center justify-between text-[color:var(--cc-ink)]">
    <span className="text-[color:var(--cc-ash)]">{k}</span>
    <span className="flex items-center gap-2">
      {dot && <span className="cc-blink w-1.5 h-1.5 rounded-full bg-[color:var(--cc-rust)]" />}
      <span className="cc-tabular">{v}</span>
    </span>
  </div>
);

const Meta = ({ k, v }: { k: string; v: string }) => (
  <div>
    <div className="cc-label-sm text-[color:var(--cc-ash)]">{k}</div>
    <div className="mt-2 cc-font-display italic text-xl text-[color:var(--cc-ink)]">{v}</div>
  </div>
);

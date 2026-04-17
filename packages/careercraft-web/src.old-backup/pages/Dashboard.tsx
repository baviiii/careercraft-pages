import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { gsap } from "gsap";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { NotificationCenter, type Notification } from "@/components/ui/NotificationCenter";
import {
  FileText,
  Upload,
  BarChart3,
  Sparkles,
  Mail,
  Briefcase,
  Layout,
  LogOut,
  ChevronRight,
  Clock,
  TrendingUp,
  Target,
  Zap,
  Home,
  Menu,
  Brain,
  Newspaper,
  Settings,
  X,
  ArrowRight,
  ChevronDown,
  MessageSquare,
  Search,
  Building2,
  Star,
  Rocket,
} from "lucide-react";
import { Session } from "@supabase/supabase-js";

interface ResumeStats {
  totalResumes: number;
  totalCoverLetters: number;
  totalApplications: number;
  recentActivity: { type: string; name: string; date: string }[];
}

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
  const [expandedCategory, setExpandedCategory] = useState<string | null>("resume");
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "insight",
      title: "Career Insight Ready",
      message: "Your resume has been analyzed. Check out personalized recommendations.",
      timestamp: new Date(Date.now() - 300000),
      read: false,
      actionLabel: "View Insights",
      actionPath: "/intelligence",
    },
    {
      id: "2",
      type: "success",
      title: "Resume Updated",
      message: "Your resume 'Senior Software Engineer' was successfully saved.",
      timestamp: new Date(Date.now() - 3600000),
      read: false,
    },
  ]);

  // Respect user's motion preferences
  const prefersReducedMotion = useReducedMotion();

  // GSAP Animation refs
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement[]>([]);

  // GSAP animations on mount
  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      // Hero animation with bounce
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current,
          { y: 40, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.2)" }
        );
      }

      // Stats animation with stagger
      if (statsRef.current) {
        const cards = statsRef.current.querySelectorAll('.stat-card');
        gsap.fromTo(
          cards,
          { y: 30, opacity: 0, scale: 0.9 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, delay: 0.2, ease: "back.out(1.4)" }
        );
      }

      // Categories stagger
      if (categoriesRef.current.length > 0) {
        gsap.fromTo(
          categoriesRef.current.filter(Boolean),
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.12, delay: 0.4, ease: "power3.out" }
        );
      }
    });

    return () => ctx.revert();
  }, [loading]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.user) return;

      try {
        const [resumesRes, coverLettersRes, applicationsRes] = await Promise.all([
          supabase.from('resumes').select('id, name, created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }),
          supabase.from('cover_letters').select('id, created_at').eq('user_id', session.user.id),
          supabase.from('job_applications').select('id').eq('user_id', session.user.id),
        ]);

        const resumes = resumesRes.data || [];
        const coverLetters = coverLettersRes.data || [];
        const applications = applicationsRes.data || [];

        setStats({
          totalResumes: resumes.length,
          totalCoverLetters: coverLetters.length,
          totalApplications: applications.length,
          recentActivity: resumes.slice(0, 3).map(r => ({
            type: 'resume',
            name: r.name,
            date: new Date(r.created_at).toLocaleDateString(),
          })),
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [session]);

  const handleSignOut = useCallback(async () => {
    try {
      localStorage.removeItem('horus_session_token');
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.error('Sign out error:', error);
      }

      setSession(null);

      setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 100);
    } catch (error) {
      console.error('Sign out error:', error);
      navigate("/auth", { replace: true });
    }
  }, [navigate]);

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const handleClearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleNotificationAction = useCallback((notification: Notification) => {
    if (notification.actionPath) {
      navigate(notification.actionPath);
    }
  }, [navigate]);

  // Optimized animation configs (memoized)
  const springConfig = useMemo(() => ({
    type: "spring" as const,
    stiffness: prefersReducedMotion ? 500 : 300,
    damping: prefersReducedMotion ? 30 : 20,
  }), [prefersReducedMotion]);

  const fastSpring = useMemo(() => ({
    type: "spring" as const,
    stiffness: 400,
    damping: 17,
  }), []);

  const smoothEase = useMemo(() => ({
    duration: prefersReducedMotion ? 0.2 : 0.5,
    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  }), [prefersReducedMotion]);

  // Memoize tool categories to prevent re-renders
  const toolCategories = useMemo(() => [
    {
      id: "resume",
      title: "Resume Tools",
      icon: FileText,
      gradient: "from-blue-500 via-blue-600 to-indigo-600",
      glowColor: "blue",
      tools: [
        {
          icon: Zap,
          title: "Resume Builder",
          description: "Create professional resumes with templates",
          path: "/builder",
          gradient: "from-yellow-400 to-orange-500",
        },
        {
          icon: Upload,
          title: "My Resumes",
          description: "Manage your resume library",
          path: "/my-resumes",
          badge: stats.totalResumes > 0 ? `${stats.totalResumes}` : undefined,
          gradient: "from-blue-500 to-cyan-500",
        },
        {
          icon: BarChart3,
          title: "ATS Analysis",
          description: "Check job compatibility score",
          path: "/analysis",
          gradient: "from-purple-500 to-pink-500",
        },
        {
          icon: Sparkles,
          title: "AI Rewrite",
          description: "Enhance bullets with AI",
          path: "/rewrite",
          gradient: "from-orange-500 to-red-500",
        },
        {
          icon: Layout,
          title: "Template Builder",
          description: "Create custom resume templates",
          path: "/templates",
          gradient: "from-teal-500 to-emerald-500",
        },
      ],
    },
    {
      id: "career",
      title: "Career Intelligence",
      icon: Brain,
      gradient: "from-purple-500 via-violet-600 to-indigo-600",
      glowColor: "purple",
      tools: [
        {
          icon: Brain,
          title: "Career Hub",
          description: "AI coach & career guidance",
          path: "/sa-career-hub",
          gradient: "from-indigo-500 to-purple-600",
        },
        {
          icon: TrendingUp,
          title: "Intelligence Dashboard",
          description: "Skills, funding & insights",
          path: "/intelligence",
          gradient: "from-blue-600 to-indigo-600",
        },
        {
          icon: Newspaper,
          title: "Market News",
          description: "Job market trends & analysis",
          path: "/job-market-news",
          gradient: "from-cyan-500 to-blue-600",
        },
      ],
    },
    {
      id: "applications",
      title: "Job Applications",
      icon: Briefcase,
      gradient: "from-emerald-500 via-teal-600 to-cyan-600",
      glowColor: "emerald",
      tools: [
        {
          icon: Mail,
          title: "Cover Letters",
          description: "Generate tailored cover letters",
          path: "/cover-letter",
          badge: stats.totalCoverLetters > 0 ? `${stats.totalCoverLetters}` : undefined,
          gradient: "from-pink-500 to-rose-500",
        },
        {
          icon: Briefcase,
          title: "Job Tracker",
          description: "Track application status",
          path: "/tracker",
          badge: stats.totalApplications > 0 ? `${stats.totalApplications}` : undefined,
          gradient: "from-green-500 to-emerald-600",
        },
        {
          icon: Search,
          title: "Australian Jobs",
          description: "Browse SEEK, Indeed & more",
          path: "/au-jobs",
          gradient: "from-amber-500 to-orange-500",
        },
      ],
    },
  ], [stats.totalResumes, stats.totalCoverLetters, stats.totalApplications]);

  // Memoize stat cards data
  const statCards = useMemo(() => [
    {
      label: "Resumes",
      value: stats.totalResumes,
      icon: FileText,
      gradient: "from-blue-500 via-cyan-500 to-blue-600",
      path: "/my-resumes",
      shadowColor: "blue",
      iconBg: "from-blue-400 to-cyan-400",
      delay: 0
    },
    {
      label: "Cover Letters",
      value: stats.totalCoverLetters,
      icon: Mail,
      gradient: "from-purple-500 via-pink-500 to-purple-600",
      path: "/cover-letter",
      shadowColor: "purple",
      iconBg: "from-purple-400 to-pink-400",
      delay: 0.1
    },
    {
      label: "Applications",
      value: stats.totalApplications,
      icon: Briefcase,
      gradient: "from-emerald-500 via-teal-500 to-emerald-600",
      path: "/tracker",
      shadowColor: "emerald",
      iconBg: "from-emerald-400 to-teal-400",
      delay: 0.2
    },
  ], [stats.totalResumes, stats.totalCoverLetters, stats.totalApplications]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50/30 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
      </div>
    );
  }

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'there';

  const sidebarLinks = [
    { icon: Home, label: "Dashboard", path: "/dashboard", active: location.pathname === "/dashboard" },
    { icon: TrendingUp, label: "Intelligence", path: "/intelligence", active: location.pathname === "/intelligence" },
    { icon: Brain, label: "Career Hub", path: "/sa-career-hub", active: location.pathname === "/sa-career-hub" },
    { icon: FileText, label: "My Resumes", path: "/my-resumes", active: location.pathname === "/my-resumes" },
    { icon: Briefcase, label: "Job Tracker", path: "/tracker", active: location.pathname === "/tracker" },
    { icon: Settings, label: "Settings", path: "/settings", active: location.pathname === "/settings" },
  ];

  return (
    <div className="min-h-screen bg-white relative cursor-default">
      {/* Subtle, organic background with premium feel */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Soft gradient base with noise texture */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-white" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")` }} />

        {/* Organic shapes - subtle and creative */}
        <svg className="absolute top-0 right-0 w-1/2 h-1/2 opacity-[0.03]" viewBox="0 0 800 800">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <path
            d="M400,100 C550,120 680,250 700,400 C720,550 590,680 440,700 C290,720 160,590 140,440 C120,290 250,120 400,100 Z"
            fill="url(#grad1)"
          />
        </svg>

        <svg className="absolute bottom-0 left-0 w-1/3 h-1/3 opacity-[0.02]" viewBox="0 0 600 600">
          <path
            d="M300,50 C420,60 540,180 550,300 C560,420 440,540 320,550 C200,560 80,440 70,320 C60,200 180,60 300,50 Z"
            fill="#6366f1"
          />
        </svg>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Glassmorphic Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-[280px] z-50 transform transition-all duration-500 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Glass effect background */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl border-r border-white/20 shadow-2xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent" />

        <div className="relative p-6 h-full flex flex-col">
          {/* Logo with glow */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate("/")} className="flex items-center gap-3 group relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />
              <img
                src="/logo.png"
                alt="Hours Intelligence"
                className="w-11 h-11 rounded-xl shadow-lg shadow-blue-500/50 object-contain relative z-10 group-hover:scale-110 transition-transform duration-300"
              />
              <div className="relative z-10">
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  Hours
                </span>
                <p className="text-xs text-slate-500 font-medium">Intelligence</p>
              </div>
            </button>
            <Button variant="ghost" size="icon" className="lg:hidden hover:bg-blue-50" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 flex-1 overflow-y-auto">
            {sidebarLinks.map((link) => (
              <button key={link.path}
                onClick={() => { navigate(link.path); setSidebarOpen(false); }}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  link.active
                    ? "text-white"
                    : "text-slate-700 hover:text-blue-600"
                }`}>
                {/* Active background gradient */}
                {link.active && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/50" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
                  </>
                )}

                {/* Hover effect for inactive */}
                {!link.active && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}

                <link.icon className={`w-5 h-5 relative z-10 ${link.active ? "text-white" : "text-slate-500 group-hover:text-blue-600"} transition-colors duration-300`} />
                <span className="text-sm font-medium relative z-10">{link.label}</span>

                {link.active && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse relative z-10" />
                )}
              </button>
            ))}
          </nav>

          {/* User Card with gradient */}
          <Card className="relative overflow-hidden p-4 border-0 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50" />
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10" />

            <div className="relative flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/50">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-white shadow-md" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate text-sm">{userName}</p>
                <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="relative w-full justify-center text-slate-600 hover:text-red-600 border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all duration-300 group overflow-hidden"
              onClick={handleSignOut}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <LogOut className="w-4 h-4 mr-2 relative z-10" />
              <span className="relative z-10">Sign Out</span>
            </Button>
          </Card>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[280px] relative min-h-screen">
        {/* Glassmorphic Header */}
        <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-2xl border-b border-white/20 shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden hover:bg-blue-50 relative group"
                onClick={() => setSidebarOpen(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <Menu className="w-5 h-5 relative z-10" />
              </Button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                  Welcome back, {userName}
                </h1>
                <p className="text-sm text-slate-600">Let's advance your career today ✨</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationCenter
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onClearAll={handleClearAllNotifications}
                onActionClick={handleNotificationAction}
              />
              <Button
                onClick={() => navigate("/builder")}
                className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all duration-300 group border-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                <Zap className="w-4 h-4 mr-2 relative z-10" />
                <span className="relative z-10 font-semibold">New Resume</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Hero Section - Premium Typography */}
          <div ref={heroRef} className="mb-16">
            <div className="relative group">
              {/* Premium accent element */}
              <div className="absolute left-0 top-10 w-1 h-32 bg-gradient-to-b from-blue-600 via-blue-500 to-transparent rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute left-0 top-10 w-1 h-32 bg-gradient-to-b from-blue-600 via-blue-500 to-transparent rounded-full blur-sm opacity-40" />

              <div className="pl-10">
                <div className="max-w-5xl">
                  {/* Premium typography with display font */}
                  <h1 className="font-display text-7xl lg:text-8xl font-semibold text-slate-900 mb-8 leading-[0.95] tracking-tight">
                    {stats.totalResumes > 0
                      ? <>Create your<br/><span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">next chapter</span></>
                      : <>Build something<br/><span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">remarkable</span></>
                    }
                  </h1>

                  <p className="text-2xl text-slate-600 mb-12 leading-relaxed max-w-2xl font-light tracking-wide">
                    {stats.totalResumes > 0
                      ? "Professional templates, intelligent insights, limitless possibilities."
                      : "AI-powered resume builder that understands what makes you unique."
                    }
                  </p>

                  <div className="flex flex-wrap gap-5 items-center">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="lg"
                        onClick={() => navigate("/builder")}
                        className="group/btn relative overflow-hidden bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base px-10 py-7 h-auto rounded-2xl shadow-[0_8px_30px_rgb(37,99,235,0.2)] hover:shadow-[0_20px_60px_rgb(37,99,235,0.3)] transition-all duration-500 cursor-pointer border-0"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                        <Zap className="w-5 h-5 mr-2.5 relative z-10" />
                        <span className="relative z-10">{stats.totalResumes > 0 ? "New Resume" : "Start Building"}</span>
                        <ArrowRight className="w-5 h-5 ml-2.5 relative z-10 group-hover/btn:translate-x-1 transition-transform duration-300" />
                      </Button>
                    </motion.div>

                    {stats.totalResumes > 0 && (
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => navigate("/my-resumes")}
                          className="border-[1.5px] border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-semibold text-base px-10 py-7 h-auto rounded-2xl cursor-pointer transition-all duration-300"
                        >
                          <Upload className="w-5 h-5 mr-2.5" />
                          My Resumes
                        </Button>
                      </motion.div>
                    )}

                    {stats.totalResumes === 0 && (
                      <span className="text-sm text-slate-500 flex items-center gap-2.5 font-medium">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-green-600" />
                        </div>
                        Free forever • No credit card
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards - Premium Design */}
          <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                layout
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? { duration: 0.1 } : {
                  ...springConfig,
                  delay: stat.delay,
                }}
                whileHover={{ y: -4 }}
                onClick={() => navigate(stat.path)}
                className="stat-card group cursor-pointer"
                style={{ willChange: 'transform' }}
              >
                <div className="relative p-8 bg-white border border-slate-200/60 hover:border-slate-300 rounded-3xl transition-all duration-500 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                  {/* Premium gradient accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-3xl`} />
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${stat.gradient} opacity-30 blur-sm group-hover:opacity-50 transition-opacity duration-500`} />

                  <div className="flex items-start justify-between mb-8">
                    <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-xl group-hover:shadow-blue-500/30 transition-all duration-500 group-hover:scale-110`}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1.5 transition-all duration-300" />
                  </div>

                  <div>
                    <p className="font-display text-6xl font-semibold text-slate-900 mb-3 tabular-nums tracking-tight group-hover:text-blue-600 transition-colors duration-500">
                      {stat.value}
                    </p>
                    <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest">{stat.label}</p>
                  </div>

                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500 pointer-events-none`} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tool Categories - Premium Layout */}
          <div className="space-y-7">
            <div className="flex items-center gap-5 mb-10">
              <h2 className="font-display text-4xl font-semibold text-slate-900 tracking-tight">
                Your Tools
              </h2>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-300 via-slate-200 to-transparent" />
            </div>

            {toolCategories.map((category, index) => (
              <Card
                key={category.id}
                ref={(el) => { if (el) categoriesRef.current[index] = el; }}
                className="border border-slate-200/60 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden bg-white rounded-3xl cursor-pointer"
              >
                {/* Category Header - Premium Design */}
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  className="relative w-full flex items-center justify-between p-7 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.gradient} flex items-center justify-center shadow-lg shadow-blue-500/15 group-hover:shadow-xl group-hover:shadow-blue-500/25 group-hover:scale-105 transition-all duration-500`}>
                      <category.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-display text-xl font-semibold text-slate-900 tracking-tight">{category.title}</h3>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">{category.tools.length} tools</p>
                    </div>
                  </div>

                  <ChevronDown
                    className={`w-6 h-6 text-slate-400 transition-all duration-500 ${
                      expandedCategory === category.id ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>

                {/* Category Tools - Premium Grid */}
                <AnimatePresence>
                  {expandedCategory === category.id && (
                    <motion.div
                      layout
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={smoothEase}
                      className="border-t border-slate-200/60 bg-gradient-to-b from-slate-50/40 to-white overflow-hidden"
                    >
                      <div className="p-7">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {category.tools.map((tool, toolIndex) => (
                            <motion.div
                              key={tool.path}
                              layout
                              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={prefersReducedMotion ? { duration: 0.1 } : {
                                ...springConfig,
                                damping: 24,
                                delay: toolIndex * 0.05
                              }}
                              whileHover={{ y: -2 }}
                              onClick={() => navigate(tool.path)}
                              className="group cursor-pointer"
                              style={{ willChange: 'transform' }}
                            >
                              <div className="relative p-6 rounded-2xl bg-white border border-slate-200/60 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden">
                                {/* Premium accent glow */}
                                <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-[0.04] blur-3xl transition-opacity duration-700`} />

                                <div className="relative">
                                  <div className="flex items-start justify-between mb-5">
                                    <div className={`relative w-13 h-13 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-md shadow-blue-500/15 group-hover:shadow-lg group-hover:shadow-blue-500/25 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}>
                                      <tool.icon className="w-6 h-6 text-white" />
                                    </div>
                                    {tool.badge && (
                                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs px-2.5 py-1">
                                        {tool.badge}
                                      </Badge>
                                    )}
                                  </div>
                                  <h4 className="font-display text-lg font-semibold text-slate-900 mb-2.5 tracking-tight group-hover:text-blue-600 transition-colors duration-300">
                                    {tool.title}
                                  </h4>
                                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                                    {tool.description}
                                  </p>
                                </div>

                                {/* Subtle hover arrow */}
                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                  <ArrowRight className="w-4 h-4 text-blue-600" />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>

          {/* Recent Activity - Premium List */}
          {stats.recentActivity.length > 0 && (
            <div className="mt-20">
              <div className="flex items-center gap-5 mb-10">
                <h2 className="font-display text-4xl font-semibold text-slate-900 tracking-tight">
                  Recent Activity
                </h2>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-300 via-slate-200 to-transparent" />
              </div>

              <Card className="border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] divide-y divide-slate-100 overflow-hidden bg-white rounded-3xl">
                {stats.recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 flex items-center gap-5 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-all duration-300 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/15 group-hover:shadow-lg group-hover:shadow-blue-500/25 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate text-base">{activity.name}</p>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">Updated {activity.date}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/my-resumes")}
                      className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 font-semibold cursor-pointer rounded-xl px-4 py-2"
                    >
                      View
                      <ChevronRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </Button>
                  </motion.div>
                ))}
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Premium Global Styles */}
      <style>{`
        /* Premium cursor styles */
        * {
          cursor: default;
        }

        button,
        a,
        [role="button"],
        .cursor-pointer {
          cursor: pointer;
        }

        input,
        textarea,
        select {
          cursor: text;
        }

        /* Custom cursor trail effect - optional enhancement */
        @media (hover: hover) and (pointer: fine) {
          button:hover,
          a:hover,
          .cursor-pointer:hover {
            cursor: pointer;
          }
        }

        /* Smooth scrolling with premium easing */
        html {
          scroll-behavior: smooth;
        }

        /* GPU acceleration for performance */
        .stat-card,
        .group,
        button {
          transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Premium text rendering */
        body {
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: "kern" 1, "liga" 1;
        }

        /* Smooth overflow scrolling */
        nav,
        main {
          -webkit-overflow-scrolling: touch;
        }

        /* Hide scrollbar but keep functionality */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }

        /* Premium selection color */
        ::selection {
          background-color: rgba(59, 130, 246, 0.2);
          color: inherit;
        }

        ::-moz-selection {
          background-color: rgba(59, 130, 246, 0.2);
          color: inherit;
        }
      `}</style>
    </div>
  );
}

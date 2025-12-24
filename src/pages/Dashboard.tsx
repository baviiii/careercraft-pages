import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { gsap } from "gsap";
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
  Crown,
  Bell,
  Award,
  Star,
  Flame,
} from "lucide-react";
import { Session } from "@supabase/supabase-js";

interface ResumeStats {
  totalResumes: number;
  totalCoverLetters: number;
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
    recentActivity: [],
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // GSAP Animation refs
  const navItemsRef = useRef<HTMLButtonElement[]>([]);
  const statsCardsRef = useRef<HTMLDivElement[]>([]);
  const quickActionsRef = useRef<HTMLDivElement[]>([]);
  const toolsRef = useRef<HTMLDivElement[]>([]);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // GSAP animations on mount
  useEffect(() => {
    if (loading) return;
    
    const ctx = gsap.context(() => {
      // Stagger animation for nav items
      if (navItemsRef.current.length > 0) {
        gsap.fromTo(
          navItemsRef.current.filter(Boolean),
          { x: -20, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: "power2.out", delay: 0.1 }
        );
      }

      // Stats cards animation
      if (statsCardsRef.current.length > 0) {
        gsap.fromTo(
          statsCardsRef.current.filter(Boolean),
          { y: 20, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.2 }
        );
      }

      // Quick actions animation
      if (quickActionsRef.current.length > 0) {
        gsap.fromTo(
          quickActionsRef.current.filter(Boolean),
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 0.4 }
        );
      }

      // Tools grid animation
      if (toolsRef.current.length > 0) {
        gsap.fromTo(
          toolsRef.current.filter(Boolean),
          { y: 20, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: "power2.out", delay: 0.5 }
        );
      }

      // Main content fade in
      if (mainContentRef.current) {
        gsap.fromTo(
          mainContentRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: "power2.out" }
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
        const [resumesRes, coverLettersRes] = await Promise.all([
          supabase.from('resumes').select('id, name, created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('cover_letters').select('id, created_at').eq('user_id', session.user.id),
        ]);

        const resumes = resumesRes.data || [];
        const coverLetters = coverLettersRes.data || [];

        setStats({
          totalResumes: resumes.length,
          totalCoverLetters: coverLetters.length,
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const quickActions = [
    {
      id: "build",
      icon: Zap,
      title: "Build Resume",
      description: "Create a polished resume",
      path: "/builder",
      gradient: "from-primary to-primary-glow",
      primary: true,
    },
    {
      id: "manage",
      icon: Upload,
      title: "My Resumes",
      description: "Manage your saved resumes",
      path: "/my-resumes",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      id: "analysis",
      icon: BarChart3,
      title: "ATS Analysis",
      description: "Check ATS compatibility",
      path: "/analysis",
      gradient: "from-purple-500 to-pink-500",
    },
  ];

  const tools = [
    {
      icon: Zap,
      title: "Resume Builder",
      description: "Create professional resumes with templates",
      path: "/builder",
      gradient: "from-primary to-primary-glow",
      featured: true,
    },
    {
      icon: Upload,
      title: "Resume Manager",
      description: "Upload, organize, and manage all your resumes",
      path: "/my-resumes",
      gradient: "from-blue-500 to-cyan-500",
      stats: `${stats.totalResumes} resumes`,
    },
    {
      icon: BarChart3,
      title: "ATS Analysis",
      description: "Analyze resume compatibility with job postings",
      path: "/analysis",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Sparkles,
      title: "AI Rewrite",
      description: "Transform bullet points with AI suggestions",
      path: "/rewrite",
      gradient: "from-orange-500 to-amber-500",
    },
    {
      icon: Mail,
      title: "Cover Letter",
      description: "Generate tailored cover letters instantly",
      path: "/cover-letter",
      gradient: "from-indigo-500 to-blue-500",
      stats: `${stats.totalCoverLetters} letters`,
    },
    {
      icon: Briefcase,
      title: "Job Tracker",
      description: "Track your job applications and status",
      path: "/tracker",
      gradient: "from-pink-500 to-rose-500",
    },
    {
      icon: Layout,
      title: "Template Builder",
      description: "Create and customize resume templates",
      path: "/templates",
      gradient: "from-teal-500 to-cyan-500",
    },
    {
      icon: Briefcase,
      title: "🇦🇺 Australian Jobs",
      description: "Browse jobs from SEEK, Indeed & more - Free!",
      path: "/au-jobs",
      gradient: "from-emerald-500 to-teal-500",
      featured: true,
    },
    {
      icon: Newspaper,
      title: "📊 Market News",
      description: "AU job market trends, news & insights",
      path: "/job-market-news",
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      icon: Brain,
      title: "🇦🇺 SA Career Hub",
      description: "AI coach & SA Government career resources",
      path: "/sa-career-hub",
      gradient: "from-purple-500 to-pink-500",
      featured: true,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50/30 flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'there';

  const sidebarLinks = [
    { icon: Home, label: "Dashboard", path: "/dashboard", active: location.pathname === "/dashboard" },
    { icon: BarChart3, label: "Intelligence", path: "/intelligence", active: location.pathname === "/intelligence" },
    { icon: Brain, label: "🇦🇺 SA Career Hub", path: "/sa-career-hub", active: location.pathname === "/sa-career-hub" },
    { icon: FileText, label: "My Resumes", path: "/my-resumes", active: location.pathname === "/my-resumes" },
    { icon: Mail, label: "Cover Letters", path: "/cover-letter", active: location.pathname === "/cover-letter" },
    { icon: Briefcase, label: "Job Tracker", path: "/tracker", active: location.pathname === "/tracker" },
    { icon: Briefcase, label: "🇦🇺 AU Jobs", path: "/au-jobs", active: location.pathname === "/au-jobs" },
    { icon: Newspaper, label: "📊 Market News", path: "/job-market-news", active: location.pathname === "/job-market-news" },
    { icon: Settings, label: "Settings", path: "/settings", active: location.pathname === "/settings" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50/30 relative overflow-hidden">
      {/* Premium Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white/50 to-sky-50/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(14,165,233,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.05),transparent_70%)]" />
        
        {/* Morphing Orbs */}
        <div className="absolute -top-40 right-[10%] w-[800px] h-[800px] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.20) 0%, rgba(139,92,246,0.10) 50%, transparent 70%)", animation: "morph 15s ease-in-out infinite, float-slow 12s ease-in-out infinite" }} />
        <div className="absolute top-[40%] -left-40 w-[700px] h-[700px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, rgba(59,130,246,0.08) 50%, transparent 70%)", animation: "morph 18s ease-in-out infinite reverse, float-slower 15s ease-in-out infinite" }} />
        <div className="absolute bottom-[-20%] right-[20%] w-[600px] h-[600px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(14,165,233,0.06) 50%, transparent 70%)", animation: "morph 20s ease-in-out infinite, glow-pulse 8s ease-in-out infinite" }} />

        {/* Grid & Particles */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
        <div className="absolute top-[15%] left-[5%] w-2 h-2 bg-blue-400/30 rounded-full" style={{ animation: "particle-float 10s ease-in-out infinite" }} />
        <div className="absolute top-[25%] right-[8%] w-3 h-3 bg-sky-400/25 rounded-full" style={{ animation: "particle-float 12s ease-in-out infinite 2s" }} />
        <div className="absolute top-[55%] left-[12%] w-2 h-2 bg-indigo-400/30 rounded-full" style={{ animation: "particle-float 11s ease-in-out infinite 1s" }} />
        <div className="absolute top-[70%] right-[15%] w-2.5 h-2.5 bg-blue-400/25 rounded-full" style={{ animation: "particle-float 13s ease-in-out infinite 3s" }} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Premium Glassmorphism Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-[300px] z-50 transform transition-all duration-500 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/60 to-sky-50/50 backdrop-blur-xl border-r border-blue-100/80 shadow-lg shadow-blue-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(14,165,233,0.08),transparent_60%)]" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-300/30 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-100/20 to-transparent" />

        <div className="relative p-6 h-full flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate("/")} className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-teal-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full border-2 border-slate-900 flex items-center justify-center animate-bounce-subtle">
                  <Crown className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">CareerCraft</span>
                <p className="text-xs text-slate-600">AI Career Platform</p>
              </div>
            </button>
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-600 hover:text-slate-900 hover:bg-blue-50" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Resumes", value: stats.totalResumes, icon: FileText },
              { label: "Letters", value: stats.totalCoverLetters, icon: Mail },
            ].map((stat, index) => (
              <div key={stat.label} ref={(el) => { if (el) statsCardsRef.current[index] = el; }}
                className="group relative p-4 rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-blue-100/60 shadow-md hover:shadow-lg hover:border-blue-300/80 transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-blue-50/30">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/20 flex items-center justify-center mb-2">
                    <stat.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800 mb-0.5">{stat.value}</p>
                  <span className="text-xs text-slate-600 font-medium">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1 overflow-y-auto pr-2 -mr-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4 px-3">Main Menu</p>
            {sidebarLinks.map((link, index) => (
              <button key={link.path} ref={(el) => { if (el) navItemsRef.current[index] = el; }}
                onClick={() => { navigate(link.path); setSidebarOpen(false); }}
                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  link.active ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-l-2 border-blue-500 shadow-sm"
                    : "text-slate-700 hover:text-blue-700 hover:bg-blue-50/50"
                }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  link.active ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25" : "bg-blue-50 group-hover:bg-blue-100"
                }`}>
                  <link.icon className={`w-4 h-4 ${link.active ? "text-white" : "text-blue-600"}`} />
                </div>
                <span className={`flex-1 text-left text-sm ${link.active ? "font-semibold" : "font-medium"}`}>{link.label}</span>
                {link.active && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                <ChevronRight className={`w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ${link.active ? "opacity-100 translate-x-0 text-blue-500" : "text-slate-400"}`} />
              </button>
            ))}
          </nav>

          {/* User Card */}
          <Card className="relative overflow-hidden p-4 bg-white/90 backdrop-blur-sm border-2 border-blue-100/60 hover:border-blue-300/80 transition-all duration-300 cursor-pointer group shadow-md hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-sky-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
            <div className="relative flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{userName}</p>
                <p className="text-xs text-slate-600 truncate">{session?.user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-center text-slate-700 hover:text-red-600 hover:bg-red-50 border-2 border-blue-100 hover:border-red-200 transition-all" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />Sign Out
            </Button>
          </Card>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[300px] relative min-h-screen">
        {/* Premium Floating Header */}
        <header className="sticky top-0 z-30 mx-4 mt-4 lg:mx-6">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xl border-2 border-blue-100/50 shadow-lg" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-sky-50/50" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_70%)]" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-300/30 to-transparent" />
            
            <div className="relative flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-600 hover:text-slate-900 hover:bg-blue-50" onClick={() => setSidebarOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800">Welcome back</h1>
                    <span className="text-2xl" style={{ animation: "wave 2s ease-in-out infinite" }}>👋</span>
                  </div>
                  <p className="text-sm text-slate-600">Ready to advance your career, <span className="text-blue-600 font-semibold">{userName}</span>?</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="relative p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-slate-700 hover:text-blue-700 transition-all duration-300 border-2 border-blue-100">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full border-2 border-white animate-pulse" />
                </button>
                <Button onClick={() => navigate("/builder")} className="hidden sm:flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-slate-700 hover:text-blue-700 border-2 border-blue-200 font-semibold">
                  <Zap className="w-4 h-4 text-yellow-500" />New Resume
                </Button>
                <Button onClick={() => navigate("/my-resumes")} className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 font-semibold">
                  <Upload className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Upload</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main ref={mainContentRef} className="p-4 md:p-6 lg:p-8 relative">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Resumes", value: stats.totalResumes || 0, change: "+2 this week", icon: FileText, color: "blue" },
              { label: "Cover Letters", value: stats.totalCoverLetters || 0, change: "+1 this week", icon: Mail, color: "teal" },
              { label: "Profile Views", value: "156", change: "+12%", icon: TrendingUp, color: "purple" },
              { label: "ATS Score", value: "92", change: "Excellent", icon: Award, color: "orange" },
            ].map((stat, idx) => (
              <div key={stat.label} ref={(el) => { if (el) statsCardsRef.current[idx + 2] = el; }}
                className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-blue-100/60 hover:border-blue-300/80 transition-all duration-300 cursor-pointer overflow-hidden shadow-md hover:shadow-lg bg-gradient-to-br from-white to-blue-50/30">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                  stat.color === "blue" ? "from-blue-500 to-blue-400" : stat.color === "teal" ? "from-teal-500 to-teal-400" : stat.color === "purple" ? "from-purple-500 to-purple-400" : "from-orange-500 to-orange-400"
                }`} />
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                  stat.color === "blue" ? "bg-blue-50/50" : stat.color === "teal" ? "bg-teal-50/50" : stat.color === "purple" ? "bg-purple-50/50" : "bg-orange-50/50"
                }`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      stat.color === "blue" ? "bg-blue-100" : stat.color === "teal" ? "bg-teal-100" : stat.color === "purple" ? "bg-purple-100" : "bg-orange-100"
                    }`}>
                      <stat.icon className={`w-5 h-5 ${
                        stat.color === "blue" ? "text-blue-600" : stat.color === "teal" ? "text-teal-600" : stat.color === "purple" ? "text-purple-600" : "text-orange-600"
                      }`} />
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">{stat.change}</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800 mb-1">{stat.value}</p>
                  <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <div key={action.id} ref={(el) => { if (el) quickActionsRef.current[index] = el; }}
                  onClick={() => navigate(action.path)}
                  className={`group relative p-5 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                    action.primary 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02]' 
                      : 'bg-white/90 backdrop-blur-sm border-2 border-blue-100/60 hover:border-blue-300/80 hover:scale-[1.02] shadow-md hover:shadow-lg bg-gradient-to-br from-white to-blue-50/30'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                      action.primary ? 'bg-white/20' : `bg-gradient-to-br ${action.gradient}`
                    }`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${action.primary ? 'text-white' : 'text-slate-800 group-hover:text-blue-600 transition-colors'}`}>{action.title}</h3>
                      <p className={`text-sm ${action.primary ? 'text-white/90' : 'text-slate-600'}`}>{action.description}</p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${action.primary ? 'text-white/80' : 'text-slate-500'} group-hover:translate-x-1 transition-transform`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Tools Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />All Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tools.map((tool, index) => (
                <div key={tool.path} ref={(el) => { if (el) toolsRef.current[index] = el; }}
                  onClick={() => navigate(tool.path)}
                  className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-blue-100/60 hover:border-blue-300/80 transition-all duration-300 cursor-pointer overflow-hidden hover:scale-[1.02] shadow-md hover:shadow-lg bg-gradient-to-br from-white to-blue-50/30">
                  <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <tool.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{tool.title}</h3>
                  <p className="text-sm text-slate-600 mb-2">{tool.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {tool.stats && <Badge className="bg-blue-100 text-blue-700 border border-blue-200 font-semibold">{tool.stats}</Badge>}
                    {tool.featured && <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 font-semibold">Popular</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {stats.recentActivity.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />Recent Activity
              </h2>
              <div className="rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-blue-100/60 overflow-hidden divide-y divide-blue-100/50 shadow-md">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="p-4 flex items-center gap-4 hover:bg-blue-50/50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{activity.name}</p>
                      <p className="text-sm text-slate-600">Resume updated</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />{activity.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

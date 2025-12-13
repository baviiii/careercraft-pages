import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";
import { Session } from "@supabase/supabase-js";

interface ResumeStats {
  totalResumes: number;
  totalCoverLetters: number;
  recentActivity: { type: string; name: string; date: string }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
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
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'there';

  const sidebarLinks = [
    { icon: Home, label: "Dashboard", path: "/dashboard", active: true },
    { icon: FileText, label: "My Resumes", path: "/my-resumes" },
    { icon: Mail, label: "Cover Letters", path: "/cover-letter" },
    { icon: Briefcase, label: "Job Tracker", path: "/tracker" },
    { icon: Brain, label: "Interview Prep", path: "/interview-prep" },
    { icon: Briefcase, label: "🇦🇺 AU Jobs", path: "/au-jobs" },
    { icon: Newspaper, label: "📊 Market News", path: "/job-market-news" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 mb-8 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">CareerCraft</span>
          </button>

          {/* Nav Links with GSAP refs */}
          <nav className="space-y-1">
            {sidebarLinks.map((link, index) => (
              <button
                key={link.path}
                ref={(el) => { if (el) navItemsRef.current[index] = el; }}
                onClick={() => {
                  navigate(link.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:translate-x-1 ${
                  link.active 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Welcome back, {userName}!
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/builder")} className="gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Resume</span>
            </Button>
          </div>
        </header>

        {/* Dashboard Content with GSAP animations */}
        <main ref={mainContentRef} className="p-4 md:p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: FileText, value: stats.totalResumes, label: "Total Resumes", color: "blue", trend: true },
              { icon: Mail, value: stats.totalCoverLetters, label: "Cover Letters", color: "purple" },
              { icon: Target, value: "--", label: "ATS Score Avg", color: "green" },
              { icon: Briefcase, value: "--", label: "Applications", color: "orange" },
            ].map((stat, i) => (
              <Card 
                key={stat.label} 
                ref={(el) => { if (el) statsCardsRef.current[i] = el; }}
                className="p-4 md:p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                  </div>
                  {stat.trend && <TrendingUp className="w-4 h-4 text-green-500" />}
                </div>
                <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <Card
                  key={action.id}
                  ref={(el) => { if (el) quickActionsRef.current[index] = el; }}
                  className={`p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group ${
                    action.primary ? 'bg-gradient-to-br from-primary to-primary-glow text-white border-0' : 'hover:border-primary/50'
                  }`}
                  onClick={() => navigate(action.path)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                      action.primary ? 'bg-white/20' : `bg-gradient-to-br ${action.gradient}`
                    }`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${action.primary ? '' : 'group-hover:text-primary transition-colors'}`}>
                        {action.title}
                      </h3>
                      <p className={`text-sm ${action.primary ? 'text-white/80' : 'text-muted-foreground'}`}>
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${action.primary ? 'text-white/60' : 'text-muted-foreground'} group-hover:translate-x-1 transition-transform`} />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* All Tools */}
          <div>
            <h2 className="text-lg font-semibold mb-4">All Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tools.map((tool, index) => (
                <Card
                  key={tool.path}
                  ref={(el) => { if (el) toolsRef.current[index] = el; }}
                  className="p-5 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-primary/50 hover:scale-[1.02]"
                  onClick={() => navigate(tool.path)}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <tool.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {tool.description}
                  </p>
                  {tool.stats && (
                    <p className="text-xs text-primary font-medium">{tool.stats}</p>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {stats.recentActivity.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              <Card className="divide-y divide-border">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{activity.name}</p>
                      <p className="text-sm text-muted-foreground">Resume uploaded</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {activity.date}
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

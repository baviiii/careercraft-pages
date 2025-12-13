import { useState, ReactNode, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gsap } from "gsap";
import {
  FileText,
  TrendingUp,
  Home,
  Menu,
  Briefcase,
  Bell,
  X,
  Heart,
  Mail,
  Brain,
  Newspaper,
  LogOut,
  Sparkles,
  Upload,
  BarChart3,
  Layout,
  Zap,
} from "lucide-react";

interface MainDashboardLayoutProps {
  children: ReactNode;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
  stats?: {
    totalResumes: number;
    totalCoverLetters: number;
  };
}

export default function MainDashboardLayout({
  children,
  userName = "User",
  userEmail = "",
  onSignOut,
  stats,
}: MainDashboardLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // GSAP Animation refs
  const navItemsRef = useRef<HTMLButtonElement[]>([]);
  const statsRef = useRef<HTMLDivElement[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Animate sidebar items on mount
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Stagger animation for nav items
      if (navItemsRef.current.length > 0) {
        gsap.fromTo(
          navItemsRef.current.filter(Boolean),
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out", delay: 0.2 }
        );
      }

      // Stagger animation for stats
      if (statsRef.current.length > 0) {
        gsap.fromTo(
          statsRef.current.filter(Boolean),
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power2.out", delay: 0.4 }
        );
      }

      // Card animation
      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { y: 30, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out", delay: 0.6 }
        );
      }

      // Main content fade in
      if (mainContentRef.current) {
        gsap.fromTo(
          mainContentRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.3 }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  const sidebarLinks = [
    { icon: Home, label: "Dashboard", path: "/dashboard", active: true },
    { icon: FileText, label: "My Resumes", path: "/my-resumes" },
    { icon: Zap, label: "Resume Builder", path: "/builder" },
    { icon: BarChart3, label: "ATS Analysis", path: "/analysis" },
    { icon: Mail, label: "Cover Letters", path: "/cover-letter" },
    { icon: Briefcase, label: "Job Tracker", path: "/tracker" },
    { icon: Brain, label: "Interview Prep", path: "/interview-prep" },
    { icon: Briefcase, label: "🇦🇺 AU Jobs", path: "/au-jobs", highlight: true },
    { icon: Newspaper, label: "📊 Market News", path: "/job-market-news" },
  ];

  const quickStats = [
    { label: "Resumes", value: stats?.totalResumes?.toString() || "0", icon: FileText },
    { label: "Letters", value: stats?.totalCoverLetters?.toString() || "0", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-violet-950/20 dark:to-indigo-950/30 relative overflow-hidden">
      {/* Beautiful Animated Background - Purple/Indigo Theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Strong Base Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100/60 via-transparent to-indigo-100/50 dark:from-violet-900/20 dark:to-indigo-900/15" />

        {/* Main Gradient Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.2),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.1),transparent_70%)]" />

        {/* Animated Floating Orbs */}
        <div
          className="absolute top-20 right-[20%] w-[500px] h-[500px] bg-gradient-to-br from-violet-400/30 to-indigo-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute top-[40%] -left-20 w-[400px] h-[400px] bg-gradient-to-br from-indigo-400/25 to-purple-500/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-20 right-[30%] w-[350px] h-[350px] bg-gradient-to-br from-purple-400/20 to-violet-500/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "6s", animationDelay: "2s" }}
        />
        <div
          className="absolute top-[60%] right-[10%] w-[300px] h-[300px] bg-gradient-to-br from-violet-400/15 to-indigo-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "7s", animationDelay: "0.5s" }}
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />

        {/* Floating Particles */}
        <div
          className="absolute top-[15%] left-[10%] w-3 h-3 bg-violet-500/50 rounded-full animate-bounce shadow-lg shadow-violet-500/50"
          style={{ animationDuration: "3s" }}
        />
        <div
          className="absolute top-[25%] right-[15%] w-4 h-4 bg-indigo-500/40 rounded-full animate-bounce shadow-lg shadow-indigo-500/50"
          style={{ animationDuration: "4s", animationDelay: "1s" }}
        />
        <div
          className="absolute top-[45%] left-[25%] w-3 h-3 bg-purple-500/45 rounded-full animate-bounce shadow-lg shadow-purple-500/50"
          style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-[65%] right-[25%] w-3.5 h-3.5 bg-violet-500/40 rounded-full animate-bounce shadow-lg shadow-violet-500/50"
          style={{ animationDuration: "4.5s", animationDelay: "1.5s" }}
        />

        {/* Gradient Lines */}
        <div className="absolute top-0 left-[20%] w-px h-full bg-gradient-to-b from-transparent via-violet-400/20 to-transparent" />
        <div className="absolute top-0 right-[30%] w-px h-full bg-gradient-to-b from-transparent via-indigo-400/20 to-transparent" />

        {/* Corner Accents */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-violet-400/15 via-indigo-400/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-400/15 via-purple-400/10 to-transparent" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Premium Sidebar with GSAP Animations */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 z-50 transform transition-all duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Background with Purple Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-violet-50/80 to-indigo-100/70 dark:from-slate-900 dark:via-violet-950/50 dark:to-indigo-950/40 backdrop-blur-xl border-r border-violet-200/50 dark:border-violet-800/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.1),transparent_60%)]" />

        <div className="relative p-6 h-full flex flex-col">
          {/* Logo Section */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-all duration-300 group-hover:scale-105">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-violet-400 to-indigo-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                  <Sparkles className="w-2 h-2 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  CareerCraft
                </span>
                <p className="text-xs text-muted-foreground">AI Resume Builder</p>
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {quickStats.map((stat, index) => (
              <div
                key={stat.label}
                ref={(el) => {
                  if (el) statsRef.current[index] = el;
                }}
                className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-violet-200/30 dark:border-violet-700/30"
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="w-4 h-4 text-violet-500" />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-violet-600 dark:text-violet-400">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Navigation with Stagger Animation */}
          <nav className="space-y-1 flex-1 overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
              Navigation
            </p>
            {sidebarLinks.map((link, index) => (
              <button
                key={link.path}
                ref={(el) => {
                  if (el) navItemsRef.current[index] = el;
                }}
                onClick={() => {
                  navigate(link.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:translate-x-1 transition-all duration-200 ${
                  link.active
                    ? "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                    : link.highlight
                    ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/50"
                }`}
              >
                <link.icon className="w-5 h-5" />
                <span className={link.active ? "font-medium" : ""}>{link.label}</span>
                {link.active && (
                  <Badge className="ml-auto bg-violet-500 text-white text-[10px] px-1.5">
                    Active
                  </Badge>
                )}
                {link.highlight && (
                  <Badge className="ml-auto bg-emerald-500 text-white text-[10px] px-1.5">
                    Free
                  </Badge>
                )}
              </button>
            ))}
          </nav>

          {/* User Card with Animation */}
          <Card
            ref={cardRef}
            className="p-4 bg-gradient-to-br from-violet-500 to-indigo-600 border-0 text-white hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{userName}</p>
                <p className="text-xs text-white/70 truncate">{userEmail}</p>
              </div>
            </div>
            {onSignOut && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
                onClick={onSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            )}
          </Card>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-80 relative">
        {/* Premium Header */}
        <header className="sticky top-0 z-30 bg-gradient-to-r from-white/95 via-violet-50/90 to-indigo-50/85 dark:from-slate-900/95 dark:via-violet-950/80 dark:to-indigo-950/75 backdrop-blur-xl border-b border-violet-200/50 dark:border-violet-800/50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.1),transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-100/20 to-indigo-100/30 dark:via-violet-900/10 dark:to-indigo-900/20" />
          <div className="relative flex items-center justify-between px-4 md:px-8 py-4">
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
                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  Dashboard
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Welcome back, {userName}!
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/builder")}
                className="border-violet-200 hover:bg-violet-50"
              >
                <Zap className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Resume</span>
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/my-resumes")}
                className="bg-gradient-to-r from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
              >
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </div>
          </div>
        </header>

        <main ref={mainContentRef} className="p-4 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

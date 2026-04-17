import { useState, ReactNode, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  ChevronRight,
  Star,
  Target,
  Award,
  Flame,
  Settings,
  Crown,
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
    <div className="min-h-screen bg-[#0a0f1a] relative overflow-hidden">
      {/* Premium Animated Background - Deep Navy with Vibrant Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Deep Navy Base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0d1526] to-[#0f172a]" />
        
        {/* Beautiful CSS Animated Gradient Background - Always Works */}
        <div 
          className="absolute inset-0"
          style={{
            zIndex: 0,
            background: `linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(99,102,241,0.3) 25%, rgba(139,92,246,0.28) 50%, rgba(20,184,166,0.3) 75%, rgba(14,165,233,0.25) 100%)`,
            backgroundSize: '400% 400%',
            animation: 'gradient-shift 12s ease infinite',
            mixBlendMode: 'screen',
            opacity: 0.6
          }}
        />
        
        {/* Radial gradient overlay for depth */}
        <div 
          className="absolute inset-0"
          style={{
            zIndex: 0,
            background: 'radial-gradient(circle at top right, rgba(59,130,246,0.2), transparent 50%), radial-gradient(circle at bottom left, rgba(20,184,166,0.15), transparent 50%)',
            opacity: 0.8
          }}
        />
        
        {/* Dark overlay to maintain dark theme */}
        <div className="absolute inset-0 bg-[#0a0f1a]/70" style={{ zIndex: 1 }} />
        
        {/* Ambient Gradient Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(251,146,60,0.04),transparent_40%)]" />

        {/* Large Morphing Gradient Orbs */}
        <div
          className="absolute -top-40 right-[10%] w-[800px] h-[800px] rounded-full opacity-60"
          style={{ 
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)",
            animation: "morph 15s ease-in-out infinite, float-slow 12s ease-in-out infinite" 
          }}
        />
        <div
          className="absolute top-[40%] -left-40 w-[700px] h-[700px] rounded-full opacity-50"
          style={{ 
            background: "radial-gradient(circle, rgba(20,184,166,0.12) 0%, rgba(59,130,246,0.06) 50%, transparent 70%)",
            animation: "morph 18s ease-in-out infinite reverse, float-slower 15s ease-in-out infinite" 
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[20%] w-[600px] h-[600px] rounded-full opacity-40"
          style={{ 
            background: "radial-gradient(circle, rgba(251,146,60,0.1) 0%, rgba(236,72,153,0.05) 50%, transparent 70%)",
            animation: "morph 20s ease-in-out infinite, glow-pulse 8s ease-in-out infinite" 
          }}
        />

        {/* Geometric Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
        
        {/* Diagonal Light Streaks */}
        <div className="absolute top-0 left-[15%] w-[2px] h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent transform -skew-x-12" />
        <div className="absolute top-0 right-[25%] w-[1px] h-full bg-gradient-to-b from-transparent via-teal-400/15 to-transparent transform skew-x-12" />
        <div className="absolute top-0 left-[45%] w-[1px] h-full bg-gradient-to-b from-transparent via-purple-500/10 to-transparent" />

        {/* Floating Particles */}
        <div className="absolute top-[15%] left-[5%] w-2 h-2 bg-blue-400/50 rounded-full" style={{ animation: "particle-float 10s ease-in-out infinite" }} />
        <div className="absolute top-[25%] right-[8%] w-3 h-3 bg-teal-400/40 rounded-full" style={{ animation: "particle-float 12s ease-in-out infinite 2s" }} />
        <div className="absolute top-[55%] left-[12%] w-2 h-2 bg-purple-400/45 rounded-full" style={{ animation: "particle-float 11s ease-in-out infinite 1s" }} />
        <div className="absolute top-[70%] right-[15%] w-2.5 h-2.5 bg-orange-400/35 rounded-full" style={{ animation: "particle-float 13s ease-in-out infinite 3s" }} />
        <div className="absolute top-[40%] left-[30%] w-1.5 h-1.5 bg-blue-300/40 rounded-full" style={{ animation: "particle-float 9s ease-in-out infinite 0.5s" }} />
        <div className="absolute top-[85%] left-[40%] w-2 h-2 bg-teal-300/30 rounded-full" style={{ animation: "particle-float 14s ease-in-out infinite 4s" }} />

        {/* Corner Accent Glows */}
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-bl from-blue-600/10 via-purple-600/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-gradient-to-tr from-teal-600/10 via-blue-600/5 to-transparent" />
        
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Premium Glassmorphism Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[300px] z-50 transform transition-all duration-500 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Glass Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-900/95 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-teal-500/5" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/30 to-transparent" />
        
        {/* Animated Glow Effect */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-teal-500/10 to-transparent" />

        <div className="relative p-6 h-full flex flex-col">
          {/* Logo Section with Glow */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 group"
            >
              <img 
                src="/logo.png" 
                alt="Hours Intelligence" 
                className="w-12 h-12 rounded-xl shadow-lg shadow-blue-500/30 object-contain"
              />
              <div>
                <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-400 to-blue-400">
                  Hours Intelligence
                </span>
                <p className="text-xs text-slate-400">Intelligence Platform</p>
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats Cards with 3D Effect */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {quickStats.map((stat, index) => (
              <div
                key={stat.label}
                ref={(el) => { if (el) statsRef.current[index] = el; }}
                className="group relative p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 cursor-pointer card-3d"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center">
                      <stat.icon className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white mb-0.5">{stat.value}</p>
                  <span className="text-xs text-slate-400">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Premium Navigation */}
          <nav className="space-y-1 flex-1 overflow-y-auto pr-2 -mr-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-4 px-3">
              Main Menu
            </p>
            {sidebarLinks.map((link, index) => (
              <button
                key={link.path}
                ref={(el) => { if (el) navItemsRef.current[index] = el; }}
                onClick={() => { navigate(link.path); setSidebarOpen(false); }}
                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  link.active
                    ? "bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent text-white border-l-2 border-blue-400"
                    : link.highlight
                    ? "text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  link.active 
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25" 
                    : link.highlight
                    ? "bg-teal-500/20 group-hover:bg-teal-500/30"
                    : "bg-slate-800/80 group-hover:bg-slate-700/80"
                }`}>
                  <link.icon className={`w-4 h-4 ${link.active ? "text-white" : ""}`} />
                </div>
                <span className={`flex-1 text-left text-sm ${link.active ? "font-semibold" : "font-medium"}`}>
                  {link.label}
                </span>
                {link.active && (
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                )}
                {link.highlight && (
                  <Badge className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[9px] px-2 border-0">
                    FREE
                  </Badge>
                )}
                <ChevronRight className={`w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ${link.active ? "opacity-100 translate-x-0" : ""}`} />
              </button>
            ))}
          </nav>

          {/* Settings Link */}
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300 mb-4"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Settings</span>
          </button>

          {/* Premium User Card */}
          <Card
            ref={cardRef}
            className="relative overflow-hidden p-4 bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 cursor-pointer group"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            
            <div className="relative flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-slate-800" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{userName}</p>
                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
              </div>
            </div>
            
            {onSignOut && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-slate-700/50 hover:border-red-500/30 transition-all"
                onClick={onSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            )}
          </Card>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[300px] relative min-h-screen">
        {/* Premium Floating Header */}
        <header className="sticky top-0 z-30 mx-4 mt-4 lg:mx-6">
          <div className="relative rounded-2xl overflow-hidden">
            {/* Glass Background */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-teal-500/5" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            
            <div className="relative flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                
                {/* Welcome Section */}
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-bold text-white">
                      Welcome back
                    </h1>
                    <span className="text-2xl animate-wave inline-block origin-bottom-right">👋</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Ready to advance your career, <span className="text-blue-400 font-medium">{userName}</span>?
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Notification Bell */}
                <button className="relative p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-all duration-300 group">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full border-2 border-slate-900 animate-pulse" />
                </button>
                
                {/* Quick Actions */}
                <Button
                  onClick={() => navigate("/builder")}
                  className="hidden sm:flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border-0 transition-all duration-300"
                >
                  <Zap className="w-4 h-4 text-yellow-400" />
                  New Resume
                </Button>
                
                <Button
                  onClick={() => navigate("/my-resumes")}
                  className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500 text-white border-0 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 btn-premium"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Upload</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content with Fade-in Animation */}
        <main ref={mainContentRef} className="p-4 md:p-6 lg:p-8 relative">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Applications", value: "24", change: "+12%", icon: Briefcase, color: "blue" },
              { label: "Interviews", value: "8", change: "+25%", icon: Target, color: "teal" },
              { label: "Profile Views", value: "156", change: "+8%", icon: TrendingUp, color: "purple" },
              { label: "Score", value: "92", change: "+5", icon: Award, color: "orange" },
            ].map((stat, idx) => (
              <div
                key={stat.label}
                className="group relative p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-all duration-300 cursor-pointer card-elevated overflow-hidden"
              >
                {/* Gradient Accent */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                  stat.color === "blue" ? "from-blue-500 to-blue-400" :
                  stat.color === "teal" ? "from-teal-500 to-teal-400" :
                  stat.color === "purple" ? "from-purple-500 to-purple-400" :
                  "from-orange-500 to-orange-400"
                }`} />
                
                {/* Hover Glow */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                  stat.color === "blue" ? "bg-blue-500/5" :
                  stat.color === "teal" ? "bg-teal-500/5" :
                  stat.color === "purple" ? "bg-purple-500/5" :
                  "bg-orange-500/5"
                }`} />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      stat.color === "blue" ? "bg-blue-500/20" :
                      stat.color === "teal" ? "bg-teal-500/20" :
                      stat.color === "purple" ? "bg-purple-500/20" :
                      "bg-orange-500/20"
                    }`}>
                      <stat.icon className={`w-5 h-5 ${
                        stat.color === "blue" ? "text-blue-400" :
                        stat.color === "teal" ? "text-teal-400" :
                        stat.color === "purple" ? "text-purple-400" :
                        "text-orange-400"
                      }`} />
                    </div>
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Children Content */}
          {children}
        </main>
      </div>
    </div>
  );
}

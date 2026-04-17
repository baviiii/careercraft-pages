/**
 * UnifiedLayout - Comprehensive layout for Intelligence & SA Career Hub
 * 
 * Provides:
 * - Consistent sidebar navigation
 * - Authentication handling
 * - Responsive design
 * - Unified styling across all intelligence and career hub pages
 */

import { useEffect, useState, useRef, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import {
  Globe,
  Brain,
  Home,
  FileText,
  Mail,
  Briefcase,
  Newspaper,
  Settings,
  LogOut,
  Menu,
  X,
  Crown,
  ChevronRight,
  Bell,
  LayoutDashboard,
  Compass,
  TrendingUp,
  MessageSquareText,
  BarChart3,
  Building2,
  Activity,
  Sparkles,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface UnifiedLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  headerActions?: ReactNode;
  fullWidth?: boolean;
}

interface NavLink {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string;
  description?: string;
  section?: "intelligence" | "career" | "tools";
}

const navigationLinks: NavLink[] = [
  // Intelligence Section
  {
    icon: LayoutDashboard,
    label: "Intelligence Overview",
    path: "/intelligence",
    section: "intelligence",
    description: "AI-powered insights & analysis",
  },
  {
    icon: Globe,
    label: "Career Hub",
    path: "/sa-career-hub",
    section: "career",
    description: "AI-powered chat & exploration",
    badge: "New",
  },
  {
    icon: Compass,
    label: "Career Explorer",
    path: "/career-explorer",
    section: "intelligence",
    description: "Interactive sector analysis",
  },
  {
    icon: TrendingUp,
    label: "Market Trends",
    path: "/market-trends",
    section: "intelligence",
    description: "Real-time job & skills trends",
  },
  
  // Career Tools Section
  {
    icon: FileText,
    label: "My Resumes",
    path: "/my-resumes",
    section: "tools",
    description: "Resume builder & manager",
  },
  {
    icon: Mail,
    label: "Cover Letters",
    path: "/cover-letter",
    section: "tools",
  },
  {
    icon: Briefcase,
    label: "Job Tracker",
    path: "/tracker",
    section: "tools",
  },
  {
    icon: Briefcase,
    label: "🇦🇺 AU Jobs",
    path: "/au-jobs",
    section: "tools",
  },
  {
    icon: Newspaper,
    label: "📊 Market News",
    path: "/job-market-news",
    section: "tools",
  },
  {
    icon: BarChart3,
    label: "Policy Insights",
    path: "/policy",
    section: "tools",
    description: "Government investment data",
  },
];

export function UnifiedLayout({
  children,
  title,
  subtitle,
  showSearch = false,
  onSearch,
  headerActions,
  fullWidth = false,
}: UnifiedLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // Session tracking for heartbeat and activity monitoring
  const { trackEvent } = useSessionTracking(session);

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

  useEffect(() => {
    if (loading || !mainContentRef.current) return;
    
    const ctx = gsap.context(() => {
      if (mainContentRef.current) {
        gsap.fromTo(
          mainContentRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
        );
      }
    });

    return () => ctx.revert();
  }, [loading, location.pathname]);

  const handleSignOut = async () => {
    try {
      await trackEvent('logout');
    } catch (_) {
      // don't block sign out if tracking fails
    }
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    navigate("/auth");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userName = session?.user?.user_metadata?.full_name || 
                   session?.user?.email?.split('@')[0] || 'there';

  const intelligenceLinks = navigationLinks.filter(l => l.section === "intelligence");
  const careerLinks = navigationLinks.filter(l => l.section === "career");
  const toolLinks = navigationLinks.filter(l => l.section === "tools");

  return (
    <div className="min-h-screen bg-[#0a0f1a] relative overflow-hidden">
      {/* Premium Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0d1526] to-[#0f172a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_60%)]" />
        
        {/* Morphing Orbs */}
        <div className="absolute -top-40 right-[10%] w-[800px] h-[800px] rounded-full opacity-60"
          style={{ 
            background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.08) 50%, transparent 70%)", 
            animation: "morph 15s ease-in-out infinite, float-slow 12s ease-in-out infinite" 
          }} 
        />
        <div className="absolute top-[40%] -left-40 w-[700px] h-[700px] rounded-full opacity-50"
          style={{ 
            background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(168,85,247,0.06) 50%, transparent 70%)", 
            animation: "morph 18s ease-in-out infinite reverse, float-slower 15s ease-in-out infinite" 
          }} 
        />

        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-[300px] z-50 transform transition-all duration-500 ease-out lg:translate-x-0",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-900/95 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-pink-500/5" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-purple-500/30 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-500/10 to-transparent" />

        <div className="relative p-6 h-full flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigate("/")} 
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full border-2 border-slate-900 flex items-center justify-center animate-bounce-subtle">
                  <Crown className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">HOURS</span>
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

          {/* Navigation */}
          <nav className="space-y-4 flex-1 overflow-y-auto pr-2 -mr-2">
            {/* Intelligence Section */}
            {intelligenceLinks.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3 px-3">
                  Intelligence
                </p>
                <div className="space-y-1">
                  {intelligenceLinks.map((link) => (
                    <NavButton
                      key={link.path}
                      link={link}
                      isActive={isActive(link.path)}
                      onClick={() => {
                        navigate(link.path);
                        setSidebarOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Career Section */}
            {careerLinks.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3 px-3">
                  Career Hub
                </p>
                <div className="space-y-1">
                  {careerLinks.map((link) => (
                    <NavButton
                      key={link.path}
                      link={link}
                      isActive={isActive(link.path)}
                      onClick={() => {
                        navigate(link.path);
                        setSidebarOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tools Section */}
            {toolLinks.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3 px-3">
                  Tools
                </p>
                <div className="space-y-1">
                  {toolLinks.map((link) => (
                    <NavButton
                      key={link.path}
                      link={link}
                      isActive={isActive(link.path)}
                      onClick={() => {
                        navigate(link.path);
                        setSidebarOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Additional Links */}
            <div className="space-y-1">
              <NavButton
                link={{
                  icon: Home,
                  label: "Dashboard",
                  path: "/dashboard",
                  section: "tools",
                }}
                isActive={isActive("/dashboard")}
                onClick={() => {
                  navigate("/dashboard");
                  setSidebarOpen(false);
                }}
              />
            </div>
          </nav>

          {/* User Card */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-slate-700/50">
            <div className="relative flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-slate-800" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{userName}</p>
                <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-slate-700/50 hover:border-slate-600/50 transition-all" 
                onClick={() => {
                  navigate("/settings");
                  setSidebarOpen(false);
                }}
              >
                <Settings className="w-4 h-4 mr-2" />Settings
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-slate-700/50 hover:border-red-500/30 transition-all" 
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />Sign Out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[300px] relative min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 mx-4 mt-4 lg:mx-6">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            
            <div className="relative flex flex-col gap-4 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10" 
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      {title || "Dashboard"}
                      {location.pathname === "/intelligence" && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                          <Activity className="w-3 h-3 animate-pulse" />
                          Live
                        </Badge>
                      )}
                    </h1>
                    <p className="text-sm text-slate-400">
                      {subtitle || "Your intelligence and career platform"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {headerActions}
                  <button className="relative p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-all duration-300">
                    <Bell className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              {showSearch && (
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Brain className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search careers, skills, funding programs..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main 
          ref={mainContentRef} 
          className={cn(
            "p-4 md:p-6 lg:p-8 relative",
            fullWidth && "p-0"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Navigation Button Component
 */
function NavButton({
  link,
  isActive,
  onClick,
}: {
  link: NavLink;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = link.icon;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
        isActive
          ? "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent text-white border-l-2 border-purple-400"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300",
        isActive 
          ? "bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/25" 
          : "bg-slate-800/80 group-hover:bg-slate-700/80"
      )}>
        <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm",
            isActive ? "font-semibold text-white" : "font-medium text-slate-400 group-hover:text-white"
          )}>
            {link.label}
          </span>
          {link.badge && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1.5 py-0">
              {link.badge}
            </Badge>
          )}
        </div>
        {link.description && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{link.description}</p>
        )}
      </div>
      {isActive && <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />}
      <ChevronRight className={cn(
        "w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex-shrink-0",
        isActive && "opacity-100 translate-x-0"
      )} />
    </button>
  );
}

export default UnifiedLayout;


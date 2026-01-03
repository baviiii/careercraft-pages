import { useState, ReactNode, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { gsap } from "gsap";
import {
  Newspaper,
  TrendingUp,
  Home,
  Menu,
  Briefcase,
  Search,
  Bell,
  Settings,
  ChevronRight,
  Sparkles,
  Activity,
  BarChart3,
  Globe,
  X,
  Calendar,
  ArrowUpRight,
  Heart,
  RefreshCw,
  Zap,
} from "lucide-react";

interface JobsDashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  stats?: {
    totalJobs: number;
    avgSalary: string;
    hotSkills?: string[];
  } | null;
  savedJobsCount?: number;
}

export default function JobsDashboardLayout({
  children,
  activeTab,
  onTabChange,
  onRefresh,
  isLoading,
  stats,
  savedJobsCount = 0,
}: JobsDashboardLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // GSAP Animation refs
  const sidebarRef = useRef<HTMLElement>(null);
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
          { x: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 0.2 }
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
          { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out", delay: 0.7 }
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

  // Tab change animation
  useEffect(() => {
    if (mainContentRef.current) {
      gsap.fromTo(
        mainContentRef.current,
        { opacity: 0.7, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [activeTab]);

  const tabs = [
    {
      id: "jobs",
      label: "Job Listings",
      icon: Briefcase,
      description: "Browse Australian jobs",
      color: "from-emerald-500 to-teal-600",
    },
    {
      id: "saved",
      label: "Saved",
      icon: Heart,
      description: "Your saved jobs",
      color: "from-rose-500 to-pink-600",
      badge: savedJobsCount > 0 ? savedJobsCount : undefined,
    },
    {
      id: "analysis",
      label: "AI Analysis",
      icon: BarChart3,
      description: "Market insights & trends",
      color: "from-violet-500 to-purple-600",
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: Bell,
      description: "Job notifications",
      color: "from-amber-500 to-orange-600",
    },
  ];

  const quickStats = stats
    ? [
        { label: "Active Jobs", value: stats.totalJobs.toLocaleString(), change: "+12%", up: true },
        { label: "Avg Salary", value: stats.avgSalary, change: "+8%", up: true },
        { label: "Hot Skills", value: `${stats.hotSkills?.length || 10}+`, change: "+5%", up: true },
      ]
    : [
        { label: "Active Jobs", value: "47.2K", change: "+12%", up: true },
        { label: "Avg Salary", value: "$125K", change: "+8%", up: true },
        { label: "Hot Skills", value: "15+", change: "+5%", up: true },
      ];

  const notifications = [
    {
      id: 1,
      type: "surge",
      title: "New Jobs Alert",
      message: "50+ new tech jobs in Sydney",
      time: "2h ago",
    },
    {
      id: 2,
      type: "salary",
      title: "Salary Update",
      message: "Senior Dev salaries increased 8%",
      time: "5h ago",
    },
    {
      id: 3,
      type: "trend",
      title: "Hot Skill",
      message: "AI/ML roles growing rapidly",
      time: "1d ago",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/50 to-cyan-50 dark:from-slate-950 dark:via-emerald-950/30 dark:to-teal-950/20 relative overflow-hidden">
      {/* Beautiful Animated Background - Green Theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Strong Base Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/80 via-transparent to-teal-100/60 dark:from-emerald-900/30 dark:to-teal-900/20" />

        {/* Main Gradient Mesh - Increased Opacity */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.25),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,150,105,0.15),transparent_70%)]" />

        {/* Animated Floating Orbs - More Visible */}
        <div
          className="absolute top-20 right-[20%] w-[500px] h-[500px] bg-gradient-to-br from-emerald-400/40 to-teal-500/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute top-[40%] -left-20 w-[400px] h-[400px] bg-gradient-to-br from-teal-400/35 to-cyan-500/25 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-20 right-[30%] w-[350px] h-[350px] bg-gradient-to-br from-cyan-400/30 to-emerald-500/25 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "6s", animationDelay: "2s" }}
        />
        <div
          className="absolute top-[60%] right-[10%] w-[300px] h-[300px] bg-gradient-to-br from-emerald-400/25 to-teal-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "7s", animationDelay: "0.5s" }}
        />

        {/* Grid Pattern - More Visible */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.07)_1px,transparent_1px)] bg-[size:50px_50px]" />

        {/* Floating Particles - Larger & More Visible */}
        <div
          className="absolute top-[15%] left-[10%] w-3 h-3 bg-emerald-500/60 rounded-full animate-bounce shadow-lg shadow-emerald-500/50"
          style={{ animationDuration: "3s" }}
        />
        <div
          className="absolute top-[25%] right-[15%] w-4 h-4 bg-teal-500/50 rounded-full animate-bounce shadow-lg shadow-teal-500/50"
          style={{ animationDuration: "4s", animationDelay: "1s" }}
        />
        <div
          className="absolute top-[45%] left-[25%] w-3 h-3 bg-cyan-500/55 rounded-full animate-bounce shadow-lg shadow-cyan-500/50"
          style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-[65%] right-[25%] w-3.5 h-3.5 bg-emerald-500/50 rounded-full animate-bounce shadow-lg shadow-emerald-500/50"
          style={{ animationDuration: "4.5s", animationDelay: "1.5s" }}
        />
        <div
          className="absolute top-[80%] left-[40%] w-3 h-3 bg-teal-500/45 rounded-full animate-bounce shadow-lg shadow-teal-500/50"
          style={{ animationDuration: "5s", animationDelay: "2s" }}
        />

        {/* Gradient Lines - More Visible */}
        <div className="absolute top-0 left-[20%] w-px h-full bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent" />
        <div className="absolute top-0 right-[30%] w-px h-full bg-gradient-to-b from-transparent via-teal-400/30 to-transparent" />
        <div className="absolute top-0 left-[50%] w-px h-full bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent" />

        {/* Corner Accents - Stronger */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-emerald-400/25 via-teal-400/15 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal-400/25 via-cyan-400/15 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-300/10 via-teal-300/15 to-cyan-300/10 rounded-full blur-3xl" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Premium Sidebar with GSAP Animations */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-80 z-50 transform transition-all duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Background with Strong Green Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-emerald-50/80 to-teal-100/70 dark:from-slate-900 dark:via-emerald-950/50 dark:to-teal-950/40 backdrop-blur-xl border-r border-emerald-200/50 dark:border-emerald-800/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.2),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(20,184,166,0.15),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-teal-200/50 via-emerald-100/30 to-transparent dark:from-teal-900/30 dark:via-emerald-900/20 dark:to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-emerald-100/60 to-transparent dark:from-emerald-900/30 dark:to-transparent" />

        <div className="relative p-6 h-full flex flex-col">
          {/* Logo Section */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all duration-300 group-hover:scale-105">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">AU</span>
                </div>
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  AU Jobs
                </span>
                <p className="text-xs text-muted-foreground">Australian Job Board</p>
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Quick Stats with Stagger Animation */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {quickStats.map((stat, i) => (
              <div
                key={i}
                ref={(el) => {
                  if (el) statsRef.current[i] = el;
                }}
                className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-800/30 border border-emerald-200/50 dark:border-emerald-700/50 hover:scale-105 hover:border-emerald-400/50 transition-all duration-300 cursor-pointer"
              >
                <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
                <p className={`text-[10px] font-medium ${stat.up ? "text-emerald-600" : "text-rose-600"}`}>
                  {stat.change}
                </p>
              </div>
            ))}
          </div>

          {/* Navigation with Stagger Animation */}
          <nav className="space-y-2 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
              Navigation
            </p>
            <button
              ref={(el) => {
                if (el) navItemsRef.current[0] = el;
              }}
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-emerald-100/50 dark:hover:bg-emerald-800/30 hover:translate-x-1 transition-all duration-200"
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) navItemsRef.current[index + 1] = el;
                }}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:translate-x-1 transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                    : "text-muted-foreground hover:bg-emerald-100/50 dark:hover:bg-emerald-800/30"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className={activeTab === tab.id ? "font-medium" : ""}>{tab.label}</span>
                {tab.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {tab.badge}
                  </Badge>
                )}
                {activeTab === tab.id && (
                  <Badge className="ml-auto bg-emerald-500 text-white text-[10px] px-1.5">Active</Badge>
                )}
              </button>
            ))}

            <button
              ref={(el) => {
                if (el) navItemsRef.current[tabs.length + 1] = el;
              }}
              onClick={() => navigate("/job-market-news")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-emerald-100/50 dark:hover:bg-emerald-800/30 hover:translate-x-1 transition-all duration-200"
            >
              <Newspaper className="w-5 h-5" />
              <span>Market News</span>
            </button>
          </nav>

          {/* AI Insights Card with Animation */}
          <Card
            ref={cardRef}
            className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">AI Insights</p>
                <p className="text-xs text-white/70">Analyze job trends</p>
              </div>
            </div>
            <p className="text-xs text-white/80 mb-3">
              Get AI-powered insights on salary trends, hot skills, and market predictions.
            </p>
            <Button
              size="sm"
              className="w-full bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
              onClick={() => onTabChange("analysis")}
            >
              View Analysis
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Card>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-80 relative">
        {/* Premium Header */}
        <header className="sticky top-0 z-30 bg-gradient-to-r from-white/95 via-emerald-50/90 to-teal-50/85 dark:from-slate-900/95 dark:via-emerald-950/80 dark:to-teal-950/75 backdrop-blur-xl border-b border-emerald-200/50 dark:border-emerald-800/50">
          {/* Header Gradient Accent */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-100/30 to-teal-100/40 dark:via-emerald-900/20 dark:to-teal-900/30" />
          <div className="relative flex items-center justify-between px-4 md:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Tab Navigation - Premium Style */}
              <div className="hidden md:flex items-center gap-1 p-1 bg-emerald-100/80 dark:bg-emerald-800/40 rounded-2xl">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50"
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-emerald-500" : ""}`} />
                    {tab.label}
                    {tab.badge && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {tab.badge}
                      </Badge>
                    )}
                    {activeTab === tab.id && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  <Search className="w-5 h-5" />
                </Button>
                {searchOpen && (
                  <div className="absolute right-0 top-12 w-80 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-700 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Input
                      placeholder="Search jobs, skills, companies..."
                      className="rounded-xl border-emerald-200 focus:border-emerald-400"
                      autoFocus
                    />
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Popular searches</p>
                      {["Software Engineer", "Remote Jobs", "AI/ML", "Sydney"].map((term) => (
                        <button
                          key={term}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                        >
                          <Search className="w-3 h-3 text-muted-foreground" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl relative hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </Button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-700 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="p-4 border-b border-emerald-200 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Notifications</h3>
                        <Badge className="bg-emerald-500 text-white text-xs">3 new</Badge>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="p-4 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer border-b border-emerald-100 dark:border-emerald-800/50 last:border-0"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                notif.type === "surge"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : notif.type === "salary"
                                  ? "bg-amber-100 text-amber-600"
                                  : "bg-teal-100 text-teal-600"
                              }`}
                            >
                              {notif.type === "surge" ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : notif.type === "salary" ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : (
                                <Zap className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{notif.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-emerald-200 dark:border-emerald-700">
                      <Button variant="ghost" size="sm" className="w-full hover:bg-emerald-50">
                        View all notifications
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Refresh */}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="rounded-xl hidden sm:flex border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              )}

              {/* Settings */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                onClick={() => onTabChange("alerts")}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Tab Navigation */}
          <div className="md:hidden px-4 pb-4">
            <div className="flex items-center gap-1 p-1 bg-emerald-100/80 dark:bg-emerald-800/40 rounded-2xl overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Tab Description Bar */}
          <div className="px-4 md:px-8 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl bg-gradient-to-br ${
                    tabs.find((t) => t.id === activeTab)?.color || "from-emerald-500 to-teal-600"
                  } text-white shadow-lg`}
                >
                  {(() => {
                    const Icon = tabs.find((t) => t.id === activeTab)?.icon || Briefcase;
                    return <Icon className="w-5 h-5" />;
                  })()}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    {tabs.find((t) => t.id === activeTab)?.label || "Jobs"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {tabs.find((t) => t.id === activeTab)?.description || "Browse jobs"} • Australian Job Market
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="outline" className="rounded-full text-xs gap-1 border-emerald-200">
                  <Globe className="w-3 h-3" /> Australia
                </Badge>
                <Badge variant="outline" className="rounded-full text-xs gap-1 border-emerald-200">
                  <Calendar className="w-3 h-3" /> Live Data
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content with Animation */}
        <main ref={mainContentRef} className="p-4 md:p-8 relative">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative px-4 md:px-8 py-6 border-t border-emerald-200/50 dark:border-emerald-800/50 overflow-hidden">
          {/* Footer Background - More Visible */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/70 via-teal-50/60 to-cyan-100/70 dark:from-emerald-950/50 dark:via-teal-950/40 dark:to-cyan-950/50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.2),transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-teal-100/50 to-transparent dark:from-teal-900/30 dark:to-transparent" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2025 Horus Intelligence. Intelligence-Powered Insights.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">Live job listings</span>
              </span>
              <span className="px-3 py-1.5 bg-teal-500/10 rounded-full text-teal-700 dark:text-teal-400 font-medium">
                Updated in real-time
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Click outside to close dropdowns */}
      {(searchOpen || notificationsOpen) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setSearchOpen(false);
            setNotificationsOpen(false);
          }}
        />
      )}
    </div>
  );
}

import { useState, ReactNode, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { gsap } from "gsap";
import {
  Newspaper,
  TrendingUp,
  Lightbulb,
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
  Zap,
  X,
  Filter,
  Calendar,
  ArrowUpRight,
  Users,
  Building2,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  onRefresh,
  isLoading,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // GSAP Animation refs
  const sidebarRef = useRef<HTMLElement>(null);
  const navItemsRef = useRef<HTMLButtonElement[]>([]);
  const statsRef = useRef<HTMLDivElement[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);

  // Animate sidebar items on mount
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Stagger animation for nav items
      if (navItemsRef.current.length > 0) {
        gsap.fromTo(
          navItemsRef.current,
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 0.2 }
        );
      }
      
      // Stagger animation for stats
      if (statsRef.current.length > 0) {
        gsap.fromTo(
          statsRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power2.out", delay: 0.4 }
        );
      }
      
      // Card animation
      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.7 }
        );
      }
    });
    
    return () => ctx.revert();
  }, []);

  const tabs = [
    {
      id: "news",
      label: "News Feed",
      icon: Newspaper,
      description: "Latest job market updates",
      color: "from-blue-500 to-indigo-600",
    },
    {
      id: "trends",
      label: "Analytics",
      icon: BarChart3,
      description: "Market trends & data",
      color: "from-emerald-500 to-teal-600",
    },
    {
      id: "insights",
      label: "AI Insights",
      icon: Sparkles,
      description: "Predictions & opportunities",
      color: "from-violet-500 to-purple-600",
    },
  ];

  const quickStats = [
    { label: "Active Jobs", value: "47.2K", change: "+12%", up: true },
    { label: "Avg Salary", value: "$125K", change: "+8%", up: true },
    { label: "Remote %", value: "23%", change: "+5%", up: true },
  ];

  const notifications = [
    {
      id: 1,
      type: "surge",
      title: "Hiring Surge Detected",
      message: "Tech sector up 15% this week",
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
      title: "New Trend",
      message: "AI/ML roles growing rapidly",
      time: "1d ago",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50/30 relative overflow-hidden">
      {/* Beautiful Animated Background - Blue/White Theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Clean Base Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white/50 to-sky-50/60" />

        {/* Soft Gradient Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(14,165,233,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.05),transparent_70%)]" />

        {/* Elegant Floating Orbs */}
        <div
          className="absolute top-10 right-[15%] w-[600px] h-[600px] bg-gradient-to-br from-blue-400/20 to-sky-300/15 rounded-full blur-[100px]"
          style={{ animation: "float-slow 8s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[50%] -left-32 w-[500px] h-[500px] bg-gradient-to-br from-sky-400/15 to-blue-300/10 rounded-full blur-[80px]"
          style={{ animation: "float-slower 10s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-10 right-[25%] w-[400px] h-[400px] bg-gradient-to-br from-blue-300/15 to-cyan-300/10 rounded-full blur-[90px]"
          style={{ animation: "glow-pulse 6s ease-in-out infinite" }}
        />

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {/* Floating Dots */}
        <div
          className="absolute top-[20%] left-[8%] w-2 h-2 bg-blue-400/40 rounded-full shadow-lg shadow-blue-400/30"
          style={{ animation: "float 4s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[30%] right-[12%] w-3 h-3 bg-sky-400/30 rounded-full shadow-lg shadow-sky-400/30"
          style={{ animation: "float 5s ease-in-out infinite 1s" }}
        />

        {/* Elegant Gradient Lines */}
        <div className="absolute top-0 left-[25%] w-px h-full bg-gradient-to-b from-transparent via-blue-300/15 to-transparent" />
        <div className="absolute top-0 right-[35%] w-px h-full bg-gradient-to-b from-transparent via-sky-300/10 to-transparent" />

        {/* Corner Glow */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-blue-200/20 via-sky-200/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-sky-200/15 via-blue-200/10 to-transparent" />
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
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-80 z-50 transform transition-all duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Background with Blue Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/60 to-sky-50/50 backdrop-blur-xl border-r border-blue-100/80 shadow-lg shadow-blue-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(14,165,233,0.08),transparent_60%)]" />
        
        <div className="relative p-6 h-full flex flex-col">
          {/* Logo Section */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-md">
                  <span className="text-[8px] text-white font-bold">AU</span>
                </div>
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Market Intel
                </span>
                <p className="text-xs text-muted-foreground">
                  Australian Jobs
                </p>
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

          {/* Quick Stats with Stagger Animation */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {quickStats.map((stat, i) => (
              <motion.div
                key={i}
                ref={(el) => { if (el) statsRef.current[i] = el; }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="p-3 rounded-xl bg-white/90 backdrop-blur-sm border-2 border-blue-100/60 shadow-md hover:shadow-lg transition-all cursor-pointer hover:border-blue-300/80 bg-gradient-to-br from-white to-blue-50/30"
              >
                <p className="text-lg font-bold text-slate-800 mb-1">
                  {stat.value}
                </p>
                <p className="text-[10px] text-slate-600 truncate font-medium">
                  {stat.label}
                </p>
                <p
                  className={`text-[10px] font-bold mt-1 ${
                    stat.up ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {stat.change}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Navigation with Stagger Animation */}
          <nav className="space-y-2 flex-1">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 px-3">
              Navigation
            </p>
            <button
              ref={(el) => { if (el) navItemsRef.current[0] = el; }}
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-blue-50/80 hover:text-blue-700 hover:translate-x-1 transition-all duration-200 font-medium"
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              ref={(el) => { if (el) navItemsRef.current[1] = el; }}
              onClick={() => navigate("/australian-jobs")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-blue-50/80 hover:text-blue-700 hover:translate-x-1 transition-all duration-200 font-medium"
            >
              <Briefcase className="w-5 h-5" />
              <span>Job Listings</span>
            </button>
            <button
              ref={(el) => { if (el) navItemsRef.current[2] = el; }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-2 border-blue-300/50 shadow-sm hover:shadow-md hover:translate-x-1 transition-all duration-200 font-semibold"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Market Intel</span>
              <Badge className="ml-auto bg-blue-500 text-white text-[10px] px-1.5">
                Live
              </Badge>
            </button>
            <button
              ref={(el) => { if (el) navItemsRef.current[3] = el; }}
              onClick={() => navigate("/resume-builder")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-blue-50/80 hover:text-blue-700 hover:translate-x-1 transition-all duration-200 font-medium"
            >
              <Users className="w-5 h-5" />
              <span>Resume Builder</span>
            </button>
            <button
              ref={(el) => { if (el) navItemsRef.current[4] = el; }}
              onClick={() => navigate("/interview-prep")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-blue-50/80 hover:text-blue-700 hover:translate-x-1 transition-all duration-200 font-medium"
            >
              <Sparkles className="w-5 h-5" />
              <span>Interview Prep</span>
            </button>
          </nav>

          {/* Bottom Card with Animation */}
          <Card 
            ref={cardRef}
            className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 border-0 text-white hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">AI Analysis</p>
                <p className="text-xs text-white/70">Updated 5 min ago</p>
              </div>
            </div>
            <p className="text-xs text-white/80 mb-3">
              Tech hiring is surging. Consider upskilling in cloud technologies.
            </p>
            <Button
              size="sm"
              className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
            >
              View Full Report
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Card>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-80 relative">
        {/* Premium Header */}
        <header className="sticky top-0 z-30 bg-gradient-to-r from-white/95 via-blue-50/90 to-indigo-50/85 backdrop-blur-xl border-b border-blue-200/50 shadow-sm">
          {/* Header Gradient Accent */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/30 to-indigo-100/40" />
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

              {/* Tab Navigation - Premium Style */}
              <div className="hidden md:flex items-center gap-1 p-1 bg-white/60 backdrop-blur-sm rounded-2xl border border-blue-100/50 shadow-sm">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                        : "text-slate-600 hover:text-slate-900 hover:bg-blue-50/50"
                    }`}
                  >
                    <tab.icon
                      className={`w-4 h-4 ${
                        activeTab === tab.id ? "text-white" : "text-slate-500"
                      }`}
                    />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.span 
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                        layoutId="activeTab"
                      />
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
                className="rounded-xl hover:bg-blue-50 text-slate-700"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <Search className="w-5 h-5" />
              </Button>
                {searchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-12 w-80 p-4 bg-white rounded-2xl shadow-2xl border-2 border-blue-100/50 z-50"
                  >
                    <Input
                      placeholder="Search jobs, trends, insights..."
                      className="rounded-xl border-2 border-blue-100 focus:border-blue-400"
                      autoFocus
                    />
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-slate-600 font-semibold">
                        Recent searches
                      </p>
                      {["Software Engineer", "Remote Jobs", "AI/ML"].map(
                        (term) => (
                          <button
                            key={term}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors"
                          >
                            <Search className="w-3 h-3 text-blue-500" />
                            {term}
                          </button>
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl relative hover:bg-blue-50 text-slate-700"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                </Button>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border-2 border-blue-100/50 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Notifications</h3>
                        <Badge className="bg-blue-500 text-white text-xs">
                          3 new
                        </Badge>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="p-4 hover:bg-blue-50/50 transition-colors cursor-pointer border-b border-blue-50 last:border-0"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                notif.type === "surge"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : notif.type === "salary"
                                  ? "bg-amber-100 text-amber-600"
                                  : "bg-blue-100 text-blue-600"
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
                              <p className="font-medium text-sm">
                                {notif.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {notif.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notif.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-blue-100 bg-blue-50/30">
                      <Button variant="ghost" size="sm" className="w-full text-blue-700 hover:text-blue-800 hover:bg-blue-100">
                        View all notifications
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Refresh */}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="rounded-xl hidden sm:flex border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 font-semibold"
                >
                  <Activity
                    className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              )}

              {/* Settings */}
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-blue-50 text-slate-700">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Tab Navigation */}
          <div className="md:hidden px-4 pb-4">
            <div className="flex items-center gap-1 p-1 bg-white/60 backdrop-blur-sm rounded-2xl border border-blue-100/50 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900 hover:bg-blue-50/50"
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
                    tabs.find((t) => t.id === activeTab)?.color
                  } text-white`}
                >
                  {(() => {
                    const Icon = tabs.find((t) => t.id === activeTab)?.icon;
                    return Icon ? <Icon className="w-5 h-5" /> : null;
                  })()}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">
                    {tabs.find((t) => t.id === activeTab)?.label}
                  </h1>
                  <p className="text-xs text-slate-600">
                    {tabs.find((t) => t.id === activeTab)?.description} •
                    Australian Job Market
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full text-xs gap-1"
                >
                  <Globe className="w-3 h-3" /> Australia
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full text-xs gap-1"
                >
                  <Calendar className="w-3 h-3" /> Live Data
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-8 relative">{children}</main>

        {/* Footer */}
        <footer className="relative px-4 md:px-8 py-6 border-t border-blue-200/50 overflow-hidden bg-gradient-to-r from-blue-50/50 via-indigo-50/40 to-sky-50/50">
          {/* Footer Background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.15),transparent_70%)]" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-slate-700 font-medium">© 2025 Hours Intelligence. Intelligence-Powered Insights.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/50 rounded-full shadow-sm">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-700 font-semibold text-xs">Live data from 4 sources</span>
              </span>
              <span className="px-3 py-1.5 bg-blue-50 border border-blue-200/50 rounded-full text-blue-700 font-semibold text-xs shadow-sm">Updated every 15 min</span>
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

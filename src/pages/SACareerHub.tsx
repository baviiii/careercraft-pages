import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { gsap } from "gsap";
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
} from "lucide-react";
import { Session } from "@supabase/supabase-js";
import ExploreSA from "@/components/rag/ExploreSA";
import CareerCoach from "@/components/rag/CareerCoach";

export default function SACareerHub() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("explore");
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    
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
  }, [loading, activeTab]);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'there';

  const sidebarLinks = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Globe, label: "SA Career Hub", path: "/sa-career-hub", active: true },
    { icon: FileText, label: "My Resumes", path: "/my-resumes" },
    { icon: Mail, label: "Cover Letters", path: "/cover-letter" },
    { icon: Briefcase, label: "Job Tracker", path: "/tracker" },
    { icon: Briefcase, label: "🇦🇺 AU Jobs", path: "/au-jobs" },
    { icon: Newspaper, label: "📊 Market News", path: "/job-market-news" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

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
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.08) 50%, transparent 70%)", animation: "morph 15s ease-in-out infinite, float-slow 12s ease-in-out infinite" }} />
        <div className="absolute top-[40%] -left-40 w-[700px] h-[700px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(168,85,247,0.06) 50%, transparent 70%)", animation: "morph 18s ease-in-out infinite reverse, float-slower 15s ease-in-out infinite" }} />

        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-[300px] z-50 transform transition-all duration-500 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-900/95 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-pink-500/5" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-purple-500/30 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-500/10 to-transparent" />

        <div className="relative p-6 h-full flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate("/")} className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full border-2 border-slate-900 flex items-center justify-center animate-bounce-subtle">
                  <Crown className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">SA Intelligence</span>
                <p className="text-xs text-slate-400">Intelligence Platform</p>
              </div>
            </button>
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1 overflow-y-auto pr-2 -mr-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-4 px-3">Main Menu</p>
            {sidebarLinks.map((link) => (
              <button key={link.path}
                onClick={() => { navigate(link.path); setSidebarOpen(false); }}
                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  link.active ? "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent text-white border-l-2 border-purple-400"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  link.active ? "bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/25" : "bg-slate-800/80 group-hover:bg-slate-700/80"
                }`}>
                  <link.icon className={`w-4 h-4 ${link.active ? "text-white" : ""}`} />
                </div>
                <span className={`flex-1 text-left text-sm ${link.active ? "font-semibold" : "font-medium"}`}>{link.label}</span>
                {link.active && <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />}
                <ChevronRight className={`w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ${link.active ? "opacity-100 translate-x-0" : ""}`} />
              </button>
            ))}
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
            <Button variant="ghost" size="sm" className="w-full justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-slate-700/50 hover:border-red-500/30 transition-all" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />Sign Out
            </Button>
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
            
            <div className="relative flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setSidebarOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                    🇦🇺 SA Career Hub
                  </h1>
                  <p className="text-sm text-slate-400">Your gateway to South Australian careers</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="relative p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-all duration-300">
                  <Bell className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content with Tabs */}
        <main ref={mainContentRef} className="p-4 md:p-6 lg:p-8 relative">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full max-w-md mx-auto mb-6 bg-slate-900/50 border border-slate-800/50 p-1 rounded-2xl">
              <TabsTrigger 
                value="explore" 
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-teal-500 data-[state=active]:text-white"
              >
                <Globe className="w-4 h-4" />
                Explore SA
              </TabsTrigger>
              <TabsTrigger 
                value="coach" 
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
              >
                <Brain className="w-4 h-4" />
                Career Coach
              </TabsTrigger>
            </TabsList>

            <TabsContent value="explore" className="mt-0">
              <ExploreSA />
            </TabsContent>

            <TabsContent value="coach" className="mt-0">
              <CareerCoach />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import {
  CareerPulse,
  SectorHeatmap,
  InvestmentHighlights,
  BreakingNews,
  CareersDashboard,
  SkillsDashboard,
  FundingDashboard,
} from "@/components/intelligence";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Brain, 
  DollarSign, 
  LayoutDashboard, 
  Search, 
  Download,
  RefreshCw,
  Filter,
  Sparkles,
  TrendingUp,
  Bell,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

type DashboardTab = "overview" | "careers" | "skills" | "funding";

export default function IntelligenceOverview() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50/30">
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  const userName = session?.user?.user_metadata?.full_name || 
                   session?.user?.email?.split('@')[0] || 'there';

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50/30">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Enhanced Header */}
          <motion.div variants={item}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                      Intelligence Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Welcome back, <span className="font-semibold text-foreground">{userName}</span>
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground max-w-2xl mt-2">
                  Real-time insights into South Australia's job market, government investments, 
                  and career opportunities powered by AI analysis.
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="gap-2"
                      >
                        <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                        <span className="hidden sm:inline">Refresh</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export dashboard data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button variant="outline" size="sm" className="gap-2">
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Alerts</span>
                </Button>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search careers, skills, funding programs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-background/50 backdrop-blur-sm border-border/50"
                />
              </div>
              <Button variant="outline" className="gap-2 h-11">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Button>
            </div>

            {/* Status Bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-accent-emerald rounded-full animate-pulse" />
                <span>Live data</span>
              </div>
              <span>•</span>
              <span>Last updated {formatTimeAgo(lastRefresh)}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-accent-emerald" />
                <span>12,847 active opportunities</span>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Dashboard Tabs */}
          <motion.div variants={item}>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTab)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-background/50 backdrop-blur-sm border border-border/50 p-1.5 h-auto shadow-sm">
                <TabsTrigger 
                  value="overview" 
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600",
                    "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="careers"
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600",
                    "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                  )}
                >
                  <Briefcase className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Careers</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">6</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="skills"
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600",
                    "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                  )}
                >
                  <Brain className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Skills</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">8</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="funding"
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600",
                    "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                  )}
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Funding</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">5</Badge>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <CareerPulse />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <SectorHeatmap />
                      </div>
                      <div>
                        <InvestmentHighlights />
                      </div>
                    </div>
                    <BreakingNews />
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              {/* Careers Tab */}
              <TabsContent value="careers" className="mt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="careers"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CareersDashboard searchQuery={searchQuery} />
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="mt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="skills"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SkillsDashboard searchQuery={searchQuery} />
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              {/* Funding Tab */}
              <TabsContent value="funding" className="mt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="funding"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FundingDashboard searchQuery={searchQuery} />
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

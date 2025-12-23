import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import {
  IntelligenceLayout,
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
import { Briefcase, Brain, DollarSign, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

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

  if (loading) {
    return (
      <IntelligenceLayout>
        <div className="space-y-6">
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
      </IntelligenceLayout>
    );
  }

  const userName = session?.user?.user_metadata?.full_name || 
                   session?.user?.email?.split('@')[0] || 'there';

  return (
    <IntelligenceLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={item}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Welcome back, {userName}
              </p>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Intelligence Dashboard
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Real-time insights into South Australia's job market, government investments, 
                and career opportunities.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 bg-accent-emerald rounded-full animate-pulse" />
              <span>Live data • Last updated just now</span>
            </div>
          </div>
        </motion.div>

        {/* Dashboard Tabs */}
        <motion.div variants={item}>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 h-auto">
              <TabsTrigger 
                value="overview" 
                className={cn(
                  "flex items-center gap-2 px-4 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm",
                  "transition-all duration-200"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="careers"
                className={cn(
                  "flex items-center gap-2 px-4 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm",
                  "transition-all duration-200"
                )}
              >
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">Careers</span>
              </TabsTrigger>
              <TabsTrigger 
                value="skills"
                className={cn(
                  "flex items-center gap-2 px-4 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm",
                  "transition-all duration-200"
                )}
              >
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Skills</span>
              </TabsTrigger>
              <TabsTrigger 
                value="funding"
                className={cn(
                  "flex items-center gap-2 px-4 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm",
                  "transition-all duration-200"
                )}
              >
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Funding</span>
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
                  {/* Career Pulse - Key Metrics */}
                  <CareerPulse />

                  {/* Main Grid: Heatmap + Investment Highlights */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <SectorHeatmap />
                    </div>
                    <div>
                      <InvestmentHighlights />
                    </div>
                  </div>

                  {/* Breaking News */}
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
                  <CareersDashboard />
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
                  <SkillsDashboard />
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
                  <FundingDashboard />
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </IntelligenceLayout>
  );
}

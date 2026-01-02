/**
 * IntelligenceOverview - Main intelligence dashboard page
 * 
 * Features:
 * - Centralized IntelligenceContext for cost-efficient data fetching
 * - AI-powered insights with cross-tab connections
 * - Stunning hero section with real-time metrics
 * - Tab-based navigation with lazy loading
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CareerPulse,
  SectorHeatmap,
  InvestmentHighlights,
  BreakingNews,
  CareersDashboard,
  SkillsDashboard,
  FundingDashboard,
  AIInsightsPanel,
  IntelligenceHero,
  CrossTabConnections,
  DataStoriesPanel,
  LiveDiscoveryFeed,
} from "@/components/intelligence";
import { IntelligenceProvider, useIntelligence } from "@/contexts/IntelligenceContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Brain, 
  DollarSign, 
  LayoutDashboard, 
  Download,
  RefreshCw,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { IntelligenceTab } from "@/lib/intelligencePrompts";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";

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

/**
 * Inner dashboard component that uses the intelligence context
 */
function IntelligenceDashboardContent() {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    refreshAll,
    globalLoading,
    metrics,
    crossTabInsights,
  } = useIntelligence();

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as IntelligenceTab);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const headerActions = (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || globalLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", (isRefreshing || globalLoading) && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh all data</p>
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
    </>
  );

  return (
    <UnifiedLayout
      title="Intelligence Dashboard"
      subtitle={`${metrics?.totalDocuments || 0} documents indexed • Live analysis`}
      showSearch
      onSearch={setSearchQuery}
      headerActions={headerActions}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Enhanced Dashboard Tabs */}
        <motion.div variants={item}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 p-1.5 h-auto shadow-sm rounded-xl">
              <TabsTrigger 
                value="overview" 
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600",
                  "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25",
                  "data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-slate-800/50"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="careers"
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600",
                  "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25",
                  "data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-slate-800/50"
                )}
              >
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Careers</span>
              </TabsTrigger>
              <TabsTrigger 
                value="skills"
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600",
                  "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25",
                  "data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-slate-800/50"
                )}
              >
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Skills</span>
              </TabsTrigger>
              <TabsTrigger 
                value="funding"
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600",
                  "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/25",
                  "data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-slate-800/50"
                )}
              >
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Funding</span>
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
                  {activeTab === "overview" && (
                    <>
                      {/* Hero Section with Real-Time Metrics */}
                      <IntelligenceHero />

                      {/* NEXT-GEN: Data Stories - The WOW Factor */}
                      <DataStoriesPanel />

                      {/* NEXT-GEN: Live Discovery Feed */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <LiveDiscoveryFeed />

                        {/* AI Strategic Insights */}
                        <AIInsightsPanel
                          tab="overview"
                          title="Strategic Intelligence"
                          maxInsights={4}
                        />
                      </div>

                      {/* Cross-Tab Connections */}
                      <CrossTabConnections />

                      {/* Traditional Components */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <SectorHeatmap />
                        </div>
                        <div>
                          <InvestmentHighlights />
                        </div>
                      </div>

                      <BreakingNews />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Careers Tab */}
            <TabsContent value="careers" className="mt-6 space-y-6">
              {activeTab === "careers" && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="careers"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* AI Labour Market Intelligence */}
                    <AIInsightsPanel 
                      tab="careers" 
                      maxInsights={3}
                    />
                    <CareersDashboard searchQuery={searchQuery} />
                  </motion.div>
                </AnimatePresence>
              )}
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="mt-6 space-y-6">
              {activeTab === "skills" && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="skills"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* AI Skills Foresight */}
                    <AIInsightsPanel 
                      tab="skills" 
                      maxInsights={3}
                    />
                    <SkillsDashboard searchQuery={searchQuery} />
                  </motion.div>
                </AnimatePresence>
              )}
            </TabsContent>

            {/* Funding Tab */}
            <TabsContent value="funding" className="mt-6 space-y-6">
              {activeTab === "funding" && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="funding"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* AI Fiscal Intelligence */}
                    <AIInsightsPanel 
                      tab="funding" 
                      maxInsights={3}
                    />
                    <FundingDashboard searchQuery={searchQuery} />
                  </motion.div>
                </AnimatePresence>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </UnifiedLayout>
  );
}

/**
 * Main page component with provider wrapper
 */
export default function IntelligenceOverview() {
  return (
    <IntelligenceProvider>
      <IntelligenceDashboardContent />
    </IntelligenceProvider>
  );
}

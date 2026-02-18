/**
 * FundingDashboard - NEXT-GEN Funding Intelligence
 * Features: Budget Stories, Funding-to-Jobs Connections, Investment Opportunities
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  Award,
  Search,
  Filter,
  Download,
  ExternalLink,
  Bookmark,
  Info,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Sparkles,
  Target,
  Briefcase,
  MessageSquare,
  ArrowRight,
  Lightbulb,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIntelligence, type FundingAllocation } from "@/contexts/IntelligenceContext";
import { FundingDetailModal } from "./FundingDetailModal";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { FundingCharts } from "./FundingCharts";
import { useImpactQueries } from "@/hooks/useImpactQueries";
import { ImpactBadge } from "./ImpactBadge";
import { ImpactDetailsModal } from "./ImpactDetailsModal";

interface FundingProgram {
  name: string;
  amount: string;
  sector: string;
  year: string;
  status: "active" | "upcoming" | "closing";
  eligibility: string;
  deadline?: string;
  description?: string;
}

type FilterStatus = "all" | "active" | "upcoming" | "closing";
type FilterSector = "all" | string;

interface FundingDashboardProps {
  searchQuery?: string;
}

const sectorColors: Record<string, string> = {
  "Healthcare": "bg-red-500",
  "Education": "bg-purple-500",
  "Skills & Training": "bg-blue-500",
  "Infrastructure": "bg-amber-500",
  "Renewable Energy": "bg-green-500",
  "Regional Development": "bg-cyan-500",
  "Technology": "bg-indigo-500",
};

export function FundingDashboard({ searchQuery = "" }: FundingDashboardProps) {
  const { fundingAllocations, getTabData, globalLoading, totalBudget } = useIntelligence();
  const tabData = getTabData("funding");
  const { getImpactsForEntity, forecastImpacts } = useImpactQueries();

  const [localSearch, setLocalSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterSector, setFilterSector] = useState<FilterSector>("all");
  const [sortBy, setSortBy] = useState<"amount" | "name" | "deadline">("amount");

  // Detail modal state
  const [selectedAllocation, setSelectedAllocation] = useState<FundingAllocation | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // Store impacts and forecasts for sectors
  const [sectorImpacts, setSectorImpacts] = useState<Record<string, any[]>>({});
  const [sectorForecasts, setSectorForecasts] = useState<Record<string, any>>({});
  const [loadingImpacts, setLoadingImpacts] = useState(false);
  
  // Impact details modal
  const [impactModalEntity, setImpactModalEntity] = useState<string | null>(null);
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  
  // Fetch impacts for funding sectors
  useEffect(() => {
    const fetchSectorImpacts = async () => {
      if (fundingAllocations.length === 0) return;
      
      setLoadingImpacts(true);
      const impactsMap: Record<string, any[]> = {};
      const forecastsMap: Record<string, any> = {};
      
      // Fetch impacts for top 5 sectors
      const topSectors = fundingAllocations.slice(0, 5);
      
      await Promise.all(
        topSectors.map(async (allocation) => {
          try {
            // Get impacts for sector
            const impacts = await getImpactsForEntity(allocation.sector, { limit: 10 });
            if (impacts.length > 0) {
              impactsMap[allocation.sector] = impacts;
            }
            
            // Get forecast for sector
            const forecast = await forecastImpacts(allocation.sector, 12);
            if (forecast && forecast.confidence > 0.3) {
              forecastsMap[allocation.sector] = forecast;
            }
          } catch (error) {
            console.error(`Failed to fetch impacts for ${allocation.sector}:`, error);
          }
        })
      );
      
      setSectorImpacts(impactsMap);
      setSectorForecasts(forecastsMap);
      setLoadingImpacts(false);
    };
    
    fetchSectorImpacts();
  }, [fundingAllocations, getImpactsForEntity, forecastImpacts]);

  const handleAllocationClick = (allocation: FundingAllocation) => {
    setSelectedAllocation(allocation);
    setDetailModalOpen(true);
  };

  // Generate programs from context data
  const fundingPrograms = useMemo<FundingProgram[]>(() => {
    return fundingAllocations.map((alloc, idx) => ({
      name: `${alloc.sector} Investment Fund`,
      amount: `$${alloc.amount.toFixed(0)}M`,
      sector: alloc.sector,
      year: "2024-25",
      status: alloc.priority === "high" ? "active" as const : "upcoming" as const,
                        eligibility: "See document for details",
      deadline: alloc.priority === "high" ? "Ongoing" : "Mar 2025",
      description: `Funding for ${alloc.sector.toLowerCase()} sector initiatives`,
    }));
  }, [fundingAllocations]);

  const effectiveSearch = searchQuery || localSearch;

  const filteredPrograms = useMemo(() => {
    let filtered = fundingPrograms.filter(program => {
      const matchesSearch = effectiveSearch === "" || 
        program.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        program.sector.toLowerCase().includes(effectiveSearch.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || program.status === filterStatus;
      const matchesSector = filterSector === "all" || program.sector === filterSector;
      
      return matchesSearch && matchesStatus && matchesSector;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "amount":
          return parseFloat(b.amount.replace(/[^0-9.]/g, "")) - parseFloat(a.amount.replace(/[^0-9.]/g, ""));
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [effectiveSearch, filterStatus, filterSector, sortBy, fundingPrograms]);

  const activePrograms = fundingPrograms.filter(p => p.status === "active").length;
  const uniqueSectors = Array.from(new Set(fundingPrograms.map(p => p.sector)));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "upcoming": return <Clock className="w-4 h-4 text-blue-500" />;
      case "closing": return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "upcoming": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "closing": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "";
    }
  };

  if (globalLoading || tabData.loading) {
    return (
        <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const navigate = useNavigate();

  // Funding Investment Stories
  const fundingStories = useMemo(() => {
    const topAllocation = fundingAllocations[0];
    const fastestGrowing = [...fundingAllocations].sort((a, b) => b.change - a.change)[0];

    const totalPrograms = fundingAllocations.reduce((s, a) => s + (a.programs || 0), 0);
    const avgAllocation = fundingAllocations.length > 0 ? (totalBudget / fundingAllocations.length) : 0;
    const avgChange = fundingAllocations.length > 0 ? (fundingAllocations.reduce((s, a) => s + a.change, 0) / fundingAllocations.length) : 0;

    return [
      {
        id: "healthcare-wave",
        title: `💰 ${topAllocation?.sector || "Top Sector"}: $${((topAllocation?.amount || 0) / 1000).toFixed(1)}B Investment`,
        narrative: `The government allocated $${((topAllocation?.amount || 0) / 1000).toFixed(1)}B to ${topAllocation?.sector || "the top sector"}, funding ${topAllocation?.programs || 0} programs with a ${topAllocation?.change?.toFixed(1) || 0}% growth rate.`,
        metrics: [
          { label: "Total Investment", value: topAllocation?.amount ? `$${(topAllocation.amount / 1000).toFixed(1)}B` : "N/A", icon: DollarSign },
          { label: "Funded Programs", value: `${topAllocation?.programs || 0}`, icon: Award },
          { label: "Growth Rate", value: `+${topAllocation?.change?.toFixed(1) || 0}%`, icon: TrendingUp },
          { label: "Budget Share", value: totalBudget > 0 ? `${((topAllocation?.amount || 0) / totalBudget * 100).toFixed(0)}%` : "N/A", icon: Briefcase },
        ],
        fundingToJobs: {
          avgProgramSize: topAllocation?.programs ? `$${(topAllocation.amount / topAllocation.programs).toFixed(0)}M` : "N/A",
          jobsPerMillion: `${totalPrograms} programs`,
          trainingSpots: `${topAllocation?.programs || 0} funded`,
          successRate: `+${topAllocation?.change?.toFixed(0) || 0}% YoY`,
        },
        conversationStarters: [
          `Which ${topAllocation?.sector || "healthcare"} programs am I eligible for?`,
          `Show me jobs created by the $${((topAllocation?.amount || 0) / 1000).toFixed(1)}B ${topAllocation?.sector || "healthcare"} investment`,
          `Compare funding opportunities across all sectors`,
          `What training programs have guaranteed job placements?`,
        ],
      },
      {
        id: "fastest-growing",
        title: `⚡ ${fastestGrowing?.sector || "Emerging Sector"}: Fastest Growing Investment`,
        narrative: `${fastestGrowing?.sector || "This sector"}'s funding grew ${fastestGrowing?.change?.toFixed(1) || 0}% this year — the highest increase across all ${fundingAllocations.length} tracked sectors.`,
        metrics: [
          { label: "Budget Increase", value: `+${fastestGrowing?.change?.toFixed(1) || 0}%`, icon: TrendingUp },
          { label: "New Programs", value: `${fastestGrowing?.programs || 0}`, icon: Zap },
          { label: "Investment", value: fastestGrowing?.amount ? `$${(fastestGrowing.amount / 1000).toFixed(1)}B` : "N/A", icon: DollarSign },
          { label: "Confidence", value: fastestGrowing?.confidence || "Medium", icon: Target },
        ],
        fundingToJobs: {
          avgProgramSize: fastestGrowing?.programs ? `$${(fastestGrowing.amount / fastestGrowing.programs).toFixed(0)}M` : "N/A",
          jobsPerMillion: `${fastestGrowing?.programs || 0} programs`,
          trainingSpots: `${fastestGrowing?.programs || 0} funded`,
          successRate: `+${fastestGrowing?.change?.toFixed(0) || 0}% YoY`,
        },
        conversationStarters: [
          `How do I access ${fastestGrowing?.sector || "growing sector"} training programs?`,
          `Which programs have the highest job placement rates?`,
          `Show me funding opportunities with government guarantees`,
          `Calculate my ROI for sector-specific training`,
        ],
      },
      {
        id: "opportunity-mapping",
        title: "🎯 Full Budget Landscape",
        narrative: `SA Government invested $${(totalBudget / 1000).toFixed(1)}B across ${fundingAllocations.length} sectors with ${totalPrograms} total funded programs. Average sector allocation is $${(avgAllocation / 1000).toFixed(1)}B with ${avgChange.toFixed(1)}% average growth.`,
        metrics: [
          { label: "Total Budget", value: `$${(totalBudget / 1000).toFixed(1)}B`, icon: DollarSign },
          { label: "Active Sectors", value: `${fundingAllocations.length}`, icon: Target },
          { label: "Total Programs", value: `${totalPrograms}`, icon: Users },
          { label: "Avg Growth", value: `+${avgChange.toFixed(1)}%`, icon: CheckCircle2 },
        ],
        fundingToJobs: {
          avgProgramSize: `$${(avgAllocation / Math.max(totalPrograms / fundingAllocations.length, 1)).toFixed(0)}M`,
          jobsPerMillion: `${totalPrograms} programs total`,
          trainingSpots: `${fundingAllocations.length} sectors`,
          successRate: `+${avgChange.toFixed(0)}% avg growth`,
        },
        conversationStarters: [
          "Which sectors have both high funding AND low competition?",
          "Show me the funding-to-jobs multiplier for each sector",
          "Find programs with guaranteed employment outcomes",
          "Calculate career stability score based on funding trends",
        ],
      },
    ];
  }, [fundingAllocations, totalBudget]);

  const [activeStory, setActiveStory] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setActiveStory((prev) => (prev + 1) % fundingStories.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [isAutoPlay, fundingStories.length]);

  const handleConversationStarter = (question: string) => {
    navigate("/sa-career-hub", { state: { initialQuestion: question } });
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <ExecutiveSummary tab="funding" />

      {/* Header - PINK GLASSMORPHISM */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-xl shadow-fuchsia-500/30 relative">
            <DollarSign className="w-6 h-6 text-white relative z-10" />
            <div className="absolute inset-0 bg-white/20 rounded-2xl blur-sm"></div>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold bg-gradient-to-r from-fuchsia-500 via-pink-500 to-fuchsia-600 bg-clip-text text-transparent">
              Funding & Budgets
            </h2>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <span className="font-semibold text-fuchsia-400">{filteredPrograms.length}</span> programs •
              <span className="font-semibold text-pink-400">${(totalBudget / 1000).toFixed(1)}B</span> total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 text-fuchsia-300 border-fuchsia-400/30 gap-1 px-3 py-1.5 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-semibold">Budget Intelligence</span>
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-pink-400/30 hover:bg-pink-500/10 hover:border-pink-400/50">
                  <Download className="w-4 h-4" />Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export funding data</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* NEXT-GEN: Funding Investment Stories - PINK GLASSMORPHISM */}
      <div className="p-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-500/15 via-pink-500/10 to-fuchsia-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-fuchsia-500/20">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-fuchsia-400/20 to-pink-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-400/20 to-fuchsia-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-lg shadow-fuchsia-500/30">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  Investment Intelligence
                </h3>
                <p className="text-xs text-slate-300 font-medium">Real-time budget analysis</p>
              </div>
              <Badge className="bg-gradient-to-r from-fuchsia-500/30 to-pink-500/30 text-pink-200 border-pink-400/30 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
          <div className="flex items-center gap-2">
            {fundingStories.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setActiveStory(idx); setIsAutoPlay(false); }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === activeStory ? "bg-pink-400 w-6" : "bg-pink-300/30"
                )}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-5">
              <h4 className="text-2xl font-bold text-white mb-3">{fundingStories[activeStory].title}</h4>
              <p className="text-slate-200 leading-relaxed">{fundingStories[activeStory].narrative}</p>
            </div>

            {/* Metrics Grid - ENHANCED */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {fundingStories[activeStory].metrics.map((metric, idx) => {
                const Icon = metric.icon;
                return (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group p-5 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 backdrop-blur-sm border border-pink-400/30 hover:border-pink-400/50 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-fuchsia-500/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">
                      {metric.value}
                    </p>
                    <p className="text-xs text-slate-300 font-medium">{metric.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Funding-to-Jobs Multiplier */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-5 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 backdrop-blur-sm border border-pink-400/30 mb-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-semibold text-pink-100">Funding → Jobs Multiplier:</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Avg Program Size</p>
                  <p className="text-lg font-bold text-foreground">{fundingStories[activeStory].fundingToJobs.avgProgramSize}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Jobs per $1M</p>
                  <p className="text-lg font-bold text-emerald-600">{fundingStories[activeStory].fundingToJobs.jobsPerMillion}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Training Spots</p>
                  <p className="text-lg font-bold text-blue-600">{fundingStories[activeStory].fundingToJobs.trainingSpots}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Success Rate</p>
                  <p className="text-lg font-bold text-purple-600">{fundingStories[activeStory].fundingToJobs.successRate}</p>
                </div>
              </div>
            </motion.div>

            {/* Conversation Starters */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">Ask Horus Chat:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {fundingStories[activeStory].conversationStarters.map((question, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.05 }}
                    onClick={() => handleConversationStarter(question)}
                    className="group p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-100 group-hover:text-amber-600 transition-colors">{question}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors opacity-0 group-hover:opacity-100" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
      </div>

      {/* Key Metrics - ULTRA VIBRANT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="metric-card-amber hover-lift relative overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs font-bold text-amber-600">TOTAL</span>
            </div>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-br from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
            ${(totalBudget / 1000).toFixed(1)}B
          </p>
          <p className="text-sm font-semibold text-slate-200">Total Budget</p>
          <p className="text-xs text-slate-400 mt-1">Allocated across all sectors</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="metric-card-emerald hover-lift relative overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            </div>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-br from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">
            {activePrograms}
          </p>
          <p className="text-sm font-semibold text-slate-200">Active Programs</p>
          <p className="text-xs text-slate-400 mt-1">Currently accepting applications</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="metric-card-blue hover-lift relative overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Zap className="w-3 h-3 text-blue-600" />
            </div>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            +{fundingAllocations[0]?.change?.toFixed(1) || 0}%
          </p>
          <p className="text-sm font-semibold text-slate-200">Top Growth Rate</p>
          <p className="text-xs text-slate-400 mt-1">Highest sector increase YoY</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="metric-card-purple hover-lift relative overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
              <Clock className="w-3 h-3 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            2024-25
          </p>
          <p className="text-sm font-semibold text-slate-200">Financial Year</p>
          <p className="text-xs text-slate-400 mt-1">Current budget period</p>
        </motion.div>
      </div>

      {/* Data Visualizations */}
      <FundingCharts allocations={fundingAllocations} totalBudget={totalBudget} />

      {/* Budget Allocations */}
      <div className="card-intelligence p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Budget Allocations by Sector</h3>
        <div className="space-y-3">
          {fundingAllocations.slice(0, 6).map((alloc, index) => {
            const percentage = totalBudget > 0 ? (alloc.amount / totalBudget) * 100 : 0;
            return (
              <motion.div
                key={alloc.sector}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleAllocationClick(alloc)}
                className="group p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", sectorColors[alloc.sector] || "bg-blue-500")} />
                    <span className="font-medium text-foreground">{alloc.sector}</span>
                    <span className="text-xs text-slate-400">({alloc.programs} programs)</span>
                    {alloc.sources[0]?.extractionMethod && (
                      <Badge variant="outline" className={cn(
                        "text-xs opacity-0 group-hover:opacity-100 transition-opacity",
                        alloc.sources[0].extractionMethod === "table" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      )}>
                        {alloc.sources[0].extractionMethod === "table" ? "📊 Table" : "📄 Text"}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {alloc.confidence} confidence
                    </Badge>
                    {sectorImpacts[alloc.sector] && sectorImpacts[alloc.sector].length > 0 && (
                      <ImpactBadge
                        impacts={sectorImpacts[alloc.sector]}
                        compact={true}
                        onClick={() => {
                          setImpactModalEntity(alloc.sector);
                          setImpactModalOpen(true);
                        }}
                      />
                    )}
                    {alloc.sources[0]?.pageNumber && (
                      <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        p.{alloc.sources[0].pageNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {alloc.change !== 0 && (
                      <span className={cn("text-sm font-semibold flex items-center gap-1", alloc.change > 0 ? "text-emerald-500" : "text-red-500")}>
                        <TrendingUp className={cn("w-4 h-4", alloc.change < 0 && "rotate-180")} />
                        {alloc.change > 0 ? "+" : ""}{alloc.change.toFixed(1)}%
                      </span>
                    )}
                    <span className="font-bold text-foreground">${(alloc.amount / 1000).toFixed(1)}B</span>
                    <Info className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                    className={cn("h-full rounded-full", sectorColors[alloc.sector] || "bg-blue-500")}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-400">{percentage.toFixed(1)}% of total</p>
                  <p className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click for details →
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card-intelligence p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search programs..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-full lg:w-[150px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSector} onValueChange={setFilterSector}>
            <SelectTrigger className="w-full lg:w-[150px]"><SelectValue placeholder="All Sectors" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {uniqueSectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h3 className="font-display text-lg font-semibold text-foreground">Funding Programs</h3>
          </div>
          <Badge variant="secondary">{filteredPrograms.length} programs</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredPrograms.map((program, index) => (
              <motion.div
                key={`${program.name}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group p-5 rounded-xl bg-muted/50 border border-border/50 hover:border-emerald-500/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">{program.name}</h4>
                      {getStatusIcon(program.status)}
                    </div>
                    <Badge variant="outline" className="text-xs">{program.sector}</Badge>
                  </div>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", getStatusColor(program.status))}>
                    {program.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{program.amount}</p>
                    <p className="text-xs text-slate-400">Allocated</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{program.year}</p>
                    <p className="text-xs text-slate-400">FY</p>
                  </div>
                  {program.deadline && (
                    <div>
                      <p className="text-sm font-medium text-foreground">{program.deadline}</p>
                      <p className="text-xs text-slate-400">Deadline</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <p className="text-xs text-slate-400">{program.eligibility}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Bookmark className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-4 h-4" /></Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Detail Modal */}
      <FundingDetailModal
        allocation={selectedAllocation}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />

      {/* Impact Details Modal */}
      {impactModalEntity && (
        <ImpactDetailsModal
          entityName={impactModalEntity}
          impacts={sectorImpacts[impactModalEntity] || []}
          isOpen={impactModalOpen}
          onClose={() => {
            setImpactModalOpen(false);
            setImpactModalEntity(null);
          }}
        />
      )}
    </div>
  );
}

export default FundingDashboard;

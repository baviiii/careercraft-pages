/**
 * CareersDashboard - NEXT-GEN Career Intelligence
 * Features: Career Stories, Pathways, Opportunity Scores, Conversation Starters
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  MapPin,
  Users,
  BarChart3,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  Bookmark,
  ExternalLink,
  Download,
  Eye,
  Loader2,
  Sparkles,
  Zap,
  Target,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  DollarSign,
  Clock,
  Award,
  Grid3x3,
  BarChart2,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
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
import { useIntelligence } from "@/contexts/IntelligenceContext";
import { useImpactQueries } from "@/hooks/useImpactQueries";
import { ImpactBadge } from "./ImpactBadge";
import { ImpactDetailsModal } from "./ImpactDetailsModal";
import { detectImpactAnomalies } from "@/lib/impactAnomalyDetection";

type SortField = "growth" | "jobs" | "occupation";
type SortDirection = "asc" | "desc";

interface CareersDashboardProps {
  searchQuery?: string;
}

const sectorColors: Record<string, string> = {
  "Healthcare": "bg-red-500",
  "Technology": "bg-blue-500",
  "Construction": "bg-amber-500",
  "Education": "bg-purple-500",
  "Renewable Energy": "bg-green-500",
};

export function CareersDashboard({ searchQuery = "" }: CareersDashboardProps) {
  const { careerOpportunities, getTabData, globalLoading, totalJobs } = useIntelligence();
  const tabData = getTabData("careers");
  const navigate = useNavigate();
  const { getImpactsForEntity } = useImpactQueries();
  
  const [localSearch, setLocalSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("growth");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterDemand, setFilterDemand] = useState<string>("all");
  const [activeStory, setActiveStory] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "chart" | "cards">("cards");
  const itemsPerPage = 5;
  
  // Store impacts for each career
  const [careerImpacts, setCareerImpacts] = useState<Record<string, any[]>>({});
  const [loadingImpacts, setLoadingImpacts] = useState(false);
  
  // Impact details modal
  const [impactModalEntity, setImpactModalEntity] = useState<string | null>(null);
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  
  const effectiveSearch = searchQuery || localSearch;

  // Derive sector stats from data
  const sectorGrowth = useMemo(() => {
    const sectorMap = new Map<string, { jobs: number; growth: number; count: number; growthCount: number }>();
    careerOpportunities.forEach(c => {
      const existing = sectorMap.get(c.sector) || { jobs: 0, growth: 0, count: 0, growthCount: 0 };
      sectorMap.set(c.sector, {
        jobs: existing.jobs + (c.jobs ?? 0),
        growth: existing.growth + (c.growth ?? 0),
        count: existing.count + 1,
        growthCount: existing.growthCount + (c.growth !== undefined ? 1 : 0),
      });
    });
    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      sector,
      jobs: data.jobs,
      growth: data.growthCount > 0 ? data.growth / data.growthCount : 0,
      color: sectorColors[sector] || "bg-blue-500",
    })).sort((a, b) => b.growth - a.growth).slice(0, 5);
  }, [careerOpportunities]);

  const filteredCareers = useMemo(() => {
    let filtered = careerOpportunities.filter(career => {
      const matchesSearch = effectiveSearch === "" || 
        career.occupation.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        career.sector.toLowerCase().includes(effectiveSearch.toLowerCase());
      const matchesSector = filterSector === "all" || career.sector === filterSector;
      const matchesDemand = filterDemand === "all" || career.demand === filterDemand;
      return matchesSearch && matchesSector && matchesDemand;
    });

    filtered.sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "growth": return ((b.growth ?? 0) - (a.growth ?? 0)) * dir;
        case "jobs": return ((b.jobs ?? 0) - (a.jobs ?? 0)) * dir;
        case "occupation": return a.occupation.localeCompare(b.occupation) * dir;
        default: return 0;
      }
    });

    return filtered;
  }, [effectiveSearch, filterSector, filterDemand, sortField, sortDirection, careerOpportunities]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5" />;
    return sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
  };

  const careersWithGrowth = filteredCareers.filter(c => c.growth !== undefined);
  const avgGrowth = careersWithGrowth.length > 0
    ? careersWithGrowth.reduce((sum, c) => sum + (c.growth ?? 0), 0) / careersWithGrowth.length
    : 0;

  const uniqueSectors = Array.from(new Set(careerOpportunities.map(c => c.sector)));

  // Pagination
  const totalPages = Math.ceil(filteredCareers.length / itemsPerPage);
  const paginatedCareers = filteredCareers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Fetch impacts for top careers (lazy load)
  useEffect(() => {
    const fetchImpacts = async () => {
      if (paginatedCareers.length === 0) return;
      
      setLoadingImpacts(true);
      const impactsMap: Record<string, any[]> = {};
      
      const careersToFetch = paginatedCareers.slice(0, 10);
      
      await Promise.all(
        careersToFetch.map(async (career) => {
          try {
            const impacts = await getImpactsForEntity(career.occupation, { limit: 5 });
            if (impacts.length > 0) {
              impactsMap[career.occupation] = impacts;
            }
          } catch (error) {
            console.error(`Failed to fetch impacts for ${career.occupation}:`, error);
          }
        })
      );
      
      setCareerImpacts(impactsMap);
      setLoadingImpacts(false);
    };
    
    fetchImpacts();
  }, [paginatedCareers, getImpactsForEntity]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveSearch, filterSector, filterDemand, sortField, sortDirection]);

  // Career Opportunity Stories - MUST be before conditional return
  const careerStories = useMemo(() => {
    const topGrowthSector = sectorGrowth[0];
    const highestPayingCareers = [...careerOpportunities]
      .filter(c => c.salary && c.salary.includes("$"))
      .sort((a, b) => {
        const aNum = parseInt(a.salary?.replace(/[^0-9]/g, "") || "0");
        const bNum = parseInt(b.salary?.replace(/[^0-9]/g, "") || "0");
        return bNum - aNum;
      })
      .slice(0, 3);

    return [
      {
        id: "high-demand-boom",
        title: `💼 ${topGrowthSector?.sector || "Healthcare"}: The High-Demand Career Wave`,
        narrative: `With ${topGrowthSector?.jobs?.toLocaleString() || "12,000+"} open positions and ${(topGrowthSector?.growth ?? 42).toFixed(1)}% growth, this sector is creating unprecedented opportunity. Entry requirements are dropping while salaries climb.`,
        metrics: [
          { label: "Open Positions", value: `${topGrowthSector?.jobs?.toLocaleString() || "12,000+"}`, icon: Briefcase },
          { label: "Growth Rate", value: `+${(topGrowthSector?.growth ?? 42).toFixed(1)}%`, icon: TrendingUp },
          { label: "Avg Timeline", value: "6-12 months", icon: Clock },
          { label: "Success Rate", value: "87%", icon: Target },
        ],
        conversationStarters: [
          `Show me the fastest path to a ${topGrowthSector?.sector || "healthcare"} career`,
          `Which ${topGrowthSector?.sector || "healthcare"} roles require the least training?`,
          `Compare salaries: entry vs 5-year experience in ${topGrowthSector?.sector || "healthcare"}`,
          `What training programs have job guarantees in ${topGrowthSector?.sector || "healthcare"}?`,
        ],
      },
      {
        id: "salary-optimization",
        title: `💰 Top-Paying Careers: ${highestPayingCareers[0]?.occupation || "Specialist Roles"}`,
        narrative: highestPayingCareers.length > 0
          ? `Careers like ${highestPayingCareers.map(c => c.occupation).join(", ")} offer strong salaries with growing demand. Strategic upskilling can fast-track entry.`
          : `High-salary career paths are available across multiple sectors with growing demand.`,
        metrics: [
          { label: "Top Salary", value: highestPayingCareers[0]?.salary || "Competitive", icon: DollarSign },
          { label: "High-Pay Roles", value: `${highestPayingCareers.length}`, icon: Users },
          { label: "Avg Growth", value: `+${highestPayingCareers.length > 0 ? (highestPayingCareers.reduce((s, c) => s + (c.growth || 0), 0) / highestPayingCareers.length).toFixed(1) : "0"}%`, icon: TrendingUp },
          { label: "Total Positions", value: highestPayingCareers.reduce((s, c) => s + (c.jobs || 0), 0).toLocaleString(), icon: Briefcase },
        ],
        conversationStarters: [
          "Which high-paying careers have the lowest competition?",
          "Show me roles with $100K+ potential and under 12 months training",
          "Calculate my ROI for switching to a high-demand career",
          "What micro-credentials lead to the biggest salary jumps?",
        ],
      },
      {
        id: "career-switcher",
        title: "🔄 Career Transition Opportunities",
        narrative: careerOpportunities.length > 2
          ? `With ${careerOpportunities.filter(c => (c.growth || 0) > 10).length} high-growth roles and ${new Set(careerOpportunities.map(c => c.sector)).size} sectors hiring, career transitions are well-supported by government-funded retraining programs.`
          : `Career transition pathways are available across growing sectors with government support.`,
        metrics: [
          { label: "Growing Roles", value: `${careerOpportunities.filter(c => (c.growth || 0) > 10).length}`, icon: TrendingUp },
          { label: "Sectors Hiring", value: `${new Set(careerOpportunities.map(c => c.sector)).size}`, icon: Clock },
          { label: "Total Openings", value: careerOpportunities.reduce((s, c) => s + (c.jobs || 0), 0).toLocaleString(), icon: Target },
          { label: "Avg Growth", value: `+${careerOpportunities.length > 0 ? (careerOpportunities.reduce((s, c) => s + (c.growth || 0), 0) / careerOpportunities.length).toFixed(1) : "0"}%`, icon: Award },
        ],
        conversationStarters: [
          "Show me career switch paths from my current industry",
          "Which careers value my existing skills most?",
          "What's the fastest route to double my current salary?",
          "Find government-funded retraining programs for career switchers",
        ],
      },
    ];
  }, [sectorGrowth, careerOpportunities]);

  // Auto-play effect for stories
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setActiveStory((prev) => (prev + 1) % careerStories.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [isAutoPlay, careerStories.length]);

  const handleConversationStarter = (question: string) => {
    navigate("/career-coach", { state: { initialQuestion: question } });
  };

  // Loading state - now AFTER all hooks
  if (globalLoading || tabData.loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
          <span className="ml-3 text-pink-200">Loading career intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - PINK GLASSMORPHISM */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-xl shadow-pink-500/30 relative">
            <Briefcase className="w-6 h-6 text-white relative z-10" />
            <div className="absolute inset-0 bg-white/20 rounded-2xl blur-sm"></div>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 bg-clip-text text-transparent">
              Career Opportunities
            </h2>
            <p className="text-sm text-slate-300 flex items-center gap-2">
              <span className="font-semibold text-pink-400">{filteredCareers.length}</span> careers •
              <span className="font-semibold text-rose-400">{(totalJobs ?? 0).toLocaleString()}</span> jobs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-400/30 gap-1 px-3 py-1.5 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-semibold">AI-Powered</span>
          </Badge>
          <Button variant="outline" size="sm" className="gap-2 border-pink-400/30 hover:bg-pink-500/10 hover:border-pink-400/50">
            <Download className="w-4 h-4" />Export
          </Button>
        </div>
      </div>

      {/* NEXT-GEN: Career Opportunity Stories - PINK GLASSMORPHISM */}
      <div className="p-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-rose-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-400/20 to-rose-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-rose-400/20 to-pink-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/30">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                  Career Intelligence
                </h3>
                <p className="text-xs text-pink-200 font-medium">Real-time AI Analysis</p>
              </div>
              <Badge className="bg-gradient-to-r from-pink-500/30 to-rose-500/30 text-pink-200 border-pink-400/30 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
          <div className="flex items-center gap-2">
            {careerStories.map((_, idx) => (
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
              <h4 className="text-2xl font-bold text-white mb-3">{careerStories[activeStory].title}</h4>
              <p className="text-slate-100 leading-relaxed">{careerStories[activeStory].narrative}</p>
            </div>

            {/* Metrics Grid - ENHANCED */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {careerStories[activeStory].metrics.map((metric, idx) => {
                const Icon = metric.icon;
                return (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group p-5 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-sm border border-pink-400/30 hover:border-pink-400/50 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-pink-500/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all">
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-white mb-1">
                        {metric.value}
                      </p>
                      <p className="text-xs text-pink-200 font-medium">{metric.label}</p>
                    </motion.div>
                );
              })}
            </div>

            {/* Conversation Starters */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-semibold text-pink-100">Ask Horus Chat:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {careerStories[activeStory].conversationStarters.map((question, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    onClick={() => handleConversationStarter(question)}
                    className="group p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-100 group-hover:text-blue-600 transition-colors">{question}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
      </div>

      {/* Sector Growth Cards - PINK GLASSMORPHISM */}
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display text-2xl font-bold text-white drop-shadow-lg">Sector Growth Rates</h3>
            <p className="text-sm text-pink-200/80">Click to filter careers by sector</p>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 backdrop-blur-sm">
            <TrendingUp className="w-3 h-3 mr-1" />
            High Growth
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {sectorGrowth.map((sector, index) => (
            <motion.div
              key={sector.sector}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "group p-5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/15 backdrop-blur-sm",
                "border border-pink-400/40 hover:border-pink-400/70 hover:shadow-xl hover:shadow-pink-500/20 transition-all duration-300 cursor-pointer",
                filterSector === sector.sector && "ring-2 ring-pink-400 shadow-lg shadow-pink-500/30"
              )}
              onClick={() => setFilterSector(filterSector === sector.sector ? "all" : sector.sector)}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("w-3 h-3 rounded-full shadow-md", sector.color)} />
                <span className="text-sm font-semibold text-white truncate group-hover:text-pink-200 transition-colors drop-shadow">
                  {sector.sector}
                </span>
              </div>
              <p className="text-3xl font-bold text-white drop-shadow-lg mb-1">
                {(sector.jobs ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-pink-200/80 font-medium mb-3">open positions</p>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 w-fit">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-sm font-bold text-emerald-300">+{(sector.growth ?? 0).toFixed(1)}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-lg p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search careers..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterSector} onValueChange={setFilterSector}>
            <SelectTrigger className="w-full lg:w-[150px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {uniqueSectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDemand} onValueChange={setFilterDemand}>
            <SelectTrigger className="w-full lg:w-[150px]"><SelectValue placeholder="All Demand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Demand</SelectItem>
              <SelectItem value="high">High Demand</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Stats - ULTRA VIBRANT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="metric-card-blue hover-lift relative overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs font-bold text-blue-600">LIVE</span>
            </div>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            {(totalJobs ?? 0).toLocaleString()}
          </p>
          <p className="text-sm font-semibold text-slate-200">Total Opportunities</p>
          <p className="text-xs text-slate-400 mt-1">Active job postings across all sectors</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="metric-card-emerald hover-lift relative overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Zap className="w-3 h-3 text-emerald-600" />
            </div>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-br from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">
            +{avgGrowth.toFixed(1)}%
          </p>
          <p className="text-sm font-semibold text-slate-200">Average Growth</p>
          <p className="text-xs text-slate-400 mt-1">Year-over-year job growth rate</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="metric-card-amber hover-lift relative overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Star className="w-3 h-3 text-amber-600 fill-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-br from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
            {sectorGrowth[0]?.sector || "N/A"}
          </p>
          <p className="text-sm font-semibold text-slate-200">Top Growth Sector</p>
          <p className="text-xs text-slate-400 mt-1">
            {(sectorGrowth[0]?.jobs ?? 0).toLocaleString()} jobs • +{(sectorGrowth[0]?.growth ?? 0).toFixed(1)}% growth
          </p>
        </motion.div>
      </div>

      {/* Careers Display - PINK GLASSMORPHISM */}
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-pink-300" />
            <h3 className="font-display text-lg font-semibold text-white drop-shadow-lg">
              Career Opportunities
              <span className="ml-2 text-sm font-normal text-pink-200">
                ({filteredCareers.length} total)
              </span>
            </h3>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-pink-500/10 border border-pink-400/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "h-8 px-3 gap-2",
                  viewMode === "cards"
                    ? "bg-pink-500/30 text-white"
                    : "text-pink-200 hover:bg-pink-500/20 hover:text-white"
                )}
              >
                <Grid3x3 className="w-4 h-4" />
                Cards
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("chart")}
                className={cn(
                  "h-8 px-3 gap-2",
                  viewMode === "chart"
                    ? "bg-pink-500/30 text-white"
                    : "text-pink-200 hover:bg-pink-500/20 hover:text-white"
                )}
              >
                <BarChart2 className="w-4 h-4" />
                Chart
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("table")}
                className={cn(
                  "h-8 px-3 gap-2",
                  viewMode === "table"
                    ? "bg-pink-500/30 text-white"
                    : "text-pink-200 hover:bg-pink-500/20 hover:text-white"
                )}
              >
                <TableIcon className="w-4 h-4" />
                Table
              </Button>
            </div>

            {viewMode === "table" && (
              <div className="flex gap-1">
                {(["growth", "jobs", "occupation"] as SortField[]).map(field => (
                  <Button
                    key={field}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort(field)}
                    className={cn("h-7 px-2 text-xs text-pink-200 hover:bg-pink-500/20 hover:text-white", sortField === field && "bg-pink-500/30 text-white")}
                  >
                    {field.charAt(0).toUpperCase() + field.slice(1)} <SortIcon field={field} />
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Cards View */}
        {viewMode === "cards" && (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {paginatedCareers.map((career, index) => (
                <motion.div
                  key={career.occupation}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 backdrop-blur-sm border border-pink-400/30 hover:border-pink-400/50 p-5 hover:shadow-xl hover:shadow-pink-500/20 transition-all duration-300"
                >
                  {/* Left accent bar */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
                    career.demand === "high" ? "bg-emerald-500" :
                    career.demand === "medium" ? "bg-amber-500" : "bg-blue-500"
                  )} />

                  <div className="pl-4">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {career.trending && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                          <h4 className="font-semibold text-lg text-white">{career.occupation}</h4>
                          {career.demand && (
                            <Badge className={cn(
                              "text-[10px] px-2 py-0.5",
                              career.demand === "high" ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/50" :
                              career.demand === "medium" ? "bg-amber-500/30 text-amber-200 border-amber-400/50" :
                              "bg-blue-500/30 text-blue-200 border-blue-400/50"
                            )}>
                              {career.demand.toUpperCase()}
                            </Badge>
                          )}
                          {careerImpacts[career.occupation] && careerImpacts[career.occupation].length > 0 && (
                            <ImpactBadge 
                              impacts={careerImpacts[career.occupation]} 
                              compact={true}
                              onClick={() => {
                                setImpactModalEntity(career.occupation);
                                setImpactModalOpen(true);
                              }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-pink-200">
                          <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/40">
                            {career.sector}
                          </Badge>
                          {career.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{career.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-200/70">Growth</span>
                        </div>
                        {career.growth !== undefined ? (
                          <p className="text-lg font-bold text-emerald-300">+{career.growth.toFixed(1)}%</p>
                        ) : (
                          <p className="text-xs text-emerald-200/50 italic">Not specified</p>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-400/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs font-medium text-blue-200/70">Positions</span>
                        </div>
                        {career.jobs !== undefined ? (
                          <p className="text-lg font-bold text-blue-300">{career.jobs.toLocaleString()}</p>
                        ) : (
                          <p className="text-xs text-blue-200/50 italic">Not specified</p>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-400/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-medium text-amber-200/70">Salary</span>
                        </div>
                        <p className="text-sm font-semibold text-amber-300 truncate">
                          {career.salary || "See details"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Chart View */}
        {viewMode === "chart" && (
          <div className="space-y-4">
            {paginatedCareers.map((career, index) => {
              const maxGrowth = Math.max(...filteredCareers.filter(c => c.growth !== undefined).map(c => c.growth!), 30);
              const growthPercent = career.growth !== undefined ? (career.growth / maxGrowth) * 100 : 0;
              const maxJobs = Math.max(...filteredCareers.filter(c => c.jobs !== undefined).map(c => c.jobs!), 1000);
              const jobsPercent = career.jobs !== undefined ? (career.jobs / maxJobs) * 100 : 0;

              return (
                <motion.div
                  key={career.occupation}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {career.trending && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                      <span className="font-medium text-white text-sm">{career.occupation}</span>
                      <Badge className="text-[9px] bg-purple-500/30 text-purple-200 border-purple-400/40">
                        {career.sector}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-pink-200">
                      {career.growth !== undefined && (
                        <span className="text-emerald-300 font-semibold">+{career.growth.toFixed(1)}%</span>
                      )}
                      {career.jobs !== undefined && (
                        <span className="text-blue-300 font-semibold">{career.jobs.toLocaleString()} jobs</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {/* Growth Bar */}
                    {career.growth !== undefined && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-pink-200/60">
                          <span>Growth Rate</span>
                        </div>
                        <div className="h-2 rounded-full bg-pink-500/10 overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(growthPercent, 100)}%` }}
                            transition={{ delay: index * 0.05 + 0.2, duration: 0.8 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Jobs Bar */}
                    {career.jobs !== undefined && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-pink-200/60">
                          <span>Open Positions</span>
                        </div>
                        <div className="h-2 rounded-full bg-pink-500/10 overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(jobsPercent, 100)}%` }}
                            transition={{ delay: index * 0.05 + 0.3, duration: 0.8 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pink-400/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-pink-200">Occupation</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-pink-200">Sector</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-pink-200">Growth</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-pink-200">Jobs</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-pink-200">Salary</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-pink-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {paginatedCareers.map((career, index) => (
                  <motion.tr
                    key={career.occupation}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-pink-400/20 hover:bg-pink-500/10 transition-colors group"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {career.trending && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                        <span className="font-medium text-white drop-shadow">{career.occupation}</span>
                        {career.demand === "high" && <Badge className="text-[10px] px-1.5 py-0 bg-pink-500/30 text-pink-200 border-pink-400/50">Hot</Badge>}
                      </div>
                      {career.location && (
                        <p className="text-xs text-pink-200 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{career.location}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4"><Badge className="text-xs bg-purple-500/30 text-purple-200 border-purple-400/40">{career.sector}</Badge></td>
                    <td className="py-4 px-4 text-right">
                      {career.growth !== undefined ? (
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="w-4 h-4 text-emerald-300" />
                          <span className="font-semibold text-emerald-300">+{career.growth.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-pink-200/50 italic">Not specified</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {career.jobs !== undefined ? (
                        <span className="font-medium text-white">{career.jobs.toLocaleString()}</span>
                      ) : (
                        <span className="text-xs text-pink-200/50 italic">Not specified</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-pink-200/80">{career.salary || "See details"}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-pink-200 hover:text-white hover:bg-pink-500/20"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-pink-200 hover:text-white hover:bg-pink-500/20"><Bookmark className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-pink-200 hover:text-white hover:bg-pink-500/20"><ExternalLink className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

        {/* Empty State */}
        {filteredCareers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-pink-200/80">No careers found matching your filters.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterSector("all");
                setFilterDemand("all");
                setLocalSearch("");
              }}
              className="mt-4 border-pink-400/40 text-pink-200 hover:bg-pink-500/20"
            >
              Clear filters
            </Button>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredCareers.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-pink-200">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCareers.length)} of {filteredCareers.length} careers
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-pink-400/30 text-pink-200 hover:bg-pink-500/20 hover:border-pink-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 p-0",
                      currentPage === page
                        ? "bg-pink-500/30 text-white border-pink-400/50"
                        : "text-pink-200 hover:bg-pink-500/20"
                    )}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-pink-400/30 text-pink-200 hover:bg-pink-500/20 hover:border-pink-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Impact Details Modal */}
      {impactModalEntity && (
        <ImpactDetailsModal
          entityName={impactModalEntity}
          impacts={careerImpacts[impactModalEntity] || []}
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

export default CareersDashboard;

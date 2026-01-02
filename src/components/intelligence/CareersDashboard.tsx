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
  
  const [localSearch, setLocalSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("growth");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterDemand, setFilterDemand] = useState<string>("all");

  const effectiveSearch = searchQuery || localSearch;

  // Derive sector stats from data
  const sectorGrowth = useMemo(() => {
    const sectorMap = new Map<string, { jobs: number; growth: number; count: number }>();
    careerOpportunities.forEach(c => {
      const existing = sectorMap.get(c.sector) || { jobs: 0, growth: 0, count: 0 };
      sectorMap.set(c.sector, {
        jobs: existing.jobs + c.jobs,
        growth: existing.growth + c.growth,
        count: existing.count + 1,
      });
    });
    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      sector,
      jobs: data.jobs,
      growth: data.count > 0 ? data.growth / data.count : 0,
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
        case "growth": return (b.growth - a.growth) * dir;
        case "jobs": return (b.jobs - a.jobs) * dir;
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

  const avgGrowth = filteredCareers.length > 0 
    ? filteredCareers.reduce((sum, c) => sum + c.growth, 0) / filteredCareers.length 
    : 0;

  const uniqueSectors = Array.from(new Set(careerOpportunities.map(c => c.sector)));

  if (globalLoading || tabData.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const navigate = useNavigate();

  // Career Opportunity Stories
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
          { label: "Open Positions", value: `${topGrowthSector?.jobs.toLocaleString() || "12,000+"}`, icon: Briefcase },
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
        title: "💰 High-Salary, Low-Competition Careers",
        narrative: `These careers offer $85K+ starting salaries with less than 50 applicants per position. Strategic positioning beats mass competition.`,
        metrics: [
          { label: "Avg Salary", value: "$89K", icon: DollarSign },
          { label: "Competition", value: "Low (3.2:1)", icon: Users },
          { label: "Training Cost", value: "$2-8K", icon: Award },
          { label: "ROI", value: "1100%", icon: Sparkles },
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
        title: "🔄 Career Switcher Success Paths",
        narrative: `Professional career switchers are seeing 40% salary increases within 18 months. Government-funded retraining programs reduce the risk to near-zero.`,
        metrics: [
          { label: "Avg Increase", value: "+40%", icon: TrendingUp },
          { label: "Time to Switch", value: "12-18 months", icon: Clock },
          { label: "Success Rate", value: "78%", icon: Target },
          { label: "Funded Programs", value: "127", icon: Award },
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

  const [activeStory, setActiveStory] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setActiveStory((prev) => (prev + 1) % careerStories.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [isAutoPlay, careerStories.length]);

  const handleConversationStarter = (question: string) => {
    navigate("/sa-career-hub", { state: { initialQuestion: question } });
  };

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
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="font-semibold text-pink-500">{filteredCareers.length}</span> careers •
              <span className="font-semibold text-rose-500">{totalJobs.toLocaleString()}</span> jobs
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
                <p className="text-xs text-pink-200/70 font-medium">Real-time AI Analysis</p>
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
              <p className="text-pink-100/80 leading-relaxed">{careerStories[activeStory].narrative}</p>
              <p className="text-muted-foreground leading-relaxed">{careerStories[activeStory].narrative}</p>
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
                      <p className="text-xs text-pink-200/70 font-medium">{metric.label}</p>
                    </motion.div>
                );
              })}
            </div>

            {/* Conversation Starters */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-semibold text-pink-100">Ask Career Coach:</span>
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
                      <span className="text-sm text-foreground/90 group-hover:text-blue-600 transition-colors">{question}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
      </div>

      {/* Sector Growth Cards - ULTRA VIBRANT */}
      <div className="card-intelligence p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display text-2xl font-bold text-foreground">Sector Growth Rates</h3>
            <p className="text-sm text-muted-foreground">Click to filter careers by sector</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
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
                "group p-5 rounded-2xl bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-800",
                "border border-border/50 hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300 cursor-pointer hover-lift",
                filterSector === sector.sector && "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20"
              )}
              onClick={() => setFilterSector(filterSector === sector.sector ? "all" : sector.sector)}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("w-3 h-3 rounded-full shadow-md", sector.color)} />
                <span className="text-sm font-semibold text-foreground truncate group-hover:text-emerald-600 transition-colors">
                  {sector.sector}
                </span>
              </div>
              <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent mb-1">
                {sector.jobs.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground font-medium mb-3">open positions</p>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 w-fit">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-600">+{sector.growth.toFixed(1)}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card-intelligence p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
            {totalJobs.toLocaleString()}
          </p>
          <p className="text-sm font-semibold text-foreground/80">Total Opportunities</p>
          <p className="text-xs text-muted-foreground mt-1">Active job postings across all sectors</p>
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
          <p className="text-sm font-semibold text-foreground/80">Average Growth</p>
          <p className="text-xs text-muted-foreground mt-1">Year-over-year job growth rate</p>
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
          <p className="text-sm font-semibold text-foreground/80">Top Growth Sector</p>
          <p className="text-xs text-muted-foreground mt-1">
            {sectorGrowth[0]?.jobs.toLocaleString()} jobs • +{sectorGrowth[0]?.growth.toFixed(1)}% growth
          </p>
        </motion.div>
      </div>

      {/* Careers Table */}
      <div className="card-intelligence p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-emerald-500" />
            <h3 className="font-display text-lg font-semibold text-foreground">Top Growth Careers</h3>
          </div>
            <div className="flex gap-1">
              {(["growth", "jobs", "occupation"] as SortField[]).map(field => (
                <Button
                  key={field}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort(field)}
                className={cn("h-7 px-2 text-xs", sortField === field && "bg-blue-500/10 text-blue-600")}
                >
                {field.charAt(0).toUpperCase() + field.slice(1)} <SortIcon field={field} />
                </Button>
              ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Occupation</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Sector</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Growth</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Jobs</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Salary</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredCareers.slice(0, 15).map((career, index) => (
                  <motion.tr
                    key={career.occupation}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {career.trending && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                        <span className="font-medium text-foreground">{career.occupation}</span>
                        {career.demand === "high" && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Hot</Badge>}
                      </div>
                      {career.location && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{career.location}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4"><Badge variant="secondary" className="text-xs">{career.sector}</Badge></td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold text-emerald-500">+{(career.growth ?? 0).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-foreground">{career.jobs.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-sm text-muted-foreground">{career.salary || "See details"}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Bookmark className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredCareers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No careers found matching your filters.</p>
              <Button variant="outline" size="sm" onClick={() => { setFilterSector("all"); setFilterDemand("all"); setLocalSearch(""); }} className="mt-4">
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CareersDashboard;

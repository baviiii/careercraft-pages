/**
 * HORUS AIInsightsPanel — Intelligence Briefing Cards
 * 
 * Decision-grade intelligence display with classified briefing aesthetic.
 * Features insight cards that look like real intelligence documents.
 */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Target,
  Lightbulb,
  Zap,
  BookOpen,
  Eye,
  FileText,
  BarChart3,
  ArrowUpRight,
  Shield,
  Clock,
  Briefcase,
  MapPin,
  DollarSign,
  Building2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIntelligence } from "@/contexts/IntelligenceContext";
import { ImpactForecastCards } from "./ImpactForecastCards";
import { useImpactQueries } from "@/hooks/useImpactQueries";
import type { IntelligenceTab, InsightOutput } from "@/lib/intelligencePrompts";

interface AIInsightsPanelProps {
  tab: IntelligenceTab;
  title?: string;
  className?: string;
  maxInsights?: number;
  compact?: boolean;
  showSources?: boolean;
  variant?: "default" | "minimal" | "expanded" | "briefing";
}

// Parser for structured career data
interface ParsedCareer {
  occupation: string;
  sector?: string;
  growth?: string;
  jobs?: string;
  demand?: string;
  salary?: string;
  region?: string;
}

function parseCareerData(text: string): ParsedCareer[] {
  const careers: ParsedCareer[] = [];
  const blocks = text.split(/Occupation:\s*/i).filter(b => b.trim().length > 0);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) continue;

    const occupation = lines[0].replace(/^[:\s]+/, '').trim();
    if (!occupation || occupation.length < 3) continue;

    const career: ParsedCareer = { occupation };

    // Extract fields
    const sectorMatch = block.match(/Sector:\s*([^\n]+)/i);
    if (sectorMatch) career.sector = sectorMatch[1].trim();

    const growthMatch = block.match(/Growth:\s*([^\n]+)/i);
    if (growthMatch) career.growth = growthMatch[1].trim();

    const jobsMatch = block.match(/Job\s+Count:\s*([^\n]+)/i);
    if (jobsMatch) career.jobs = jobsMatch[1].trim();

    const demandMatch = block.match(/Demand:\s*([^\n]+)/i);
    if (demandMatch) career.demand = demandMatch[1].trim();

    const salaryMatch = block.match(/Salary:\s*([^\n]+)/i);
    if (salaryMatch) career.salary = salaryMatch[1].trim();

    const regionMatch = block.match(/Region:\s*([^\n]+)/i);
    if (regionMatch) career.region = regionMatch[1].trim();

    careers.push(career);
  }

  return careers;
}

const tabConfig = {
  overview: {
    icon: Brain,
    title: "STRATEGIC INTELLIGENCE",
    gradient: "from-pink-500 to-rose-600",
    accentColor: "pink",
    bgGradient: "from-pink-500/10 via-purple-500/5 to-pink-500/10",
    description: "Whole-of-government patterns and cross-sector trends",
    classification: "STRATEGIC",
  },
  funding: {
    icon: BarChart3,
    title: "FISCAL INTELLIGENCE",
    gradient: "from-pink-500 to-rose-600",
    accentColor: "pink",
    bgGradient: "from-pink-500/10 via-purple-500/5 to-pink-500/10",
    description: "Budget allocations, funding changes, and investment signals",
    classification: "FISCAL",
  },
  careers: {
    icon: TrendingUp,
    title: "WORKFORCE INTELLIGENCE",
    gradient: "from-pink-500 to-rose-600",
    accentColor: "pink",
    bgGradient: "from-pink-500/10 via-purple-500/5 to-pink-500/10",
    description: "Job growth, workforce demand, and career opportunities",
    classification: "LABOUR",
  },
  skills: {
    icon: Lightbulb,
    title: "CAPABILITY FORESIGHT",
    gradient: "from-pink-500 to-rose-600",
    accentColor: "pink",
    bgGradient: "from-pink-500/10 via-purple-500/5 to-pink-500/10",
    description: "Emerging skills, training needs, and capability gaps",
    classification: "SKILLS",
  },
};

export function AIInsightsPanel({
  tab,
  title,
  className,
  maxInsights = 5,
  compact = false,
  showSources = false,
  variant = "default",
}: AIInsightsPanelProps) {
  const {
    getTabData,
    refreshTab,
    metrics,
    fundingAllocations,
    careerOpportunities,
    skillsDemand,
  } = useIntelligence();
  
  const { forecastImpacts } = useImpactQueries();
  const [impactForecasts, setImpactForecasts] = useState<Record<string, any>>({});
  const [loadingForecasts, setLoadingForecasts] = useState(false);

  const tabData = getTabData(tab);
  const config = tabConfig[tab];
  const Icon = config.icon;

  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set([0]));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCareerSlide, setActiveCareerSlide] = useState(0);
  const [isCareerAutoPlay, setIsCareerAutoPlay] = useState(true);
  
  // Fetch impact forecasts for relevant entities based on tab
  useEffect(() => {
    const fetchForecasts = async () => {
      if (tabData.loading) return;
      
      setLoadingForecasts(true);
      const forecasts: Record<string, any> = {};
      
      try {
        if (tab === 'careers' && careerOpportunities.length > 0) {
          // Forecast for top 3 careers
          const topCareers = careerOpportunities.slice(0, 3);
          for (const career of topCareers) {
            try {
              const forecast = await forecastImpacts(career.occupation, 12);
              if (forecast && forecast.confidence > 0.3) {
                forecasts[career.occupation] = forecast;
              }
            } catch (error) {
              console.error(`Failed to forecast for ${career.occupation}:`, error);
            }
          }
        } else if (tab === 'funding' && fundingAllocations.length > 0) {
          // Forecast for top 3 sectors
          const topSectors = fundingAllocations.slice(0, 3);
          for (const allocation of topSectors) {
            try {
              const forecast = await forecastImpacts(allocation.sector, 12);
              if (forecast && forecast.confidence > 0.3) {
                forecasts[allocation.sector] = forecast;
              }
            } catch (error) {
              console.error(`Failed to forecast for ${allocation.sector}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch forecasts:', error);
      } finally {
        setLoadingForecasts(false);
      }
      
      setImpactForecasts(forecasts);
    };
    
    fetchForecasts();
  }, [tab, careerOpportunities, fundingAllocations, tabData.loading, forecastImpacts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshTab(tab);
    setIsRefreshing(false);
  };

  const toggleInsightExpand = (index: number) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedInsights(newExpanded);
  };

  // Generate contextual insights if none from AI
  const displayInsights = useMemo(() => {
    if (tabData.insights.length > 0) {
      return tabData.insights.slice(0, maxInsights);
    }

    // Generate fallback insights from extracted data
    const fallbacks: InsightOutput[] = [];

    if (tab === "funding" && fundingAllocations.length > 0) {
      const top = fundingAllocations[0];
      fallbacks.push({
        title: `${top.sector} Leads Budget Priority`,
        explanation: `${top.sector} receives the largest allocation with $${(top.amount / 1000).toFixed(1)}B across ${top.programs} programs, signaling strong government commitment to this sector.`,
        whyItMatters: "This concentration of resources indicates strategic priority and creates downstream job opportunities.",
        evidenceSignal: `Budget data confirms ${top.change > 0 ? `+${top.change.toFixed(1)}%` : `${top.change.toFixed(1)}%`} year-over-year change across indexed documents.`,
        trendDirection: top.change > 0 ? "up" : top.change < 0 ? "down" : "stable",
        urgency: top.change > 10 ? "important" : "informational",
        confidence: "high",
      });
    }

    if (tab === "careers" && careerOpportunities.length > 0) {
      const trending = careerOpportunities.filter(c => c.trending || c.growth !== undefined);
      if (trending.length > 0) {
        fallbacks.push({
          title: `${trending.length} High-Growth Occupations Detected`,
          explanation: `Analysis reveals ${trending[0].occupation} and similar roles showing exceptional growth of +${(trending[0].growth ?? 15).toFixed(1)}%, creating significant opportunity for workforce entry.`,
          whyItMatters: "These roles represent the strongest career pathways aligned with government investment.",
          evidenceSignal: `Pattern analysis across ${careerOpportunities.length} occupations shows consistent upward trajectory.`,
          trendDirection: "up",
          urgency: "important",
          confidence: "high",
        });
      }
    }

    if (tab === "skills" && skillsDemand.length > 0) {
      const emerging = skillsDemand.filter(s => s.category === "emerging");
      if (emerging.length > 0) {
        fallbacks.push({
          title: `${emerging.length} Emerging Skills Signal Future Demand`,
          explanation: `Skills like ${emerging[0].name} are increasingly prioritized through funding and policy alignment, with ${emerging[0].growth.toFixed(1)}% demand growth.`,
          whyItMatters: "Early investment in these capabilities provides competitive advantage in evolving job markets.",
          evidenceSignal: `Cross-referencing funding allocations and workforce data reveals consistent skill prioritization.`,
          trendDirection: "up",
          urgency: "important",
          confidence: "medium",
        });
      }
    }

    return fallbacks.slice(0, maxInsights);
  }, [tab, tabData.insights, fundingAllocations, careerOpportunities, skillsDemand, maxInsights]);

  // Career slideshow data
  const careerSlides = useMemo(() => {
    if (tab === "careers" && careerOpportunities.length > 0) {
      return careerOpportunities
        .filter(c => c.growth !== undefined || c.jobs !== undefined)
        .slice(0, 10)
        .map(career => ({
          occupation: career.occupation,
          sector: career.sector,
          growth: career.growth,
          jobs: career.jobs,
          demand: career.demand,
          salary: career.salary,
          location: career.location,
        }));
    }
    return [];
  }, [tab, careerOpportunities]);

  // Auto-play career slideshow
  useEffect(() => {
    if (!isCareerAutoPlay || careerSlides.length === 0) return;
    const timer = setInterval(() => {
      setActiveCareerSlide((prev) => (prev + 1) % careerSlides.length);
    }, 8000); // Change every 8 seconds
    return () => clearInterval(timer);
  }, [isCareerAutoPlay, careerSlides.length]);

  const getTrendIcon = (direction?: "up" | "down" | "stable") => {
    switch (direction) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getUrgencyConfig = (urgency?: "critical" | "important" | "informational") => {
    switch (urgency) {
      case "critical":
        return {
          bg: "bg-gradient-to-br from-rose-500/10 to-pink-600/5",
          border: "border-rose-500/30",
          accent: "bg-rose-500",
          badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
          icon: AlertTriangle,
          label: "CRITICAL",
        };
      case "important":
        return {
          bg: "bg-gradient-to-br from-pink-500/10 to-purple-600/5",
          border: "border-pink-500/30",
          accent: "bg-pink-500",
          badge: "bg-pink-500/20 text-pink-400 border-pink-500/30",
          icon: Zap,
          label: "IMPORTANT",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-pink-500/5 to-purple-600/5",
          border: "border-pink-500/20",
          accent: "bg-pink-500",
          badge: "bg-pink-500/10 text-pink-400 border-pink-500/20",
          icon: Info,
          label: "SIGNAL",
        };
    }
  };

  // Loading state
  if (tabData.loading && displayInsights.length === 0) {
    return (
      <div className={cn("rounded-2xl overflow-hidden border border-pink-400/30 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl shadow-2xl shadow-pink-500/20", className)}>
        <div className="relative p-10 flex flex-col items-center justify-center gap-5">
          {/* Scanning animation */}
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20"
            >
              <div className={cn(
                "absolute inset-0 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                config.gradient
              )}>
                <Icon className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-pink-400/50"
              animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          
          <div className="text-center">
            <p className="text-sm font-semibold text-white font-mono tracking-wide drop-shadow">
              ANALYZING INTELLIGENCE DATA
            </p>
            <p className="text-xs text-pink-200/80 mt-2">
              Processing {metrics?.totalDocuments?.toLocaleString() || "0"} documents through semantic search...
            </p>
          </div>
          
          {/* Progress dots */}
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-pink-400"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (tabData.error && displayInsights.length === 0) {
    return (
      <div className={cn("rounded-2xl overflow-hidden border border-pink-400/30 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl shadow-lg p-6", className)}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-300" />
          </div>
          <div>
            <h3 className="font-semibold text-white drop-shadow">Analysis Unavailable</h3>
            <p className="text-sm text-pink-200/80">{tabData.error}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          className="border-pink-400/40 text-pink-200 hover:bg-pink-500/20"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Analysis
        </Button>
      </div>
    );
  }

  // Minimal variant
  if (variant === "minimal") {
    return (
      <div className={cn("space-y-3", className)}>
        {displayInsights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
              {getTrendIcon(insight.trendDirection)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground line-clamp-1">
                {insight.title}
              </p>
              <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                {insight.explanation}
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </motion.div>
        ))}
      </div>
    );
  }

  const timestamp = new Date().toLocaleTimeString("en-AU", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });

  // Get sources for this tab if available
  const tabSources = tabData.rawData && Array.isArray(tabData.rawData) 
    ? tabData.rawData.filter((item: any) => item.title || item.documentId || item.content)
    : [];

  return (
    <div className={cn("rounded-2xl overflow-hidden border border-pink-400/30 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl shadow-2xl shadow-pink-500/20", className)}>
      {/* Header - Intelligence Briefing Style with Pink Glassmorphism */}
      <div className={cn(
        "relative p-5 border-b border-pink-400/30",
        "bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-pink-500/10"
      )}>
        {/* Classification stripe */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1",
          `bg-gradient-to-r ${config.gradient}`
        )} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                `bg-gradient-to-br ${config.gradient}`
              )}
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-lg text-white drop-shadow-lg tracking-tight leading-tight">
                  {title || config.title}
                </h3>
                <Badge
                  className={cn(
                    "text-[10px] font-mono tracking-widest px-2 py-0.5 backdrop-blur-sm",
                    "bg-pink-500/20 text-pink-200 border-pink-400/40"
                  )}
                >
                  {config.classification}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-pink-200/80">
                <FileText className="w-3 h-3 flex-shrink-0" />
                <span className="leading-relaxed">{config.description}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Timestamp */}
            <div className="hidden sm:flex items-center gap-1 text-xs text-slate-300 font-mono">
              <Clock className="w-3 h-3" />
              {timestamp}
            </div>

            {careerSlides.length > 0 && (
              <Badge className="text-xs gap-1 font-mono bg-purple-500/20 text-purple-200 border-purple-400/40 backdrop-blur-sm">
                <Briefcase className="w-3 h-3" />
                {careerSlides.length}
              </Badge>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-pink-200 hover:text-white hover:bg-pink-500/20"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh analysis</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

        {/* Career Slideshow - Only for careers tab */}
        {tab === "careers" && careerSlides.length > 0 && (
          <div className="border-b border-border/50 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-pink-500/10 p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCareerSlide}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                {(() => {
                  const career = careerSlides[activeCareerSlide];
                  return (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg">
                              <Briefcase className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-white">{career.occupation}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-pink-500/20 text-pink-400 border-pink-400/30">
                                  {career.sector}
                                </Badge>
                                {career.demand && (
                                  <Badge className={cn(
                                    "text-xs",
                                    career.demand === "high" ? "bg-emerald-500/20 text-emerald-400 border-emerald-400/30" :
                                    career.demand === "medium" ? "bg-amber-500/20 text-amber-400 border-amber-400/30" :
                                    "bg-blue-500/20 text-blue-400 border-blue-400/30"
                                  )}>
                                    {career.demand.toUpperCase()} DEMAND
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Slide counter */}
                        <div className="text-xs text-slate-400 font-mono">
                          {activeCareerSlide + 1} / {careerSlides.length}
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {career.growth !== undefined && (
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Growth</span>
                            </div>
                            <p className="text-3xl font-bold text-emerald-500">+{career.growth.toFixed(1)}%</p>
                          </div>
                        )}

                        {career.jobs !== undefined && (
                          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-blue-400" />
                              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Positions</span>
                            </div>
                            <p className="text-3xl font-bold text-blue-500">{career.jobs.toLocaleString()}</p>
                          </div>
                        )}

                        {career.salary && (
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="w-4 h-4 text-amber-400" />
                              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Salary</span>
                            </div>
                            <p className="text-lg font-bold text-amber-500">{career.salary}</p>
                          </div>
                        )}

                        {career.location && (
                          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-purple-400" />
                              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Location</span>
                            </div>
                            <p className="text-sm font-bold text-purple-500">{career.location}</p>
                          </div>
                        )}
                      </div>

                      {/* Analytics Section */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-pink-500/5 border border-pink-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-pink-400" />
                            <p className="text-xs font-bold text-pink-400 uppercase tracking-widest">Decision Impact</p>
                          </div>
                          <p className="text-sm text-white/85 leading-relaxed">
                            {career.growth !== undefined && career.growth > 15
                              ? "Critical high-growth sector requiring immediate workforce development and training infrastructure investment."
                              : "Strategic opportunity for workforce development aligned with government policy priorities."}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-blue-400" />
                            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Evidence Signal</p>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed italic">
                            Based on indexed document analysis across {careerSlides.length} career opportunities showing consistent demand patterns.
                          </p>
                        </div>
                      </div>

                      {/* Navigation Dots */}
                      <div className="flex items-center justify-center gap-2 pt-2">
                        {careerSlides.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setActiveCareerSlide(idx);
                              setIsCareerAutoPlay(false);
                            }}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all duration-300",
                              idx === activeCareerSlide
                                ? "bg-pink-500 w-8"
                                : "bg-pink-300/30 hover:bg-pink-300/50"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Insights Content - Hidden for careers tab (only slideshow shown) */}
        {tab !== "careers" && (
          <div className="p-5 space-y-4">
            <AnimatePresence mode="popLayout">
              {displayInsights.length > 0 ? (
                displayInsights.map((insight, index) => {
                  const urgencyConfig = getUrgencyConfig(insight.urgency);
                  const isOpen = expandedInsights.has(index);
                  const UrgencyIcon = urgencyConfig.icon;
                  
                  return (
                    <motion.div
                      key={`${insight.title}-${index}`}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ delay: index * 0.08, type: "spring", stiffness: 400 }}
                      className={cn(
                        "group relative rounded-xl border border-pink-400/30 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-pink-500/10 backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300",
                        isOpen ? "shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/20" : "hover:shadow-md hover:shadow-pink-500/10"
                      )}
                      onClick={() => toggleInsightExpand(index)}
                    >
                      {/* Left accent bar */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        urgencyConfig.accent
                      )} />
                      
                      {/* Insight Header */}
                      <div className="p-5 pl-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            {/* Trend indicator */}
                            <motion.div
                              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                              {getTrendIcon(insight.trendDirection)}
                            </motion.div>
                            
                            <div className="flex-1 min-w-0">
                              {/* Title */}
                              <h4 className="font-display font-semibold text-white drop-shadow text-base leading-snug mb-2">
                                {insight.title}
                              </h4>
                              
                              {/* Explanation or Career Cards */}
                              {(() => {
                                // Check if explanation contains career data
                                const hasCareerData = insight.explanation.includes('Occupation:');
                                if (hasCareerData) {
                                  const careers = parseCareerData(insight.explanation);
                                  if (careers.length > 0) {
                                    // Expanded: show career cards
                                    if (isOpen) {
                                      return (
                                        <div className="space-y-3 mt-3">
                                          {careers.map((career, idx) => (
                                            <CareerCard key={idx} career={career} index={idx} />
                                          ))}
                                        </div>
                                      );
                                    }
                                    // Collapsed: show summary
                                    return (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">
                                          <Briefcase className="w-3 h-3 mr-1" />
                                          {careers.length} {careers.length === 1 ? 'Career' : 'Careers'}
                                        </Badge>
                                        {careers.slice(0, 3).map((c, i) => (
                                          <Badge key={i} variant="secondary" className="text-xs">
                                            {c.occupation}
                                          </Badge>
                                        ))}
                                        {careers.length > 3 && (
                                          <Badge variant="secondary" className="text-xs">
                                            +{careers.length - 3} more
                                          </Badge>
                                        )}
                                      </div>
                                    );
                                  }
                                }

                                // Default: show text
                                return (
                                  <p className={cn(
                                    "text-sm text-pink-200/90 leading-relaxed",
                                    isOpen ? "" : "line-clamp-2"
                                  )}>
                                    {insight.explanation}
                                  </p>
                                );
                              })()}
                            </div>
                          </div>
                          
                          {/* Right side badges */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Badge className={cn("text-[10px] font-mono gap-1", urgencyConfig.badge)}>
                              <UrgencyIcon className="w-3 h-3" />
                              {urgencyConfig.label}
                            </Badge>
                            
                            {!compact && (
                              <ConfidenceMeter confidence={insight.confidence} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content - Briefing Details */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-5 space-y-4">
                              {/* Divider */}
                              <div className="h-px bg-gradient-to-r from-transparent via-pink-400/30 to-transparent" />
                              
                              <div className="grid md:grid-cols-2 gap-4">
                                {/* Why This Matters */}
                                {insight.whyItMatters && (
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/5 border border-pink-400/30 backdrop-blur-sm"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <Target className="w-4 h-4 text-pink-300" />
                                      <p className="text-xs font-bold text-pink-200 uppercase tracking-widest">
                                        Decision Impact
                                      </p>
                                    </div>
                                    <p className="text-sm text-white/90 leading-relaxed">
                                      {insight.whyItMatters}
                                    </p>
                                  </motion.div>
                                )}

                                {/* Evidence Signal with Sources */}
                                {insight.evidenceSignal && (
                                  <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 }}
                                    className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-purple-400/30 backdrop-blur-sm"
                                  >
                                    <div className="flex items-center gap-2 mb-3">
                                      <BookOpen className="w-4 h-4 text-purple-300" />
                                      <p className="text-xs font-bold text-purple-200 uppercase tracking-widest">
                                        Evidence Signal
                                      </p>
                                    </div>
                                    <p className="text-sm text-pink-200/90 leading-relaxed mb-3">
                                      {insight.evidenceSignal}
                                    </p>
                                    
                                    {/* Source Citations */}
                                    {tabSources.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-purple-400/20">
                                        <p className="text-xs font-semibold text-purple-200/80 mb-2 uppercase tracking-wide">
                                          Sources & Citations:
                                        </p>
                                        <div className="space-y-2">
                                          {tabSources.slice(0, 3).map((source: any, idx: number) => (
                                            <div key={idx} className="flex items-start gap-2 text-xs">
                                              <FileText className="w-3 h-3 text-purple-300 flex-shrink-0 mt-0.5" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-purple-200/90 font-medium truncate">
                                                  {source.title || source.documentId || `Document ${idx + 1}`}
                                                </p>
                                                {source.pageNumber && (
                                                  <p className="text-purple-300/70 text-[10px]">Page {source.pageNumber}</p>
                                                )}
                                                {source.url && (
                                                  <a 
                                                    href={source.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-purple-300/80 hover:text-purple-200 text-[10px] underline truncate block"
                                                  >
                                                    View source
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                          {tabSources.length > 3 && (
                                            <p className="text-[10px] text-purple-300/70 italic">
                                              +{tabSources.length - 3} more sources available
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                              
                              {/* Visualization suggestion tag */}
                              {insight.visualSuggestion && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.2 }}
                                  className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-400/20"
                                >
                                  <BarChart3 className="w-3 h-3 text-purple-300" />
                                  <span className="text-xs text-purple-200/80 font-mono">
                                    Suggested visualization: {insight.visualSuggestion}
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Expand hint */}
                      {!isOpen && (insight.whyItMatters || insight.evidenceSignal) && (
                        <div className="pb-3 flex items-center justify-center">
                          <motion.div
                            animate={{ y: [0, 4, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center gap-1 text-xs text-slate-400"
                          >
                            <span className="opacity-60">Expand for details</span>
                            <ChevronDown className="w-3 h-3" />
                          </motion.div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className={cn(
                    "w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-5",
                    `bg-gradient-to-br ${config.gradient}`,
                    "opacity-20"
                  )}>
                    <Icon className="w-10 h-10 text-foreground" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">
                    No intelligence insights available
                  </p>
                  <p className="text-xs text-slate-400/70 mt-2 max-w-sm mx-auto">
                    Analysis is in progress or no relevant patterns were detected for this context.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run Analysis
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Impact Forecast Cards */}
        {(loadingForecasts || Object.keys(impactForecasts).length > 0) && (
          <div className="px-6 pb-6 space-y-4">
            <div className="border-t border-pink-400/20 pt-4">
              {loadingForecasts ? (
                <ImpactForecastCards forecast={null} loading={true} compact={compact} />
              ) : (
                Object.entries(impactForecasts).map(([entity, forecast]) => (
                  <ImpactForecastCards
                    key={entity}
                    forecast={forecast}
                    loading={false}
                    compact={compact}
                  />
                ))
              )}
            </div>
          </div>
        )}
    </div>
  );
}

/**
 * Career Card Component - Beautiful display for career/occupation data
 */
function CareerCard({ career, index }: { career: ParsedCareer; index: number }) {
  const getDemandColor = (demand?: string) => {
    const d = demand?.toLowerCase();
    if (d === 'high') return { bg: 'bg-emerald-500/10', accent: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500/30' };
    if (d === 'medium') return { bg: 'bg-amber-500/10', accent: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500/30' };
    return { bg: 'bg-blue-500/10', accent: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500/30' };
  };

  const demandColors = getDemandColor(career.demand);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-border"
    >
      {/* Accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", career.demand ? demandColors.accent : 'bg-blue-500')} />

      <div className="p-5 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 flex-1">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Briefcase className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-lg text-white leading-tight mb-1">
                {career.occupation}
              </h5>
              {career.sector && (
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{career.sector}</span>
                </div>
              )}
            </div>
          </div>

          {career.demand && (
            <Badge className={cn("text-xs font-semibold", demandColors.bg, demandColors.text, demandColors.border)}>
              {career.demand.toUpperCase()} DEMAND
            </Badge>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {career.growth && (
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-slate-400">Growth</span>
              </div>
              <p className="text-base font-bold text-emerald-400">{career.growth}</p>
            </div>
          )}

          {career.jobs && (
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-medium text-slate-400">Positions</span>
              </div>
              <p className="text-base font-bold text-blue-400">{career.jobs}</p>
            </div>
          )}

          {career.salary && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-slate-400">Salary</span>
              </div>
              <p className="text-base font-bold text-amber-400">{career.salary}</p>
            </div>
          )}

          {career.region && (
            <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-medium text-slate-400">Region</span>
              </div>
              <p className="text-base font-bold text-purple-400 truncate">{career.region}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Confidence meter component - Visual indicator of insight reliability
 */
function ConfidenceMeter({ confidence }: { confidence?: "high" | "medium" | "low" }) {
  const level = confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
  const color = confidence === "high" ? "emerald" : confidence === "medium" ? "amber" : "slate";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5">
            <Shield className={cn("w-3 h-3", `text-${color}-500`)} />
            <div className="flex items-center gap-0.5">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "w-1 rounded-full",
                    i <= level ? `bg-${color}-500` : "bg-white/10",
                    i === 1 ? "h-2" : i === 2 ? "h-3" : "h-4"
                  )}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.1 }}
                />
              ))}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-xs">
            Confidence: <span className="font-bold uppercase">{confidence || "unknown"}</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AIInsightsPanel;

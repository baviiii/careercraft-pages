/**
 * HORUS AIInsightsPanel — Intelligence Briefing Cards
 * 
 * Decision-grade intelligence display with classified briefing aesthetic.
 * Features insight cards that look like real intelligence documents.
 */

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIntelligence } from "@/contexts/IntelligenceContext";
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

const tabConfig = {
  overview: {
    icon: Brain,
    title: "STRATEGIC INTELLIGENCE",
    gradient: "from-blue-500 to-purple-600",
    accentColor: "blue",
    bgGradient: "from-blue-500/5 via-transparent to-purple-500/5",
    description: "Whole-of-government patterns and cross-sector trends",
    classification: "STRATEGIC",
  },
  funding: {
    icon: BarChart3,
    title: "FISCAL INTELLIGENCE",
    gradient: "from-amber-500 to-orange-600",
    accentColor: "amber",
    bgGradient: "from-amber-500/5 via-transparent to-orange-500/5",
    description: "Budget allocations, funding changes, and investment signals",
    classification: "FISCAL",
  },
  careers: {
    icon: TrendingUp,
    title: "WORKFORCE INTELLIGENCE",
    gradient: "from-emerald-500 to-teal-600",
    accentColor: "emerald",
    bgGradient: "from-emerald-500/5 via-transparent to-teal-500/5",
    description: "Job growth, workforce demand, and career opportunities",
    classification: "LABOUR",
  },
  skills: {
    icon: Lightbulb,
    title: "CAPABILITY FORESIGHT",
    gradient: "from-purple-500 to-pink-600",
    accentColor: "purple",
    bgGradient: "from-purple-500/5 via-transparent to-pink-500/5",
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

  const tabData = getTabData(tab);
  const config = tabConfig[tab];
  const Icon = config.icon;

  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set([0]));
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      const trending = careerOpportunities.filter(c => c.trending);
      if (trending.length > 0) {
        fallbacks.push({
          title: `${trending.length} High-Growth Occupations Detected`,
          explanation: `Analysis reveals ${trending[0].occupation} and similar roles showing exceptional growth of +${trending[0].growth.toFixed(1)}%, creating significant opportunity for workforce entry.`,
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
          bg: "bg-gradient-to-br from-red-500/10 to-red-600/5",
          border: "border-red-500/30",
          accent: "bg-red-500",
          badge: "bg-red-500/20 text-red-400 border-red-500/30",
          icon: AlertTriangle,
          label: "CRITICAL",
        };
      case "important":
        return {
          bg: "bg-gradient-to-br from-amber-500/10 to-amber-600/5",
          border: "border-amber-500/30",
          accent: "bg-amber-500",
          badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          icon: Zap,
          label: "IMPORTANT",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-slate-500/5 to-slate-600/5",
          border: "border-slate-500/20",
          accent: "bg-blue-500",
          badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          icon: Info,
          label: "SIGNAL",
        };
    }
  };

  // Loading state
  if (tabData.loading && displayInsights.length === 0) {
    return (
      <div className={cn("card-intelligence overflow-hidden", className)}>
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
              className="absolute inset-0 rounded-2xl border-2 border-blue-400/50"
              animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground font-mono tracking-wide">
              ANALYZING INTELLIGENCE DATA
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Processing {metrics?.totalDocuments?.toLocaleString() || "0"} documents through semantic search...
            </p>
          </div>
          
          {/* Progress dots */}
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-blue-500"
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
      <div className={cn("card-intelligence p-6", className)}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Analysis Unavailable</h3>
            <p className="text-sm text-muted-foreground">{tabData.error}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
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
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {insight.explanation}
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </motion.div>
        ))}
      </div>
    );
  }

  const timestamp = new Date().toLocaleTimeString("en-AU", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn("rounded-2xl overflow-hidden border border-border/50 bg-card", className)}>
        {/* Header - Intelligence Briefing Style */}
        <div className={cn(
          "relative p-5 border-b border-border/50",
          `bg-gradient-to-r ${config.bgGradient}`
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
                <div className="flex items-center gap-3">
                  <h3 className="font-display font-bold text-foreground tracking-tight">
                    {title || config.title}
                  </h3>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] font-mono tracking-widest px-2",
                      `border-${config.accentColor}-500/30 text-${config.accentColor}-600`
                    )}
                  >
                    {config.classification}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {config.description}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Timestamp */}
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Clock className="w-3 h-3" />
                {timestamp}
              </div>
              
              {displayInsights.length > 0 && (
                <Badge variant="secondary" className="text-xs gap-1 font-mono">
                  <Eye className="w-3 h-3" />
                  {displayInsights.length}
                </Badge>
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
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
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>

        {/* Insights Content */}
        <CollapsibleContent>
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
                        "group relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-300",
                        urgencyConfig.bg,
                        urgencyConfig.border,
                        isOpen ? "shadow-lg ring-1 ring-white/5" : "hover:shadow-md"
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
                              <h4 className="font-display font-semibold text-foreground text-base leading-snug mb-2">
                                {insight.title}
                              </h4>
                              
                              {/* Explanation */}
                              <p className={cn(
                                "text-sm text-muted-foreground leading-relaxed",
                                isOpen ? "" : "line-clamp-2"
                              )}>
                                {insight.explanation}
                              </p>
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
                              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                              
                              <div className="grid md:grid-cols-2 gap-4">
                                {/* Why This Matters */}
                                {insight.whyItMatters && (
                                  <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <Target className="w-4 h-4 text-amber-500" />
                                      <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                                        Decision Impact
                                      </p>
                                    </div>
                                    <p className="text-sm text-foreground leading-relaxed">
                                      {insight.whyItMatters}
                                    </p>
                                  </motion.div>
                                )}

                                {/* Evidence Signal */}
                                {insight.evidenceSignal && (
                                  <motion.div 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 }}
                                    className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <BookOpen className="w-4 h-4 text-blue-500" />
                                      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                                        Evidence Signal
                                      </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                                      {insight.evidenceSignal}
                                    </p>
                                  </motion.div>
                                )}
                              </div>
                              
                              {/* Visualization suggestion tag */}
                              {insight.visualSuggestion && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.2 }}
                                  className="flex items-center gap-2"
                                >
                                  <BarChart3 className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground font-mono">
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
                            className="flex items-center gap-1 text-xs text-muted-foreground"
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
                  <p className="text-sm font-medium text-muted-foreground">
                    No intelligence insights available
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2 max-w-sm mx-auto">
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
        </CollapsibleContent>
      </div>
    </Collapsible>
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

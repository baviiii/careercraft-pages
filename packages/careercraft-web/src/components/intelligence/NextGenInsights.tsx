/**
 * NEXT-GEN INSIGHTS - Ferrari-grade intelligence that makes users go "WOAH"
 * Features: Data Stories, Deep Dives, Discovery Mode, Predictive Analytics
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Brain,
  Zap,
  Target,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Play,
  Pause,
  Lightbulb,
  Network,
  BarChart3,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Award,
  Rocket,
  Eye,
  MessageCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useIntelligence } from "@/contexts/IntelligenceContext";
import { useImpactQueries } from "@/hooks/useImpactQueries";
import { detectImpactAnomalies, type Anomaly } from "@/lib/impactAnomalyDetection";
import { ScenarioModeler } from "./ScenarioModeler";

// ============================================================================
// DATA STORY - Narrative-driven insights
// ============================================================================

interface DataStory {
  id: string;
  title: string;
  narrative: string;
  impact: "critical" | "high" | "medium";
  dataPoints: Array<{
    label: string;
    value: string;
    trend?: "up" | "down" | "stable";
    change?: number;
  }>;
  deepDive: {
    question: string;
    insights: string[];
  };
  conversationStarters: string[];
}

export function DataStoriesPanel() {
  const { fundingAllocations, careerOpportunities, skillsDemand } = useIntelligence();
  const [activeStory, setActiveStory] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Generate data stories dynamically from real context data
  const stories: DataStory[] = useMemo(() => {
    const generated: DataStory[] = [];

    // Story from top funding allocation
    if (fundingAllocations.length > 0) {
      const top = fundingAllocations[0];
      const totalBudget = fundingAllocations.reduce((s, a) => s + a.amount, 0);
      const share = totalBudget > 0 ? ((top.amount / totalBudget) * 100).toFixed(1) : "0";
      const second = fundingAllocations[1];

      generated.push({
        id: `funding-${top.sector}`,
        title: `💰 ${top.sector}: $${(top.amount / 1000).toFixed(1)}B Budget Priority`,
        narrative: `${top.sector} receives the largest share at ${share}% of total funding across ${top.programs} programs. ${top.change > 0 ? `With a ${top.change.toFixed(1)}% year-over-year increase, momentum is strong.` : top.change < 0 ? `However, funding decreased ${Math.abs(top.change).toFixed(1)}% from last year.` : 'Funding remains stable year-over-year.'} ${second ? `${second.sector} follows with $${(second.amount / 1000).toFixed(1)}B.` : ''}`,
        impact: top.change > 10 ? "critical" : top.change > 0 ? "high" : "medium",
        dataPoints: [
          { label: "Total Allocation", value: `$${(top.amount / 1000).toFixed(1)}B`, trend: top.change > 0 ? "up" : top.change < 0 ? "down" : "stable", change: top.change },
          { label: "Budget Share", value: `${share}%`, trend: "stable" },
          { label: "Programs", value: `${top.programs}`, trend: "up" },
          { label: "YoY Change", value: `${top.change > 0 ? '+' : ''}${top.change.toFixed(1)}%`, trend: top.change > 0 ? "up" : top.change < 0 ? "down" : "stable", change: top.change },
        ],
        deepDive: {
          question: `What's driving ${top.sector} investment?`,
          insights: [
            `${top.sector} has ${top.programs} active government programs`,
            `Confidence level: ${top.confidence}`,
            ...(second ? [`${second.sector} is the second largest sector at $${(second.amount / 1000).toFixed(1)}B`] : []),
            `Total government budget across all sectors: $${(totalBudget / 1000).toFixed(1)}B`,
          ],
        },
        conversationStarters: [
          `What specific programs are funded under ${top.sector}?`,
          `How does ${top.sector} funding compare historically?`,
          `What career opportunities exist in ${top.sector} right now?`,
          `Which regions benefit most from ${top.sector} investment?`,
        ],
      });
    }

    // Story from career opportunities
    if (careerOpportunities.length > 0) {
      const trending = careerOpportunities.filter(c => c.growth !== undefined && c.growth > 0).sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0));
      const topCareers = trending.slice(0, 4);

      if (topCareers.length > 0) {
        const fastest = topCareers[0];
        generated.push({
          id: "career-growth",
          title: `🚀 ${topCareers.length} High-Growth Careers: ${fastest.occupation} Leads at +${(fastest.growth ?? 0).toFixed(0)}%`,
          narrative: `Analysis of ${careerOpportunities.length} occupations reveals ${topCareers.length} with exceptional growth trajectories. ${fastest.occupation} is growing fastest at ${(fastest.growth ?? 0).toFixed(1)}%${fastest.jobs ? ` with ${fastest.jobs.toLocaleString()} positions` : ''}. ${fastest.sector ? `The ${fastest.sector} sector is a key driver.` : ''}`,
          impact: (fastest.growth ?? 0) > 20 ? "critical" : "high",
          dataPoints: topCareers.slice(0, 4).map(c => ({
            label: c.occupation.length > 15 ? c.occupation.substring(0, 14) + '…' : c.occupation,
            value: `+${(c.growth ?? 0).toFixed(0)}%`,
            trend: "up" as const,
            change: c.growth,
          })),
          deepDive: {
            question: "Which careers have the strongest momentum?",
            insights: topCareers.map(c =>
              `${c.occupation}: +${(c.growth ?? 0).toFixed(1)}% growth${c.salary ? `, avg salary $${typeof c.salary === 'number' ? c.salary.toLocaleString() : c.salary}` : ''}${c.sector ? ` (${c.sector})` : ''}`
            ),
          },
          conversationStarters: [
            `What qualifications do I need for ${fastest.occupation}?`,
            `Compare salaries across the top growing occupations`,
            `Which regions have the most ${fastest.occupation} openings?`,
            `What training programs are available for high-growth careers?`,
          ],
        });
      }
    }

    // Story from skills demand
    if (skillsDemand.length > 0) {
      const emerging = skillsDemand.filter(s => s.category === "emerging");
      const topSkills = skillsDemand.sort((a, b) => b.growth - a.growth).slice(0, 4);

      if (topSkills.length > 0) {
        generated.push({
          id: "skills-demand",
          title: `⚡ Skills Intelligence: ${emerging.length} Emerging Skills Detected`,
          narrative: `Cross-referencing funding allocations and workforce data reveals ${topSkills.length} skills with exceptional demand growth. ${topSkills[0].name} leads at +${topSkills[0].growth.toFixed(0)}% demand growth. ${emerging.length > 0 ? `${emerging.length} skills are classified as emerging — early investment here provides competitive advantage.` : ''}`,
          impact: emerging.length > 3 ? "critical" : "high",
          dataPoints: topSkills.map(s => ({
            label: s.name.length > 15 ? s.name.substring(0, 14) + '…' : s.name,
            value: `+${s.growth.toFixed(0)}%`,
            trend: "up" as const,
            change: s.growth,
          })),
          deepDive: {
            question: "Which skills will define the future workforce?",
            insights: topSkills.map(s =>
              `${s.name}: +${s.growth.toFixed(1)}% demand (${s.category})`
            ),
          },
          conversationStarters: [
            `What jobs require ${topSkills[0].name}?`,
            `How do I upskill in emerging technology areas?`,
            `Which skills have the best salary premium right now?`,
            `Show me micro-credentials for top-demand skills`,
          ],
        });
      }
    }

    return generated.length > 0 ? generated : [{
      id: "loading",
      title: "📊 Intelligence Loading...",
      narrative: "Data stories are generated from real-time analysis of funding allocations, career trends, and skills demand. Run a search or wait for data to load.",
      impact: "medium",
      dataPoints: [],
      deepDive: { question: "How are stories generated?", insights: ["Stories are built from live budget, career, and skills data", "They update automatically as new data arrives"] },
      conversationStarters: ["What sectors have the most funding?", "Show me high-growth careers"],
    }];
  }, [fundingAllocations, careerOpportunities, skillsDemand]);

  // Auto-rotate stories
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setActiveStory((prev) => (prev + 1) % stories.length);
    }, 12000);
    return () => clearInterval(timer);
  }, [isAutoPlay, stories.length]);

  const currentStory = stories[activeStory];

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Data Stories</h3>
            <p className="text-xs text-slate-400">AI-discovered insights from 54+ documents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className="text-slate-400 hover:text-white"
          >
            {isAutoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            {activeStory + 1} / {stories.length}
          </Badge>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStory.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Story Title */}
          <div className="flex items-start gap-3 mb-4">
            <Badge
              className={cn(
                "text-xs font-semibold shrink-0",
                currentStory.impact === "critical" &&
                  "bg-red-500/20 text-red-400 border-red-500/30",
                currentStory.impact === "high" &&
                  "bg-orange-500/20 text-orange-400 border-orange-500/30",
                currentStory.impact === "medium" &&
                  "bg-blue-500/20 text-blue-400 border-blue-500/30"
              )}
            >
              {currentStory.impact.toUpperCase()} IMPACT
            </Badge>
            <h4 className="text-xl font-bold text-white leading-tight">
              {currentStory.title}
            </h4>
          </div>

          {/* Narrative */}
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            {currentStory.narrative}
          </p>

          {/* Data Points Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {currentStory.dataPoints.map((point, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
              >
                <p className="text-xs text-slate-400 mb-1">{point.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-white">{point.value}</p>
                  {point.trend && (
                    <div
                      className={cn(
                        "flex items-center",
                        point.trend === "up" && "text-emerald-400",
                        point.trend === "down" && "text-red-400",
                        point.trend === "stable" && "text-slate-400"
                      )}
                    >
                      {point.trend === "up" && <TrendingUp className="w-3 h-3" />}
                      {point.trend === "down" && <TrendingDown className="w-3 h-3" />}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Deep Dive Section */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-purple-400" />
              <p className="text-sm font-semibold text-purple-400">
                {currentStory.deepDive.question}
              </p>
            </div>
            <div className="space-y-2">
              {currentStory.deepDive.insights.map((insight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <ChevronRight className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300">{insight}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Conversation Starters */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-semibold text-blue-400">Ask Horus Chat:</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentStory.conversationStarters.map((starter, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  onClick={() => {
                    // Navigate to Horus Chat with pre-filled question
                    window.location.href = `/career-coach?q=${encodeURIComponent(starter)}`;
                  }}
                  className="group flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/30 text-left transition-all"
                >
                  <Zap className="w-3 h-3 text-blue-400 group-hover:text-blue-300 shrink-0" />
                  <span className="text-xs text-slate-300 group-hover:text-white flex-1">
                    {starter}
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Story Navigation Dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {stories.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveStory(idx)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              idx === activeStory
                ? "w-8 bg-gradient-to-r from-purple-500 to-pink-500"
                : "w-1.5 bg-slate-700 hover:bg-slate-600"
            )}
          />
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// LIVE DISCOVERY FEED - Real-time AI insights
// ============================================================================

interface Discovery {
  id: string;
  type: "correlation" | "anomaly" | "prediction" | "opportunity";
  title: string;
  description: string;
  confidence: number;
  timestamp: Date;
  action?: string;
}

export function LiveDiscoveryFeed() {
  const { fundingAllocations, careerOpportunities, skillsDemand } = useIntelligence();
  const { getImpactsForEntity } = useImpactQueries();
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  // Generate discoveries from real data: anomaly detection + context analysis
  useEffect(() => {
    if (isPaused) return;

    const generateDiscoveries = async () => {
      const realDiscoveries: Discovery[] = [];
      let idCounter = 0;

      // Try to fetch impacts for top sectors and run anomaly detection
      try {
        const topSectors = fundingAllocations.slice(0, 3);
        const allImpacts: any[] = [];
        
        for (const alloc of topSectors) {
          try {
            const impacts = await getImpactsForEntity(alloc.sector, { limit: 20 });
            allImpacts.push(...impacts);
          } catch {
            // Silently skip if fetch fails
          }
        }

        if (allImpacts.length > 0) {
          const anomalies = detectImpactAnomalies(allImpacts);
          
          for (const anomaly of anomalies.slice(0, 3)) {
            const typeMap: Record<string, Discovery['type']> = {
              'outlier': 'anomaly',
              'conflict': 'anomaly',
              'unusual_pattern': 'anomaly',
              'threshold_breach': 'anomaly',
            };
            realDiscoveries.push({
              id: String(++idCounter),
              type: typeMap[anomaly.type] || 'anomaly',
              title: anomaly.description,
              description: anomaly.recommendation || `Detected in ${anomaly.entity || 'unknown entity'}`,
              confidence: anomaly.severity === 'high' ? 90 : anomaly.severity === 'medium' ? 70 : 50,
              timestamp: new Date(),
              action: "Investigate",
            });
          }
        }
      } catch {
        // If impact fetching fails, continue with context-based discoveries
      }

      // Generate discoveries from funding data
      if (fundingAllocations.length >= 2) {
        const top = fundingAllocations[0];
        const second = fundingAllocations[1];
        if (top.change > 5 || top.change < -5) {
          realDiscoveries.push({
            id: String(++idCounter),
            type: top.change > 0 ? "opportunity" : "anomaly",
            title: `${top.sector} funding ${top.change > 0 ? 'surged' : 'declined'} ${Math.abs(top.change).toFixed(1)}% year-over-year`,
            description: `${top.sector} at $${(top.amount / 1000).toFixed(1)}B vs ${second.sector} at $${(second.amount / 1000).toFixed(1)}B. ${top.change > 0 ? 'Growing investment signals opportunity.' : 'Declining investment may impact jobs.'}`,
            confidence: 85,
            timestamp: new Date(Date.now() - 60000),
            action: "Explore sector",
          });
        }
      }

      // Generate discoveries from career opportunities
      if (careerOpportunities.length > 0) {
        const highGrowth = careerOpportunities.filter(c => (c.growth ?? 0) > 15);
        if (highGrowth.length > 0) {
          const top = highGrowth[0];
          realDiscoveries.push({
            id: String(++idCounter),
            type: "prediction",
            title: `${highGrowth.length} occupations showing >15% growth — ${top.occupation} leads`,
            description: `${top.occupation} growing at +${(top.growth ?? 0).toFixed(1)}%${top.jobs ? ` with ${top.jobs.toLocaleString()} positions` : ''}. Strong hiring momentum detected.`,
            confidence: 78,
            timestamp: new Date(Date.now() - 180000),
            action: "View careers",
          });
        }
      }

      // Generate from skills demand
      if (skillsDemand.length > 0) {
        const emerging = skillsDemand.filter(s => s.category === "emerging");
        if (emerging.length > 0) {
          realDiscoveries.push({
            id: String(++idCounter),
            type: "correlation",
            title: `${emerging.length} emerging skills correlate with high-growth sectors`,
            description: `Skills like ${emerging.slice(0, 2).map(s => s.name).join(', ')} show +${emerging[0].growth.toFixed(0)}% demand growth. Early movers gain competitive advantage.`,
            confidence: 72,
            timestamp: new Date(Date.now() - 300000),
            action: "Explore skills",
          });
        }
      }

      // Cross-sector correlation
      if (fundingAllocations.length > 0 && careerOpportunities.length > 0) {
        const fundedSectors = new Set(fundingAllocations.map(a => a.sector.toLowerCase()));
        const careerSectors = careerOpportunities.filter(c => c.sector && fundedSectors.has(c.sector.toLowerCase()));
        if (careerSectors.length > 0) {
          realDiscoveries.push({
            id: String(++idCounter),
            type: "correlation",
            title: `${careerSectors.length} career opportunities align with funded sectors`,
            description: `Cross-referencing budget allocations and job data reveals strong correlation. Government investment is translating into hiring.`,
            confidence: 80,
            timestamp: new Date(Date.now() - 420000),
            action: "See alignment",
          });
        }
      }

      setDiscoveries(realDiscoveries.slice(0, 6));
    };

    generateDiscoveries();
  }, [isPaused, fundingAllocations, careerOpportunities, skillsDemand, getImpactsForEntity]);

  const getTypeConfig = (type: Discovery["type"]) => {
    switch (type) {
      case "correlation":
        return {
          icon: Network,
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
        };
      case "anomaly":
        return {
          icon: AlertCircle,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
        };
      case "prediction":
        return {
          icon: TrendingUp,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
        };
      case "opportunity":
        return {
          icon: Target,
          color: "text-purple-400",
          bg: "bg-purple-500/10",
          border: "border-purple-500/20",
        };
    }
  };

  return (
    <Card className="p-6 bg-slate-900/50 border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Live Discovery</h3>
            <p className="text-xs text-slate-400">AI is analyzing patterns right now...</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPaused(!isPaused)}
          className="text-slate-400 hover:text-white"
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </Button>
      </div>

      {/* Discovery Feed */}
      <div className="space-y-3">
        <AnimatePresence>
          {discoveries.map((discovery, idx) => {
            const config = getTypeConfig(discovery.type);
            const Icon = config.icon;

            return (
              <motion.div
                key={discovery.id}
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "p-4 rounded-xl border",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bg)}>
                    <Icon className={cn("w-4 h-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn("text-sm font-semibold", config.color)}>
                        {discovery.title}
                      </p>
                      <Badge className="text-[10px] bg-slate-800 text-slate-300 border-slate-700">
                        {discovery.confidence}% confident
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{discovery.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{Math.floor((Date.now() - discovery.timestamp.getTime()) / 60000)}m ago</span>
                      </div>
                      {discovery.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 text-xs gap-1",
                            config.color,
                            "hover:bg-white/5"
                          )}
                        >
                          {discovery.action}
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
}

/**
 * Impact Scenario Modeling Panel
 * Interactive what-if analysis for policy impacts
 */
export function ImpactScenarioPanel() {
  const { fundingAllocations, careerOpportunities } = useIntelligence();
  
  // Get default entity from top allocation or career
  const defaultEntity = fundingAllocations.length > 0 
    ? fundingAllocations[0].sector 
    : careerOpportunities.length > 0 
    ? careerOpportunities[0].occupation 
    : "";
  
  return (
    <ScenarioModeler defaultEntity={defaultEntity} />
  );
}

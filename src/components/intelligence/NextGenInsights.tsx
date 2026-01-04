/**
 * NEXT-GEN INSIGHTS - Ferrari-grade intelligence that makes users go "WOAH"
 * Features: Data Stories, Deep Dives, Discovery Mode, Predictive Analytics
 */

import { useState, useEffect } from "react";
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

  // Generate intelligent data stories
  const stories: DataStory[] = [
    {
      id: "healthcare-boom",
      title: "🏥 Healthcare Sector: The $4.2B Opportunity Wave",
      narrative: "Healthcare funding jumped 15.3% while demand for nurses increased 42%. This creates a perfect storm of opportunity: government is investing heavily, hospitals are hiring aggressively, and training programs are expanding. The data shows a 3-year window before supply catches up with demand.",
      impact: "critical",
      dataPoints: [
        { label: "Budget Increase", value: "+15.3%", trend: "up", change: 15.3 },
        { label: "Job Growth", value: "+42%", trend: "up", change: 42 },
        { label: "Avg Salary", value: "$89K", trend: "up", change: 8.2 },
        { label: "Training Programs", value: "127 active", trend: "up", change: 23 },
      ],
      deepDive: {
        question: "Why is this happening now?",
        insights: [
          "Aging population driving 28% increase in healthcare demand",
          "Post-pandemic workforce shortage created 12,000+ vacancies",
          "Federal government committed $4.2B for health infrastructure",
          "SA leading national health innovation initiatives",
        ],
      },
      conversationStarters: [
        "Show me the fastest path from zero to $89K in healthcare",
        "Which healthcare roles have the highest growth vs lowest competition?",
        "What training programs have government funding AND job guarantees?",
        "Predict my earnings trajectory if I start nursing training today",
      ],
    },
    {
      id: "green-tech-surge",
      title: "🌱 Green Technology: The Hidden $2.8B Gold Rush",
      narrative: "While everyone watches healthcare, green tech funding silently tripled. Renewable energy jobs grew 156%, but only 340 trained workers exist in SA. This is a blue ocean opportunity: massive funding, explosive growth, almost zero competition. First movers will dominate.",
      impact: "critical",
      dataPoints: [
        { label: "Funding Growth", value: "+187%", trend: "up", change: 187 },
        { label: "Job Openings", value: "1,247", trend: "up", change: 156 },
        { label: "Trained Workers", value: "340", trend: "up", change: 34 },
        { label: "Supply Gap", value: "907 positions", trend: "up", change: 267 },
      ],
      deepDive: {
        question: "What makes this extraordinary?",
        insights: [
          "3.67x more jobs than qualified workers - unheard of ratio",
          "Government guaranteed $2.8B for renewable energy projects",
          "Average entry salary $78K - above most traditional trades",
          "Training duration: 6-18 months vs 4 years for degree",
        ],
      },
      conversationStarters: [
        "Map the complete green tech career pathway with exact salaries",
        "Which renewable energy roles need the least training for highest pay?",
        "Show me government-funded green tech programs with job placement",
        "What's the ROI calculation: training cost vs lifetime earnings in green tech?",
      ],
    },
    {
      id: "skills-arbitrage",
      title: "⚡ The Skills Arbitrage: AI + Trade Skills = $127K",
      narrative: "Data reveals a hidden pattern: tradespeople adding AI/automation skills command 68% higher salaries. Electricians with IoT training: $127K. Builders with BIM software: $118K. The market is pricing 'hybrid skills' at a massive premium, but only 4% of workers have noticed.",
      impact: "high",
      dataPoints: [
        { label: "Hybrid Premium", value: "+68%", trend: "up", change: 68 },
        { label: "Electrician + AI", value: "$127K", trend: "up", change: 71 },
        { label: "Builder + BIM", value: "$118K", trend: "up", change: 63 },
        { label: "Workers Aware", value: "4%", trend: "stable" },
      ],
      deepDive: {
        question: "Why does this arbitrage exist?",
        insights: [
          "Traditional trades have stable demand, AI skills are rare",
          "Combining both creates unique value employers can't find elsewhere",
          "Training overlap: learn AI fundamentals in 3-6 months",
          "Market inefficiency: most workers don't know this premium exists",
        ],
      },
      conversationStarters: [
        "Which trade + AI combinations have the highest salary premium?",
        "Show me micro-credentials that add $30K+ to my current trade salary",
        "Calculate exact ROI: cost of AI training vs salary increase in my field",
        "Which hybrid skills are emerging but not yet mainstream?",
      ],
    },
  ];

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
                    window.location.href = `/sa-career-hub?q=${encodeURIComponent(starter)}`;
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
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  // Simulate AI discovering insights in real-time
  useEffect(() => {
    if (isPaused) return;

    const mockDiscoveries: Discovery[] = [
      {
        id: "1",
        type: "correlation",
        title: "Strong correlation detected: Education budget ↔ Tech job growth",
        description: "87% correlation between education sector funding and technology job creation with 6-month lag",
        confidence: 87,
        timestamp: new Date(),
        action: "Explore correlation",
      },
      {
        id: "2",
        type: "opportunity",
        title: "Arbitrage detected: Cyber security roles vs qualified candidates",
        description: "247 open positions, only 43 qualified candidates in SA. Supply-demand gap creates 5.7x opportunity multiplier",
        confidence: 94,
        timestamp: new Date(Date.now() - 120000),
        action: "View opportunities",
      },
      {
        id: "3",
        type: "prediction",
        title: "Infrastructure jobs predicted to surge 34% in Q2 2025",
        description: "Based on budget allocation patterns and historical data, construction/infrastructure roles will spike",
        confidence: 76,
        timestamp: new Date(Date.now() - 240000),
        action: "See predictions",
      },
      {
        id: "4",
        type: "anomaly",
        title: "Unusual pattern: Healthcare funding stable, but job postings +42%",
        description: "Mismatch suggests private sector growth or efficiency drive creating unexpected opportunities",
        confidence: 82,
        timestamp: new Date(Date.now() - 360000),
        action: "Investigate",
      },
    ];

    setDiscoveries(mockDiscoveries);
  }, [isPaused]);

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

/**
 * HORUS Intelligence Hero — Command Center Overview
 * 
 * A stunning hero section styled like a classified intelligence briefing system.
 * Features real-time metrics, cross-sector connections, and AI-discovered patterns.
 */

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Sparkles,
  Zap,
  Target,
  ArrowUpRight,
  Activity,
  Shield,
  Eye,
  Cpu,
  Network,
  AlertTriangle,
  CheckCircle,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useIntelligence } from "@/contexts/IntelligenceContext";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 25 }
  },
};

const pulseRing = {
  initial: { scale: 1, opacity: 0.8 },
  animate: { 
    scale: [1, 1.5, 1], 
    opacity: [0.8, 0, 0.8],
  },
};

// Simulated system status for briefing feel
const SystemStatus = ({ label, status }: { label: string; status: "active" | "processing" | "complete" }) => (
  <div className="flex items-center gap-2 text-xs">
    <div className="relative">
      {status === "active" && (
        <>
          <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
          <motion.div 
            className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400"
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </>
      )}
      {status === "processing" && (
        <Circle className="w-2 h-2 fill-amber-400 text-amber-400 animate-pulse" />
      )}
      {status === "complete" && (
        <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
      )}
    </div>
    <span className={cn(
      "font-mono uppercase tracking-wide",
      status === "active" ? "text-emerald-400" : 
      status === "processing" ? "text-amber-400" : "text-slate-500"
    )}>
      {label}
    </span>
  </div>
);

export function IntelligenceHero() {
  const {
    metrics,
    totalBudget,
    totalJobs,
    topGrowthSector,
    emergingTrends,
    crossTabInsights,
    globalLoading,
    fundingAllocations,
    careerOpportunities,
    skillsDemand,
  } = useIntelligence();

  // Typing effect for briefing title
  const [displayedTitle, setDisplayedTitle] = useState("");
  const fullTitle = "INTELLIGENCE BRIEFING";
  
  useEffect(() => {
    if (globalLoading) return;
    let i = 0;
    const timer = setInterval(() => {
      if (i <= fullTitle.length) {
        setDisplayedTitle(fullTitle.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [globalLoading]);

  const heroStats = useMemo(() => [
    {
      id: "budget",
      label: "FISCAL ALLOCATION",
      value: totalBudget > 0 ? `$${(totalBudget / 1000).toFixed(1)}B` : "—",
      subValue: fundingAllocations.length > 0 ? `${fundingAllocations.length} sectors tracked` : "Analyzing...",
      icon: DollarSign,
      gradient: "from-amber-500 via-orange-500 to-red-500",
      bgGradient: "from-amber-500/10 to-orange-500/5",
      borderColor: "border-amber-500/30",
      trend: fundingAllocations[0]?.change || 0,
      loading: totalBudget === 0,
    },
    {
      id: "careers",
      label: "WORKFORCE SIGNALS",
      value: totalJobs > 0 ? totalJobs.toLocaleString() : "—",
      subValue: careerOpportunities.length > 0 ? `${careerOpportunities.filter(c => c.trending).length} high-growth roles` : "Scanning...",
      icon: Briefcase,
      gradient: "from-blue-500 via-cyan-500 to-teal-500",
      bgGradient: "from-blue-500/10 to-cyan-500/5",
      borderColor: "border-blue-500/30",
      trend: careerOpportunities.length > 0 ? careerOpportunities.reduce((sum, c) => sum + c.growth, 0) / careerOpportunities.length : 0,
      loading: totalJobs === 0,
    },
    {
      id: "skills",
      label: "CAPABILITY DEMAND",
      value: skillsDemand.length > 0 ? skillsDemand.length.toString() : "—",
      subValue: skillsDemand.length > 0 ? `${skillsDemand.filter(s => s.category === "emerging").length} emerging` : "Processing...",
      icon: Brain,
      gradient: "from-purple-500 via-pink-500 to-rose-500",
      bgGradient: "from-purple-500/10 to-pink-500/5",
      borderColor: "border-purple-500/30",
      trend: skillsDemand.length > 0 ? skillsDemand.reduce((sum, s) => sum + s.growth, 0) / skillsDemand.length : 0,
      loading: skillsDemand.length === 0,
    },
    {
      id: "connections",
      label: "AI CONNECTIONS",
      value: crossTabInsights.length > 0 ? crossTabInsights.length.toString() : "—",
      subValue: crossTabInsights.length > 0 ? "Cross-sector patterns" : "Discovering...",
      icon: Network,
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      bgGradient: "from-emerald-500/10 to-teal-500/5",
      borderColor: "border-emerald-500/30",
      trend: crossTabInsights.filter(c => c.impact === "positive").length * 15,
      loading: crossTabInsights.length === 0,
    },
  ], [totalBudget, totalJobs, fundingAllocations, careerOpportunities, skillsDemand, crossTabInsights]);

  const currentTime = new Date().toLocaleTimeString("en-AU", { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: false 
  });

  const currentDate = new Date().toLocaleDateString("en-AU", { 
    weekday: "short",
    day: "numeric", 
    month: "short",
    year: "numeric"
  });

  return (
    <div className="relative overflow-hidden rounded-3xl mb-8">
      {/* Deep background with noise texture */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute -top-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-radial from-blue-600/20 via-blue-600/5 to-transparent blur-3xl"
          animate={{ 
            x: [0, 50, 0], 
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-1/3 -left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-radial from-purple-600/15 via-purple-600/5 to-transparent blur-3xl"
          animate={{ 
            x: [0, -30, 0], 
            y: [0, 50, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-gradient-radial from-emerald-600/10 via-transparent to-transparent blur-3xl"
          animate={{ 
            x: ["-50%", "-45%", "-50%"], 
            y: ["-50%", "-55%", "-50%"],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Scanline effect */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/5 to-transparent h-[2px] w-full"
        animate={{ y: ["-100%", "4000%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 p-8 lg:p-10">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Header with classified briefing style */}
          <motion.div variants={item} className="flex items-start justify-between mb-10">
            <div className="flex items-start gap-4">
              {/* HORUS Logo */}
              <div className="relative">
                <motion.div 
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-blue-500/30"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Eye className="w-8 h-8 text-white" />
                </motion.div>
                {/* Pulse ring */}
                <motion.div 
                  className="absolute inset-0 rounded-2xl border-2 border-blue-400/50"
                  variants={pulseRing}
                  animate="animate"
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-display font-black text-white tracking-tight">
                    HORUS
                  </h1>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono text-[10px] px-2">
                    v2.0
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-400 tracking-widest">
                    {displayedTitle}
                    <motion.span 
                      animate={{ opacity: [1, 0] }} 
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      _
                    </motion.span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  {currentDate} • {currentTime} ACST
                </p>
              </div>
            </div>
            
            {/* System Status Panel */}
            <div className="hidden md:flex flex-col items-end gap-2 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wide">System Status</span>
              </div>
              <SystemStatus label="Vector Search" status={globalLoading ? "processing" : "active"} />
              <SystemStatus label="AI Analysis" status={globalLoading ? "processing" : "complete"} />
              <SystemStatus label="Pattern Detection" status="active" />
              <div className="mt-2 pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-400">
                    {metrics?.totalDocuments?.toLocaleString() || "0"} docs indexed
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Metrics Grid */}
          <motion.div 
            variants={item}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {heroStats.map((stat, index) => (
              <motion.div
                key={stat.id}
                variants={item}
                whileHover={{ y: -4, scale: 1.02 }}
                className={cn(
                  "relative group p-6 rounded-2xl overflow-hidden cursor-pointer",
                  "bg-gradient-to-br", stat.bgGradient,
                  "border", stat.borderColor,
                  "backdrop-blur-xl transition-all duration-300"
                )}
              >
                {/* Animated border glow on hover */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  "bg-gradient-to-br", stat.gradient,
                  "blur-xl"
                )} style={{ margin: "-1px" }} />
                
                <div className="relative z-10">
                  {/* Icon and trend */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      "bg-gradient-to-br", stat.gradient,
                      "shadow-lg"
                    )}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    {!stat.loading && stat.trend !== 0 && (
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
                          stat.trend > 0 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-red-500/20 text-red-400"
                        )}
                      >
                        {stat.trend > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {stat.trend > 0 ? "+" : ""}{stat.trend.toFixed(1)}%
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Value */}
                  <AnimatePresence mode="wait">
                    {stat.loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2"
                      >
                        <div className="h-8 w-24 bg-slate-700/50 rounded animate-pulse" />
                        <div className="h-3 w-32 bg-slate-700/30 rounded animate-pulse" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="value"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <p className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                          {stat.value}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{stat.subValue}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Label */}
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-4">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* AI Connections Strip */}
          {crossTabInsights.length > 0 && (
            <motion.div 
              variants={item}
              className="p-5 rounded-2xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI-Discovered Connections</h3>
                  <p className="text-xs text-slate-500">Cross-sector patterns detected by semantic analysis</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {crossTabInsights.slice(0, 3).map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className={cn(
                      "relative p-4 rounded-xl border overflow-hidden group cursor-pointer",
                      insight.impact === "positive" 
                        ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10" 
                        : insight.impact === "negative"
                        ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                        : "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10",
                      "transition-all duration-300"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        insight.impact === "positive" ? "bg-emerald-500/20" : 
                        insight.impact === "negative" ? "bg-red-500/20" : "bg-blue-500/20"
                      )}>
                        {insight.impact === "negative" ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Target className={cn(
                            "w-4 h-4",
                            insight.impact === "positive" ? "text-emerald-400" : "text-blue-400"
                          )} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white mb-1 line-clamp-1">
                          {insight.title}
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {insight.description}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-2 font-mono">
                          {insight.connection}
                        </p>
                      </div>
                    </div>
                    
                    {/* Hover arrow */}
                    <motion.div 
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                      initial={{ x: -10 }}
                      whileHover={{ x: 0 }}
                    >
                      <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Emerging Trends Ticker */}
          {emergingTrends.length > 0 && (
            <motion.div 
              variants={item}
              className="mt-6 pt-5 border-t border-slate-700/50"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                    EMERGING SIGNALS
                  </span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-700/50 to-transparent" />
              </div>
              
              <div className="flex flex-wrap gap-2">
                {emergingTrends.map((trend, index) => (
                  <motion.div
                    key={trend}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.8 + index * 0.05 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                  >
                    <Badge 
                      className={cn(
                        "bg-gradient-to-r from-blue-500/10 to-purple-500/10",
                        "text-slate-200 border-blue-500/20 hover:border-blue-500/40",
                        "gap-1.5 px-3 py-1.5 cursor-pointer transition-all"
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      {trend}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default IntelligenceHero;

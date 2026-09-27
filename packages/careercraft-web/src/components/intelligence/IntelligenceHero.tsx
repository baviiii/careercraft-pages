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
  Zap,
  Target,
  ArrowUpRight,
  Activity,
  Network,
  AlertTriangle,
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
    transition: { type: "spring" as const, stiffness: 400, damping: 25 }
  },
} as const;

/* `pulseRing` and the `SystemStatus` component lived here.
   pulseRing animated the ring behind the deleted HORUS v2.0 eye logo.
   SystemStatus drew the Vector Search / AI Analysis / Pattern Detection
   lights, which went with the panel above the stat cards. Both had exactly
   one caller each, and both callers are gone. */

export function IntelligenceHero() {
  const {
    totalBudget,
    totalJobs,
    topGrowthSector,
    emergingTrends,
    crossTabInsights,
    getTabData,
    fundingAllocations,
    careerOpportunities,
    skillsDemand,
  } = useIntelligence();

  /* Each card waits on ITS OWN request, not on all four.
     globalLoading is only true until the first tab lands, so using it
     per-card would make a finished card look finished before its own data
     had actually arrived. These are the real per-tab flags. */
  const fundingLoading = getTabData("funding").loading;
  const careersLoading = getTabData("careers").loading;
  const skillsLoading = getTabData("skills").loading;
  /* Cross-tab patterns are computed from the other three, so this card is
     honestly still working until they have all reported. */
  const connectionsLoading = fundingLoading || careersLoading || skillsLoading;

  /* `loading` used to be defined as "the number is zero" — loading:
     totalJobs === 0 and friends. That conflates two different facts, and
     when the answer genuinely IS zero the card never stops loading: careers
     returned 11 real opportunities, none of which carried a job count, so
     Workforce Signals sat on a skeleton and "Scanning…" permanently. Same
     for AI Connections whenever no cross-sector pattern was found.

     Loading now means a fetch is in flight — nothing else. A resolved-but-
     empty figure shows "—" and says why, which is a finding, not a wait. */
  /* Labels are what the reader wants to know, not how the data is filed.
     These were FISCAL ALLOCATION, WORKFORCE SIGNALS, CAPABILITY DEMAND and
     AI CONNECTIONS — monospace small caps, which is the typography of a
     classification stamp. The page's whole credibility problem was that it
     addressed an intelligence analyst while serving someone in Adelaide
     working out whether to retrain as an enrolled nurse. The figures under
     these labels never changed; only who they are speaking to did. */
  const heroStats = useMemo(() => [
    {
      id: "budget",
      label: "Where the money goes",
      value: totalBudget > 0 ? `$${(totalBudget / 1000).toFixed(1)}B` : "—",
      subValue:
        fundingAllocations.length > 0
          ? `${fundingAllocations.length} sectors tracked`
          : fundingLoading ? "Reading budget papers" : "No figures found",
      icon: DollarSign,
      gradient: "from-amber-500 via-orange-500 to-red-500",
      bgGradient: "from-amber-500/10 to-orange-500/5",
      borderColor: "border-amber-500/30",
      trend: fundingAllocations[0]?.change || 0,
      loading: fundingLoading && totalBudget === 0,
    },
    {
      id: "careers",
      label: "Who's hiring",
      /* Falls back to the count of roles. The corpus often names occupations
         without stating headcounts, and "11 roles" is a real answer where a
         summed 0 jobs is not. */
      value:
        totalJobs > 0
          ? totalJobs.toLocaleString()
          : careerOpportunities.length > 0
            ? careerOpportunities.length.toString()
            : "—",
      subValue:
        careerOpportunities.length > 0
          ? totalJobs > 0
            ? `${careerOpportunities.filter(c => c.trending).length} high-growth roles`
            : `${careerOpportunities.length} roles · no headcounts stated`
          : careersLoading ? "Reading workforce data" : "No roles found",
      icon: Briefcase,
      gradient: "from-blue-500 via-cyan-500 to-teal-500",
      bgGradient: "from-blue-500/10 to-cyan-500/5",
      borderColor: "border-blue-500/30",
      trend: careerOpportunities.length > 0 ? careerOpportunities.reduce((sum, c) => sum + (c.growth ?? 0), 0) / careerOpportunities.length : 0,
      loading: careersLoading && careerOpportunities.length === 0,
    },
    {
      id: "skills",
      label: "What to learn",
      value: skillsDemand.length > 0 ? skillsDemand.length.toString() : "—",
      subValue:
        skillsDemand.length > 0
          ? `${skillsDemand.filter(s => s.category === "emerging").length} emerging`
          : skillsLoading ? "Reading skills reporting" : "No skills found",
      icon: Brain,
      gradient: "from-purple-500 via-pink-500 to-rose-500",
      bgGradient: "from-purple-500/10 to-pink-500/5",
      borderColor: "border-purple-500/30",
      trend: skillsDemand.length > 0 ? skillsDemand.reduce((sum, s) => sum + (s.growth ?? 0), 0) / skillsDemand.length : 0,
      loading: skillsLoading && skillsDemand.length === 0,
    },
    {
      id: "connections",
      label: "How they connect",
      value: crossTabInsights.length > 0 ? crossTabInsights.length.toString() : "—",
      /* "Cross-sector patterns" described the method. What a reader wants is
         the shape of the claim: funding in one sector moving with hiring in
         another — health money up, nursing roles growing. */
      subValue:
        crossTabInsights.length > 0
          ? `${crossTabInsights.length === 1 ? "Link" : "Links"} between spending and hiring`
          : connectionsLoading ? "Comparing sectors" : "No links found",
      icon: Network,
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      bgGradient: "from-emerald-500/10 to-teal-500/5",
      borderColor: "border-emerald-500/30",
      trend: crossTabInsights.filter(c => c.impact === "positive").length * 15,
      loading: connectionsLoading && crossTabInsights.length === 0,
    },
  ], [totalBudget, totalJobs, fundingAllocations, careerOpportunities, skillsDemand, crossTabInsights,
      fundingLoading, careersLoading, skillsLoading, connectionsLoading]);

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
            {/* Was a "HORUS v2.0" masthead: a gradient eye logo with an
                infinite pulse ring, the product's internal codename set as a
                3xl black display heading, a version badge, a blinking
                typewriter rendering of "INTELLIGENCE BRIEFING_", and a live
                clock to the second.

                None of it was information. Horus is the inference gateway,
                not something a job seeker has heard of or needs to; the
                version number is meaningless to them; and the typewriter
                spent its animation budget spelling out a phrase that
                describes the page's genre rather than its contents.

                Replaced with a plain statement of what this actually is. */}
            <div>
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">
                South Australian job market
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-md">
                Budget papers, workforce plans and skills reporting from the
                state's public record.
              </p>
            </div>

            {/* A "System Status" panel stood here: a CPU icon, and three
                lights labelled Vector Search, AI Analysis and Pattern
                Detection, over a shield reading "N docs indexed".

                The previous pass made those lights honest — they followed
                the real connection state instead of being hardcoded green.
                Honest was not enough. "Vector Search: active" is a retrieval
                implementation detail, and it was occupying the top-right of
                the page for a reader who wants to know which roles South
                Australia is hiring for. Nobody outside this codebase knows
                what pattern detection being green would mean for them.

                Connection state is reported once, in the topbar, where the
                freshness line already lives. A second opinion in a more
                emphatic typeface is not more information. */}
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
                  
                  {/* Label first.
                      It sat under the figure in 10px mono uppercase with
                      widest tracking — the typography of a classification
                      stamp, which also meant `uppercase` shouted the new
                      sentence-case wording back into the voice being
                      removed. A reader needs to know what a number counts
                      before they read it, so it leads. */}
                  <p className="text-xs text-slate-400 mb-1.5">{stat.label}</p>

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
                        <p className="text-xs text-slate-500 mt-1">{stat.subValue}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                  {/* Was "AI-Discovered Connections" over "Cross-sector
                      patterns detected by semantic analysis" — a description
                      of the method, twice, with the reader's question
                      answered nowhere. Say what the links are. */}
                  <h3 className="text-sm font-bold text-white">Where spending and hiring line up</h3>
                  <p className="text-xs text-slate-500">
                    Sectors whose funding and workforce signals move together in the same documents
                  </p>
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

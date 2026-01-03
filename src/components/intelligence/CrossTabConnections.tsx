/**
 * CrossTabConnections - Visualizes connections between funding, careers, and skills
 * 
 * Shows how government investment decisions flow through to job creation and skill demand
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  DollarSign,
  Briefcase,
  Brain,
  Sparkles,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Zap,
  Link2,
  Target,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIntelligence } from "@/contexts/IntelligenceContext";

interface ConnectionNode {
  id: string;
  type: "funding" | "career" | "skill";
  label: string;
  value: string;
  trend: number;
  connections: string[];
}

export function CrossTabConnections() {
  const {
    fundingAllocations,
    careerOpportunities,
    skillsDemand,
    crossTabInsights,
    getRelatedData,
  } = useIntelligence();

  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Build connection graph
  const connectionGraph = useMemo(() => {
    const sectors = new Set<string>();
    
    fundingAllocations.forEach(f => sectors.add(f.sector.toLowerCase()));
    careerOpportunities.forEach(c => sectors.add(c.sector.toLowerCase()));
    skillsDemand.forEach(s => sectors.add(s.sector.toLowerCase()));

    return Array.from(sectors).slice(0, 6).map(sector => {
      const related = getRelatedData(sector);
      return {
        sector: sector.charAt(0).toUpperCase() + sector.slice(1),
        funding: related.funding,
        careers: related.careers,
        skills: related.skills,
        hasStrongConnection: !!related.funding && related.careers.length > 0 && related.skills.length > 0,
      };
    });
  }, [fundingAllocations, careerOpportunities, skillsDemand, getRelatedData]);

  const selectedData = useMemo(() => {
    if (!selectedSector) return null;
    return getRelatedData(selectedSector);
  }, [selectedSector, getRelatedData]);

  // Helper function to format amounts (billions or millions with one decimal)
  const formatAmount = (amount: number): string => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl border border-pink-400/30 shadow-2xl shadow-pink-500/20 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-pink-400/30 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-xl text-white drop-shadow-lg">
                Cross-Sector Intelligence
              </h3>
              <p className="text-xs text-pink-200/80">
                How funding flows to jobs and skills
              </p>
            </div>
          </div>
          <Badge className="gap-1 bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-200 border-pink-400/40 backdrop-blur-sm">
            <Sparkles className="w-3 h-3" />
            AI Connected
          </Badge>
        </div>
      </div>

      {/* Connection Visualization */}
      <div className="p-6">
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
            <span className="text-pink-200/90">Funding</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
            <span className="text-pink-200/90">Careers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
            <span className="text-pink-200/90">Skills</span>
          </div>
        </div>

        {/* Sector Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {connectionGraph.map((item, index) => (
            <motion.button
              key={item.sector}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedSector(
                selectedSector === item.sector ? null : item.sector
              )}
              className={cn(
                "relative p-4 rounded-xl border text-left transition-all backdrop-blur-sm",
                selectedSector === item.sector
                  ? "bg-gradient-to-br from-pink-500/30 to-purple-500/25 border-pink-400/50 shadow-lg shadow-pink-500/20"
                  : "bg-gradient-to-br from-pink-500/15 to-purple-500/10 border-pink-400/30 hover:border-pink-400/50 hover:bg-gradient-to-br hover:from-pink-500/20 hover:to-purple-500/15"
              )}
            >
              {/* Connection Strength Indicator */}
              {item.hasStrongConnection && (
                <div className="absolute -top-1 -right-1">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg" />
                </div>
              )}
              
              <h4 className="font-medium text-white text-sm mb-2 drop-shadow">
                {item.sector}
              </h4>
              
              <div className="flex items-center gap-2 flex-wrap">
                {item.funding && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center cursor-help">
                          <DollarSign className="w-3 h-3 text-amber-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.funding.amount && typeof item.funding.amount === 'number' ? formatAmount(item.funding.amount) : '$0'} allocated</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {item.careers.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center cursor-help">
                          <Briefcase className="w-3 h-3 text-blue-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.careers.length} career opportunities</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {item.skills.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center cursor-help">
                          <Brain className="w-3 h-3 text-purple-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.skills.length} skills in demand</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Selected Sector Details */}
        <AnimatePresence mode="wait">
          {selectedSector && selectedData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-pink-500/20 border border-pink-400/40 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-display font-semibold text-white text-lg drop-shadow-lg">
                    {selectedSector} Intelligence Flow
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSector(null)}
                    className="text-xs text-pink-200 hover:text-white hover:bg-pink-500/20"
                  >
                    Close
                  </Button>
                </div>

                {/* Flow Visualization */}
                <div className="flex items-center justify-between gap-4">
                  {/* Funding */}
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 mb-2">
                      <DollarSign className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-lg font-bold text-white drop-shadow-lg">
                      {selectedData.funding && selectedData.funding.amount && typeof selectedData.funding.amount === 'number'
                        ? formatAmount(selectedData.funding.amount)
                        : "N/A"
                      }
                    </p>
                    <p className="text-xs text-pink-200/80">Budget</p>
                    {selectedData.funding && selectedData.funding.change !== undefined && typeof selectedData.funding.change === 'number' && selectedData.funding.change > 0 && (
                      <Badge className="mt-1 text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-400/40 backdrop-blur-sm">
                        +{selectedData.funding.change.toFixed(1)}% YoY
                      </Badge>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-6 h-6 text-pink-300/70" />
                    </motion.div>
                  </div>

                  {/* Careers */}
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25 mb-2">
                      <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-lg font-bold text-white drop-shadow-lg">
                      {selectedData.careers.length > 0
                        ? selectedData.careers.reduce((sum, c) => sum + (c.jobs && typeof c.jobs === 'number' ? c.jobs : 0), 0).toLocaleString()
                        : "N/A"
                      }
                    </p>
                    <p className="text-xs text-pink-200/80">Jobs</p>
                    {selectedData.careers.length > 0 && (
                      <Badge className="mt-1 text-[10px] bg-blue-500/20 text-blue-300 border-blue-400/40 backdrop-blur-sm">
                        {selectedData.careers.length} roles
                      </Badge>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                    >
                      <ArrowRight className="w-6 h-6 text-pink-300/70" />
                    </motion.div>
                  </div>

                  {/* Skills */}
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25 mb-2">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-lg font-bold text-white drop-shadow-lg">
                      {selectedData.skills.length}
                    </p>
                    <p className="text-xs text-pink-200/80">Skills Needed</p>
                    {selectedData.skills.filter(s => s.category === "emerging").length > 0 && (
                      <Badge className="mt-1 text-[10px] bg-purple-500/20 text-purple-300 border-purple-400/40 backdrop-blur-sm">
                        {selectedData.skills.filter(s => s.category === "emerging").length} emerging
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Top Items */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-pink-400/30">
                  {/* Top Career */}
                  {selectedData.careers[0] && (
                    <div>
                      <p className="text-xs font-medium text-pink-200/70 mb-1">
                        Top Career
                      </p>
                      <p className="text-sm font-semibold text-white drop-shadow">
                        {selectedData.careers[0].occupation}
                      </p>
                      {selectedData.careers[0].growth !== undefined && typeof selectedData.careers[0].growth === 'number' && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3 text-emerald-300" />
                          <span className="text-xs text-emerald-300">
                            {selectedData.careers[0].growth > 0 ? '+' : ''}{selectedData.careers[0].growth.toFixed(1)}% growth
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top Skill */}
                  {selectedData.skills[0] && (
                    <div>
                      <p className="text-xs font-medium text-pink-200/70 mb-1">
                        Top Skill
                      </p>
                      <p className="text-sm font-semibold text-white drop-shadow">
                        {selectedData.skills[0].name}
                      </p>
                      {selectedData.skills[0].demand !== undefined && (
                        <Badge className="text-[10px] mt-1 bg-purple-500/20 text-purple-300 border-purple-400/40 backdrop-blur-sm">
                          {typeof selectedData.skills[0].demand === 'number' ? selectedData.skills[0].demand : selectedData.skills[0].demand}% demand
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Insight */}
                  <div>
                    <p className="text-xs font-medium text-pink-200/70 mb-1">
                      AI Insight
                    </p>
                    <p className="text-xs text-white drop-shadow">
                      {selectedData.funding && selectedData.careers.length > 0
                        ? `Investment translating to ${selectedData.careers.length} career pathways`
                        : "Analyzing sector connections..."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Insights Summary */}
        {crossTabInsights.length > 0 && !selectedSector && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-pink-500/20 border border-pink-400/40 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1 drop-shadow">
                  {crossTabInsights[0].title}
                </p>
                <p className="text-xs text-pink-200/80">
                  {crossTabInsights[0].connection}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrossTabConnections;


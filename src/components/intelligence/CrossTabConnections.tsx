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

  return (
    <div className="card-intelligence overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">
                Cross-Sector Intelligence
              </h3>
              <p className="text-xs text-muted-foreground">
                How funding flows to jobs and skills
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
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
            <span className="text-muted-foreground">Funding</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
            <span className="text-muted-foreground">Careers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
            <span className="text-muted-foreground">Skills</span>
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
                "relative p-4 rounded-xl border text-left transition-all",
                selectedSector === item.sector
                  ? "bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/10"
                  : "bg-muted/30 border-border/50 hover:border-border hover:bg-muted/50"
              )}
            >
              {/* Connection Strength Indicator */}
              {item.hasStrongConnection && (
                <div className="absolute -top-1 -right-1">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              )}
              
              <h4 className="font-medium text-foreground text-sm mb-2">
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
                        <p>${(item.funding.amount / 1000).toFixed(1)}B allocated</p>
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
              <div className="p-5 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-display font-semibold text-foreground">
                    {selectedSector} Intelligence Flow
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSector(null)}
                    className="text-xs"
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
                    <p className="text-lg font-bold text-foreground">
                      {selectedData.funding 
                        ? `$${(selectedData.funding.amount / 1000).toFixed(1)}B`
                        : "N/A"
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    {selectedData.funding && selectedData.funding.change > 0 && (
                      <Badge className="mt-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
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
                      <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    </motion.div>
                  </div>

                  {/* Careers */}
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25 mb-2">
                      <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {selectedData.careers.length > 0
                        ? selectedData.careers.reduce((sum, c) => sum + c.jobs, 0).toLocaleString()
                        : "N/A"
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Jobs</p>
                    {selectedData.careers.length > 0 && (
                      <Badge className="mt-1 text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
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
                      <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    </motion.div>
                  </div>

                  {/* Skills */}
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25 mb-2">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {selectedData.skills.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Skills Needed</p>
                    {selectedData.skills.filter(s => s.category === "emerging").length > 0 && (
                      <Badge className="mt-1 text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">
                        {selectedData.skills.filter(s => s.category === "emerging").length} emerging
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Top Items */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border/50">
                  {/* Top Career */}
                  {selectedData.careers[0] && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Top Career
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedData.careers[0].occupation}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600">
                          +{selectedData.careers[0].growth.toFixed(1)}% growth
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top Skill */}
                  {selectedData.skills[0] && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Top Skill
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedData.skills[0].name}
                      </p>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {selectedData.skills[0].demand}% demand
                      </Badge>
                    </div>
                  )}

                  {/* Insight */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      AI Insight
                    </p>
                    <p className="text-xs text-foreground">
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
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {crossTabInsights[0].title}
                </p>
                <p className="text-xs text-muted-foreground">
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


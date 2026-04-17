/**
 * ImpactDetailsModal - Drill-down view for entity impacts
 * Shows full impact list with evidence chains, aggregation, and policy breakdown
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  X,
  FileText,
  Layers,
  BarChart3,
  Shield,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useImpactQueries, type Impact, type ImpactAggregation } from "@/hooks/useImpactQueries";

interface ImpactDetailsModalProps {
  entityName: string;
  impacts: Impact[];
  isOpen: boolean;
  onClose: () => void;
}

export function ImpactDetailsModal({ entityName, impacts, isOpen, onClose }: ImpactDetailsModalProps) {
  const { aggregateImpacts } = useImpactQueries();
  const [aggregation, setAggregation] = useState<ImpactAggregation | null>(null);
  const [loadingAggregation, setLoadingAggregation] = useState(false);
  const [expandedImpacts, setExpandedImpacts] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen && entityName) {
      const fetchAggregation = async () => {
        setLoadingAggregation(true);
        try {
          const result = await aggregateImpacts(entityName);
          setAggregation(result);
        } catch (err) {
          console.error("Failed to aggregate impacts:", err);
        } finally {
          setLoadingAggregation(false);
        }
      };
      fetchAggregation();
    }
  }, [isOpen, entityName, aggregateImpacts]);

  const toggleExpand = (index: number) => {
    const next = new Set(expandedImpacts);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedImpacts(next);
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "high":
        return { bg: "bg-red-500/20", border: "border-red-400/40", text: "text-red-300", icon: AlertTriangle };
      case "medium":
        return { bg: "bg-amber-500/20", border: "border-amber-400/40", text: "text-amber-300", icon: AlertCircle };
      default:
        return { bg: "bg-blue-500/20", border: "border-blue-400/40", text: "text-blue-300", icon: Shield };
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "increase": return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case "decrease": return <TrendingDown className="w-4 h-4 text-red-400" />;
      case "enable": return <Zap className="w-4 h-4 text-blue-400" />;
      default: return <AlertCircle className="w-4 h-4 text-amber-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  Impact Analysis
                </h2>
                <p className="text-sm text-slate-400 mt-1">{entityName}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <ScrollArea className="max-h-[calc(85vh-100px)]">
              <div className="p-6 space-y-6">

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-4 bg-slate-800/50 border-slate-700/50 text-center">
                    <p className="text-2xl font-bold text-white">{impacts.length}</p>
                    <p className="text-xs text-slate-400">Total Impacts</p>
                  </Card>
                  <Card className="p-4 bg-slate-800/50 border-slate-700/50 text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {impacts.filter(i => i.severity === "high").length}
                    </p>
                    <p className="text-xs text-slate-400">High Severity</p>
                  </Card>
                  <Card className="p-4 bg-slate-800/50 border-slate-700/50 text-center">
                    <p className="text-2xl font-bold text-purple-400">
                      {new Set(impacts.map(i => i.policyName || i.policyId)).size}
                    </p>
                    <p className="text-xs text-slate-400">Policies</p>
                  </Card>
                </div>

                {/* Aggregation Summary */}
                {loadingAggregation && (
                  <Card className="p-4 bg-slate-800/50 border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                      <span className="text-sm text-slate-400">Loading aggregated analysis...</span>
                    </div>
                  </Card>
                )}

                {aggregation && aggregation.conflicts && aggregation.conflicts.length > 0 && (
                  <Card className="p-4 bg-red-500/10 border-red-400/30">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-semibold text-red-300">
                        {aggregation.conflicts.length} Policy Conflict{aggregation.conflicts.length > 1 ? "s" : ""} Detected
                      </span>
                    </div>
                    <div className="space-y-2">
                      {aggregation.conflicts.map((conflict, idx) => (
                        <div key={idx} className="text-xs text-slate-400 bg-red-500/10 rounded-lg p-3">
                          <span className="text-red-300 font-medium">{conflict.impactType}</span>
                          : {conflict.increases.length} policies increase vs {conflict.decreases.length} policies decrease for {conflict.affectedEntity}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {aggregation && aggregation.quantitativeSummary && (
                  <div className="grid grid-cols-2 gap-3">
                    {aggregation.quantitativeSummary.totalFunding > 0 && (
                      <Card className="p-4 bg-emerald-500/10 border-emerald-400/30">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs text-emerald-300">Total Funding Impact</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-300">
                          ${(aggregation.quantitativeSummary.totalFunding / 1_000_000).toFixed(1)}M
                        </p>
                      </Card>
                    )}
                    {aggregation.quantitativeSummary.totalJobs > 0 && (
                      <Card className="p-4 bg-blue-500/10 border-blue-400/30">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-blue-300">Total Jobs Impact</span>
                        </div>
                        <p className="text-xl font-bold text-blue-300">
                          {aggregation.quantitativeSummary.totalJobs.toLocaleString()}
                        </p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Impact List */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    All Impacts ({impacts.length})
                  </h3>
                  <div className="space-y-2">
                    {impacts.map((impact, idx) => {
                      const sevConfig = getSeverityConfig(impact.severity);
                      const isExpanded = expandedImpacts.has(idx);
                      return (
                        <motion.div
                          key={impact.id || idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <Card
                            className={cn(
                              "p-4 cursor-pointer transition-all hover:bg-slate-800/80",
                              sevConfig.bg,
                              sevConfig.border
                            )}
                            onClick={() => toggleExpand(idx)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {getDirectionIcon(impact.direction)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <Badge className={cn("text-[10px]", sevConfig.bg, sevConfig.text, sevConfig.border)}>
                                      {impact.severity}
                                    </Badge>
                                    <Badge className="text-[10px] bg-slate-700/50 text-slate-300 border-slate-600">
                                      {impact.impactType}
                                    </Badge>
                                    <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-400/40">
                                      {impact.direction}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-200 font-medium truncate">
                                    {impact.policyName || impact.policyId || "Unknown Policy"}
                                  </p>
                                  {impact.quantitativeValue && (
                                    <p className="text-xs text-emerald-400 mt-1">
                                      {impact.quantitativeValue}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 pt-3 border-t border-slate-700/50"
                                >
                                  {impact.evidenceText && (
                                    <div className="mb-2">
                                      <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Evidence</p>
                                      <p className="text-xs text-slate-300 leading-relaxed">{impact.evidenceText}</p>
                                    </div>
                                  )}
                                  {impact.timeframe && (
                                    <div className="mb-2">
                                      <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Timeframe</p>
                                      <p className="text-xs text-slate-300">{impact.timeframe}</p>
                                    </div>
                                  )}
                                  {impact.sourceDocument && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <FileText className="w-3 h-3" />
                                      <span>{impact.sourceDocument}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                    <Shield className="w-3 h-3" />
                                    <span>Confidence: {Math.round((impact.confidence || 0) * 100)}%</span>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * FundingDetailModal - Detailed view of funding allocation with source citations
 * Production-grade: Shows source documents, table data, and confidence scores
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Table,
  TrendingUp,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FundingAllocation } from "@/contexts/IntelligenceContext";
import { DataProvenance } from "./DataProvenance";

interface FundingDetailModalProps {
  allocation: FundingAllocation | null;
  open: boolean;
  onClose: () => void;
}

export function FundingDetailModal({
  allocation,
  open,
  onClose,
}: FundingDetailModalProps) {
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"overview" | "sources" | "provenance">("overview");

  if (!allocation) return null;

  const toggleSource = (index: number) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSources(newExpanded);
  };

  const confidenceColor = {
    high: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    medium: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    low: "text-red-600 bg-red-500/10 border-red-500/20",
  };

  const confidenceIcon = {
    high: <CheckCircle2 className="w-4 h-4" />,
    medium: <Info className="w-4 h-4" />,
    low: <AlertTriangle className="w-4 h-4" />,
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-display">
                {allocation.sector} Funding Details
              </DialogTitle>
              <DialogDescription className="mt-2">
                Production-grade data with source citations and confidence scoring
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={cn("ml-4 flex items-center gap-1.5 px-3 py-1", confidenceColor[allocation.confidence])}
            >
              {confidenceIcon[allocation.confidence]}
              {allocation.confidence.toUpperCase()} CONFIDENCE
            </Badge>
          </div>
        </DialogHeader>

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-4 my-6">
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-400">Allocation</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              ${(allocation.amount / 1000).toFixed(2)}B
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {allocation.amount.toFixed(0)} million
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={cn("w-4 h-4", allocation.change >= 0 ? "text-emerald-500" : "text-red-500")} />
              <span className="text-xs text-slate-400">Year-over-Year</span>
            </div>
            <p className={cn("text-2xl font-bold", allocation.change >= 0 ? "text-emerald-600" : "text-red-600")}>
              {allocation.change > 0 ? "+" : ""}{allocation.change.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Change from prior year
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-400">Programs</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{allocation.programs}</p>
            <p className="text-xs text-slate-400 mt-1">
              Funding programs identified
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border/50 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              activeTab === "overview"
                ? "text-foreground"
                : "text-slate-400 hover:text-foreground"
            )}
          >
            Overview
            {activeTab === "overview" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              activeTab === "sources"
                ? "text-foreground"
                : "text-slate-400 hover:text-foreground"
            )}
          >
            Source Citations
            <Badge variant="secondary" className="ml-2 text-xs">
              {allocation.sources.length}
            </Badge>
            {activeTab === "sources" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("provenance")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              activeTab === "provenance"
                ? "text-foreground"
                : "text-slate-400 hover:text-foreground"
            )}
          >
            Data Provenance
            <Badge variant="secondary" className="ml-2 text-xs">
              Audit Trail
            </Badge>
            {activeTab === "provenance" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
              />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Table Data */}
              {allocation.tableData && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Table className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-lg">Source Table Data</h3>
              <Badge variant="outline" className="text-xs">Structured Data</Badge>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-500/20">
                    {allocation.tableData.headers.map((header: string, idx: number) => (
                      <th key={idx} className="text-left p-2 font-semibold text-foreground">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {allocation.tableData.values.map((value: any, idx: number) => (
                      <td key={idx} className="p-2 text-foreground">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              ✓ Extracted from structured table data for maximum accuracy
            </p>
          </div>
        )}

              {/* Confidence Explanation for Overview */}
              <div className={cn("p-4 rounded-xl border", confidenceColor[allocation.confidence])}>
                <div className="flex items-start gap-3">
                  {confidenceIcon[allocation.confidence]}
                  <div>
                    <p className="font-semibold text-sm mb-1">
                      {allocation.confidence === "high" && "High Confidence Data"}
                      {allocation.confidence === "medium" && "Medium Confidence Data"}
                      {allocation.confidence === "low" && "Low Confidence Data"}
                    </p>
                    <p className="text-xs opacity-90">
                      {allocation.confidence === "high" &&
                        "Extracted from structured table data in authoritative budget documents. This represents the most reliable funding information available."}
                      {allocation.confidence === "medium" &&
                        "Extracted from text mentions in budget-related documents. Cross-verified but not from structured tables."}
                      {allocation.confidence === "low" &&
                        "Estimated or inferred from limited source data. Use with caution for critical decisions."}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "sources" && (
            <motion.div
              key="sources"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Source Citations */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-lg">Source Citations</h3>
                  <Badge variant="secondary" className="text-xs">
                    {allocation.sources.length} {allocation.sources.length === 1 ? "source" : "sources"}
                  </Badge>
                </div>

                <div className="space-y-3">
            {allocation.sources.map((source, index) => (
              <div
                key={index}
                className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden"
              >
                <button
                  onClick={() => toggleSource(index)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 text-left">
                    <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {source.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {source.excerpt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {source.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(source.url, "_blank");
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    {expandedSources.has(index) ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedSources.has(index) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border/50 bg-muted/20"
                    >
                      <div className="p-4">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {source.excerpt}
                        </p>
                        {source.url && (
                          <Button
                            variant="link"
                            size="sm"
                            className="mt-3 p-0 h-auto"
                            onClick={() => window.open(source.url, "_blank")}
                          >
                            View full document
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "provenance" && (
            <motion.div
              key="provenance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DataProvenance allocation={allocation} />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default FundingDetailModal;

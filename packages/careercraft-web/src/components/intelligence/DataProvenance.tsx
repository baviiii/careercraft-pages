/**
 * DataProvenance - Explainability layer for data extraction
 * Shows exactly how data was extracted, validated, and normalized
 * Critical for government auditing and data quality assurance
 */

import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
  FileSearch,
  Calendar,
  Hash,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { FundingAllocation } from "@/contexts/IntelligenceContext";

interface DataProvenanceProps {
  allocation: FundingAllocation;
}

export function DataProvenance({ allocation }: DataProvenanceProps) {
  const log = allocation.extractionLog;

  if (!log) {
    return (
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
        <p className="text-sm text-slate-400">
          Extraction log not available for this allocation.
        </p>
      </div>
    );
  }

  const methodConfig = {
    table_row: {
      icon: Database,
      label: "Structured Table Extraction",
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      description: "Data extracted from structured table with headers and values"
    },
    text_extraction: {
      icon: FileSearch,
      label: "Text Pattern Extraction",
      color: "text-blue-600",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      description: "Data extracted from document text using pattern matching"
    },
    metadata: {
      icon: Layers,
      label: "Metadata Extraction",
      color: "text-purple-600",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      description: "Data extracted from document metadata fields"
    }
  };

  const config = methodConfig[log.method];
  const MethodIcon = config.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", config.bg)}>
          <Shield className={cn("w-5 h-5", config.color)} />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Data Provenance & Audit Trail</h4>
          <p className="text-xs text-slate-400">Full transparency for regulatory compliance</p>
        </div>
      </div>

      {/* Extraction Method */}
      <div className={cn("p-4 rounded-xl border", config.bg, config.border)}>
        <div className="flex items-start gap-3">
          <MethodIcon className={cn("w-5 h-5 mt-0.5", config.color)} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("font-semibold text-sm", config.color)}>{config.label}</span>
              <Badge variant="outline" className="text-xs">
                {log.method.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Extraction Timeline */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-foreground">Extraction Timeline</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Extracted on:</span>
          <span className="font-medium text-foreground">
            {log.timestamp.toLocaleString('en-AU', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Australia/Adelaide'
            })}
          </span>
          <Badge variant="secondary" className="text-xs">ACST</Badge>
        </div>
      </div>

      {/* Data Transformation Pipeline */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-foreground">Data Transformation Pipeline</span>
        </div>

        <div className="space-y-3">
          {/* Step 1: Raw Value */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
              1
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">Raw Value Extracted</p>
              <div className="p-2 rounded bg-muted/50 border border-border/50">
                <code className="text-xs font-mono text-foreground">{log.rawValue || "N/A"}</code>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="pl-3">
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Step 2: Normalization */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
              2
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">Normalization Applied</p>
              <div className="p-2 rounded bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <code className="text-xs font-mono text-foreground">
                    ${log.normalizedValue.toFixed(2)}M
                  </code>
                  <Badge variant="outline" className="text-xs ml-auto">Millions</Badge>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Converted to millions for consistency across dataset
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="pl-3">
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Step 3: Validation */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
              3
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">Validation Checks</p>
              <div className="space-y-1">
                {log.validationsPassed.map((validation, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded bg-emerald-500/5 border border-emerald-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-foreground">{validation}</span>
                  </div>
                ))}
                {log.validationsFailed && log.validationsFailed.length > 0 && (
                  log.validationsFailed.map((validation, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded bg-amber-500/5 border border-amber-500/20"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-foreground">{validation}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Source Metadata */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-foreground">Source Document Metadata</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {allocation.sources[0]?.documentType && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Document Type</p>
              <Badge variant="outline" className="text-xs">
                {allocation.sources[0].documentType.toUpperCase()}
              </Badge>
            </div>
          )}
          {allocation.sources[0]?.category && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Category</p>
              <Badge variant="outline" className="text-xs">
                {allocation.sources[0].category}
              </Badge>
            </div>
          )}
          {allocation.sources[0]?.pageNumber && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Page Number</p>
              <span className="text-sm font-medium text-foreground">
                Page {allocation.sources[0].pageNumber}
              </span>
            </div>
          )}
          {allocation.sources[0]?.tableNumber && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Table Reference</p>
              <span className="text-sm font-medium text-foreground">
                Table {allocation.sources[0].tableNumber}
              </span>
            </div>
          )}
          {allocation.sources[0]?.extractionMethod && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Extraction Method</p>
              <Badge variant="outline" className="text-xs">
                {allocation.sources[0].extractionMethod.toUpperCase()}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Audit Statement */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-600 mb-1">Audit Certification</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              This data extraction has been logged with full provenance tracking. All validation
              steps have been recorded for regulatory compliance and audit purposes. Source
              documents, extraction method, transformation pipeline, and validation results are
              preserved in the system audit log.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataProvenance;

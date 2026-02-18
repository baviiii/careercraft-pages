/**
 * ImpactBadge - Display impact indicators on entities
 */

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Impact } from "@/hooks/useImpactQueries";

interface ImpactBadgeProps {
  impacts: Impact[];
  compact?: boolean;
  showCount?: boolean;
  onClick?: () => void;
}

export function ImpactBadge({ impacts, compact = false, showCount = true, onClick }: ImpactBadgeProps) {
  if (!impacts || impacts.length === 0) return null;

  const highSeverityCount = impacts.filter(i => i.severity === 'high').length;
  const hasHighSeverity = highSeverityCount > 0;
  
  // Calculate net jobs affected
  const netJobs = impacts.reduce((sum, impact) => {
    if (!impact.quantitativeValue) return sum;
    const jobMatch = impact.quantitativeValue.match(/(\d+(?:,\d+)?)\s*(?:jobs?|positions?|workers?|employees?)/i);
    if (jobMatch) {
      const jobs = parseInt(jobMatch[1].replace(/,/g, ''), 10);
      return sum + (impact.direction === 'increase' ? jobs : -jobs);
    }
    return sum;
  }, 0);

  const clickProps = onClick ? {
    onClick,
    role: "button" as const,
    tabIndex: 0,
    className: "cursor-pointer hover:opacity-80 transition-opacity",
  } : {};

  if (compact) {
    return (
      <span {...clickProps}>
        <Badge
          variant={hasHighSeverity ? 'destructive' : 'default'}
          className={cn(
            "text-[10px] px-2 py-0.5",
            hasHighSeverity 
              ? "bg-red-500/30 text-red-200 border-red-400/50" 
              : "bg-blue-500/30 text-blue-200 border-blue-400/50",
            onClick && "cursor-pointer hover:opacity-80"
          )}
        >
          {hasHighSeverity && <AlertTriangle className="w-2.5 h-2.5 mr-1" />}
          {showCount && `${impacts.length} impact${impacts.length > 1 ? 's' : ''}`}
          {!showCount && 'Impact'}
        </Badge>
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", onClick && "cursor-pointer")} {...clickProps}>
      <Badge
        variant={hasHighSeverity ? 'destructive' : 'default'}
        className={cn(
          "text-xs px-2.5 py-1",
          hasHighSeverity 
            ? "bg-red-500/30 text-red-200 border-red-400/50" 
            : "bg-blue-500/30 text-blue-200 border-blue-400/50"
        )}
      >
        {hasHighSeverity ? (
          <AlertTriangle className="w-3 h-3 mr-1" />
        ) : (
          <AlertCircle className="w-3 h-3 mr-1" />
        )}
        {impacts.length} impact{impacts.length > 1 ? 's' : ''}
        {highSeverityCount > 0 && ` (${highSeverityCount} high)`}
      </Badge>
      
      {netJobs !== 0 && (
        <Badge
          variant="outline"
          className={cn(
            "text-xs px-2.5 py-1",
            netJobs > 0 
              ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
              : "bg-red-500/20 text-red-200 border-red-400/40"
          )}
        >
          {netJobs > 0 ? (
            <TrendingUp className="w-3 h-3 mr-1" />
          ) : (
            <TrendingDown className="w-3 h-3 mr-1" />
          )}
          {Math.abs(netJobs).toLocaleString()} jobs
        </Badge>
      )}
    </div>
  );
}

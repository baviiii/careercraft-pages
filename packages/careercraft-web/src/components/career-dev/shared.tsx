/**
 * Shared building blocks for the career-development panels (career guidance,
 * certifications, study engine, profile). Keeps every panel visually identical
 * to InterviewPrep — same Card idiom, gradients, "not available" pattern — and
 * centralizes the REAL-ONLY error handling so no panel ever shows mock data.
 */
import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import { CAREER_COACH_AVAILABLE } from "@/lib/careerCoach";

/** Shown when VITE_INTERVIEW_MCP_URL isn't configured — mirrors InterviewPrep. */
export function CoachNotConnected() {
  if (CAREER_COACH_AVAILABLE) return null;
  return (
    <Card className="p-4 bg-amber-500/10 border-amber-500/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-sm">Career coach not connected</p>
          <p className="text-xs text-muted-foreground">
            Set <code className="font-mono">VITE_INTERVIEW_MCP_URL</code> to your running interview-coach-mcp to enable
            live guidance, certification analysis, roadmaps and the study engine. Until then, these show "not available
            at the moment".
          </p>
        </div>
      </div>
    </Card>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Icon className="w-7 h-7 text-primary" />
          {title}
        </h2>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Full-card loading state. */
export function LoadingCard({ label }: { label: string }) {
  return (
    <Card className="p-12 text-center">
      <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
      <h3 className="text-lg font-semibold">{label}</h3>
      <p className="text-muted-foreground text-sm">This runs against your live profile — a few seconds.</p>
    </Card>
  );
}

/** Empty/error state with a retry CTA. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Card className="p-12 text-center">
      <Icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-md mx-auto">{description}</p>
      {children}
    </Card>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
  important: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "nice-to-have": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  high: "bg-red-500/10 text-red-600 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export function SeverityBadge({ level }: { level: string }) {
  const cls = SEVERITY_STYLES[level.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cls}>
      {level}
    </Badge>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  expiring_soon: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  expired: "bg-red-500/10 text-red-600 border-red-500/20",
};

export function CertStatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground";
  const label = status === "expiring_soon" ? "expiring soon" : status;
  return (
    <Badge variant="outline" className={cls}>
      {label}
    </Badge>
  );
}

/** Small proficiency meter used across skill displays. */
export function ProficiencyBar({ value }: { value: number }) {
  const color = value >= 75 ? "bg-green-500" : value >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
    </div>
  );
}

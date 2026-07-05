/**
 * CareerProfilePanel — the "what the coach knows about you" home screen for the
 * career-development surface. Deterministic, instant (no LLM): goal, readiness,
 * skill matrix, certifications with expiry status, job pipeline, missing
 * signals, and the synthesized persona. Refreshing the persona is the one
 * model call here.
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  Brain,
  Briefcase,
  Compass,
  Gauge,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  CircleAlert,
} from "lucide-react";
import {
  careerCoach,
  CoachUnavailableError,
  type CareerProfile,
} from "@/lib/careerCoach";
import { CertStatusBadge, CoachNotConnected, EmptyState, ProficiencyBar, SectionHeader } from "./shared";

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

const READINESS_STYLES: Record<string, string> = {
  "interview-ready": "bg-green-500/10 text-green-600 border-green-500/20",
  "almost ready": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  developing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export default function CareerProfilePanel({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      setProfile(await careerCoach.getProfile());
    } catch (e) {
      setProfile(null);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshPersona = async () => {
    setRefreshing(true);
    try {
      const r = await careerCoach.refreshPersona({});
      toast({
        title: r.persisted ? "Persona refreshed" : "Persona synthesized",
        description: `Confidence ${Math.round((r.confidence ?? 0) * 100)}% · based on ${r.basedOn.length} signals.`,
      });
      await load();
    } catch (e) {
      const message = e instanceof CoachUnavailableError ? e.message : "Could not refresh persona right now.";
      toast({ title: "Not available", description: message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CoachNotConnected />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (unavailable || !profile) {
    return (
      <div className="space-y-6">
        <CoachNotConnected />
        <EmptyState
          icon={Compass}
          title="Profile not available at the moment"
          description="We couldn't load your career profile. Make sure the coach is connected and you're signed in, then try again."
        >
          <Button variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </EmptyState>
      </div>
    );
  }

  const persona = profile.persona as Record<string, unknown> | null;
  const readinessCls = READINESS_STYLES[profile.readiness.level] ?? "bg-muted text-muted-foreground";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <CoachNotConnected />

      <SectionHeader
        icon={Compass}
        title="Your Career Profile"
        subtitle="Everything the coach knows about you — and what's still missing."
        action={
          <Button variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* Top row: goal, readiness, pipeline */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Target className="w-5 h-5" />
            <span className="font-semibold text-sm">Goal</span>
          </div>
          {profile.goal?.targetRole || profile.goal?.targetField ? (
            <>
              <p className="text-lg font-bold leading-tight">{profile.goal.targetRole ?? profile.goal.targetField}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {[profile.goal.targetField, profile.goal.seniority].filter(Boolean).join(" · ")}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">No goal set yet.</p>
              {onNavigate && (
                <Button size="sm" variant="outline" onClick={() => onNavigate("career-coach")}>
                  Set your goal
                </Button>
              )}
            </>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-sm">Interview readiness</span>
          </div>
          <Badge variant="outline" className={`${readinessCls} mb-2 capitalize`}>
            {profile.readiness.level}
          </Badge>
          <p className="text-xs text-muted-foreground">
            {profile.readiness.averageRecentScore !== null
              ? `Avg recent score ${profile.readiness.averageRecentScore}/100 across ${profile.readiness.recentScores.length} sessions`
              : "No scored sessions yet"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-sm">Job pipeline</span>
          </div>
          {profile.jobPipeline ? (
            <div className="flex gap-4">
              <div>
                <p className="text-2xl font-bold">{profile.jobPipeline.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Applied</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{profile.jobPipeline.interviews}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Interview</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{profile.jobPipeline.offers}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Offers</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No applications tracked yet.</p>
          )}
        </Card>
      </div>

      {/* Skill matrix */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Skill matrix
          <Badge variant="secondary" className="ml-1">{profile.skills.tracked} tracked</Badge>
        </h3>
        {profile.skills.tracked === 0 ? (
          <p className="text-sm text-muted-foreground">
            No skills tracked yet. Run an interview session or a drill and they'll start appearing here.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Needs work</p>
              <div className="space-y-3">
                {profile.skills.weakest.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1.5">
                        <TrendIcon trend={s.trend} />
                        {s.name}
                      </span>
                      <span className="text-muted-foreground">{s.proficiency}/100</span>
                    </div>
                    <ProficiencyBar value={s.proficiency} />
                  </div>
                ))}
                {profile.skills.weakest.length === 0 && (
                  <p className="text-sm text-muted-foreground">No weak skills — nice.</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Strongest</p>
              <div className="space-y-3">
                {profile.skills.strongest.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1.5">
                        <TrendIcon trend={s.trend} />
                        {s.name}
                      </span>
                      <span className="text-muted-foreground">{s.proficiency}/100</span>
                    </div>
                    <ProficiencyBar value={s.proficiency} />
                  </div>
                ))}
                {profile.skills.strongest.length === 0 && (
                  <p className="text-sm text-muted-foreground">Keep practicing to build strengths.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Certifications */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Certifications
          <Badge variant="secondary" className="ml-1">{profile.certifications.length}</Badge>
        </h3>
        {profile.certifications.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">No certifications logged yet.</p>
            {onNavigate && (
              <Button size="sm" variant="outline" onClick={() => onNavigate("certifications")}>
                Log a certification
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {profile.certifications.map((c, i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.issuer ?? "Unknown issuer"}
                    {c.skillsVouchedFor.length > 0 && ` · vouches for ${c.skillsVouchedFor.join(", ")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!c.recognized && (
                    <Badge variant="outline" className="text-[10px]">unrecognized</Badge>
                  )}
                  <CertStatusBadge status={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Persona */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Coach persona
          </h3>
          <Button onClick={refreshPersona} disabled={refreshing} size="sm" className="bg-gradient-to-r from-primary to-primary/80">
            {refreshing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {persona ? "Refresh" : "Synthesize"}
          </Button>
        </div>
        {persona ? (
          <div className="space-y-3">
            {typeof persona.headline === "string" && <p className="text-lg font-medium">{persona.headline}</p>}
            {typeof persona.summary === "string" && <p className="text-sm text-muted-foreground">{persona.summary}</p>}
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              {Array.isArray(persona.superpowers) && persona.superpowers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase mb-2">Superpowers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(persona.superpowers as string[]).map((s, i) => (
                      <Badge key={i} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(persona.growthEdges) && persona.growthEdges.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase mb-2">Growth edges</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(persona.growthEdges as string[]).map((s, i) => (
                      <Badge key={i} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No persona yet. Synthesize one from your skills, certifications, scores and resume — it's the memory that
            makes every coaching answer more personal.
          </p>
        )}
      </Card>

      {/* Missing signals */}
      {profile.missingSignals.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/20">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CircleAlert className="w-5 h-5 text-blue-600" />
            Make your coaching sharper
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            The more of these the coach has, the more personalized every plan, question and recommendation becomes:
          </p>
          <ul className="space-y-1.5">
            {profile.missingSignals.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </motion.div>
  );
}

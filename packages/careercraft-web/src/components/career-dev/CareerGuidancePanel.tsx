/**
 * CareerGuidancePanel — set the goal that anchors all personalization, then get
 * a full strategist read (position, strengths to sell, gaps, trajectory options,
 * narrative, next actions) and build a week-addressed roadmap to the target.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Compass,
  Flag,
  Lightbulb,
  Loader2,
  MapPin,
  Megaphone,
  Route,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  careerCoach,
  CoachUnavailableError,
  type CareerGuidance,
  type CareerRoadmap,
} from "@/lib/careerCoach";
import { CoachNotConnected, SectionHeader, SeverityBadge } from "./shared";

/**
 * `field` is the role from the page's "Going for" card. Setting the goal used to
 * happen here too, through a fixed list of fields; it now happens once, in that
 * card, which saves to the profile the coach reads.
 */
export default function CareerGuidancePanel({ field }: { field?: string; seniority?: string }) {
  const { toast } = useToast();

  const [question, setQuestion] = useState("");
  const [horizonMonths, setHorizonMonths] = useState("6");

  const [guidance, setGuidance] = useState<CareerGuidance | null>(null);
  const [loadingGuidance, setLoadingGuidance] = useState(false);

  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [horizonWeeks, setHorizonWeeks] = useState("12");
  const [hoursPerWeek, setHoursPerWeek] = useState("6");

  const notAvailable = (e: unknown) => {
    const message = e instanceof CoachUnavailableError ? e.message : "Career coach is not available at the moment.";
    toast({ title: "Not available", description: message, variant: "destructive" });
  };

  const getGuidance = async () => {
    setLoadingGuidance(true);
    try {
      const r = await careerCoach.getGuidance({
        question: question || undefined,
        targetRole: field || undefined,
        targetField: field || undefined,
        horizonMonths: Number(horizonMonths) || 6,
      });
      setGuidance(r.guidance);
    } catch (e) {
      setGuidance(null);
      notAvailable(e);
    } finally {
      setLoadingGuidance(false);
    }
  };

  const buildRoadmap = async () => {
    if (!field) {
      toast({
        title: "Tell us the job you're going for",
        description: "Use the card at the top of the page. Any job works.",
        variant: "destructive",
      });
      return;
    }
    setLoadingRoadmap(true);
    try {
      const r = await careerCoach.buildRoadmap({
        targetRole: field,
        targetField: field,
        horizonWeeks: Number(horizonWeeks) || 12,
        hoursPerWeek: Number(hoursPerWeek) || 6,
      });
      setRoadmap(r.roadmap);
    } catch (e) {
      setRoadmap(null);
      notAvailable(e);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <CoachNotConnected />
      <SectionHeader icon={Compass} title="Career Coach" subtitle="A specialist's read on where you are, and a plan to get to the job you're going for." />

      {/* Question setup — the target is the page's "Going for" role */}
      <Card className="p-6">
        <h3 className="font-semibold flex items-center gap-2">
          <Flag className="w-5 h-5 text-primary" />
          {field ? `Guidance for ${field}` : "Your target"}
        </h3>
        {!field && (
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us the job you're going for at the top of the page first. Any job works.
          </p>
        )}

        <div className="space-y-2 mt-4">
          <label className="text-sm font-medium flex items-center gap-2">
            Ask the coach anything <Badge variant="outline" className="text-[10px]">optional</Badge>
          </label>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Should I aim for staff engineer or engineering manager? Is my AWS cert still worth keeping?"
            className="min-h-[80px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Horizon</span>
            <Select value={horizonMonths} onValueChange={setHorizonMonths}>
              <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["3", "6", "12", "18", "24"].map((m) => <SelectItem key={m} value={m}>{m} months</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={getGuidance} disabled={loadingGuidance} className="bg-gradient-to-r from-primary to-primary/80">
            {loadingGuidance ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reading your profile...</> : <><Sparkles className="w-4 h-4 mr-2" />Get guidance<ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
        </div>
      </Card>

      {/* Guidance output */}
      <AnimatePresence>
        {guidance && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {guidance.headline && (
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <p className="text-lg font-semibold">{guidance.headline}</p>
                {guidance.assessment && (
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    {guidance.assessment.whereYouAre && (
                      <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Where you are</p><p className="text-sm">{guidance.assessment.whereYouAre}</p></div>
                    )}
                    {guidance.assessment.momentum && (
                      <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Momentum</p><p className="text-sm">{guidance.assessment.momentum}</p></div>
                    )}
                    {guidance.assessment.marketPosition && (
                      <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Market position</p><p className="text-sm">{guidance.assessment.marketPosition}</p></div>
                    )}
                  </div>
                )}
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {guidance.strengthsToSell && guidance.strengthsToSell.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-600"><TrendingUp className="w-5 h-5" />Strengths to sell</h3>
                  <div className="space-y-3">
                    {guidance.strengthsToSell.map((s, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm">{s.strength}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.evidence}</p>
                        <p className="text-xs mt-1.5 flex items-start gap-1.5"><Megaphone className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />{s.howToPitch}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {guidance.gapsToClose && guidance.gapsToClose.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-amber-600"><Target className="w-5 h-5" />Gaps to close</h3>
                  <div className="space-y-3">
                    {guidance.gapsToClose.map((g, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-medium text-sm">{g.gap}</p>
                          <SeverityBadge level={g.severity} />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />{g.fastestFix}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {guidance.trajectoryOptions && guidance.trajectoryOptions.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Route className="w-5 h-5 text-primary" />Trajectory options</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {guidance.trajectoryOptions.map((t, i) => (
                    <div key={i} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm">{t.path}</p>
                        <Badge variant="secondary">{t.viability}% fit</Badge>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, Math.min(100, t.viability))}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{t.whyItFits}</p>
                      <Separator className="my-2" />
                      <p className="text-xs"><span className="font-medium">First milestone:</span> {t.firstMilestone}</p>
                      <p className="text-xs mt-1 text-muted-foreground flex items-center gap-1"><CalendarRange className="w-3 h-3" />{t.timeToCredible}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {guidance.narrative && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" />Your narrative</h3>
                <div className="space-y-3">
                  {guidance.narrative.elevatorPitch && (
                    <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Elevator pitch</p><p className="text-sm bg-muted/50 p-3 rounded-lg">{guidance.narrative.elevatorPitch}</p></div>
                  )}
                  {guidance.narrative.linkedinHeadline && (
                    <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">LinkedIn headline</p><p className="text-sm font-medium">{guidance.narrative.linkedinHeadline}</p></div>
                  )}
                  {guidance.narrative.storyArc && (
                    <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Story arc</p><p className="text-sm text-muted-foreground">{guidance.narrative.storyArc}</p></div>
                  )}
                </div>
              </Card>
            )}

            {guidance.nextActions && guidance.nextActions.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Next actions</h3>
                <div className="space-y-2">
                  {guidance.nextActions.map((a, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">{a.action}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <SeverityBadge level={a.impact} />
                        <Badge variant="outline" className="text-[10px]">{a.due}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roadmap builder */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="font-semibold flex items-center gap-2"><Route className="w-5 h-5 text-primary" />Build a roadmap</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Over</span>
              <Select value={horizonWeeks} onValueChange={setHorizonWeeks}>
                <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["6", "8", "12", "16", "24"].map((w) => <SelectItem key={w} value={w}>{w} wks</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">at</span>
              <Select value={hoursPerWeek} onValueChange={setHoursPerWeek}>
                <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["3", "5", "8", "10", "15"].map((h) => <SelectItem key={h} value={h}>{h} h/wk</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={buildRoadmap} disabled={loadingRoadmap} className="bg-gradient-to-r from-primary to-primary/80">
              {loadingRoadmap ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building...</> : <><Route className="w-4 h-4 mr-2" />Build roadmap</>}
            </Button>
          </div>
        </div>

        {roadmap ? (
          <div className="space-y-4">
            {roadmap.title && <p className="text-lg font-semibold">{roadmap.title}</p>}
            {roadmap.northStar && (
              <p className="text-sm text-muted-foreground flex items-start gap-2"><Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />{roadmap.northStar}</p>
            )}
            <div className="space-y-3">
              {(roadmap.phases ?? []).map((p, i) => (
                <div key={i} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="font-semibold text-sm">{p.name}</p>
                    <Badge variant="outline" className="text-[10px] ml-auto">weeks {p.weeks}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{p.objective}</p>
                  {p.skillTargets && p.skillTargets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.skillTargets.map((t, j) => (
                        <Badge key={j} variant="secondary" className="text-[10px]">{t.skill} {t.from}→{t.to}</Badge>
                      ))}
                    </div>
                  )}
                  {p.actions && p.actions.length > 0 && (
                    <ul className="space-y-1.5">
                      {p.actions.map((a, j) => (
                        <li key={j} className="text-xs flex items-start gap-2">
                          <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">{a.type}</Badge>
                          <span><span className="text-foreground">{a.action}</span> <span className="text-muted-foreground">· {a.cadence} · done when: {a.doneWhen}</span></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            {roadmap.certificationTrack && roadmap.certificationTrack.length > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <p className="text-sm font-medium mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Certification track</p>
                <ul className="space-y-1">
                  {roadmap.certificationTrack.map((c, i) => (
                    <li key={i} className="text-xs text-muted-foreground">Week {c.targetWeek}: <span className="text-foreground font-medium">{c.certification}</span> — {c.why}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Generates a week-by-week plan to your target — skill targets from your real proficiencies, a certification
            track, mock-interview cadence and checkable phase exits.
          </p>
        )}
      </Card>
    </motion.div>
  );
}

/**
 * StudyPanel — the upskilling engine. Build a sequenced study plan, run the
 * spaced-repetition drill loop (scheduler picks what's due → attempt → self-score
 * → matrix updates), and get layered concept explanations on demand.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  Loader2,
  Repeat,
  Target,
  Timer,
} from "lucide-react";
import {
  careerCoach,
  CoachUnavailableError,
  type ConceptExplanation,
  type Degradation,
  type Drill,
  type DrillScheduling,
  type LearningPathway,
  type Proof,
  type StudyPlan,
} from "@/lib/careerCoach";
import { CoachNotConnected, SectionHeader } from "./shared";

const METHOD_STYLES: Record<string, string> = {
  learn: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  drill: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  build: "bg-green-500/10 text-green-600 border-green-500/20",
  mock: "bg-red-500/10 text-red-600 border-red-500/20",
  review: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

function ProofChip({ proof }: { proof: Proof | null | undefined }) {
  if (!proof) return null;
  return (
    <a href={proof.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10">
      <CheckCircle2 className="w-3 h-3" />
      <span className="opacity-70">Backed by</span>
      <span className="font-semibold">{proof.label}</span>
      {proof.stat && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold">{proof.stat}</span>}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

export default function StudyPanel({ field }: { field?: string }) {
  const { toast } = useToast();

  // Study plan — sourced from the pathway call, which also carries the focus
  // reasoning, ranked resources and the next mock to sit.
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [pathway, setPathway] = useState<LearningPathway | null>(null);
  const [degraded, setDegraded] = useState<Degradation | null>(null);
  const [planning, setPlanning] = useState(false);
  const [weeks, setWeeks] = useState("4");
  const [hours, setHours] = useState("5");

  // Drill loop
  const [drill, setDrill] = useState<Drill | null>(null);
  const [scheduling, setScheduling] = useState<DrillScheduling | null>(null);
  const [drilling, setDrilling] = useState(false);
  const [attempt, setAttempt] = useState("");
  const [score, setScore] = useState(6);
  const [recording, setRecording] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  // Explain
  const [concept, setConcept] = useState("");
  const [level, setLevel] = useState<"eli5" | "working" | "interview">("working");
  const [explanation, setExplanation] = useState<ConceptExplanation | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Plans, drills and explanations are for one job; a new role clears them.
  useEffect(() => {
    setPlan(null);
    setPathway(null);
    setDegraded(null);
    setDrill(null);
    setScheduling(null);
    setLastResult(null);
    setExplanation(null);
  }, [field]);

  const notAvailable = (e: unknown) => {
    const message = e instanceof CoachUnavailableError ? e.message : "Career coach is not available at the moment.";
    toast({ title: "Not available", description: message, variant: "destructive" });
  };

  /**
   * Uses the pathway endpoint rather than buildStudyPlan directly: it derives
   * targets from the career goal or field research when nothing has been tested
   * yet, so a learner with an empty skill matrix gets a plan instead of an error.
   */
  const buildPlan = async () => {
    setPlanning(true);
    try {
      const r = await careerCoach.getLearningPathway({
        field: field || undefined,
        weeks: Number(weeks) || 4,
        hoursPerWeek: Number(hours) || 5,
      });
      setPathway(r.pathway);
      setPlan(r.pathway?.plan ?? null);
      setDegraded(r._meta?.degraded ?? null);
      if (!r.pathway?.plan?.weeks?.length) {
        toast({
          title: "No plan returned",
          description: "The coach reached the model but returned no weeks — try again.",
          variant: "destructive",
        });
      }
    } catch (e) {
      notAvailable(e);
    } finally {
      setPlanning(false);
    }
  };

  const getDrill = async () => {
    setDrilling(true);
    setLastResult(null);
    setAttempt("");
    try {
      const r = await careerCoach.nextDrill({ field: field || undefined });
      setDrill(r.drill);
      setScheduling(r.scheduling);
      setScore(6);
    } catch (e) {
      setDrill(null);
      notAvailable(e);
    } finally {
      setDrilling(false);
    }
  };

  const recordResult = async () => {
    if (!scheduling) return;
    setRecording(true);
    try {
      const r = await careerCoach.recordDrillResult({ skill: scheduling.skill, score });
      setLastResult(`${r.skill}: ${r.previousProficiency} → ${r.newProficiency} (${r.delta >= 0 ? "+" : ""}${r.delta}). ${r.verdict} Next review in ${r.nextReviewInDays}d.`);
      toast({ title: "Drill recorded", description: `${r.skill} is now ${r.newProficiency}/100.` });
    } catch (e) {
      notAvailable(e);
    } finally {
      setRecording(false);
    }
  };

  const explain = async () => {
    if (concept.trim().length < 2) {
      toast({ title: "Enter a concept", variant: "destructive" });
      return;
    }
    setExplaining(true);
    try {
      setExplanation(await careerCoach.explainConcept({ concept: concept.trim(), level, field: field || undefined }));
    } catch (e) {
      setExplanation(null);
      notAvailable(e);
    } finally {
      setExplaining(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <CoachNotConnected />
      <SectionHeader icon={GraduationCap} title="Study & Upskill" subtitle="A sequenced plan, spaced-repetition drills, and explanations that stick." />

      {/* Drill loop — the daily habit, first */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="font-semibold flex items-center gap-2"><Dumbbell className="w-5 h-5 text-primary" />Today's drill</h3>
          <Button onClick={getDrill} disabled={drilling} className="bg-gradient-to-r from-primary to-primary/80">
            {drilling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Picking what's due...</> : <><Repeat className="w-4 h-4 mr-2" />{drill ? "Next drill" : "Start a drill"}</>}
          </Button>
        </div>

        {drill && scheduling ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{scheduling.skill}</Badge>
              <Badge variant="outline">{drill.type}</Badge>
              <Badge variant="outline">{drill.difficulty}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" />{drill.timeboxMinutes} min</span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Why now: {scheduling.whyNow}</p>

            <Card className="p-4 bg-muted/40">
              <p className="text-base font-medium">{drill.prompt}</p>
            </Card>

            <Textarea value={attempt} onChange={(e) => setAttempt(e.target.value)} placeholder="Draft your answer here (optional — for your own reflection)..." className="min-h-[120px]" />

            <Accordion type="single" collapsible>
              <AccordionItem value="check">
                <AccordionTrigger className="text-sm">Reveal self-check & ideal points</AccordionTrigger>
                <AccordionContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase mb-2">A strong answer includes</p>
                      <ul className="space-y-1">{drill.idealAnswerPoints.map((p, i) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-1 shrink-0" />{p}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ask yourself</p>
                      <ul className="space-y-1">{drill.selfCheck.map((p, i) => <li key={i} className="text-sm flex items-start gap-2"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-1 shrink-0" />{p}</li>)}</ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            {/* Self-score → records to the matrix */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">How did you do?</p>
                <span className="text-2xl font-bold">{score}<span className="text-sm text-muted-foreground">/10</span></span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>Struggled</span><span>Nailed it</span></div>
              <Button onClick={recordResult} disabled={recording} className="mt-3 w-full" variant="outline">
                {recording ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating your matrix...</> : <><Target className="w-4 h-4 mr-2" />Record result</>}
              </Button>
              {lastResult && (
                <p className="text-sm text-center mt-3 p-3 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg">{lastResult}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            The scheduler picks the skill most due for review — based on your proficiency, how long since you last
            touched it, and its trend — then generates one focused, self-checkable exercise. Scoring it updates your
            skill matrix instantly.
          </p>
        )}
      </Card>

      {/* Study plan */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="font-semibold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" />Study plan</h3>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={weeks} onValueChange={setWeeks}>
              <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{["2", "4", "6", "8"].map((w) => <SelectItem key={w} value={w}>{w} wks</SelectItem>)}</SelectContent>
            </Select>
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{["3", "5", "8", "10"].map((h) => <SelectItem key={h} value={h}>{h} h/wk</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={buildPlan} disabled={planning} className="bg-gradient-to-r from-primary to-primary/80">
              {planning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building...</> : <><CalendarDays className="w-4 h-4 mr-2" />Build plan</>}
            </Button>
          </div>
        </div>

        {/* Why these skills — and, when the data was thin, what the coach fell
            back to. Makes an under-powered pathway readable instead of looking
            broken. */}
        {pathway && (
          <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {pathway.focus.fromLastInterview ? "from your last mock" : pathway.focus.source}
              </Badge>
              {pathway.targets.map((t) => (
                <Badge key={t.skill} variant="secondary" className="text-[10px]">
                  {t.skill} {t.from}→{t.to}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{pathway.focus.why}</p>
            {pathway.nextMock.focusAreas.length > 0 && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                Next mock: {pathway.nextMock.focusAreas.join(", ")} — {pathway.nextMock.why}
              </p>
            )}
            {degraded?.degraded && (
              <p className="text-xs text-amber-600">
                Working with partial data — {degraded.reasons.join("; ")}.
              </p>
            )}
          </div>
        )}

        {pathway?.resources?.length ? (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Resources for these skills
              {pathway.unsourcedResources && " (suggestions — nothing real backed these yet)"}
            </p>
            {pathway.resources.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
                <Badge variant="outline" className="shrink-0 text-[9px]">
                  {r.source}
                </Badge>
                <div className="flex-1 min-w-0">
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {r.title}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <p className="text-sm font-medium">{r.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{r.whyRecommended}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {plan?.weeks?.length ? (
          <div className="space-y-4">
            {plan.goal && <p className="text-sm text-muted-foreground flex items-start gap-2"><Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />{plan.goal}</p>}
            <Accordion type="single" collapsible defaultValue="week-0">
              {plan.weeks.map((w, i) => (
                <AccordionItem key={i} value={`week-${i}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3 text-left">
                      <Badge variant="secondary" className="shrink-0">Week {w.week}</Badge>
                      <span className="font-medium">{w.theme}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {w.sessions.map((s, j) => (
                        <div key={j} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                          <div className="text-center shrink-0 w-10">
                            <p className="text-xs font-bold">{s.day}</p>
                            <p className="text-[10px] text-muted-foreground">{s.minutes}m</p>
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-[9px] ${METHOD_STYLES[s.method] ?? ""}`}>{s.method}</Badge>
                              <span className="text-xs text-muted-foreground">{s.skill}</span>
                            </div>
                            <p className="text-sm">{s.activity}</p>
                            {s.resourceTitle && <p className="text-xs text-primary mt-1 flex items-center gap-1"><BookOpen className="w-3 h-3" />{s.resourceTitle}</p>}
                          </div>
                        </div>
                      ))}
                      {w.milestone && <p className="text-xs text-muted-foreground italic pt-1 flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />By week's end: {w.milestone}</p>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {plan.spacedReviewRules && plan.spacedReviewRules.length > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <p className="text-sm font-medium mb-2 flex items-center gap-2"><Repeat className="w-4 h-4 text-primary" />Spaced-review rules</p>
                <ul className="space-y-1">{plan.spacedReviewRules.map((r, i) => <li key={i} className="text-xs text-muted-foreground">• {r}</li>)}</ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Builds a week-by-week deliberate-practice plan over your weakest skills, sized to your weekly hours, with
            real learning resources slotted in and standing spaced-review rules.
          </p>
        )}
      </Card>

      {/* Explain a concept */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-primary" />Explain a concept</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="e.g. CAP theorem, eventual consistency, B-trees..." className="flex-1" onKeyDown={(e) => e.key === "Enter" && explain()} />
          <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="eli5">Explain simply</SelectItem>
              <SelectItem value="working">Working knowledge</SelectItem>
              <SelectItem value="interview">Interview-grade</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={explain} disabled={explaining} className="bg-gradient-to-r from-primary to-primary/80">
            {explaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
            Explain
          </Button>
        </div>

        <AnimatePresence>
          {explanation && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 space-y-4">
              {explanation.levels && (
                <div className="space-y-3">
                  {explanation.levels.intuition && (
                    <div><p className="text-xs font-semibold text-blue-600 uppercase mb-1">Intuition</p><p className="text-sm">{explanation.levels.intuition}</p></div>
                  )}
                  {explanation.levels.working && (
                    <div><p className="text-xs font-semibold text-purple-600 uppercase mb-1">Working knowledge</p><p className="text-sm">{explanation.levels.working}</p></div>
                  )}
                  {explanation.levels.interviewGrade && (
                    <div><p className="text-xs font-semibold text-primary uppercase mb-1">Interview-grade</p><p className="text-sm">{explanation.levels.interviewGrade}</p></div>
                  )}
                </div>
              )}
              {explanation.workedExample && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Worked example</p>
                  <p className="text-sm">{explanation.workedExample}</p>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                {explanation.commonPitfalls && explanation.commonPitfalls.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase mb-2">Common pitfalls</p>
                    <ul className="space-y-1">{explanation.commonPitfalls.map((p, i) => <li key={i} className="text-sm text-muted-foreground">• {p}</li>)}</ul>
                  </div>
                )}
                {explanation.interviewAngles && explanation.interviewAngles.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase mb-2">How interviewers probe it</p>
                    <ul className="space-y-1">{explanation.interviewAngles.map((p, i) => <li key={i} className="text-sm text-muted-foreground">• {p}</li>)}</ul>
                  </div>
                )}
              </div>
              {explanation.proof && <ProofChip proof={explanation.proof} />}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

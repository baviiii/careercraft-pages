/**
 * CertificationsPanel — the certificate-aware guidance surface. Analyze the
 * held portfolio (coverage, market value, expiry alerts, interview talking
 * points), get a ranked next-certification plan (budget/time aware, sourced),
 * and log newly-earned certs (which credit their skills in the matrix).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Award,
  BadgeCheck,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  GraduationCap,
  Loader2,
  MessageSquareQuote,
  Plus,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  careerCoach,
  CoachUnavailableError,
  type CertificationAnalysis,
  type CertificationFacts,
  type CertificationPlan,
  type Proof,
} from "@/lib/careerCoach";
import { CertStatusBadge, CoachNotConnected, SectionHeader } from "./shared";

function ProofChip({ proof }: { proof: Proof | null }) {
  if (!proof) return null;
  return (
    <a
      href={proof.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
    >
      <CheckCircle2 className="w-3 h-3" />
      <span className="opacity-70">Backed by</span>
      <span className="font-semibold">{proof.label}</span>
      {proof.stat && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold">{proof.stat}</span>}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

const VALUE_STYLES: Record<string, string> = {
  high: "bg-green-500/10 text-green-600 border-green-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-muted text-muted-foreground",
};

/**
 * `field` / `level` are the role and level from the page's "Going for" card —
 * the saved ones, or a just-this-once pick — so recommendations fit both.
 */
export default function CertificationsPanel({ field, level }: { field?: string; level?: string }) {
  const { toast } = useToast();
  const targetField = field ?? "";

  const [facts, setFacts] = useState<CertificationFacts | null>(null);
  const [analysis, setAnalysis] = useState<CertificationAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [plan, setPlan] = useState<CertificationPlan | null>(null);
  const [planProof, setPlanProof] = useState<Proof | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [budget, setBudget] = useState("");
  const [hours, setHours] = useState("5");

  // Log form
  const [showLog, setShowLog] = useState(false);
  const [logName, setLogName] = useState("");
  const [logIssuer, setLogIssuer] = useState("");
  const [logIssue, setLogIssue] = useState("");
  const [logExpiry, setLogExpiry] = useState("");
  const [logging, setLogging] = useState(false);

  const notAvailable = (e: unknown) => {
    const message = e instanceof CoachUnavailableError ? e.message : "Career coach is not available at the moment.";
    toast({ title: "Not available", description: message, variant: "destructive" });
  };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const r = await careerCoach.analyzeCertifications({ targetField: targetField || undefined });
      setFacts(r.facts);
      setAnalysis(r.analysis);
    } catch (e) {
      notAvailable(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const recommend = async () => {
    setRecommending(true);
    try {
      const r = await careerCoach.recommendCertifications({
        targetField: targetField || undefined,
        seniority: level || undefined,
        budgetUsd: budget ? Number(budget) : undefined,
        hoursPerWeek: Number(hours) || 5,
        count: 3,
      });
      setPlan(r.plan);
      setPlanProof(r.topPickProof);
    } catch (e) {
      notAvailable(e);
    } finally {
      setRecommending(false);
    }
  };

  const logCert = async () => {
    if (logName.trim().length < 2) {
      toast({ title: "Enter the certification name", variant: "destructive" });
      return;
    }
    setLogging(true);
    try {
      const r = await careerCoach.logCertification({
        name: logName.trim(),
        issuer: logIssuer || undefined,
        issueDate: logIssue || undefined,
        expiryDate: logExpiry || undefined,
      });
      toast({
        title: r.recognized ? `Logged: ${r.recognized.name}` : "Certification logged",
        description: r.skillsCredited.length
          ? `Credited skills: ${r.skillsCredited.join(", ")}`
          : r.note,
      });
      setLogName(""); setLogIssuer(""); setLogIssue(""); setLogExpiry("");
      setShowLog(false);
      void analyze();
    } catch (e) {
      notAvailable(e);
    } finally {
      setLogging(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <CoachNotConnected />
      <SectionHeader
        icon={Award}
        title="Certifications"
        subtitle="Turn credentials into hiring signal — analyzed, prioritized, and logged."
        action={
          <Button onClick={() => setShowLog((s) => !s)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />Log a certification
          </Button>
        }
      />

      {/* Log form */}
      <AnimatePresence>
        {showLog && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-primary" />Log a certification</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input value={logName} onChange={(e) => setLogName(e.target.value)} placeholder="e.g. AWS Certified Solutions Architect – Associate" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Issuer</label>
                  <Input value={logIssuer} onChange={(e) => setLogIssuer(e.target.value)} placeholder="e.g. Amazon Web Services" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Issued</label>
                  <Input type="date" value={logIssue} onChange={(e) => setLogIssue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expires <Badge variant="outline" className="text-[10px]">optional</Badge></label>
                  <Input type="date" value={logExpiry} onChange={(e) => setLogExpiry(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={logCert} disabled={logging} className="bg-gradient-to-r from-primary to-primary/80">
                  {logging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BadgeCheck className="w-4 h-4 mr-2" />}
                  Save & credit skills
                </Button>
                <Button variant="ghost" onClick={() => setShowLog(false)}>Cancel</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Recognized certs credit the skills they vouch for in your matrix — so your next questions, plans and
                recommendations immediately account for them.
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium">
              {targetField ? `Certifications and licences for ${targetField}` : "Certifications and licences"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {targetField
                ? "Change the job at the top of the page."
                : "Tell us the job you're going for at the top of the page for advice aimed at it."}
            </p>
          </div>
          <Button onClick={analyze} disabled={analyzing} variant="outline" className="md:mb-0">
            {analyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><ShieldCheck className="w-4 h-4 mr-2" />Analyze my portfolio</>}
          </Button>
        </div>
      </Card>

      {/* Facts + analysis */}
      <AnimatePresence>
        {(facts || analysis) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Expiry alerts */}
            {facts && (facts.expiringSoon.length > 0 || facts.expired.length > 0) && (
              <Card className="p-4 bg-amber-500/10 border-amber-500/20">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Renewal attention needed</p>
                    <p className="text-xs text-muted-foreground">
                      {facts.expired.length > 0 && <>Expired: {facts.expired.join(", ")}. </>}
                      {facts.expiringSoon.length > 0 && <>Expiring soon: {facts.expiringSoon.join(", ")}.</>}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {analysis?.portfolioVerdict && (
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" />Portfolio verdict</h3>
                <p className="text-sm text-muted-foreground">{analysis.portfolioVerdict}</p>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {analysis?.coverage && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Coverage vs target</h3>
                  {analysis.coverage.covered && analysis.coverage.covered.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-green-600 uppercase mb-2">Credibly proven</p>
                      <div className="flex flex-wrap gap-1.5">{analysis.coverage.covered.map((c, i) => <Badge key={i} variant="secondary">{c}</Badge>)}</div>
                    </div>
                  )}
                  {analysis.coverage.missing && analysis.coverage.missing.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 uppercase mb-2">Not yet covered</p>
                      <div className="flex flex-wrap gap-1.5">{analysis.coverage.missing.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}</div>
                    </div>
                  )}
                </Card>
              )}

              {analysis?.marketValue && analysis.marketValue.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Market value</h3>
                  <div className="space-y-3">
                    {analysis.marketValue.map((m, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{m.certification}</p>
                          <Badge variant="outline" className={VALUE_STYLES[m.value.toLowerCase()] ?? ""}>{m.value}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{m.why}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {analysis?.interviewTalkingPoints && analysis.interviewTalkingPoints.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><MessageSquareQuote className="w-5 h-5 text-primary" />Interview talking points</h3>
                <div className="space-y-3">
                  {analysis.interviewTalkingPoints.map((t, i) => (
                    <div key={i} className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs font-semibold text-primary mb-1">{t.certification}</p>
                      <p className="text-sm">{t.talkingPoint}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {analysis?.gapsVsTarget && analysis.gapsVsTarget.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-3">Gaps vs your target</h3>
                <ul className="space-y-1.5">
                  {analysis.gapsVsTarget.map((g, i) => (
                    <li key={i} className="text-sm flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />{g}</li>
                  ))}
                </ul>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommendations */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="font-semibold flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" />What to earn next</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget" className="w-24 h-9" type="number" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Study</span>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["3", "5", "8", "10", "15"].map((h) => <SelectItem key={h} value={h}>{h} h/wk</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={recommend} disabled={recommending} className="bg-gradient-to-r from-primary to-primary/80">
              {recommending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ranking...</> : <><Sparkles className="w-4 h-4 mr-2" />Recommend</>}
            </Button>
          </div>
        </div>

        {plan ? (
          <div className="space-y-4">
            {planProof && <ProofChip proof={planProof} />}
            <div className="space-y-3">
              {(plan.recommendations ?? []).map((r, i) => (
                <div key={i} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{r.priority}</span>
                      </div>
                      <p className="font-semibold text-sm">{r.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">~{r.estimatedWeeks} wks</Badge>
                      <Badge variant="secondary" className="text-[10px]">${r.examCostUsd}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{r.whyThisOne}</p>
                  <p className="text-xs"><span className="font-medium">Prep:</span> {r.prepPlan}</p>
                  <p className="text-xs mt-1 text-primary"><span className="font-medium">Opens:</span> {r.roi}</p>
                </div>
              ))}
            </div>
            {plan.skipForNow && plan.skipForNow.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Skip for now</p>
                <div className="space-y-1">
                  {plan.skipForNow.map((s, i) => (
                    <p key={i} className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{s.name}</span> — {s.why}</p>
                  ))}
                </div>
              </div>
            )}
            {plan.sequencingNote && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground italic">{plan.sequencingNote}</p>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ranks the best next certifications from a vetted catalog — optimized for hiring impact per prep hour,
            sequenced so prerequisites come first, and grounded in a real community source.
          </p>
        )}
      </Card>
    </motion.div>
  );
}

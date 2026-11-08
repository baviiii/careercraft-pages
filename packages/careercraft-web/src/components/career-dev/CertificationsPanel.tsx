/**
 * CertificationsPanel — the certificate-aware guidance surface. Analyze the
 * held portfolio (coverage, market value, expiry alerts, interview talking
 * points), get a ranked next-certification plan (budget/time aware, sourced),
 * and log newly-earned certs (which credit their skills in the matrix).
 *
 * The review and the plan open on the last ones the coach saved for this job.
 * Logging a certification redoes the review straight away and marks the plan
 * out of date, since it was ranked without that certification.
 *
 * Laid out to be read, not scanned for: the verdict's first sentence is the
 * headline, coverage is a checklist with a meter, each gap leads with its
 * point, and the plan is a numbered path with the weeks it takes.
 */
import "./certifications.css";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, BadgeCheck, Check, ExternalLink, Loader2, Plus, TriangleAlert } from "lucide-react";
import {
  careerCoach,
  CoachUnavailableError,
  type CertificationAnalysis,
  type CertificationFacts,
  type CertificationPlan,
  type Proof,
} from "@/lib/careerCoach";
import { useForgetSaved, useLatestSaved } from "@/lib/savedResults";
import { issuerSite } from "@/lib/brandLogos";
import { BrandLogo, BrandMark } from "./BrandLogo";
import { CoachNotConnected, SavedNote } from "./shared";

/* ── Reading helpers ─────────────────────────────────────────────────────── */

/**
 * The coach writes some **bold** and *italic*. Render those two and drop any
 * other stray asterisks. Built as React nodes, never as HTML.
 */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) {
          return (
            <strong key={i} className="font-semibold text-[color:var(--cc-ink)]">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (/^\*[^*\s][^*]*\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
        return <span key={i}>{p.replace(/\*+/g, "")}</span>;
      })}
    </>
  );
}

/** "**No cloud credential.** Employers expect…" → a title and its explanation. */
function splitLead(text: string): { lead: string | null; rest: string } {
  const m = text.match(/^\s*\*\*(.+?)\*\*[\s:—-]*([\s\S]*)$/);
  if (m) return { lead: m[1].trim(), rest: m[2].trim() };
  return { lead: null, rest: text };
}

/** First sentence and the rest, so a long verdict can lead with its point. */
function leadSentence(text: string): [string, string] {
  const m = text.trim().match(/^([\s\S]+?[.!?])\s+([A-Z][\s\S]*)$/);
  return m ? [m[1], m[2]] : [text.trim(), ""];
}

/* ── A plan, however it was saved ───────────────────────────────────────── */

/**
 * A model once returned the plan's list as one JSON string, and it was saved
 * that way: spread into steps, every character became a step. Plans are
 * cleaned by the coach now; this repairs the ones already saved.
 */
function asList<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string" && /^\s*\[/.test(v)) {
    try {
      const parsed: unknown = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Text, even when it was saved as a list of sentences. */
function asText(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.filter((s) => typeof s === "string").join(" ");
  return "";
}

const STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Current", tone: "is-good" },
  expiring_soon: { label: "Expiring soon", tone: "is-soon" },
  expired: { label: "Expired", tone: "is-gone" },
};

function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

const VALUE_LEVEL: Record<string, number> = { high: 3, medium: 2, low: 1 };

function ValueDots({ value }: { value: string }) {
  const level = VALUE_LEVEL[value.toLowerCase()] ?? 1;
  return (
    <span className="cc-cert-dots" aria-label={`${value} value`}>
      {[1, 2, 3].map((n) => (
        <i key={n} className={n <= level ? "is-on" : ""} />
      ))}
      <span className="ml-1.5 text-[13px] capitalize text-[color:var(--cc-ink-soft)]">{value}</span>
    </span>
  );
}

function Section({ label, title, aside, children }: { label: string; title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="cc-surface p-6 md:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="cc-cert-label">{label}</p>
          <h3 className="cc-cert-h mt-2 text-[22px] leading-tight md:text-[26px]">{title}</h3>
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A thread or page the coach found about the top pick. It's related reading,
    not proof the pick is right, so it isn't labelled as backing. */
function ProofLink({ proof }: { proof: Proof | null }) {
  if (!proof) return null;
  return (
    <a href={proof.url} target="_blank" rel="noreferrer" className="cc-cert-proof">
      <span className="cc-cert-label cc-cert-label--muted !text-[10px] !tracking-[0.16em]">Related reading</span>
      <span>{proof.label}</span>
      {proof.stat && <span className="shrink-0 text-[color:var(--cc-ash)]">{proof.stat}</span>}
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
    </a>
  );
}

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
  const [verdictOpen, setVerdictOpen] = useState(false);

  const [plan, setPlan] = useState<CertificationPlan | null>(null);
  const [planProof, setPlanProof] = useState<Proof | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [budget, setBudget] = useState("");
  const [hours, setHours] = useState("5");
  // The hours the current plan was ranked with; unknown for a saved plan.
  const [planHours, setPlanHours] = useState<number | null>(null);

  // The last review and plan the coach saved for this job (and level).
  const forgetSaved = useForgetSaved();
  const savedReview = useLatestSaved<{ facts: CertificationFacts; analysis: CertificationAnalysis }>(
    "certification_analysis",
    targetField,
  );
  const savedPlan = useLatestSaved<{ plan: CertificationPlan; topPickProof: Proof | null }>(
    "certification",
    targetField,
    level || null,
  );
  const [reviewSavedAt, setReviewSavedAt] = useState<string | null>(null);
  const [planSavedAt, setPlanSavedAt] = useState<string | null>(null);
  const [planOutOfDate, setPlanOutOfDate] = useState(false);
  useEffect(() => {
    const saved = savedReview.data;
    if (!saved?.payload.analysis) return;
    setAnalysis((current) => current ?? saved.payload.analysis);
    setFacts((current) => current ?? saved.payload.facts);
    setReviewSavedAt((current) => current ?? saved.savedAt);
  }, [savedReview.data]);
  useEffect(() => {
    const saved = savedPlan.data;
    if (!saved?.payload.plan) return;
    setPlan((current) => current ?? saved.payload.plan);
    setPlanProof((current) => current ?? saved.payload.topPickProof ?? null);
    setPlanSavedAt((current) => current ?? saved.savedAt);
  }, [savedPlan.data]);

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
      setReviewSavedAt(null);
      setVerdictOpen(false);
      void forgetSaved("certification_analysis");
    } catch (e) {
      notAvailable(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const recommend = async () => {
    setRecommending(true);
    try {
      const hoursPerWeek = Number(hours) || 5;
      const r = await careerCoach.recommendCertifications({
        targetField: targetField || undefined,
        seniority: level || undefined,
        budgetAud: budget ? Number(budget) : undefined,
        hoursPerWeek,
        count: 3,
      });
      setPlan(r.plan);
      setPlanHours(hoursPerWeek);
      setPlanProof(r.topPickProof);
      setPlanSavedAt(null);
      setPlanOutOfDate(false);
      void forgetSaved("certification");
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
      if (plan) setPlanOutOfDate(true);
      void analyze();
    } catch (e) {
      notAvailable(e);
    } finally {
      setLogging(false);
    }
  };

  /* What the review adds up to. */
  const held = facts?.held ?? [];
  const covered = analysis?.coverage?.covered ?? [];
  const missing = analysis?.coverage?.missing ?? [];
  const requirementCount = covered.length + missing.length;
  /* Proven beside not-yet; with nothing proven, the list just splits in two. */
  const half = Math.ceil(missing.length / 2);
  const coverageColumns = (
    covered.length ? [covered.map((t) => [t, true] as const), missing.map((t) => [t, false] as const)]
      : [missing.slice(0, half).map((t) => [t, false] as const), missing.slice(half).map((t) => [t, false] as const)]
  ).map((col) => col.map(([text, on]) => ({ text, on })));
  const [verdictLead, verdictRest] = analysis?.portfolioVerdict ? leadSentence(analysis.portfolioVerdict) : ["", ""];

  /* The plan in order, with the weeks each one takes if done one after another.
     Repaired first: a plan saved before the coach cleaned its answers can hold
     a list as a string, or a list where text belongs. */
  type Rec = NonNullable<CertificationPlan["recommendations"]>[number];
  const recs = asList<Rec>(plan?.recommendations)
    .filter((r): r is Rec => Boolean(r) && typeof r === "object" && asText(r.name).trim().length > 0)
    .map((r) => ({
      ...r,
      name: asText(r.name),
      issuer: asText(r.issuer),
      whyThisOne: asText(r.whyThisOne),
      prepPlan: asText(r.prepPlan),
      roi: asText(r.roi),
    }))
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const skipForNow = asList<{ name: string; why: string }>(plan?.skipForNow).filter(
    (s) => Boolean(s) && typeof s === "object" && asText(s.name).trim().length > 0,
  );
  const sequencingNote = asText(plan?.sequencingNote);
  let week = 1;
  const ranges = recs.map((r) => {
    const w = Math.round(Number(r.estimatedWeeks));
    if (!Number.isFinite(w) || w <= 0) return null;
    const range = { from: week, to: week + w - 1 };
    week += w;
    return range;
  });
  const totalWeeks = ranges.length > 0 && ranges.every(Boolean) ? week - 1 : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="cc-cert space-y-6">
      <CoachNotConnected />

      {/* ── Heading and the two things you can do ── */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="cc-cert-label">Certifications</p>
          <h2 className="cc-cert-h mt-2 text-3xl leading-[1.05] md:text-[40px]">
            {targetField ? <>Credentials for {targetField}</> : "Certifications and licences"}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">
            {targetField
              ? "What you hold, what this job looks for that you can't prove yet, and what to earn next. Change the job at the top of the page."
              : "Tell us the job you're going for at the top of the page, and this is aimed at it."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setShowLog((s) => !s)} className="cc-action cc-action--ghost">
            <Plus className="h-4 w-4" aria-hidden /> Log a certification
          </button>
          <button type="button" onClick={analyze} disabled={analyzing} className="cc-action">
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reviewing…
              </>
            ) : analysis ? (
              "Review again"
            ) : (
              "Review my certifications"
            )}
          </button>
        </div>
      </div>

      {/* ── Log form ── */}
      <AnimatePresence>
        {showLog && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <section className="cc-surface p-6 md:p-7">
              <p className="cc-cert-label">New</p>
              <h3 className="cc-cert-h mt-2 flex items-center gap-3 text-[22px]">
                {issuerSite(logIssuer, logName) ? (
                  <BrandLogo issuer={logIssuer} name={logName} ask={false} />
                ) : (
                  <BadgeCheck className="h-5 w-5 text-[color:var(--cc-rust)]" aria-hidden />
                )}
                Log a certification
              </h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Name</span>
                  <Input value={logName} onChange={(e) => setLogName(e.target.value)} placeholder="e.g. AWS Certified Solutions Architect – Associate" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Issuer</span>
                  <Input value={logIssuer} onChange={(e) => setLogIssuer(e.target.value)} placeholder="e.g. Amazon Web Services" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Issued</span>
                  <Input type="date" value={logIssue} onChange={(e) => setLogIssue(e.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Expires <span className="font-normal text-[color:var(--cc-ash)]">(if it does)</span>
                  </span>
                  <Input type="date" value={logExpiry} onChange={(e) => setLogExpiry(e.target.value)} />
                </label>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={logCert} disabled={logging} className="cc-action">
                  {logging ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BadgeCheck className="h-4 w-4" aria-hidden />}
                  Save it
                </button>
                <button type="button" onClick={() => setShowLog(false)} className="cc-action cc-action--ghost">
                  Cancel
                </button>
              </div>
              <p className="mt-4 text-[13.5px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                If Faircopy recognises it, the skills it covers count towards your profile, and the next review and plan take it into
                account.
              </p>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── The review ── */}
      <AnimatePresence>
        {(facts || analysis) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <SavedNote at={reviewSavedAt} refreshLabel="Review again" />

            {facts && (facts.expiringSoon.length > 0 || facts.expired.length > 0) && (
              <div className="cc-cert-note cc-cert-note--warn">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--cc-wheat-deep)]" aria-hidden />
                <div>
                  <p className="font-semibold text-[color:var(--cc-ink)]">Renewal needed</p>
                  <p className="mt-1">
                    {facts.expired.length > 0 && <>Expired: {facts.expired.join(", ")}. </>}
                    {facts.expiringSoon.length > 0 && <>Expiring soon: {facts.expiringSoon.join(", ")}.</>}
                  </p>
                </div>
              </div>
            )}

            {/* Verdict: the tally, then the point in a sentence. */}
            {analysis?.portfolioVerdict && (
              <section className="cc-cert-verdict">
                <div className="cc-cert-tally">
                  <div>
                    <div className="cc-cert-tally__n">{held.length}</div>
                    <p className="cc-cert-tally__label">
                      {held.length === 1 ? "certification" : "certifications"} on record
                    </p>
                  </div>
                  {requirementCount > 0 && (
                    <div>
                      <div className="cc-cert-tally__n">
                        {covered.length}
                        <small> / {requirementCount}</small>
                      </div>
                      <p className="cc-cert-tally__label">of what the job looks for, proven</p>
                    </div>
                  )}
                </div>
                <div className="cc-cert-verdict__body">
                  <p className="cc-cert-label">The verdict</p>
                  <p className="cc-cert-lead">
                    <Inline text={verdictLead} />
                  </p>
                  {verdictRest && (
                    <>
                      <p className={`cc-cert-rest ${verdictOpen ? "" : "cc-cert-rest--clamped"}`}>
                        <Inline text={verdictRest} />
                      </p>
                      <button type="button" onClick={() => setVerdictOpen((o) => !o)} className="cc-cert-more" aria-expanded={verdictOpen}>
                        {verdictOpen ? "Show less" : "Read the whole verdict"}
                      </button>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* On record: what they hold, each with who awards it. */}
            {held.length > 0 && (
              <Section label="On record" title={held.length === 1 ? "Your certification" : `Your ${held.length} certifications`}>
                <ul className="cc-cert-held">
                  {held.map((c, i) => {
                    const status = STATUS[c.status] ?? { label: c.status, tone: "" };
                    const expires = shortDate(c.expiryDate);
                    return (
                      <li key={`${c.name}-${i}`} className="cc-cert-held__item">
                        <BrandLogo issuer={c.issuer ?? ""} name={c.name} />
                        <div className="min-w-0 flex-1">
                          {c.issuer && <p className="cc-cert-issuer">{c.issuer}</p>}
                          <p className="font-semibold leading-snug text-[color:var(--cc-ink)]">{c.name}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`cc-cert-status ${status.tone}`}>{status.label}</span>
                            {expires && (
                              <span className="text-[13px] text-[color:var(--cc-ink-soft)]">
                                {c.status === "expired" ? "Expired" : "Expires"} {expires}
                              </span>
                            )}
                            {!c.recognized && (
                              <span className="text-[13px] text-[color:var(--cc-ash)]">Not in our catalog yet</span>
                            )}
                          </div>
                          {(c.skillsVouchedFor?.length ?? 0) > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {c.skillsVouchedFor.map((s) => (
                                <span key={s} className="cc-cert-chip">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            {/* Coverage: a checklist against the job. */}
            {requirementCount > 0 && (
              <Section
                label="Against the job"
                title={
                  <>
                    {covered.length} of {requirementCount} proven
                  </>
                }
              >
                <div className="cc-cert-meter" role="img" aria-label={`${covered.length} of ${requirementCount} proven`}>
                  {Array.from({ length: requirementCount }, (_, i) => (
                    <i key={i} className={i < covered.length ? "is-on" : ""} />
                  ))}
                </div>
                <div className="mt-5 grid gap-x-10 md:grid-cols-2">
                  {coverageColumns.map((col, ci) => (
                    <div key={ci}>
                      {covered.length > 0 && (
                        <p className="cc-cert-label cc-cert-label--muted mb-1 !text-[10px]">{ci === 0 ? "Proven" : "Not yet"}</p>
                      )}
                      <ul>
                        {col.map(({ text, on }, i) => (
                          <li key={`${ci}-${i}`} className="cc-cert-check">
                            <span className={`cc-cert-box ${on ? "is-on" : ""}`} aria-hidden>
                              {on && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <BrandMark text={text} />
                            <span className={on ? "cc-cert-hl" : undefined}>
                              <Inline text={text} />
                            </span>
                            <span className="sr-only">{on ? "(proven)" : "(not yet proven)"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Gaps: each one leads with its point. */}
            {analysis?.gapsVsTarget && analysis.gapsVsTarget.length > 0 && (
              <Section label="What's missing" title="Gaps between you and the job">
                <ol>
                  {analysis.gapsVsTarget.map((g, i) => {
                    const { lead, rest } = splitLead(g);
                    return (
                      <li key={i} className="cc-cert-gap">
                        <span className="cc-cert-gap__n">{String(i + 1).padStart(2, "0")}</span>
                        {lead ? (
                          <>
                            <span className="cc-cert-gap__title">
                              <BrandMark text={lead} />
                              <Inline text={lead} />
                            </span>
                            {rest && (
                              <span className="cc-cert-gap__body">
                                <Inline text={rest} />
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="cc-cert-gap__body !col-start-2 !row-start-1">
                            <Inline text={rest} />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </Section>
            )}

            {/* Only when they hold something: what each is worth, and how to talk about it. */}
            {((analysis?.marketValue?.length ?? 0) > 0 || (analysis?.interviewTalkingPoints?.length ?? 0) > 0) && (
              <div className="grid gap-6 md:grid-cols-2">
                {analysis?.marketValue && analysis.marketValue.length > 0 && (
                  <Section label="What they're worth" title="Market value">
                    <ul>
                      {analysis.marketValue.map((m, i) => (
                        <li key={i} className={`py-3 ${i ? "border-t border-[color:var(--cc-hair)]" : ""}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="flex items-center gap-2 font-semibold text-[color:var(--cc-ink)]">
                              <BrandMark text={m.certification} />
                              {m.certification}
                            </p>
                            <ValueDots value={m.value} />
                          </div>
                          <p className="mt-1 text-[14.5px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                            <Inline text={m.why} />
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                {analysis?.interviewTalkingPoints && analysis.interviewTalkingPoints.length > 0 && (
                  <Section label="In the interview" title="How to bring them up">
                    <ul className="space-y-3">
                      {analysis.interviewTalkingPoints.map((t, i) => (
                        <li key={i} className="rounded-[0.9rem] border-l-2 border-[color:var(--cc-rust)] bg-[color:var(--cc-cream)] px-4 py-3">
                          <p className="cc-cert-label flex items-center gap-2 !text-[10px]">
                            <BrandMark text={t.certification} />
                            {t.certification}
                          </p>
                          <p className="mt-1.5 text-[15px] leading-relaxed text-[color:var(--cc-ink)]">
                            “<Inline text={t.talkingPoint} />”
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── What to earn next ── */}
      <Section
        label="What to earn next"
        title={
          totalWeeks && plan ? (
            <>
              {recs.length} steps, about {totalWeeks} weeks
            </>
          ) : (
            "Your next certifications"
          )
        }
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[color:var(--cc-ink-soft)]">
              Budget
              <span className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[color:var(--cc-ash)]">A$</span>
                <Input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="any"
                  className="h-10 w-28 pl-11"
                  type="number"
                  min={0}
                />
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm text-[color:var(--cc-ink-soft)]">
              Study
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger className="h-10 w-[132px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["3", "5", "8", "10", "15"].map((h) => (
                    <SelectItem key={h} value={h}>
                      {h} h a week
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <button type="button" onClick={recommend} disabled={recommending} className="cc-action">
              {recommending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Ranking… about half a minute
                </>
              ) : (
                <>
                  {plan ? "Recommend again" : "Recommend"} <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </div>
        }
      >
        {plan && recs.length === 0 ? (
          <p className="cc-cert-note cc-cert-note--warn">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cc-wheat-deep)]" aria-hidden />
            <span>This plan came back incomplete. Press Recommend again for a fresh one.</span>
          </p>
        ) : plan ? (
          <div className="space-y-5">
            {planOutOfDate ? (
              <p className="flex items-center gap-1.5 text-[13.5px] text-[color:var(--cc-wheat-deep)]">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                You've logged a certification since this plan was made. Press Recommend again to rank with it.
              </p>
            ) : (
              <SavedNote at={planSavedAt} refreshLabel="Recommend again" />
            )}
            {totalWeeks !== null && (
              <p className="text-[14.5px] text-[color:var(--cc-ink-soft)]">
                In this order, one after another{planHours !== null ? `, at ${planHours} hours a week` : ""}.
              </p>
            )}

            <ol className="cc-cert-path">
              {recs.map((r, i) => {
                const range = ranges[i];
                // Australian dollars; a plan saved before that still says US$.
                const aud = Number(r.examCostAud);
                const usd = Number(r.examCostUsd);
                const cost =
                  Number.isFinite(aud) && aud > 0
                    ? `A$${Math.round(aud)}`
                    : Number.isFinite(usd) && usd > 0
                      ? `US$${Math.round(usd)}`
                      : null;
                // Catalog prices are converted from US list prices, so they're "about" too.
                const converted = cost?.startsWith("A$") && !r.costIsEstimate;
                return (
                  <li key={`${r.certificationId || r.name}-${i}`} className={`cc-cert-step cc-cert-tone-${(i % 3) + 1}`}>
                    <span className="cc-cert-step__n" aria-hidden>
                      {i + 1}
                    </span>
                    <div className="cc-surface cc-cert-step__card">
                      <div className="flex items-start gap-4">
                        <BrandLogo issuer={r.issuer} name={r.name} given={r.issuerDomain} />
                        <div className="min-w-0">
                          {r.issuer && <p className="cc-cert-issuer">{r.issuer}</p>}
                          <h4 className="cc-cert-h text-[19px] leading-snug md:text-[21px]">{r.name}</h4>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {range && (
                          <span className="cc-cert-chip cc-cert-chip--weeks">
                            Weeks {range.from}–{range.to}
                          </span>
                        )}
                        {!range && Number(r.estimatedWeeks) > 0 && (
                          <span className="cc-cert-chip cc-cert-chip--weeks">About {Math.round(Number(r.estimatedWeeks))} weeks</span>
                        )}
                        {cost && (
                          <span className={`cc-cert-chip ${r.costIsEstimate ? "cc-cert-chip--estimate" : "cc-cert-chip--cost"}`}>
                            {r.costIsEstimate ? `Exam about ${cost} · estimate` : converted ? `Exam about ${cost}` : `Exam ${cost}`}
                          </span>
                        )}
                      </div>
                      {r.whyThisOne && (
                        <p className="mt-4 text-[15.5px] leading-relaxed text-[color:var(--cc-ink)]">
                          <Inline text={r.whyThisOne} />
                        </p>
                      )}
                      {(r.prepPlan || r.roi) && (
                        <div className="cc-cert-split">
                          {r.prepPlan && (
                            <div>
                              <p className="cc-cert-label !text-[10px]">How to prepare</p>
                              <p>
                                <Inline text={r.prepPlan} />
                              </p>
                            </div>
                          )}
                          {r.roi && (
                            <div>
                              <p className="cc-cert-label !text-[10px]">What it opens</p>
                              <p>
                                <Inline text={r.roi} />
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {i === 0 && planProof && (
                        <div className="mt-4">
                          <ProofLink proof={planProof} />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {sequencingNote && (
              <p className="cc-cert-note">
                <span className="cc-cert-label shrink-0 !text-[10px] leading-[1.9]">Order</span>
                <span>
                  <Inline text={sequencingNote} />
                </span>
              </p>
            )}

            {skipForNow.length > 0 && (
              <div>
                <p className="cc-cert-label cc-cert-label--muted">Skip for now</p>
                <ul className="mt-2">
                  {skipForNow.map((s, i) => (
                    <li key={i} className={`py-2.5 text-[14.5px] leading-relaxed text-[color:var(--cc-ink-soft)] ${i ? "border-t border-dashed border-[color:var(--cc-hair)]" : ""}`}>
                      <span className="font-semibold text-[color:var(--cc-ink)]">{asText(s.name)}</span> — <Inline text={asText(s.why)} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="max-w-2xl text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">
            Set a budget and how many hours a week you can study, then press Recommend. You get three certifications in the order to
            do them, with what each costs, how to prepare and what it opens.
          </p>
        )}
      </Section>
    </motion.div>
  );
}

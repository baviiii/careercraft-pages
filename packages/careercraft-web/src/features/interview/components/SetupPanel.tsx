/**
 * Practice setup — pick the kind of round, set it up, start.
 *
 * The round type is the first choice and the real one: it decides which
 * questions the coach builds, how answers are scored, and the colour the
 * session wears in progress and history. It's held by the hub (so the
 * progress panel can set it too) and passed in here.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Loader2, Map, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  interviewCoach,
  COACH_AVAILABLE,
  CoachUnavailableError,
  NSW_LEVELS,
  type Framework,
  type InterviewPlan,
  type PlanRound,
} from "@/lib/interviewCoach";
import { SAMarketIntelligence } from "@/components/interview/SAMarketIntelligence";
import { stageSession } from "../hooks/useInterviewSession";
import { progressByType, type TypeProgress } from "../lib/progress";
import {
  ROUND_TYPES,
  roundClass,
  roundMeta,
  roundMinutes,
  roundTypeFromName,
  type RoundType,
  type RoundTypeMeta,
} from "../lib/roundTypes";
import { FRAMEWORK_LABEL } from "../lib/competencies";
import { jobLabel, useTrackerJobs } from "../lib/practiceData";
import { useInterviewSessions } from "../lib/sessions";
import type { InterviewMode, SessionConfig, SetupChoice } from "../types";
import { PlanCard } from "./PlanCard";
import { CoachOfflineBanner } from "./CoachOfflineBanner";
import "../interview.css";

const MODES: Array<{ id: InterviewMode; title: string; sub: string }> = [
  {
    id: "realistic",
    title: "Realistic",
    sub: "Feedback sealed until the debrief — closest to the real room.",
  },
  {
    id: "coached",
    title: "Coached",
    sub: "Feedback after every answer. Learn patterns before going realistic.",
  },
];

function Field({
  id,
  label,
  hint,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="cc-field-wrap">
      <label htmlFor={id} className="cc-field-label">
        {label}
      </label>
      {children}
      {hint && <p className="cc-field-hint">{hint}</p>}
    </div>
  );
}

/** One line on how this learner has done at this type so far. */
function historyLine(p: TypeProgress | undefined): string {
  if (!p || p.count === 0) return "Not tried yet";
  if (p.latest === null) return `${p.count} started, none finished`;
  return `Last ${p.latest}/100 · ${p.finished} done`;
}

function RoundCard({
  meta,
  checked,
  progress,
  tabbable,
  onPick,
  onKeyDown,
  cardRef,
}: {
  meta: RoundTypeMeta;
  checked: boolean;
  progress: TypeProgress | undefined;
  tabbable: boolean;
  onPick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  cardRef: (el: HTMLButtonElement | null) => void;
}) {
  const Icon = meta.icon;
  const count = meta.lengths[1];
  return (
    <button
      ref={cardRef}
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={tabbable ? 0 : -1}
      onClick={onPick}
      onKeyDown={onKeyDown}
      className={`cc-iv-card ${roundClass(meta.id)}`}
    >
      {checked && (
        <span className="cc-iv-check" aria-hidden>
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      <span className="cc-iv-card-icon" aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <span className="mt-3 cc-font-display text-lg leading-tight text-[color:var(--cc-ink)]">{meta.label}</span>
      <span className="mt-0.5 text-sm font-medium text-[color:var(--cc-ink-soft)]">{meta.lede}</span>
      <span className="mt-2 text-xs leading-relaxed text-[color:var(--cc-ink-soft)]">{meta.covers}</span>
      <span className="mt-auto flex flex-col gap-0.5 pt-4">
        <span className="cc-label-sm text-[color:var(--cc-ash)]">
          {count} questions · about {roundMinutes(meta.id, count)} min
        </span>
        <span className="text-xs text-[color:var(--cc-ink-soft)]">{historyLine(progress)}</span>
      </span>
    </button>
  );
}

/**
 * `role` / `level` come from the page's "Going for" card — the learner's saved
 * role, or one they picked just this once — so this panel never asks again.
 */
export function SetupPanel({
  role,
  level,
  choice,
  onChange,
}: {
  role?: string;
  level?: string;
  choice: SetupChoice;
  onChange: (patch: Partial<SetupChoice>) => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const roundType = choice.roundType;
  const onRoundTypeChange = (type: RoundType) => onChange({ roundType: type });
  const meta = roundMeta(roundType);

  // Practising for a tracker job: its ad seeds the questions, and with no
  // role set on the page, its title stands in for one.
  const { data: jobs } = useTrackerJobs();
  const job = (jobs ?? []).find((j) => j.id === choice.jobId) ?? null;
  const field = role || job?.title || "";
  const seniority = level ?? "";
  // Public-sector mode shapes story questions, so it applies where stories are asked.
  const storyRound = roundType === "behavioral" || roundType === "full";
  const framework = storyRound ? choice.framework : null;

  const [jobDescription, setJobDescription] = useState("");
  // The ad last filled in from a job. Switching job (or to none) swaps it for
  // the new job's ad, but never replaces text they typed or pasted themselves.
  const seeded = useRef<{ jobId: string | null; text: string }>({ jobId: null, text: "" });
  useEffect(() => {
    const jobId = job?.id ?? null;
    if (seeded.current.jobId === jobId) return;
    const previous = seeded.current.text;
    const text = job?.description?.trim() ?? "";
    seeded.current = { jobId, text };
    setJobDescription((current) => (!current.trim() || current === previous ? text : current));
  }, [job]);
  const [mode, setMode] = useState<InterviewMode>(meta.defaultMode);
  const [questionCount, setQuestionCount] = useState(meta.lengths[1]);
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [buildingPlan, setBuildingPlan] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Each round has its own sensible length and mode; picking one (here, or
  // from the progress panel below) starts from those.
  useEffect(() => {
    const next = roundMeta(roundType);
    setMode(next.defaultMode);
    setQuestionCount(next.lengths[1]);
  }, [roundType]);

  const { data: sessions } = useInterviewSessions();
  const progress = useMemo(() => progressByType(sessions ?? []), [sessions]);

  const config: SessionConfig = useMemo(
    () => ({
      field,
      seniority: seniority || undefined,
      jobDescription: jobDescription.trim() || undefined,
      mode,
      questionCount,
      roundType,
      roundName: meta.label,
      framework: framework ?? undefined,
      frameworkLevel: framework === "nsw" ? choice.frameworkLevel : undefined,
      jobId: job?.id,
      jobLabel: job ? jobLabel(job) : undefined,
    }),
    [field, seniority, jobDescription, mode, questionCount, roundType, meta.label, framework, choice.frameworkLevel, job],
  );

  const requireField = (): boolean => {
    if (!field) {
      toast({
        title: "Tell us the job you're going for",
        description: "Use the card at the top of the page. Any job works.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const buildPlan = async () => {
    if (!requireField()) return;
    setBuildingPlan(true);
    try {
      const built = await interviewCoach.buildPlan({
        field,
        seniority: seniority || undefined,
        jobDescription: jobDescription.trim() || undefined,
      });
      setPlan(built);
    } catch (e) {
      const message =
        e instanceof CoachUnavailableError
          ? "Coach is temporarily offline. Try again shortly."
          : "Interview coach is not available at the moment.";
      toast({ title: "Not available", description: message, variant: "destructive" });
    } finally {
      setBuildingPlan(false);
    }
  };

  const enterRoom = (extra?: Partial<SessionConfig>) => {
    if (!requireField()) return;
    if (!COACH_AVAILABLE) {
      toast({
        title: "Coach is offline",
        description: "Live sessions aren’t available right now.",
        variant: "destructive",
      });
      return;
    }
    stageSession({ ...config, ...extra });
    navigate("/interview-prep/room");
  };

  // One coached question of the picked type: the opener of that round.
  const quickDrill = () =>
    enterRoom({ questionCount: 1, mode: "coached", roundName: `${meta.label} · quick drill` });

  const practiceRound = (round: PlanRound) => {
    const type = roundTypeFromName(round.name);
    onRoundTypeChange(type);
    // Public-sector mode only shapes story questions; a technical or screen
    // round from the plan mustn't be saved as an APS/NSW session.
    const stories = type === "behavioral" || type === "full";
    enterRoom({
      roundType: type,
      focusAreas: round.focusAreas,
      roundName: round.name,
      mode: roundMeta(type).defaultMode,
      questionCount: roundMeta(type).lengths[1],
      framework: stories ? choice.framework ?? undefined : undefined,
      frameworkLevel: stories && choice.framework === "nsw" ? choice.frameworkLevel : undefined,
    });
  };

  // Roving focus: one tab stop for the group, arrows move the pick.
  const onCardKey = (index: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + ROUND_TYPES.length) % ROUND_TYPES.length;
    onRoundTypeChange(ROUND_TYPES[next]!.id);
    cardRefs.current[next]?.focus();
  };

  return (
    <div className="space-y-5">
      {!COACH_AVAILABLE && <CoachOfflineBanner />}

      {/* 1 · What kind of round */}
      <div>
        <p id="iv-round-label" className="cc-field-label mb-3">
          What are you practising for?
        </p>
        <div
          role="radiogroup"
          aria-labelledby="iv-round-label"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {ROUND_TYPES.map((t, i) => (
            <RoundCard
              key={t.id}
              meta={t}
              checked={t.id === roundType}
              tabbable={t.id === roundType}
              progress={progress.find((p) => p.type === t.id)}
              onPick={() => onRoundTypeChange(t.id)}
              onKeyDown={onCardKey(i)}
              cardRef={(el) => {
                cardRefs.current[i] = el;
              }}
            />
          ))}
        </div>
      </div>

      {/* 2 · Set it up, 3 · start */}
      <section className={`cc-surface overflow-hidden ${roundClass(roundType)}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--cc-hair)] bg-[color:var(--cc-iv-wash)] px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold text-[color:var(--cc-ink)]">
              <span aria-hidden className="cc-iv-dot" />
              {meta.label}
            </p>
            <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">
              {field
                ? `Questions are tuned to ${field}. Change the job at the top of the page.`
                : "Tell us the job you're going for at the top of the page, then start."}
            </p>
          </div>
        </div>

        <div className="space-y-6 p-5 md:p-6">
          {(jobs?.length ?? 0) > 0 && (
            <Field
              id="iv-job"
              label="Practising for"
              hint={
                job
                  ? `Questions aim at ${jobLabel(job)}, and this session shows on that job in your tracker.`
                  : "Pick a job from your tracker to aim the questions at its ad."
              }
            >
              <select
                id="iv-job"
                value={choice.jobId ?? ""}
                onChange={(e) => onChange({ jobId: e.target.value || null })}
                className="cc-field"
              >
                <option value="">Not for a specific job</option>
                {(["interview", "applied", "saved"] as const).map((status) => {
                  const group = (jobs ?? []).filter((j) => j.status === status);
                  if (!group.length) return null;
                  return (
                    <optgroup key={status} label={{ interview: "Interviewing", applied: "Applied", saved: "Saved" }[status]}>
                      {group.map((j) => (
                        <option key={j.id} value={j.id}>
                          {jobLabel(j)}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </Field>
          )}

          {storyRound && (
            <div>
              <p className="cc-field-label mb-2">Public-sector role?</p>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  role="group"
                  aria-label="Capability framework"
                  className="inline-flex overflow-hidden rounded-[0.85rem] border border-[color:var(--cc-hair-strong)]"
                >
                  {([null, "aps", "nsw"] as Array<Framework | null>).map((f) => (
                    <button
                      key={f ?? "none"}
                      type="button"
                      aria-pressed={choice.framework === f}
                      onClick={() => onChange({ framework: f })}
                      className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                        choice.framework === f
                          ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                          : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
                      }`}
                    >
                      {f === null ? "No" : f === "aps" ? "APS" : "NSW"}
                    </button>
                  ))}
                </div>
                {choice.framework === "nsw" && (
                  <label className="inline-flex items-center gap-2 text-sm text-[color:var(--cc-ink-soft)]">
                    Level
                    <select
                      value={choice.frameworkLevel}
                      onChange={(e) => onChange({ frameworkLevel: e.target.value })}
                      className="cc-field !w-auto !py-2"
                    >
                      {NSW_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <p className="cc-field-hint">
                {choice.framework
                  ? `Story questions target the ${FRAMEWORK_LABEL[choice.framework]}, named the way the role description names them, and your stories are filed under its capabilities.`
                  : "For government roles: story questions then target the APS or NSW capabilities the panel marks against."}
              </p>
            </div>
          )}

          <Field
            id="iv-jd"
            label="Job ad"
            hint={
              roundType === "screen"
                ? "Optional, and worth it here: a recruiter's questions come straight from the ad."
                : "Optional — paste the ad to aim questions at this exact role."
            }
          >
            <textarea
              id="iv-jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job ad…"
              className="cc-field cc-field-textarea"
              rows={4}
            />
          </Field>

          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="cc-field-label mb-2">Mode</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODES.map((m) => {
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMode(m.id)}
                      className={`rounded-[0.85rem] border p-4 text-left transition-colors ${
                        active
                          ? "border-[color:var(--cc-ink)] bg-[color:var(--cc-cream-2)]"
                          : "border-[color:var(--cc-hair-strong)] hover:border-[color:var(--cc-ink)]"
                      }`}
                    >
                      <p className="cc-font-display text-lg text-[color:var(--cc-ink)]">{m.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[color:var(--cc-ink-soft)]">{m.sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="cc-field-label mb-2">Length</p>
              <div
                role="group"
                aria-label="Number of questions"
                className="inline-flex overflow-hidden rounded-[0.85rem] border border-[color:var(--cc-hair-strong)]"
              >
                {meta.lengths.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={questionCount === n}
                    onClick={() => setQuestionCount(n)}
                    className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                      questionCount === n
                        ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                        : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="cc-field-hint">
                {questionCount} questions · about {roundMinutes(roundType, questionCount)} min
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[color:var(--cc-hair)] pt-5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => enterRoom()}
              disabled={!COACH_AVAILABLE}
              className="cc-action sm:order-3 sm:ml-auto"
            >
              Start the {meta.noun}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={quickDrill}
              disabled={!COACH_AVAILABLE}
              className="cc-action cc-action--ghost sm:order-2"
              title={`One coached question: the opening question of a ${meta.noun}`}
            >
              <Zap className="h-4 w-4" />
              Quick drill · 1 question
            </button>
            <button
              type="button"
              onClick={buildPlan}
              disabled={buildingPlan || !COACH_AVAILABLE}
              className="cc-action cc-action--ghost sm:order-1"
            >
              {buildingPlan ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building your plan
                </>
              ) : (
                <>
                  <Map className="h-4 w-4" />
                  Build an interview plan
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {plan && <PlanCard plan={plan} onPracticeRound={practiceRound} />}

      {field && (
        <div className="cc-surface overflow-hidden">
          <button
            type="button"
            onClick={() => setMarketOpen((v) => !v)}
            aria-expanded={marketOpen}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div>
              <p className="cc-kicker">Market context</p>
              <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">
                Optional SA market intel for {field}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-[color:var(--cc-ash)] transition-transform ${
                marketOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {marketOpen && (
            <div className="border-t border-[color:var(--cc-hair)] px-5 py-4">
              <SAMarketIntelligence field={field} seniority={seniority} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

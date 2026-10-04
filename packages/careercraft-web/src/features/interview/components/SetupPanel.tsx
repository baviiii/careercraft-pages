/**
 * Practice setup — situation-first, dual start (drill / full mock).
 */
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  ChevronDown,
  Loader2,
  Map,
  MessageSquare,
  Phone,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  interviewCoach,
  COACH_AVAILABLE,
  CoachUnavailableError,
  type InterviewPlan,
  type PlanRound,
} from "@/lib/interviewCoach";
import { SAMarketIntelligence } from "@/components/interview/SAMarketIntelligence";
import { stageSession } from "../hooks/useInterviewSession";
import type { InterviewMode } from "../types";
import { PlanCard } from "./PlanCard";
import { CoachOfflineBanner } from "./CoachOfflineBanner";

type SituationId = "behavioral" | "technical" | "role" | "screen";

const SITUATIONS: Array<{
  id: SituationId;
  title: string;
  sub: string;
  icon: typeof MessageSquare;
  tone: "cobalt" | "sage" | "wheat" | "ink";
  focusAreas: string[];
  defaultCount: number;
  defaultMode: InterviewMode;
}> = [
  {
    id: "behavioral",
    title: "Behavioral",
    sub: "STAR stories, conflict, impact",
    icon: MessageSquare,
    tone: "cobalt",
    focusAreas: ["behavioral", "communication"],
    defaultCount: 6,
    defaultMode: "coached",
  },
  {
    id: "technical",
    title: "Technical",
    sub: "Depth, trade-offs, problem-solving",
    icon: Wrench,
    tone: "sage",
    focusAreas: ["technical"],
    defaultCount: 6,
    defaultMode: "realistic",
  },
  {
    id: "role",
    title: "Role-specific",
    sub: "Tuned to your field and level",
    icon: Briefcase,
    tone: "wheat",
    focusAreas: [],
    defaultCount: 6,
    defaultMode: "realistic",
  },
  {
    id: "screen",
    title: "Phone screen",
    sub: "Short, crisp first-round answers",
    icon: Phone,
    tone: "ink",
    focusAreas: ["behavioral", "communication"],
    defaultCount: 4,
    defaultMode: "coached",
  },
];

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

const LENGTHS = [4, 6, 8];

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

/**
 * `role` / `level` come from the page's "Going for" card — the learner's saved
 * role, or one they picked just this once — so this panel never asks again.
 */
export function SetupPanel({ role, level }: { role?: string; level?: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const field = role ?? "";
  const seniority = level ?? "";

  const [situation, setSituation] = useState<SituationId | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [mode, setMode] = useState<InterviewMode>("realistic");
  const [questionCount, setQuestionCount] = useState(6);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [buildingPlan, setBuildingPlan] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);

  const pickSituation = (id: SituationId) => {
    const s = SITUATIONS.find((x) => x.id === id)!;
    setSituation(id);
    setFocusAreas(s.focusAreas);
    setQuestionCount(s.defaultCount);
    setMode(s.defaultMode);
  };

  const config = useMemo(
    () => ({
      field,
      seniority: seniority || undefined,
      jobDescription: jobDescription.trim() || undefined,
      mode,
      questionCount,
      focusAreas: focusAreas.length ? focusAreas : undefined,
      roundName: situation
        ? SITUATIONS.find((s) => s.id === situation)?.title
        : undefined,
    }),
    [field, seniority, jobDescription, mode, questionCount, focusAreas, situation],
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

  const enterRoom = (extra?: {
    focusAreas?: string[];
    roundName?: string;
    questionCount?: number;
    mode?: InterviewMode;
  }) => {
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

  const quickDrill = () => {
    enterRoom({
      questionCount: 1,
      mode: "coached",
      roundName: "Quick drill",
      focusAreas: focusAreas.length ? focusAreas : ["behavioral"],
    });
  };

  const fullMock = () => enterRoom();

  const practiceRound = (round: PlanRound) => {
    enterRoom({ focusAreas: round.focusAreas, roundName: round.name });
  };

  const recommendedTitle = field || "your target role";

  return (
    <div className="space-y-5">
      {!COACH_AVAILABLE && <CoachOfflineBanner />}

      {/* Dual start */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={quickDrill}
          disabled={!COACH_AVAILABLE}
          className="cc-tint cc-tone-cobalt cc-lift group p-5 text-left disabled:cursor-not-allowed disabled:opacity-55"
        >
          <div className="cc-kicker">Instant</div>
          <p className="mt-2 cc-font-display text-xl text-[color:var(--cc-ink)]">Quick drill</p>
          <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">
            One coached question — warm up in under five minutes.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--cc-rust)]">
            Start drill <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
        <button
          type="button"
          onClick={fullMock}
          disabled={!COACH_AVAILABLE}
          className="cc-tint cc-tone-sage cc-lift group p-5 text-left disabled:cursor-not-allowed disabled:opacity-55"
        >
          <div className="cc-kicker">Full loop</div>
          <p className="mt-2 cc-font-display text-xl text-[color:var(--cc-ink)]">Full mock</p>
          <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">
            {questionCount} questions for {recommendedTitle} — then a full debrief.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--cc-signal-deep)]">
            Start mock <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>

      {/* Situation cards */}
      <div>
        <p className="cc-field-label mb-3">What are you practicing for?</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SITUATIONS.map((s) => {
            const Icon = s.icon;
            const active = situation === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pickSituation(s.id)}
                className={`cc-surface cc-lift cc-tone-${s.tone} p-4 text-left transition-shadow ${
                  active ? "ring-2 ring-[color:var(--cc-rust)]" : ""
                }`}
              >
                <Icon className="h-4 w-4 text-[color:var(--cc-t,var(--cc-rust))]" />
                <p className="mt-3 font-semibold text-[color:var(--cc-ink)]">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[color:var(--cc-ink-soft)]">
                  {s.sub}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Targeting + mode */}
      <section className="cc-surface overflow-hidden">
        <div className="border-b border-[color:var(--cc-hair)] bg-[color:var(--cc-rust-soft)]/40 px-5 py-4 md:px-6">
          <div className="cc-kicker">Session setup</div>
          <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">
            {field
              ? `Questions are tuned to ${field}. Change the job at the top of the page.`
              : "Tell us the job you're going for at the top of the page, then start."}
          </p>
        </div>

        <div className="space-y-6 p-5 md:p-6">

          <Field
            id="iv-jd"
            label="Job description"
            hint="Optional — paste a JD to aim questions at this exact role."
          >
            <textarea
              id="iv-jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the JD to sharpen questions…"
              className="cc-field cc-field-textarea"
              rows={4}
            />
          </Field>

          <div>
            <p className="cc-field-label mb-2">Mode</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`rounded-[0.85rem] border p-4 text-left transition-colors ${
                      active
                        ? "border-[color:var(--cc-rust)] bg-[color:var(--cc-rust-soft)]"
                        : "border-[color:var(--cc-hair-strong)] hover:border-[color:var(--cc-ink)]"
                    }`}
                  >
                    <p
                      className={`cc-font-display text-lg ${
                        active ? "text-[color:var(--cc-rust-deep)]" : "text-[color:var(--cc-ink)]"
                      }`}
                    >
                      {m.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[color:var(--cc-ink-soft)]">
                      {m.sub}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="cc-field-label mb-2">Length</p>
            <div className="inline-flex overflow-hidden rounded-[0.85rem] border border-[color:var(--cc-hair-strong)]">
              {LENGTHS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                    questionCount === n
                      ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                      : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
                  }`}
                >
                  {n} questions
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[color:var(--cc-hair)] pt-5 sm:flex-row">
            <button
              type="button"
              onClick={buildPlan}
              disabled={buildingPlan || !COACH_AVAILABLE}
              className="cc-action cc-action--ghost flex-1"
            >
              {buildingPlan ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Designing your loop
                </>
              ) : (
                <>
                  <Map className="h-4 w-4" />
                  Build interview plan
                </>
              )}
            </button>
            <button
              type="button"
              onClick={fullMock}
              disabled={!COACH_AVAILABLE}
              className="cc-action flex-1"
            >
              <Sparkles className="h-4 w-4" />
              Start full mock
              <ArrowRight className="h-4 w-4" />
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

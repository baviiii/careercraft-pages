/**
 * New Session — shape the loop, pick a mode, sit the interview.
 * "Build my plan" surfaces the MCP's build_interview_plan (weighted rounds +
 * checklist); every round is practicable and seeds question generation via
 * its focusAreas. Quick start skips straight to the room.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Loader2, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersonalization } from "@/hooks/usePersonalization";
import {
  interviewCoach,
  COACH_AVAILABLE,
  CoachUnavailableError,
  type InterviewPlan,
  type PlanRound,
} from "@/lib/interviewCoach";
import {
  CAREER_FIELDS,
  CAREER_SENIORITY,
  mapCareerLevelToSeniority,
  mapIndustryToCareerField,
  normalizeCareerField,
  isCareerField,
  isCareerSeniority,
} from "@/lib/careerFields";
import { SAMarketIntelligence } from "@/components/interview/SAMarketIntelligence";
import { stageSession } from "../hooks/useInterviewSession";
import type { InterviewMode } from "../types";
import { PlanCard } from "./PlanCard";

const HOW_IT_WORKS = [
  { step: "01", title: "Shape the loop", sub: "Field, level, and the JD if you have one." },
  { step: "02", title: "Sit the interview", sub: "One question at a time — it adapts to you." },
  { step: "03", title: "Read the debrief", sub: "Verdict, transcript, and what to fix." },
];

const MODES: Array<{
  id: InterviewMode;
  title: string;
  sub: string;
}> = [
  {
    id: "realistic",
    title: "Realistic",
    sub: "Adaptive questions that react to your answers. Feedback stays sealed until the debrief — the closest thing to the real room.",
  },
  {
    id: "coached",
    title: "Coached",
    sub: "Full feedback after every answer, hints whenever you're stuck. Learn the patterns before you go realistic.",
  },
];

const LENGTHS = [4, 6, 8];

const fieldLabel = "block cc-label-sm mb-2 text-[color:var(--cc-ink-soft)]";
const fieldControl =
  "w-full border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] px-3 py-3 text-sm text-[color:var(--cc-ink)] outline-none transition-colors focus:border-[color:var(--cc-ink)]";

export function SetupPanel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading: profileLoading, hasPersonalizationData } = usePersonalization();

  const [field, setField] = useState("");
  const [seniority, setSeniority] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [mode, setMode] = useState<InterviewMode>("realistic");
  const [questionCount, setQuestionCount] = useState(6);
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [buildingPlan, setBuildingPlan] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Prefill once from the profile; the selects stay fully editable.
  useEffect(() => {
    if (field || profileLoading || !hasPersonalizationData) return;
    if (profile.industry) {
      const mapped = normalizeCareerField(mapIndustryToCareerField(profile.industry));
      if (isCareerField(mapped)) {
        setField(mapped);
        setPrefilled(true);
      }
    }
    if (profile.careerLevel) {
      const mapped = mapCareerLevelToSeniority(profile.careerLevel);
      if (mapped && isCareerSeniority(mapped)) setSeniority(mapped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, hasPersonalizationData]);

  const config = useMemo(
    () => ({
      field,
      seniority: seniority || undefined,
      jobDescription: jobDescription.trim() || undefined,
      mode,
      questionCount,
    }),
    [field, seniority, jobDescription, mode, questionCount],
  );

  const requireField = (): boolean => {
    if (!field) {
      toast({ title: "Pick your field first", variant: "destructive" });
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
          ? e.message
          : "Interview coach is not available at the moment.";
      toast({ title: "Not available", description: message, variant: "destructive" });
    } finally {
      setBuildingPlan(false);
    }
  };

  const enterRoom = (extra?: { focusAreas?: string[]; roundName?: string }) => {
    if (!requireField()) return;
    stageSession({ ...config, ...extra });
    navigate("/interview-prep/room");
  };

  const practiceRound = (round: PlanRound) => {
    enterRoom({ focusAreas: round.focusAreas, roundName: round.name });
  };

  return (
    <div className="space-y-6">
      {!COACH_AVAILABLE && (
        <div className="flex items-start gap-3 border border-[color:var(--cc-wheat)] bg-[color:var(--cc-wheat-soft)] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cc-wheat-deep)]" />
          <div>
            <p className="text-sm font-medium text-[color:var(--cc-ink)]">
              Interview coach not connected
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cc-ink-soft)]">
              Set <code className="cc-font-mono">VITE_INTERVIEW_MCP_URL</code> to your running
              interview-coach-mcp to enable live plans, questions and evaluations.
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="grid grid-cols-1 gap-px border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-hair-strong)] sm:grid-cols-3">
        {HOW_IT_WORKS.map((item) => (
          <div key={item.step} className="bg-[color:var(--cc-cream)] p-4">
            <p className="cc-label-sm text-[color:var(--cc-rust)]">{item.step}</p>
            <p className="cc-font-display mt-1 text-lg text-[color:var(--cc-ink)]">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--cc-ash)]">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Setup */}
      <section className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]">
        <div className="border-b border-[color:var(--cc-hair)] px-5 py-4 md:px-6">
          <p className="cc-label text-[color:var(--cc-ink)]">New session</p>
          {prefilled && (
            <p className="mt-1 text-xs text-[color:var(--cc-ash)]">
              Prefilled from your profile — change anything below.
            </p>
          )}
        </div>

        <div className="space-y-6 p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="iv-field" className={fieldLabel}>
                Field *
              </label>
              <select
                id="iv-field"
                value={field}
                onChange={(e) => setField(e.target.value)}
                className={fieldControl}
              >
                <option value="" disabled>
                  Choose your field
                </option>
                {CAREER_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="iv-seniority" className={fieldLabel}>
                Level
              </label>
              <select
                id="iv-seniority"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className={fieldControl}
              >
                <option value="">Any level</option>
                {CAREER_SENIORITY.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="iv-jd" className={fieldLabel}>
              Job description <span className="normal-case tracking-normal">(optional — sharpens everything)</span>
            </label>
            <textarea
              id="iv-jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the JD to get questions aimed at this exact role…"
              className={`${fieldControl} min-h-[110px] resize-y placeholder:text-[color:var(--cc-ash)]`}
            />
          </div>

          {/* Mode */}
          <div>
            <p className={fieldLabel}>Mode</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={[
                      "border p-4 text-left transition-colors",
                      active
                        ? "border-[color:var(--cc-ink)] bg-[color:var(--cc-cream-2)] shadow-[inset_0_3px_0_0_var(--cc-rust)]"
                        : "border-[color:var(--cc-hair-strong)] hover:border-[color:var(--cc-ink)]",
                    ].join(" ")}
                  >
                    <p
                      className={[
                        "cc-font-display text-lg",
                        active ? "text-[color:var(--cc-rust)]" : "text-[color:var(--cc-ink)]",
                      ].join(" ")}
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

          {/* Length */}
          <div>
            <p className={fieldLabel}>Length</p>
            <div className="inline-flex border border-[color:var(--cc-hair-strong)]">
              {LENGTHS.map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={[
                    "cc-label-sm px-4 py-2.5 transition-colors",
                    questionCount === n
                      ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                      : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]",
                  ].join(" ")}
                >
                  {n} questions
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[color:var(--cc-hair)] pt-5 sm:flex-row">
            <button
              onClick={buildPlan}
              disabled={buildingPlan || !COACH_AVAILABLE}
              className="cc-btn cc-btn-ghost flex-1"
            >
              {buildingPlan ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Designing your loop
                </>
              ) : (
                <>
                  <Map className="h-3.5 w-3.5" />
                  Build my interview plan
                </>
              )}
            </button>
            <button
              onClick={() => enterRoom()}
              disabled={!COACH_AVAILABLE}
              className="cc-btn cc-btn-primary flex-1"
            >
              Quick start
              <ArrowRight className="cc-arrow-right h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {plan && <PlanCard plan={plan} onPracticeRound={practiceRound} />}

      {field && <SAMarketIntelligence field={field} seniority={seniority} />}
    </div>
  );
}

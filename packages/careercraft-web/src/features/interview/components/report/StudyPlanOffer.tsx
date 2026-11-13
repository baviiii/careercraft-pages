import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarRange, Loader2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { CAREER_COACH_AVAILABLE, CoachUnavailableError, careerCoach } from "@/lib/careerCoach";
import { useForgetSaved } from "@/lib/savedResults";
import { rememberPlanId, useRefreshPlans } from "@/lib/studyPlans";

const WEEKS = [2, 4, 6];
const HOURS = [3, 5, 8];
/* A plan takes the coach 15-30 seconds; say what it's doing meanwhile. */
const STEPS = ["Reading this debrief", "Picking what to practise first", "Laying out the weeks"];

/**
 * The step after a debrief: a study plan built around what this interview
 * found. It's the Study tab's own plan builder; the coach reads the latest
 * debrief's "focus next" skills, so the plan targets these gaps. Once built
 * it opens in Study, where it can be ticked off, rebuilt or deleted.
 */
export function StudyPlanOffer({
  field,
  skills,
  why,
}: {
  field: string;
  /** The debrief's "focus next" skills; the plan leads with these. */
  skills: string[];
  why: string;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const refreshPlans = useRefreshPlans();
  const forgetSaved = useForgetSaved();
  const [weeks, setWeeks] = useState(4);
  const [hours, setHours] = useState(5);
  const [building, setBuilding] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!building) return;
    setStep(0);
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 7000);
    return () => window.clearInterval(t);
  }, [building]);

  if (!CAREER_COACH_AVAILABLE) return null;

  const build = async () => {
    setBuilding(true);
    try {
      const r = await careerCoach.getLearningPathway({ field: field || undefined, weeks, hoursPerWeek: hours });
      if (!r.pathway?.plan?.weeks?.length) {
        toast({ title: "No plan came back", description: "The coach answered without any weeks. Try again.", variant: "destructive" });
        return;
      }
      if (!r.recommendationId) {
        toast({
          title: "Your plan was built but couldn't be saved",
          description: "Build it again from the Study tab.",
          variant: "destructive",
        });
        return;
      }
      rememberPlanId(r.recommendationId);
      await refreshPlans();
      void forgetSaved("pathway");
      toast({ title: "Your study plan is ready", description: `${weeks} weeks at ${hours} hours a week. It's open in Study.` });
      navigate("/interview-prep?tab=study");
    } catch (e) {
      toast({
        title: "Couldn't build a plan just now",
        description: e instanceof CoachUnavailableError ? e.message : "The coach isn't available at the moment. Try again shortly.",
        variant: "destructive",
      });
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="dr-plan">
      <div className="dr-plan__head">
        <span className="dr-plan__icon" aria-hidden>
          <CalendarRange className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="cc-font-display text-[20px] leading-tight text-[color:var(--cc-ink)]">
            Turn this into a study plan
          </h3>
          <p className="mt-1 text-[14px] leading-snug text-[color:var(--cc-ink-soft)]">
            Week by week, built around what this interview found.
          </p>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="mt-4">
          <p className="text-[13px] font-medium text-[color:var(--cc-ink-soft)]">It starts with</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="dr-skill">
                {s}
              </span>
            ))}
          </div>
          {why && <p className="mt-2 text-[13px] leading-snug text-[color:var(--cc-ash)]">{why}</p>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
        <Choice label="For" options={WEEKS} value={weeks} onChange={setWeeks} unit={(n) => `${n} weeks`} disabled={building} />
        <Choice label="At" options={HOURS} value={hours} onChange={setHours} unit={(n) => `${n} h/week`} disabled={building} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void build()} disabled={building} className="dr-plan__go">
          {building ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {building ? STEPS[step] : "Build my study plan"}
          {!building && <ArrowRight className="h-4 w-4" />}
        </button>
        {building && <span className="text-[13px] text-[color:var(--cc-ash)]">This takes about half a minute.</span>}
      </div>
    </div>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
  unit,
  disabled,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (n: number) => void;
  unit: (n: number) => string;
  disabled: boolean;
}) {
  return (
    <div>
      <p className="text-[12.5px] font-medium text-[color:var(--cc-ash)]">{label}</p>
      <div role="radiogroup" aria-label={label} className="dr-seg mt-1">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            disabled={disabled}
            onClick={() => onChange(n)}
            className="dr-seg__opt"
          >
            {unit(n)}
          </button>
        ))}
      </div>
    </div>
  );
}

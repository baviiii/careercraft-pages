import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarRange, Loader2 } from "lucide-react";

import { useBuild, type BuiltPlan } from "@/components/career-dev/study/useBuild";
import { useToast } from "@/hooks/use-toast";
import { useForgetSaved } from "@/lib/savedResults";
import { rememberPlanId, useRefreshPlans } from "@/lib/studyPlans";

const WEEKS = [2, 4, 6];
const HOURS = [3, 5, 8];
/* A plan takes the coach 15-30 seconds; say what it's doing meanwhile. */
const STEPS = ["Reading this debrief", "Picking what to practise first", "Laying out the weeks"];

/**
 * The step after a debrief: a study plan built around what this interview
 * found. It's the Study tab's own builder (the coach reads the latest
 * debrief's "focus next" skills, so the plan targets these gaps), and the
 * plan is handed to Study and opened there, saved or not.
 *
 * Rendered only when the coach is connected (DebriefReport checks).
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
  const [step, setStep] = useState(0);

  // The build outlives a click elsewhere (say, starting a drill). If they've
  // left this debrief by the time it's ready, say so; don't pull them away.
  const here = useRef(true);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);

  const onBuilt = (built: BuiltPlan) => {
    // Saved plans open in Study from the list even if Study reloads it.
    if (built.id) rememberPlanId(built.id);
    if (here.current) {
      // Study takes the plan from here (saved or not) and refreshes its list.
      toast({ title: "Your study plan is ready", description: `${weeks} weeks at ${hours} hours a week.` });
      navigate("/interview-prep?tab=study", { state: { builtPlan: built } });
      return;
    }
    if (!built.id) {
      toast({
        title: "Your study plan couldn't be saved",
        description: "Build it again from Interview prep, under Study.",
        variant: "destructive",
      });
      return;
    }
    void refreshPlans();
    void forgetSaved("pathway");
    toast({ title: "Your study plan is ready", description: "It's waiting in Interview prep, under Study." });
  };
  const { building, build } = useBuild(onBuilt);

  useEffect(() => {
    if (!building) return;
    setStep(0);
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 7000);
    return () => window.clearInterval(t);
  }, [building]);

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
            {/* The coach often names a skill and then explains it after a
                colon; the chip shows the name, the rest is on hover. */}
            {skills.map((s, i) => {
              const name = s.split(":")[0].trim() || s;
              return (
                <span key={`${i}-${s}`} className="dr-skill" title={name === s ? undefined : s}>
                  {name}
                </span>
              );
            })}
          </div>
          {why && <p className="mt-2 text-[13px] leading-snug text-[color:var(--cc-ash)]">{why}</p>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
        <Choice label="For" options={WEEKS} value={weeks} onChange={setWeeks} unit={(n) => `${n} weeks`} disabled={building} />
        <Choice label="At" options={HOURS} value={hours} onChange={setHours} unit={(n) => `${n} h/week`} disabled={building} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void build({ field: field || undefined, weeks, hours })}
          disabled={building}
          className="dr-plan__go"
        >
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

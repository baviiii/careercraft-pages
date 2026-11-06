/**
 * StudyPanel — the upskilling side of Interview Prep, laid out as a study
 * notebook in numbered sections that fold shut:
 *
 *   01 Today's drill — one short exercise on the skill most due; the coach
 *      marks what they write. Drills can be saved for later, picked up again,
 *      cancelled or deleted, and every finished one is kept.
 *   02 Your plans — the main plan for the job plus any number of plans to
 *      explore something; switch, rebuild, delete.
 *   03 Learn it — videos, discussions, courses and guides for the open plan's
 *      skills.
 *   04 Drill log — finished drills and how each skill is going (also in
 *      History, and summed up on Home).
 *   05 Explain a concept.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Degradation } from "@/lib/careerCoach";
import { drillStats, mark, useDrills, type PlanOrigin } from "@/features/interview/lib/drills";
import { DrillLog, SkillProgressCards } from "@/features/interview/components/DrillLog";
import {
  isMainPlanFor,
  planName,
  rememberedPlanId,
  rememberPlanId,
  savePlanProgress,
  useRefreshPlans,
  useStudyPlans,
  type PlanProgress,
  type SessionStatus,
  type StudyPlanRow,
} from "@/lib/studyPlans";
import { useForgetSaved } from "@/lib/savedResults";
import { CoachNotConnected } from "./shared";
import { StudySkillLearning } from "./StudySkillLearning";
import { DrillDesk, type DrillRequest } from "./study/DrillDesk";
import { ExplainConcept } from "./study/ExplainConcept";
import { NotebookSection } from "./study/NotebookSection";
import { PlanShelf, type BuiltPlan, type SessionAction } from "./study/PlanShelf";
import "./study.css";

export default function StudyPanel({
  field,
  drillRequest,
  onDrillRequestHandled,
  onSetUpMock,
}: {
  field?: string;
  /** From the address bar (?drill=): a skill to drill now, or "due" for whatever's due. */
  drillRequest?: string | null;
  onDrillRequestHandled?: () => void;
  /** A plan's mock session: go to the interview setup. */
  onSetUpMock?: () => void;
}) {
  const { toast } = useToast();
  const plansQuery = useStudyPlans();
  const refreshPlans = useRefreshPlans();
  const forgetSaved = useForgetSaved();
  const drillsQuery = useDrills();
  const drills = useMemo(() => drillsQuery.data ?? [], [drillsQuery.data]);
  const stats = useMemo(() => drillStats(drills), [drills]);
  const saved = useMemo(() => drills.filter((d) => d.status === "saved"), [drills]);

  // A plan built just now shows straight away, before the list is read again
  // (and stays, if it couldn't be saved, until they leave). A deleted one goes
  // straight away too.
  const [fresh, setFresh] = useState<StudyPlanRow | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const [degraded, setDegraded] = useState<{ id: string; value: Degradation | null } | null>(null);
  const plans = useMemo(() => {
    const listed = (plansQuery.data ?? []).filter((p) => !gone.includes(p.id));
    return fresh && !gone.includes(fresh.id) && !listed.some((p) => p.id === fresh.id) ? [fresh, ...listed] : listed;
  }, [fresh, gone, plansQuery.data]);

  // Which plan is open: the one open last time, else this job's main plan,
  // else the newest, else the form for a first plan.
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    if (plansQuery.isLoading) return;
    if (openId && (openId === "new" || plans.some((p) => p.id === openId))) return;
    const last = rememberedPlanId();
    const pick =
      plans.find((p) => p.id === last) ?? plans.find((p) => isMainPlanFor(p, field)) ?? plans[0] ?? null;
    setOpenId(pick ? pick.id : "new");
  }, [plansQuery.isLoading, plans, openId, field]);

  const open = (id: string) => {
    setOpenId(id);
    if (id !== "new" && id !== "unsaved") rememberPlanId(id);
  };

  const onBuilt = (built: BuiltPlan) => {
    const id = built.id ?? "unsaved";
    setFresh({
      id,
      pathway: built.pathway,
      savedAt: new Date().toISOString(),
      subject: null,
      description: built.description,
      progress: {},
    });
    setGone((g) => g.filter((x) => x !== id));
    setDegraded({ id, value: built.degraded });
    open(id);
    void refreshPlans();
    void forgetSaved("pathway");
  };

  const onDeleted = (id: string) => {
    setGone((g) => [...g, id]);
    rememberPlanId(null);
    setOpenId(null);
    void refreshPlans();
    void forgetSaved("pathway");
  };

  const openPlan = plans.find((p) => p.id === openId) ?? null;
  const skills = openPlan
    ? openPlan.pathway.focus.skills.length
      ? openPlan.pathway.focus.skills
      : openPlan.pathway.targets.map((t) => t.skill)
    : [];

  // Ticks on plan sessions show at once and save in the background. The refs
  // let two quick clicks (or a drill finishing) build on each other before
  // the screen catches up.
  const [ticks, setTicks] = useState<Record<string, PlanProgress>>({});
  const ticksRef = useRef(ticks);
  const plansRef = useRef(plans);
  plansRef.current = plans;
  const progressOf = (row: StudyPlanRow) => ticks[row.id] ?? row.progress;

  const setSessionStatus = (planId: string, key: string, status: SessionStatus | null) => {
    const row = plansRef.current.find((p) => p.id === planId);
    if (!row) return;
    const current = ticksRef.current[planId] ?? row.progress;
    if ((current[key] ?? null) === status) return;
    const next = { ...current };
    if (status) next[key] = status;
    else delete next[key];
    ticksRef.current = { ...ticksRef.current, [planId]: next };
    setTicks(ticksRef.current);
    if (planId === "unsaved") return;
    savePlanProgress(planId, next).catch(() => {
      const { [planId]: _, ...rest } = ticksRef.current;
      ticksRef.current = rest;
      setTicks(rest);
      void refreshPlans();
      toast({ title: "Couldn't save that tick", description: "Try again in a moment.", variant: "destructive" });
    });
  };

  const scrollTo = (id: string) =>
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));

  // "Practise it" anywhere: open the drill section and start one.
  const [drillAsk, setDrillAsk] = useState<DrillRequest | null>(null);
  const practise = (skill?: string, from?: { focus: string; origin: PlanOrigin }) => {
    setDrillAsk((a) => ({ skill, ...from, n: (a?.n ?? 0) + 1 }));
    scrollTo("study-drill");
  };

  // A session's own button: its drill, its skill's videos and guides, or the mock setup.
  const [learnAsk, setLearnAsk] = useState<{ skill: string; n: number } | null>(null);
  const onSessionAction = (a: SessionAction) => {
    if (a.kind === "drill") practise(a.skill, { focus: a.focus, origin: a.origin });
    else if (a.kind === "learn") {
      setLearnAsk((l) => ({ skill: a.skill, n: (l?.n ?? 0) + 1 }));
      scrollTo("study-learn");
    } else onSetUpMock?.();
  };

  const onPlanDrillFinished = (origin: PlanOrigin) => {
    if (!plansRef.current.some((p) => p.id === origin.planId)) return;
    setSessionStatus(origin.planId, origin.key, "done");
    toast({ title: `Ticked off ${origin.label}`, description: "That session is done in your plan." });
  };

  useEffect(() => {
    if (!drillRequest) return;
    practise(drillRequest === "due" ? undefined : drillRequest);
    onDrillRequestHandled?.();
  }, [drillRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cc-study space-y-5">
      <CoachNotConnected />

      <header className="st-head">
        <div>
          <p className="st-label">Study{field ? ` · ${field}` : ""}</p>
          <h2 className="st-h mt-2 text-[clamp(26px,3vw,34px)] leading-[1.1]">Study</h2>
          <p className="st-body mt-2 max-w-xl">
            A short drill each day, plans you can switch between, and the best videos, discussions and guides for
            each skill.
          </p>
        </div>
        <div className="st-tallies">
          <div className="st-tally">
            <p className="st-tally__n">{stats.thisWeek}</p>
            <p className="st-tally__label">drills this week</p>
          </div>
          <div className="st-tally">
            <p className="st-tally__n">
              {stats.average !== null ? mark(stats.average) : "—"}
              {stats.average !== null && <small>/10</small>}
            </p>
            <p className="st-tally__label">average mark</p>
          </div>
          <div className="st-tally">
            <p className="st-tally__n">{stats.saved}</p>
            <p className="st-tally__label">saved for later</p>
          </div>
          <div className="st-tally">
            <p className="st-tally__n">{plansQuery.data?.length ?? 0}</p>
            <p className="st-tally__label">{plansQuery.data?.length === 1 ? "plan" : "plans"}</p>
          </div>
        </div>
      </header>

      <NotebookSection
        id="drill"
        n="01"
        title="Today's drill"
        openSignal={drillAsk?.n}
        summary={
          saved.length
            ? `${saved.length} saved for later · ${stats.thisWeek} done this week`
            : stats.done
              ? `${stats.thisWeek} done this week · last mark ${mark(stats.skills[0]?.last ?? 0)}/10`
              : "Ten minutes on the skill that's most due"
        }
      >
        <DrillDesk
          field={field}
          skills={skills}
          saved={saved}
          doneCount={drillsQuery.data ? stats.done : null}
          request={drillAsk}
          onFinished={onPlanDrillFinished}
        />
      </NotebookSection>

      <NotebookSection
        id="plan"
        n="02"
        title="Your plans"
        summary={
          openPlan
            ? `${planName(openPlan.pathway)} is open · ${plans.length} ${plans.length === 1 ? "plan" : "plans"}`
            : openId === "new" && plans.length
              ? `Making a new plan · ${plans.length} saved`
              : plansQuery.isLoading
              ? "Loading your plans…"
              : "No plan yet: build one for your job, or to explore something"
        }
      >
        <PlanShelf
          field={field}
          plans={plans}
          loading={plansQuery.isLoading}
          openId={openId}
          degraded={degraded && degraded.id === openId ? degraded.value : null}
          onOpen={open}
          onBuilt={onBuilt}
          onDeleted={onDeleted}
          progressOf={progressOf}
          onSetStatus={setSessionStatus}
          onAction={onSessionAction}
        />
      </NotebookSection>

      <NotebookSection
        id="learn"
        n="03"
        title="Learn it"
        openSignal={learnAsk?.n}
        summary={
          skills.length
            ? `Videos, discussions and guides for ${skills.slice(0, 3).join(", ")}${skills.length > 3 ? "…" : ""}`
            : "Each skill in your plan gets videos, discussions and guides"
        }
      >
        {skills.length ? (
          <StudySkillLearning
            skills={learnAsk && !skills.includes(learnAsk.skill) ? [...skills, learnAsk.skill] : skills}
            field={openPlan?.pathway.field || field}
            focus={learnAsk}
            onPractise={(skill) => practise(skill)}
          />
        ) : (
          <p className="st-body pt-4">Build a plan first, and each of its skills gets videos, discussions and guides here.</p>
        )}
      </NotebookSection>

      <NotebookSection
        id="log"
        n="04"
        title="Drill log"
        defaultOpen={false}
        summary={
          stats.done
            ? `${stats.done} ${stats.done === 1 ? "drill" : "drills"} done · average ${stats.average !== null ? mark(stats.average) : "—"}/10 over the last ten`
            : "Every drill you finish is kept here"
        }
      >
        {stats.done ? (
          <div className="space-y-6 pt-4">
            <SkillProgressCards rows={drills} />
            <DrillLog rows={drills} onPractise={practise} />
          </div>
        ) : (
          <p className="st-body pt-4">
            Nothing yet. Finish a drill and it lands here with what you wrote and how it was marked.
          </p>
        )}
      </NotebookSection>

      <NotebookSection
        id="explain"
        n="05"
        title="Explain a concept"
        defaultOpen={false}
        summary="Any idea, explained simply first, then deeper"
      >
        <ExplainConcept field={field} />
      </NotebookSection>
    </div>
  );
}

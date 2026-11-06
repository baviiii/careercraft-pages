/**
 * Study plans as folder tabs on a sheet: click a tab to switch, "New plan" to
 * build another, and each plan can be rebuilt or deleted.
 *
 * A plan is either the main one for the job (the skills that most need work)
 * or one to explore something they name. The coach keeps them side by side:
 * rebuilding a plan replaces it, a new one never replaces another.
 *
 * A plan is worked through, not just read: every session has a box to tick
 * and a button for what it asks (start the drill, find videos, set up the
 * mock), weeks show how many are done, and the plan opens on the first week
 * with something left.
 */
import { useState } from "react";
import { ArrowUpRight, Check, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { careerCoach, CoachUnavailableError, type Degradation, type LearningPathway } from "@/lib/careerCoach";
import { ResourceProgress } from "@/features/interview/components/ResourceProgress";
import { savedAgo } from "@/lib/savedResults";
import type { PlanOrigin } from "@/features/interview/lib/drills";
import {
  deleteStudyPlan,
  isMainPlanFor,
  planName,
  planSize,
  sessionKey,
  type PlanProgress,
  type SessionStatus,
  type StudyPlanRow,
} from "@/lib/studyPlans";

const WEEKS = [2, 4, 6, 8];
const HOURS = [3, 5, 8, 10];

/** Where a plan's skills came from, in words. */
const SOURCE: Record<string, string> = {
  matrix: "the skills that scored lowest so far",
  field: "the core skills for the job",
  research: "what real sources say the job needs",
  requested: "the skills you picked",
  explore: "what you asked to explore",
};

const METHODS = new Set(["learn", "drill", "build", "mock", "review"]);

/** "Show HN" posts are someone's product launch, not reading (older saved plans still have them). */
const isLaunch = (title: string) => /^\s*(show|launch)\s+hn\b/i.test(title);

/** What a session's button asks for: a drill on its task, the skill's videos and guides, or a mock interview. */
export interface SessionAction {
  kind: "drill" | "learn" | "mock";
  skill: string;
  /** The session's task, for a drill built around it. */
  focus: string;
  origin: PlanOrigin;
}

/** The button each kind of session gets. */
const ACTIONS: Record<string, { label: string; kind?: SessionAction["kind"]; review?: boolean; primary?: boolean }> = {
  drill: { label: "Start this drill", kind: "drill", primary: true },
  review: { label: "Review with a drill", kind: "drill", review: true },
  learn: { label: "Find videos & guides", kind: "learn" },
  mock: { label: "Set up a mock interview", kind: "mock" },
  build: { label: "Mark as started" },
};

export interface BuiltPlan {
  id: string | null;
  pathway: LearningPathway;
  degraded: Degradation | null;
  description: string;
}

export function PlanShelf({
  field,
  plans,
  loading,
  openId,
  degraded,
  onOpen,
  onBuilt,
  onDeleted,
  progressOf,
  onSetStatus,
  onAction,
}: {
  field?: string;
  plans: StudyPlanRow[];
  loading: boolean;
  /** The open plan's id, or "new" for the form. */
  openId: string | null;
  /** What the coach had to make do with, for a plan built just now. */
  degraded: Degradation | null;
  onOpen: (id: string) => void;
  onBuilt: (plan: BuiltPlan) => void;
  onDeleted: (id: string) => void;
  /** Which sessions of a plan are started or done. */
  progressOf: (row: StudyPlanRow) => PlanProgress;
  /** Tick, half-tick or clear one session. */
  onSetStatus: (planId: string, key: string, status: SessionStatus | null) => void;
  onAction: (action: SessionAction) => void;
}) {
  const open = plans.find((p) => p.id === openId) ?? null;
  // The form when asked for, or when there's nothing to show; never for the
  // moment before the open plan is picked.
  const showForm = openId === "new" || (!loading && plans.length === 0);

  return (
    <div className="pt-4">
      <div className="st-folders" role="tablist" aria-label="Your plans">
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === openId}
            onClick={() => onOpen(p.id)}
            className="st-folder"
            title={planName(p.pathway)}
          >
            <span className="st-folder__kind">{p.pathway.explore ? "Exploring" : "For the job"}</span>
            <span className="st-folder__name">{planName(p.pathway)}</span>
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={showForm}
          onClick={() => onOpen("new")}
          className="st-folder st-folder--new"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New plan
        </button>
      </div>

      <div className="st-sheet" role="tabpanel">
        {!showForm && !open ? (
          <div className="space-y-3" aria-busy="true">
            <div className="h-6 w-1/3 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
          </div>
        ) : showForm ? (
          <NewPlanForm
            field={field}
            hasMainPlan={plans.some((p) => isMainPlanFor(p, field))}
            canCancel={plans.length > 0}
            onCancel={() => plans[0] && onOpen(plans[0].id)}
            onBuilt={onBuilt}
          />
        ) : open ? (
          <PlanSheet
            key={open.id}
            row={open}
            degraded={degraded}
            progress={progressOf(open)}
            onBuilt={onBuilt}
            onDeleted={onDeleted}
            onSetStatus={(key, status) => onSetStatus(open.id, key, status)}
            onAction={onAction}
          />
        ) : null}
      </div>
    </div>
  );
}

function useBuild(onBuilt: (plan: BuiltPlan) => void) {
  const { toast } = useToast();
  const [building, setBuilding] = useState(false);
  const build = async (input: { field?: string; explore?: string; weeks: number; hours: number }) => {
    setBuilding(true);
    try {
      const r = await careerCoach.getLearningPathway({
        field: input.field || undefined,
        explore: input.explore || undefined,
        weeks: input.weeks,
        hoursPerWeek: input.hours,
      });
      if (!r.pathway?.plan?.weeks?.length) {
        toast({ title: "No plan came back", description: "The coach answered without any weeks. Try again.", variant: "destructive" });
        return;
      }
      onBuilt({
        id: r.recommendationId,
        pathway: r.pathway,
        degraded: r._meta?.degraded ?? null,
        description: `${input.weeks}w · ${input.hours} h/week · ${r.pathway.field}`,
      });
    } catch (e) {
      toast({
        title: "Not available",
        description: e instanceof CoachUnavailableError ? e.message : "The coach isn't available at the moment.",
        variant: "destructive",
      });
    } finally {
      setBuilding(false);
    }
  };
  return { building, build };
}

function NewPlanForm({
  field,
  hasMainPlan,
  canCancel,
  onCancel,
  onBuilt,
}: {
  field?: string;
  hasMainPlan: boolean;
  canCancel: boolean;
  onCancel: () => void;
  onBuilt: (plan: BuiltPlan) => void;
}) {
  const [kind, setKind] = useState<"job" | "explore">(hasMainPlan || !field ? "explore" : "job");
  const [explore, setExplore] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [hours, setHours] = useState(5);
  const { building, build } = useBuild(onBuilt);
  const ready = kind === "job" ? Boolean(field) : explore.trim().length >= 2;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !building) void build({ field, explore: kind === "explore" ? explore.trim() : undefined, weeks, hours });
      }}
      className="space-y-6"
    >
      <div>
        <p className="st-label">New plan</p>
        <h4 className="st-h mt-1.5 text-[22px] leading-tight">What should this plan be for?</h4>
      </div>

      <div className="st-choices" role="radiogroup" aria-label="What the plan is for">
        <label className="st-choice">
          <span className="flex items-start gap-3">
            <input
              type="radio"
              name="plan-kind"
              checked={kind === "job"}
              onChange={() => setKind("job")}
              disabled={!field}
              className="mt-1"
            />
            <span>
              <span className="block text-[15px] font-semibold text-[color:var(--cc-ink)]">
                {field ? `For your job: ${field}` : "For your job"}
              </span>
              <span className="st-small mt-1 block">
                {field
                  ? "The skills that most need work: from your last mock interview, or your skill levels so far."
                  : "Set a target role at the top of the page first."}
              </span>
            </span>
          </span>
        </label>
        <label className="st-choice">
          <span className="flex items-start gap-3">
            <input
              type="radio"
              name="plan-kind"
              checked={kind === "explore"}
              onChange={() => setKind("explore")}
              className="mt-1"
            />
            <span>
              <span className="block text-[15px] font-semibold text-[color:var(--cc-ink)]">Something to explore</span>
              <span className="st-small mt-1 block">A skill, an area or a move you're curious about. Kept beside your other plans.</span>
            </span>
          </span>
        </label>
      </div>

      {kind === "explore" && (
        <div>
          <label htmlFor="plan-explore" className="st-label st-label--muted">
            What do you want to explore?
          </label>
          <input
            id="plan-explore"
            value={explore}
            onChange={(e) => setExplore(e.target.value)}
            maxLength={120}
            autoFocus
            placeholder="e.g. cloud security, leading a small team, aged care"
            className="st-input mt-1 text-[17px]"
          />
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="st-label st-label--muted">How long</p>
          <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Weeks">
            {WEEKS.map((w) => (
              <button key={w} type="button" aria-pressed={weeks === w} onClick={() => setWeeks(w)} className="st-chip">
                {w} weeks
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="st-label st-label--muted">Time each week</p>
          <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Hours a week">
            {HOURS.map((h) => (
              <button key={h} type="button" aria-pressed={hours === h} onClick={() => setHours(h)} className="st-chip">
                {h} hours
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="submit" disabled={!ready || building} className="cc-action">
          {building ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Building your plan…
            </>
          ) : (
            "Build the plan"
          )}
        </button>
        {canCancel && !building && (
          <button type="button" onClick={onCancel} className="st-textbtn">
            Cancel
          </button>
        )}
        <span className="st-small">
          {building
            ? "Picking skills, laying out the weeks and finding resources. Usually under a minute."
            : kind === "job" && hasMainPlan
              ? `This replaces your current plan for ${field}.`
              : null}
        </span>
      </div>
    </form>
  );
}

function PlanSheet({
  row,
  degraded,
  progress,
  onBuilt,
  onDeleted,
  onSetStatus,
  onAction,
}: {
  row: StudyPlanRow;
  degraded: Degradation | null;
  progress: PlanProgress;
  onBuilt: (plan: BuiltPlan) => void;
  onDeleted: (id: string) => void;
  onSetStatus: (key: string, status: SessionStatus | null) => void;
  onAction: (action: SessionAction) => void;
}) {
  const { toast } = useToast();
  const p = row.pathway;
  const weeks = p.plan?.weeks ?? [];
  const size = planSize(row);
  const { building, build } = useBuild(onBuilt);
  // Sessions are keyed by their place in the plan (week order, then day order).
  const doneIn = (wi: number) =>
    (weeks[wi]?.sessions ?? []).filter((_, j) => progress[sessionKey(wi + 1, j)] === "done").length;
  const totalSessions = weeks.reduce((n, wk) => n + wk.sessions.length, 0);
  const totalDone = weeks.reduce((n, _, wi) => n + doneIn(wi), 0);
  // Open on the first week with something left to do.
  const [week, setWeek] = useState(() => {
    const open = weeks.findIndex((wk, wi) => doneIn(wi) < wk.sessions.length);
    return open === -1 ? 0 : open;
  });
  const [confirming, setConfirming] = useState<"delete" | "rebuild" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const unsaved = row.id === "unsaved";

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteStudyPlan(row.id);
      onDeleted(row.id);
      toast({ title: "Plan deleted" });
    } catch {
      setDeleting(false);
      toast({ title: "Couldn't delete it", description: "Try again in a moment.", variant: "destructive" });
    }
  };

  const source = p.focus.fromLastInterview
    ? "what your last mock interview showed"
    : (SOURCE[p.focus.source] ?? "your skills so far");
  const reading = (p.resources ?? []).filter((r) => r.url && !isLaunch(r.title)).slice(0, 5);
  // The "with" a session names, as a link when the plan has one by that title.
  const linkFor = (title: string): string | null => {
    const t = title.trim().toLowerCase();
    return (
      p.resources?.find((r) => r.url && r.title.trim().toLowerCase() === t)?.url ??
      p.officialTraining?.find((r) => r.title.trim().toLowerCase() === t)?.url ??
      null
    );
  };
  const rebuild = () => {
    setConfirming(null);
    void build({ field: p.field, explore: p.explore ?? undefined, weeks: size.weeks, hours: size.hours });
  };
  const w = weeks[Math.min(week, weeks.length - 1)];
  const longest = Math.max(1, ...(w?.sessions ?? []).map((s) => s.minutes || 0));

  return (
    <div className="space-y-7">
      {/* Head */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="st-label">{p.explore ? `Exploring · for ${p.field}` : "Your plan for the job"}</p>
          <h4 className="st-h mt-1.5 text-[24px] leading-tight">{planName(p)}</h4>
          <p className="st-small st-mono mt-1.5 text-[12px]">
            {weeks.length} weeks · about {size.hours} hours a week ·{" "}
            {unsaved ? "not saved" : savedAgo(row.savedAt).replace(/^Saved/, "built")}
          </p>
          {totalSessions > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <span className="st-progress" aria-hidden>
                <i style={{ width: `${Math.round((totalDone / totalSessions) * 100)}%` }} />
              </span>
              <span className="st-small">
                {totalDone} of {totalSessions} sessions done
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => (totalDone > 0 ? setConfirming("rebuild") : rebuild())}
            disabled={building || deleting}
            className="cc-action cc-action--ghost cc-action--sm"
          >
            {building ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Rebuilding…
              </>
            ) : (
              "Rebuild"
            )}
          </button>
          {!unsaved && (
            <button type="button" onClick={() => setConfirming("delete")} disabled={building} className="st-textbtn st-textbtn--danger">
              Delete plan
            </button>
          )}
        </div>
      </div>

      {confirming === "rebuild" && (
        <div className="st-confirm" role="group" aria-label="Rebuild this plan?">
          <span>Rebuild this plan? The new one starts with nothing ticked.</span>
          <button type="button" onClick={rebuild} className="cc-action cc-action--sm">
            Rebuild
          </button>
          <button type="button" onClick={() => setConfirming(null)} className="st-textbtn">
            Keep this one
          </button>
        </div>
      )}

      {confirming === "delete" && (
        <div className="st-confirm" role="group" aria-label="Delete this plan?">
          <span>Delete “{planName(p)}”? Your drills, and the videos and links you've marked, stay.</span>
          <button type="button" onClick={() => void remove()} disabled={deleting} className="cc-action cc-action--danger cc-action--sm">
            {deleting ? "Deleting…" : "Delete plan"}
          </button>
          <button type="button" onClick={() => setConfirming(null)} className="st-textbtn">
            Keep it
          </button>
        </div>
      )}

      {/* Why these skills */}
      <div className="space-y-4">
        <p className="st-body">
          Built from <span className="st-hl">{source}</span>.
          {p.focus.why && !/lowest-proficiency tested skills/i.test(p.focus.why) ? ` ${p.focus.why}` : ""}
        </p>
        {p.targets.length > 0 && (
          <div className="st-targets" aria-label="Where each skill is, and where the plan takes it">
            {p.targets.map((t) => (
              <div key={t.skill} className="st-target">
                <span className="st-target__name">{t.skill}</span>
                <span className="st-track" aria-hidden>
                  <span className="st-track__now" style={{ width: `${Math.max(2, Math.min(100, t.from))}%` }} />
                  <span className="st-track__goal" style={{ left: `${Math.min(100, t.to)}%` }} />
                </span>
                <span className="st-target__nums">
                  {t.from} → {t.to}
                </span>
              </div>
            ))}
          </div>
        )}
        {degraded?.degraded && degraded.reasons.length > 0 && (
          <div className="st-note st-note--warn">
            <span>Built with partial information: {degraded.reasons.join("; ")}.</span>
          </div>
        )}
      </div>

      {/* The weeks */}
      {weeks.length > 0 && w && (
        <div className="space-y-4">
          {p.plan.goal && (
            <p className="st-body">
              <span className="st-label st-label--muted mr-2">Goal</span>
              {p.plan.goal}
            </p>
          )}
          <div className="st-weeks" role="tablist" aria-label="Weeks">
            {weeks.map((wk, i) => {
              const done = doneIn(i);
              const complete = wk.sessions.length > 0 && done === wk.sessions.length;
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === week}
                  onClick={() => setWeek(i)}
                  className={`st-week${complete ? " is-complete" : ""}`}
                  title={wk.theme}
                >
                  <b>
                    Week {wk.week} · {done}/{wk.sessions.length}
                  </b>
                  <span>{wk.theme}</span>
                </button>
              );
            })}
          </div>

          <div className="st-days" role="tabpanel" aria-label={`Week ${w.week}: ${w.theme}`}>
            {w.sessions.map((s, j) => {
              const method = METHODS.has(s.method) ? s.method : "review";
              const key = sessionKey(week + 1, j);
              const status = progress[key] ?? null;
              const action = ACTIONS[method];
              const link = s.resourceTitle ? linkFor(s.resourceTitle) : null;
              const go = () => {
                if (!status) onSetStatus(key, "started");
                if (!action.kind) return;
                onAction({
                  kind: action.kind,
                  skill: s.skill,
                  focus: action.review ? `Review: ${s.activity}` : s.activity,
                  origin: { planId: row.id, key, label: `Week ${w.week} · ${s.day}` },
                });
              };
              return (
                <div key={j} className={`st-day${status === "done" ? " is-done" : ""}`}>
                  <div className="st-day__when">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={status === "done" ? true : status === "started" ? "mixed" : false}
                      aria-label={`${s.day}, ${s.method}: ${status === "done" ? "done" : "mark as done"}`}
                      onClick={() => onSetStatus(key, status === "done" ? null : "done")}
                      className={`st-tick${status ? ` is-${status}` : ""}`}
                    >
                      {status === "done" && <Check className="h-3.5 w-3.5" aria-hidden />}
                    </button>
                    <b>{s.day}</b>
                    <span>{s.minutes} min</span>
                    <div className="st-day__bar" style={{ width: `${Math.round(((s.minutes || 0) / longest) * 100)}%` }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`st-stamp st-stamp--${method}`}>{s.method}</span>
                      <span className="st-small">{s.skill}</span>
                    </div>
                    <p className="st-day__what mt-1.5">{s.activity}</p>
                    {s.resourceTitle && (
                      <p className="st-small mt-1">
                        With:{" "}
                        {link ? (
                          <a href={link} target="_blank" rel="noreferrer" className="st-textbtn inline-flex items-center gap-1">
                            {s.resourceTitle}
                            <ArrowUpRight className="h-3 w-3" aria-hidden />
                          </a>
                        ) : (
                          s.resourceTitle
                        )}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      {status === "done" ? (
                        <span className="st-status st-status--done">Done</span>
                      ) : (
                        <>
                          {(action.kind || status !== "started") && (
                            <button
                              type="button"
                              onClick={go}
                              className={`cc-action cc-action--sm${action.primary ? "" : " cc-action--ghost"}`}
                            >
                              {action.label}
                              {action.kind && <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />}
                            </button>
                          )}
                          {status === "started" && <span className="st-status">Started</span>}
                          <button type="button" onClick={() => onSetStatus(key, "done")} className="st-textbtn">
                            Mark done
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {w.milestone && (
            <p className="st-body">
              <span className="st-label st-label--muted mr-2">By the end of the week</span>
              <span className="st-hl">{w.milestone}</span>
            </p>
          )}
        </div>
      )}

      {/* Extras, folded */}
      <div className="space-y-4 border-t border-dashed border-[color:var(--cc-hair-strong)] pt-5">
        {(p.nextMock?.focusAreas?.length ?? 0) > 0 && (
          <p className="st-small">
            <span className="font-semibold text-[color:var(--cc-ink-soft)]">Next mock interview:</span>{" "}
            {p.nextMock.focusAreas.join(", ")}. {p.nextMock.why}
          </p>
        )}
        {p.plan?.spacedReviewRules && p.plan.spacedReviewRules.length > 0 && (
          <details className="st-fold">
            <summary>How to keep it fresh ({p.plan.spacedReviewRules.length} rules)</summary>
            <ul className="mt-2">
              {p.plan.spacedReviewRules.map((r, i) => (
                <li key={i} className="st-check">
                  <span className="st-box" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          </details>
        )}
        {p.officialTraining && p.officialTraining.length > 0 && (
          <details className="st-fold">
            <summary>Get it recognised: accredited training ({p.officialTraining.length})</summary>
            <div className="st-links mt-2">
              {p.officialTraining.map((t) => (
                <div key={t.url} className="st-link">
                  <div className="min-w-0">
                    <p className="st-link__site">
                      {t.provider} · for {t.skill}
                    </p>
                    <a href={t.url} target="_blank" rel="noreferrer">
                      {t.title}
                    </a>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 text-[color:var(--cc-ash)]" aria-hidden />
                </div>
              ))}
            </div>
          </details>
        )}
        {reading.length > 0 && (
          <details className="st-fold">
            <summary>More reading the plan suggested ({reading.length})</summary>
            <div className="st-links mt-2">
              {reading.map((r) => (
                <div key={r.id} className="st-link">
                  <div className="min-w-0">
                    <p className="st-link__site">{r.provider || "Link"}</p>
                    <a href={r.url!} target="_blank" rel="noreferrer">
                      {r.title}
                    </a>
                    {r.whyRecommended && <p className="st-small mt-1">{r.whyRecommended}</p>}
                    <div className="mt-2">
                      <ResourceProgress
                        resource={{ url: r.url!, title: r.title, provider: r.provider, skill: r.forSkill }}
                        status={r.myStatus}
                      />
                    </div>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 text-[color:var(--cc-ash)]" aria-hidden />
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

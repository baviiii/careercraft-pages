/**
 * CareerGuidancePanel — a full strategist read (position, strengths to sell,
 * gaps, trajectory options, narrative, next actions) and a week-addressed
 * roadmap, for the job in the page's "Going for" card, which is where the goal
 * itself is set.
 *
 * Both open on the last ones the coach saved for this job, so coming back
 * shows your read and your roadmap instead of an empty page; Refresh asks for
 * new ones.
 *
 * Laid out like Study: two numbered sections that fold shut. The roadmap is a
 * route (every phase a stop on one line) and then a path of phases, opened
 * one at a time, with the week's rhythm, mock cadence, certificates and risks
 * around them.
 */
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Copy,
  Flag,
  Loader2,
  Megaphone,
  Mountain,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  careerCoach,
  CoachUnavailableError,
  type CareerGuidance,
  type CareerRoadmap,
} from "@/lib/careerCoach";
import { savedAgo, useForgetSaved, useLatestSaved } from "@/lib/savedResults";
import { CoachNotConnected } from "./shared";
import { NotebookSection } from "./study/NotebookSection";
import "./study.css";
import "./guidance.css";

type Tone = "cobalt" | "sage" | "wheat" | "clay" | "slate";

const HORIZON_MONTHS = ["3", "6", "12", "18", "24"];
const ROADMAP_WEEKS = ["6", "8", "12", "16", "24"];
const ROADMAP_HOURS = ["3", "6", "10", "15"];

/** Phases take turns through the palette, so neighbours never match. */
const PHASE_TONES: Tone[] = ["cobalt", "sage", "wheat", "clay", "slate"];

/** The kind of a roadmap action, as a colour. */
const ACTION_TONE: Record<string, Tone> = {
  study: "cobalt",
  practice: "wheat",
  interview: "clay",
  certification: "sage",
  project: "slate",
  networking: "sage",
};

function severityTone(level: string): Tone {
  const l = level.toLowerCase();
  if (l === "critical" || l === "high") return "clay";
  if (l === "important" || l === "medium") return "wheat";
  return "cobalt";
}

/** "nice-to-have" → "Nice-to-have": a capital to start, the rest as written. */
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function fitTone(viability: number): Tone {
  return viability >= 70 ? "sage" : viability >= 45 ? "wheat" : "slate";
}

/** "1-4" → "Weeks 1–4"; anything else as written. */
function weeksLabel(weeks: string): string {
  const w = String(weeks ?? "").trim();
  if (!w) return "";
  return /^\d+\s*[-–]\s*\d+$/.test(w)
    ? `Weeks ${w.replace(/\s*[-–]\s*/, "–")}`
    : /^\d+$/.test(w)
      ? `Week ${w}`
      : w;
}

/** How many weeks the roadmap runs: the end of its last phase. */
function roadmapWeeks(r: CareerRoadmap): number | null {
  const last = r.phases?.[r.phases.length - 1]?.weeks ?? "";
  const n = Number(/(\d+)\s*$/.exec(String(last))?.[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function SavedLine({ at, what }: { at: string | null; what: string }) {
  if (!at) return null;
  return (
    <p className="st-small">
      {savedAgo(at)}. {what} for a new one.
    </p>
  );
}

/**
 * `field` is the role from the page's "Going for" card. Setting the goal used to
 * happen here too, through a fixed list of fields; it now happens once, in that
 * card, which saves to the profile the coach reads.
 */
export default function CareerGuidancePanel({ field }: { field?: string }) {
  const { toast } = useToast();

  const [question, setQuestion] = useState("");
  const [horizonMonths, setHorizonMonths] = useState("6");

  const [guidance, setGuidance] = useState<CareerGuidance | null>(null);
  const [loadingGuidance, setLoadingGuidance] = useState(false);

  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [horizonWeeks, setHorizonWeeks] = useState("12");
  const [hoursPerWeek, setHoursPerWeek] = useState("6");

  // What the coach saved for this job last time, shown until they refresh.
  // The panel is remounted when the job changes, so these never cross jobs.
  const forgetSaved = useForgetSaved();
  const savedGuidance = useLatestSaved<{ guidance: CareerGuidance }>(
    "career_guidance",
    field,
  );
  const savedRoadmap = useLatestSaved<{ roadmap: CareerRoadmap }>(
    "roadmap",
    field,
  );
  const [guidanceSavedAt, setGuidanceSavedAt] = useState<string | null>(null);
  const [roadmapSavedAt, setRoadmapSavedAt] = useState<string | null>(null);
  useEffect(() => {
    const saved = savedGuidance.data;
    if (!saved?.payload.guidance) return;
    setGuidance((current) => current ?? saved.payload.guidance);
    setGuidanceSavedAt((current) => current ?? saved.savedAt);
  }, [savedGuidance.data]);
  useEffect(() => {
    const saved = savedRoadmap.data;
    if (!saved?.payload.roadmap) return;
    setRoadmap((current) => current ?? saved.payload.roadmap);
    setRoadmapSavedAt((current) => current ?? saved.savedAt);
  }, [savedRoadmap.data]);

  const notAvailable = (e: unknown) => {
    const message =
      e instanceof CoachUnavailableError
        ? e.message
        : "Career coach is not available at the moment.";
    toast({
      title: "Not available",
      description: message,
      variant: "destructive",
    });
  };

  const getGuidance = async () => {
    setLoadingGuidance(true);
    try {
      const r = await careerCoach.getGuidance({
        question: question || undefined,
        targetRole: field || undefined,
        targetField: field || undefined,
        horizonMonths: Number(horizonMonths) || 6,
      });
      setGuidance(r.guidance);
      setGuidanceSavedAt(null);
      void forgetSaved("career_guidance");
    } catch (e) {
      notAvailable(e);
    } finally {
      setLoadingGuidance(false);
    }
  };

  const buildRoadmap = async () => {
    if (!field) {
      toast({
        title: "Tell us the job you're going for",
        description: "Use the card at the top of the page. Any job works.",
        variant: "destructive",
      });
      return;
    }
    setLoadingRoadmap(true);
    try {
      const r = await careerCoach.buildRoadmap({
        targetRole: field,
        targetField: field,
        horizonWeeks: Number(horizonWeeks) || 12,
        hoursPerWeek: Number(hoursPerWeek) || 6,
      });
      setRoadmap(r.roadmap);
      setRoadmapSavedAt(null);
      void forgetSaved("roadmap");
    } catch (e) {
      notAvailable(e);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  const copyPitch = (text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() =>
        toast({
          title: "Copied",
          description: "Your elevator pitch is on the clipboard.",
        }),
      )
      .catch(() => undefined);
  };

  // The roadmap's phases open one at a time; a stop on the route opens its phase.
  const phaseRefs = useRef<Array<HTMLDetailsElement | null>>([]);
  const [activePhase, setActivePhase] = useState(0);
  const openPhase = (i: number) => {
    const el = phaseRefs.current[i];
    if (!el) return;
    el.open = true;
    setActivePhase(i);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const weeks = roadmap ? roadmapWeeks(roadmap) : null;
  const phases = roadmap?.phases ?? [];

  const askControls = (
    <div className="space-y-4">
      <div>
        <label htmlFor="guide-question" className="st-label st-label--muted">
          Ask the coach anything (optional)
        </label>
        <textarea
          id="guide-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Should I aim for a senior role or a lead role next? Is my certificate still worth keeping?"
          className="gd-ask mt-2"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="st-small mr-1">Looking ahead</span>
        {HORIZON_MONTHS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={horizonMonths === m}
            onClick={() => setHorizonMonths(m)}
            className="st-chip"
          >
            {m} months
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void getGuidance()}
        disabled={loadingGuidance}
        className="cc-action"
      >
        {loadingGuidance ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading your profile…
          </>
        ) : guidance ? (
          "Get a fresh read"
        ) : (
          "Get my read"
        )}
      </button>
    </div>
  );

  const roadmapControls = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="st-small mr-1">Over</span>
        {ROADMAP_WEEKS.map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={horizonWeeks === w}
            onClick={() => setHorizonWeeks(w)}
            className="st-chip"
          >
            {w} weeks
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="st-small mr-1">At</span>
        {ROADMAP_HOURS.map((h) => (
          <button
            key={h}
            type="button"
            aria-pressed={hoursPerWeek === h}
            onClick={() => setHoursPerWeek(h)}
            className="st-chip"
          >
            {h} hours a week
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void buildRoadmap()}
        disabled={loadingRoadmap}
        className="cc-action"
      >
        {loadingRoadmap ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Building your roadmap…
          </>
        ) : roadmap ? (
          "Rebuild the roadmap"
        ) : (
          "Build my roadmap"
        )}
      </button>
    </div>
  );

  return (
    <div className="cc-study cc-guide space-y-5">
      <CoachNotConnected />

      <header className="st-head">
        <div>
          <p className="st-label">
            {field ? `For ${field}` : "Your next move"}
          </p>
          <h2 className="st-h mt-2 text-[clamp(26px,3vw,34px)] leading-[1.1]">
            Guidance
          </h2>
          <p className="st-body mt-2 max-w-xl">
            {field
              ? "A specialist's read on where you stand, and a week-by-week roadmap to the job."
              : "Tell us the job you're going for at the top of the page first. Any job works."}
          </p>
        </div>
        {Boolean(roadmap || guidance?.trajectoryOptions?.length) && (
          <div className="st-tallies">
            {phases.length > 0 && (
              <div className="st-tally st-tone-cobalt">
                <p className="st-tally__n">{phases.length}</p>
                <p className="st-tally__label">phases</p>
              </div>
            )}
            {weeks && (
              <div className="st-tally st-tone-wheat">
                <p className="st-tally__n">{weeks}</p>
                <p className="st-tally__label">weeks</p>
              </div>
            )}
            {roadmap?.interviewCadence?.mocksPerWeek ? (
              <div className="st-tally st-tone-clay">
                <p className="st-tally__n">
                  {roadmap.interviewCadence.mocksPerWeek}
                </p>
                <p className="st-tally__label">mocks a week</p>
              </div>
            ) : null}
            {guidance?.trajectoryOptions?.length ? (
              <div className="st-tally st-tone-sage">
                <p className="st-tally__n">
                  {guidance.trajectoryOptions.length}
                </p>
                <p className="st-tally__label">paths open</p>
              </div>
            ) : null}
          </div>
        )}
      </header>

      {/* ── 01 The coach's read ── */}
      <NotebookSection
        id="guide-read"
        n="01"
        title="The coach's read"
        tone="sage"
        summary={
          guidance?.headline ??
          "Where you stand, what to sell, what to close, and the paths open to you"
        }
      >
        <div className="space-y-9 pt-4">
          {guidance ? (
            <>
              <SavedLine at={guidanceSavedAt} what="Get a fresh read" />

              {guidance.headline && (
                <p className="gd-lead">{guidance.headline}</p>
              )}

              {guidance.assessment && (
                <div className="gd-assess">
                  {guidance.assessment.whereYouAre && (
                    <div className="st-tone-cobalt">
                      <p className="st-label">Where you are</p>
                      <p>{guidance.assessment.whereYouAre}</p>
                    </div>
                  )}
                  {guidance.assessment.momentum && (
                    <div className="st-tone-sage">
                      <p className="st-label">Momentum</p>
                      <p>{guidance.assessment.momentum}</p>
                    </div>
                  )}
                  {guidance.assessment.marketPosition && (
                    <div className="st-tone-wheat">
                      <p className="st-label">Market position</p>
                      <p>{guidance.assessment.marketPosition}</p>
                    </div>
                  )}
                </div>
              )}

              {((guidance.strengthsToSell?.length ?? 0) > 0 ||
                (guidance.gapsToClose?.length ?? 0) > 0) && (
                <div className="gd-cols">
                  {(guidance.strengthsToSell?.length ?? 0) > 0 && (
                    <div className="st-tone-sage">
                      <p className="st-label">Strengths to sell</p>
                      <div className="gd-list">
                        {guidance.strengthsToSell!.map((s, i) => (
                          <div key={i} className="gd-item">
                            <p className="gd-item__title">{s.strength}</p>
                            <p className="gd-item__body">{s.evidence}</p>
                            {s.howToPitch && (
                              <p className="gd-pitch">
                                <Megaphone
                                  className="mt-0.5 h-4 w-4 shrink-0"
                                  aria-hidden
                                />
                                {s.howToPitch}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(guidance.gapsToClose?.length ?? 0) > 0 && (
                    <div className="st-tone-wheat">
                      <p className="st-label">Gaps to close</p>
                      <div className="gd-list">
                        {guidance.gapsToClose!.map((g, i) => (
                          <div key={i} className="gd-item">
                            <p className="gd-item__title">
                              <span>{g.gap}</span>
                              {g.severity && (
                                <span
                                  className={`st-pill st-tone-${severityTone(g.severity)} shrink-0`}
                                >
                                  {sentence(g.severity)}
                                </span>
                              )}
                            </p>
                            <p className="gd-item__body">{g.fastestFix}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(guidance.trajectoryOptions?.length ?? 0) > 0 && (
                <div>
                  <p className="st-label st-tone-cobalt">Paths open to you</p>
                  <div className="gd-options mt-3">
                    {guidance.trajectoryOptions!.map((t, i) => {
                      const v = Math.max(
                        4,
                        Math.min(100, Number(t.viability) || 0),
                      );
                      return (
                        <div
                          key={i}
                          className={`gd-option st-tone-${fitTone(v)}`}
                        >
                          <p className="gd-option__path">{t.path}</p>
                          <div className="gd-fit">
                            <span className="gd-fit__bar" aria-hidden>
                              <i style={{ width: `${v}%` }} />
                            </span>
                            <b>{Math.round(v)}% fit</b>
                          </div>
                          <p className="st-small">{t.whyItFits}</p>
                          <p className="gd-option__meta">
                            <strong>First milestone:</strong> {t.firstMilestone}
                            {t.timeToCredible && (
                              <>
                                <br />
                                <strong>Credible in:</strong> {t.timeToCredible}
                              </>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(guidance.certificationMoves?.length ?? 0) > 0 && (
                <div className="st-tone-sage">
                  <p className="st-label">Certificate moves</p>
                  <div className="gd-list">
                    {guidance.certificationMoves!.map((c, i) => (
                      <div key={i} className="gd-item">
                        <p className="gd-item__title">
                          <span>{c.certification}</span>
                          {c.action && (
                            <span className="st-pill st-tone-sage shrink-0">
                              {sentence(c.action)}
                            </span>
                          )}
                        </p>
                        <p className="gd-item__body">
                          {c.why}
                          {c.timeline ? ` (${c.timeline})` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {guidance.narrative &&
                (guidance.narrative.elevatorPitch ||
                  guidance.narrative.linkedinHeadline) && (
                  <div className="space-y-4">
                    <p className="st-label st-tone-cobalt">Your story</p>
                    {guidance.narrative.elevatorPitch && (
                      <div className="space-y-2">
                        <blockquote className="gd-quote">
                          {guidance.narrative.elevatorPitch}
                        </blockquote>
                        <button
                          type="button"
                          onClick={() =>
                            copyPitch(guidance.narrative!.elevatorPitch!)
                          }
                          className="st-textbtn inline-flex items-center gap-1.5"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                          Copy the pitch
                        </button>
                      </div>
                    )}
                    {guidance.narrative.linkedinHeadline && (
                      <p className="st-body">
                        <span className="st-label st-label--muted mr-2">
                          LinkedIn headline
                        </span>
                        <strong className="font-semibold text-[color:var(--cc-ink)]">
                          {guidance.narrative.linkedinHeadline}
                        </strong>
                      </p>
                    )}
                    {guidance.narrative.storyArc && (
                      <p className="st-body max-w-[70ch]">
                        {guidance.narrative.storyArc}
                      </p>
                    )}
                  </div>
                )}

              {(guidance.nextActions?.length ?? 0) > 0 && (
                <div>
                  <p className="st-label st-tone-clay">Do next</p>
                  <ol className="gd-next mt-3">
                    {guidance.nextActions!.map((a, i) => (
                      <li key={i}>
                        <div className="min-w-0">
                          <p>{a.action}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {a.impact && (
                              <span
                                className={`st-pill st-tone-${severityTone(a.impact)}`}
                              >
                                {sentence(a.impact)} impact
                              </span>
                            )}
                            {a.due && <span className="st-pill">{a.due}</span>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <details className="st-fold">
                <summary>Ask something else, or get a fresh read</summary>
                <div className="mt-4">{askControls}</div>
              </details>
            </>
          ) : (
            <>
              <p className="st-body max-w-2xl">
                The coach reads your profile, practice and the job market for{" "}
                {field || "the job you're going for"}, then tells you where you
                stand, what to sell, what to close, and which paths are open.
              </p>
              {askControls}
            </>
          )}
        </div>
      </NotebookSection>

      {/* ── 02 Your roadmap ── */}
      <NotebookSection
        id="guide-roadmap"
        n="02"
        title="Your roadmap"
        tone="wheat"
        summary={
          roadmap
            ? `${roadmap.title ?? "Your route to the job"}${phases.length ? ` · ${phases.length} phases` : ""}`
            : "A week-by-week route to the job, phase by phase"
        }
      >
        <div className="space-y-8 pt-4">
          {roadmap ? (
            <>
              <SavedLine at={roadmapSavedAt} what="Rebuild the roadmap" />

              {(roadmap.title || roadmap.northStar) && (
                <div className="gd-north">
                  <span className="gd-north__icon" aria-hidden>
                    <Mountain className="h-[18px] w-[18px]" />
                  </span>
                  <h4>{roadmap.title ?? "Where this leads"}</h4>
                  {roadmap.northStar && <p>{roadmap.northStar}</p>}
                </div>
              )}

              {phases.length > 1 && (
                <nav
                  className="gd-route"
                  aria-label="The route, phase by phase"
                >
                  {phases.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openPhase(i)}
                      aria-current={activePhase === i}
                      className={`gd-stop st-tone-${PHASE_TONES[i % PHASE_TONES.length]}`}
                    >
                      <span className="gd-stop__n">{i + 1}</span>
                      <span className="gd-stop__weeks">
                        {weeksLabel(p.weeks)}
                      </span>
                      <span className="gd-stop__name">{p.name}</span>
                    </button>
                  ))}
                </nav>
              )}

              {phases.length > 0 && (
                <div className="gd-path">
                  {phases.map((p, i) => {
                    const tone = PHASE_TONES[i % PHASE_TONES.length];
                    return (
                      <div key={i} className={`gd-phase st-tone-${tone}`}>
                        <span className="gd-phase__n" aria-hidden>
                          {i + 1}
                        </span>
                        <details
                          ref={(el) => {
                            phaseRefs.current[i] = el;
                          }}
                          open={i === 0}
                          onToggle={(e) =>
                            e.currentTarget.open && setActivePhase(i)
                          }
                          className="gd-phase__card"
                        >
                          <summary>
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="gd-phase__name">{p.name}</span>
                                {p.weeks && (
                                  <span className={`st-pill st-tone-${tone}`}>
                                    {weeksLabel(p.weeks)}
                                  </span>
                                )}
                              </span>
                              <span className="gd-phase__aim block">
                                {p.objective}
                              </span>
                            </span>
                            <span className="gd-phase__chev" aria-hidden>
                              <ChevronDown className="h-4 w-4" />
                            </span>
                          </summary>
                          <div className="gd-phase__body">
                            {(p.skillTargets?.length ?? 0) > 0 && (
                              <div
                                className="st-targets"
                                aria-label="Skill levels this phase aims for"
                              >
                                {p.skillTargets!.map((t, j) => (
                                  <div key={j} className="st-target">
                                    <span className="st-target__name">
                                      {t.skill}
                                    </span>
                                    <span className="st-track" aria-hidden>
                                      <span
                                        className="st-track__now"
                                        style={{
                                          width: `${Math.max(2, Math.min(100, t.from))}%`,
                                        }}
                                      />
                                      <span
                                        className="st-track__goal"
                                        style={{
                                          left: `${Math.min(100, t.to)}%`,
                                        }}
                                      />
                                    </span>
                                    <span className="st-target__nums">
                                      {t.from} → {t.to}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {(p.actions?.length ?? 0) > 0 && (
                              <div className="gd-acts">
                                {p.actions!.map((a, j) => {
                                  const actTone =
                                    ACTION_TONE[a.type?.toLowerCase()] ??
                                    "slate";
                                  return (
                                    <div
                                      key={j}
                                      className={`gd-act st-tone-${actTone}`}
                                    >
                                      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                                        {a.type && (
                                          <span
                                            className={`st-pill st-tone-${actTone}`}
                                          >
                                            {sentence(a.type)}
                                          </span>
                                        )}
                                        <p className="gd-act__what min-w-0 flex-1">
                                          {a.action}
                                        </p>
                                      </div>
                                      {(a.cadence || a.doneWhen) && (
                                        <p className="gd-act__meta">
                                          {a.cadence && (
                                            <span>
                                              <strong>How often:</strong>{" "}
                                              {a.cadence}
                                            </span>
                                          )}
                                          {a.doneWhen && (
                                            <span>
                                              <strong>Done when:</strong>{" "}
                                              {a.doneWhen}
                                            </span>
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {p.checkpoint?.test && (
                              <div className="gd-checkpoint">
                                <Flag className="h-4 w-4" aria-hidden />
                                <span>
                                  <strong className="font-semibold">
                                    Checkpoint:
                                  </strong>{" "}
                                  {p.checkpoint.test}
                                  {p.checkpoint.passBar ? (
                                    <>
                                      {" "}
                                      <span className="text-[color:var(--cc-signal-deep)]">
                                        Pass when {p.checkpoint.passBar}
                                      </span>
                                    </>
                                  ) : null}
                                </span>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    );
                  })}
                </div>
              )}

              {((roadmap.weeklyRhythm?.length ?? 0) > 0 ||
                roadmap.interviewCadence ||
                (roadmap.certificationTrack?.length ?? 0) > 0 ||
                (roadmap.riskFactors?.length ?? 0) > 0) && (
                <div className="gd-extras">
                  {(roadmap.weeklyRhythm?.length ?? 0) > 0 && (
                    <div className="gd-box st-tone-cobalt">
                      <p className="st-label">A typical week</p>
                      <div className="gd-rhythm">
                        {(() => {
                          const longest = Math.max(
                            1,
                            ...roadmap.weeklyRhythm!.map((r) => r.minutes || 0),
                          );
                          return roadmap.weeklyRhythm!.map((r, i) => (
                            <div key={i} className="gd-rhythm__row">
                              <b>{r.day}</b>
                              <span>
                                {r.block}
                                <i
                                  className="gd-rhythm__bar"
                                  style={{
                                    width: `${Math.round(((r.minutes || 0) / longest) * 100)}%`,
                                  }}
                                />
                              </span>
                              <span>{r.minutes} min</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {roadmap.interviewCadence && (
                    <div className="gd-box st-tone-clay">
                      <p className="st-label">Mock interviews</p>
                      <p className="mt-3 flex items-baseline gap-2">
                        <span className="gd-big">
                          {roadmap.interviewCadence.mocksPerWeek}
                        </span>
                        <span className="st-small">a week</span>
                      </p>
                      {(roadmap.interviewCadence.focusRotation?.length ?? 0) >
                        0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {roadmap.interviewCadence.focusRotation.map(
                            (f, i) => (
                              <span key={i} className="st-pill st-tone-clay">
                                {f}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(roadmap.certificationTrack?.length ?? 0) > 0 && (
                    <div className="gd-box st-tone-sage">
                      <p className="st-label">Certificates along the way</p>
                      <div className="gd-certs">
                        {roadmap.certificationTrack!.map((c, i) => (
                          <div key={i} className="gd-cert">
                            <span className="st-pill st-tone-sage">
                              Week {c.targetWeek}
                            </span>
                            <p>
                              <strong>{c.certification}</strong>
                              {c.why ? ` — ${c.why}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(roadmap.riskFactors?.length ?? 0) > 0 && (
                    <div className="gd-box st-tone-wheat">
                      <p className="st-label">What could get in the way</p>
                      <div className="gd-risks">
                        {roadmap.riskFactors!.map((r, i) => (
                          <div key={i} className="gd-risk">
                            <p>{r.risk}</p>
                            <p>{r.mitigation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <details className="st-fold">
                <summary>Change the length or rebuild</summary>
                <div className="mt-4">{roadmapControls}</div>
              </details>
            </>
          ) : (
            <>
              <p className="st-body max-w-2xl">
                A week-by-week route to {field || "the job you're going for"}:
                phases with skill targets from your real levels, actions with a
                clear "done when", a checkpoint to pass at the end of each, plus
                mock interviews and certificates along the way.
              </p>
              {roadmapControls}
            </>
          )}
        </div>
      </NotebookSection>
    </div>
  );
}

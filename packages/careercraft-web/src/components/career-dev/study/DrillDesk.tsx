/**
 * Today's drill, as an index card to write on.
 *
 * The coach picks the skill that's most due (or one they choose) and sets one
 * short exercise. They write an answer and the coach marks it point by point,
 * or they rate themselves. Either way the drill is kept in their log, and the
 * skill's level moves.
 *
 * Nothing written is lost: "Save for later" puts the drill (and the answer so
 * far) in the tray below; starting another drill puts a half-written one there
 * first; and the card in progress survives switching tabs or reloading, in
 * this browser, until it's finished, saved or thrown away.
 *
 * A drill started from a study-plan session is built around that session's
 * task, and finishing it (now or after saving it for later) ticks the session.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { careerCoach, CoachUnavailableError, type Drill, type DrillResult, type DrillScheduling } from "@/lib/careerCoach";
import { DrillMarks } from "@/features/interview/components/DrillMarks";
import {
  deleteDrill,
  finishDrill,
  saveDrill,
  signedInUserId,
  useRefreshDrills,
  type DrillRow,
  type PlanOrigin,
} from "@/features/interview/lib/drills";
import { savedAgo } from "@/lib/savedResults";

interface Current {
  /** The saved row it came from, once it has been put aside. */
  id: string | null;
  exercise: Drill;
  scheduling: DrillScheduling;
  /** The plan session it came from, if any. */
  origin?: PlanOrigin | null;
}

/** A drill asked for from elsewhere; a new n starts one. */
export interface DrillRequest {
  skill?: string;
  /** A study-plan task to build it around. */
  focus?: string;
  origin?: PlanOrigin;
  n: number;
}

/* The card in progress, kept per browser so a tab switch or reload doesn't lose it. */
const DRAFT_KEY = "faircopy.study.drill";
type Draft = Current & { answer: string; userId: string };

function readDraft(): Draft | null {
  try {
    const d = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null") as Draft | null;
    return d?.exercise?.prompt && d.scheduling?.skill && d.userId ? d : null;
  } catch {
    return null;
  }
}
function writeDraft(d: Draft | null): void {
  try {
    if (d) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage blocked: the card just won't survive a reload */
  }
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function DrillDesk({
  field,
  skills,
  saved,
  doneCount,
  request,
  onFinished,
}: {
  field?: string;
  /** The open plan's skills, offered as quick picks. */
  skills: string[];
  /** Drills put aside to finish later. */
  saved: DrillRow[];
  /** How many they've finished, to number the card (null until known). */
  doneCount: number | null;
  /** A drill asked for elsewhere ("Practise it", a plan session). */
  request: DrillRequest | null;
  /** A drill from a plan session was finished: tick that session. */
  onFinished?: (origin: PlanOrigin) => void;
}) {
  const { toast } = useToast();
  const refresh = useRefreshDrills();

  const [current, setCurrent] = useState<Current | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<DrillResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"coach" | "self" | "save" | "delete" | null>(null);
  const [rating, setRating] = useState(false);
  const [score, setScore] = useState(6);
  const [confirm, setConfirm] = useState<"discard" | "delete" | null>(null);
  const [ownSkill, setOwnSkill] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  // What the saved copy holds, so closing a resumed drill only writes when it changed.
  const savedAnswer = useRef("");
  // Set once a drill is asked for from elsewhere, so a card coming back from
  // the last visit can't land on top of it.
  const requested = useRef(false);
  const [cardNo, setCardNo] = useState<number | null>(null);

  // Bring back the card in progress, if it's this person's.
  useEffect(() => {
    let cancelled = false;
    void signedInUserId().then((id) => {
      if (cancelled) return;
      setUid(id);
      const d = readDraft();
      if (d && id && d.userId === id) {
        if (!requested.current) {
          setCurrent({ id: d.id, exercise: d.exercise, scheduling: d.scheduling, origin: d.origin ?? null });
          setAnswer(d.answer);
          savedAnswer.current = d.id ? d.answer : "";
        } else if (d.answer.trim()) {
          // Another drill was asked for: the one from last time goes in the tray.
          void saveDrill({ id: d.id, exercise: d.exercise, scheduling: d.scheduling, field, answer: d.answer, origin: d.origin })
            .then(() => refresh())
            .catch(() => undefined);
        }
      } else if (d) {
        writeDraft(null);
      }
    });
    return () => {
      cancelled = true;
    };
    // Once, on opening: later changes to field or refresh mustn't bring the card back again.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The card's number is fixed when it opens, so it doesn't jump once it's logged.
  useEffect(() => {
    if (!current) setCardNo(null);
    else if (cardNo === null && doneCount !== null) setCardNo(doneCount + 1);
  }, [current, doneCount, cardNo]);

  // Keep it while it's open and unmarked.
  useEffect(() => {
    if (!uid) return;
    writeDraft(current && !result ? { ...current, answer, userId: uid } : null);
  }, [current, answer, result, uid]);

  const reset = () => {
    setCurrent(null);
    setAnswer("");
    setResult(null);
    setRating(false);
    setConfirm(null);
    setScore(6);
    savedAnswer.current = "";
  };

  const notAvailable = (e: unknown) => {
    toast({
      title: "Not available",
      description: e instanceof CoachUnavailableError ? e.message : "The coach isn't available at the moment.",
      variant: "destructive",
    });
  };

  /** Put the open card in the tray, with what's written so far. */
  const putAside = async (why: "asked" | "switching"): Promise<boolean> => {
    if (!current) return true;
    setBusy("save");
    try {
      await saveDrill({
        id: current.id,
        exercise: current.exercise,
        scheduling: current.scheduling,
        field,
        answer,
        origin: current.origin,
      });
      void refresh();
      toast({
        title: why === "asked" ? "Saved for later" : "Your unfinished drill was saved for later",
        description: "It's waiting under Saved drills.",
      });
      return true;
    } catch {
      toast({ title: "Couldn't save it", description: "Try again in a moment.", variant: "destructive" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const start = async (skill?: string, focus?: string, origin?: PlanOrigin) => {
    // A half-written answer is never thrown away by starting something else.
    if (current && !result && answer.trim() && answer !== savedAnswer.current) {
      if (!(await putAside("switching"))) return;
    }
    reset();
    setLoading(true);
    try {
      const r = await careerCoach.nextDrill({ field: field || undefined, ...(skill && { skill }), ...(focus && { focus }) });
      setCurrent({ id: null, exercise: r.drill, scheduling: r.scheduling, origin: origin ?? null });
    } catch (e) {
      notAvailable(e);
    } finally {
      setLoading(false);
    }
  };

  // "Practise it" from Learn it, History or Home.
  const lastRequest = useRef(0);
  useEffect(() => {
    if (!request || request.n === lastRequest.current) return;
    lastRequest.current = request.n;
    requested.current = true;
    void start(request.skill, request.focus, request.origin);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  const resume = async (row: DrillRow) => {
    if (current?.id === row.id) return;
    if (current && !result && answer.trim() && answer !== savedAnswer.current) {
      if (!(await putAside("switching"))) return;
    }
    reset();
    setCurrent({
      id: row.id,
      exercise: row.exercise,
      scheduling: row.scheduling ?? {
        skill: row.skill,
        proficiency: 0,
        difficulty: row.exercise.difficulty,
        whyNow: "saved for later",
        nextReviewInDays: 1,
      },
      origin: row.origin,
    });
    setAnswer(row.answer ?? "");
    savedAnswer.current = row.answer ?? "";
  };

  /** One result per drill: recording twice would move the skill twice. */
  const check = async (how: "coach" | "self") => {
    if (!current || result) return;
    const { exercise, scheduling, origin } = current;
    setBusy(how);
    try {
      const r = await careerCoach.recordDrillResult(
        how === "coach"
          ? {
              skill: scheduling.skill,
              answerText: answer.trim(),
              drill: {
                prompt: exercise.prompt,
                type: exercise.type,
                difficulty: exercise.difficulty,
                idealAnswerPoints: exercise.idealAnswerPoints,
              },
              field: field || undefined,
            }
          : { skill: scheduling.skill, score },
      );
      setResult(r);
      setRating(false);
      if (origin) onFinished?.(origin);
      try {
        await finishDrill({ id: current.id, exercise, scheduling, field, answer, result: r, origin });
        void refresh();
      } catch {
        toast({
          title: "Marked, but not added to your log",
          description: "Your skill level moved; this drill couldn't be kept.",
          variant: "destructive",
        });
      }
    } catch (e) {
      notAvailable(e);
    } finally {
      setBusy(null);
    }
  };

  /** Close the card. A resumed drill keeps its place in the tray, with any new writing. */
  const close = async () => {
    if (current?.id && !result && answer !== savedAnswer.current) {
      if (!(await putAside("asked"))) return;
    }
    reset();
  };

  const cancel = () => {
    if (!current) return;
    if (current.id || result || !answer.trim()) void close();
    else setConfirm("discard");
  };

  const removeSaved = async (id: string) => {
    setBusy("delete");
    try {
      await deleteDrill(id);
      void refresh();
      if (current?.id === id) reset();
      toast({ title: "Drill deleted" });
    } catch {
      toast({ title: "Couldn't delete it", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const tray = saved.filter((r) => r.id !== current?.id);
  const quickSkills = skills.slice(0, 5);
  const marking = busy === "coach" || busy === "self";

  return (
    <div className="space-y-6 pt-4">
      {loading ? (
        <div className="st-card" aria-busy="true">
          <div className="st-card__top">
            <span className="st-card__meta">
              <b>Drill</b>
              <span>Picking what's due…</span>
            </span>
          </div>
          <div className="mt-5 space-y-3">
            <div className="h-5 w-4/5 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
            <div className="h-5 w-3/5 animate-pulse rounded bg-[color:var(--cc-cream-2)]" />
          </div>
        </div>
      ) : current ? (
        <article className="st-card" aria-label={`Drill on ${current.scheduling.skill}`}>
          <div className="st-card__top">
            <span className="st-card__meta">
              <b>{cardNo ? `Drill Nº ${cardNo}` : "Drill"}</b>
              <span>{current.scheduling.skill}</span>
              <span>{current.exercise.difficulty}</span>
              {current.exercise.timeboxMinutes ? <span>{current.exercise.timeboxMinutes} min</span> : null}
              {current.origin && <span>From your plan · {current.origin.label}</span>}
              {current.id && !result && <span>Saved</span>}
            </span>
            {!result && (
              <button type="button" onClick={cancel} className="st-textbtn" disabled={marking}>
                {current.id ? "Close" : "Cancel"}
              </button>
            )}
          </div>

          <p className="st-card__prompt">{current.exercise.prompt}</p>
          {current.scheduling.whyNow && <p className="st-card__why">Why this one: {current.scheduling.whyNow}</p>}

          <label htmlFor="drill-answer" className="st-label st-label--muted mt-6 block">
            Your answer
          </label>
          <textarea
            id="drill-answer"
            className="st-ruled mt-1"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={Boolean(result) || marking}
            placeholder="Write it the way you'd say it. The coach marks it against what a strong answer covers."
          />
          {!result && (
            <p className="st-small mt-2 text-right st-mono text-[12px]">
              {words(answer)} {words(answer) === 1 ? "word" : "words"}
            </p>
          )}

          {confirm === "discard" && (
            <div className="st-confirm mt-4" role="group" aria-label="Throw this drill away?">
              <span>Throw this drill away? What you wrote goes with it.</span>
              <button type="button" onClick={() => void putAside("asked").then((ok) => ok && reset())} className="cc-action cc-action--sm">
                Save it for later instead
              </button>
              <button type="button" onClick={reset} className="cc-action cc-action--danger cc-action--sm">
                Throw away
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="st-textbtn">
                Keep writing
              </button>
            </div>
          )}

          {confirm === "delete" && current.id && (
            <div className="st-confirm mt-4" role="group" aria-label="Delete this saved drill?">
              <span>Delete this saved drill and what you wrote?</span>
              <button
                type="button"
                onClick={() => void removeSaved(current.id!)}
                disabled={busy === "delete"}
                className="cc-action cc-action--danger cc-action--sm"
              >
                Delete
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="st-textbtn">
                Keep it
              </button>
            </div>
          )}

          {!result && !confirm && !rating && (
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="button"
                onClick={() => void check("coach")}
                disabled={marking || answer.trim().length < 20}
                className="cc-action"
              >
                {busy === "coach" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Marking…
                  </>
                ) : (
                  "Check my answer"
                )}
              </button>
              <button
                type="button"
                onClick={() => void putAside("asked").then((ok) => ok && reset())}
                disabled={marking || busy === "save"}
                className="cc-action cc-action--ghost"
              >
                {busy === "save" ? "Saving…" : current.id ? "Save and close" : "Save for later"}
              </button>
              <button type="button" onClick={() => setRating(true)} disabled={marking} className="st-textbtn">
                Skip writing, rate myself
              </button>
              {current.id && (
                <button type="button" onClick={() => setConfirm("delete")} className="st-textbtn st-textbtn--danger">
                  Delete
                </button>
              )}
              {answer.trim().length > 0 && answer.trim().length < 20 && (
                <span className="st-small">Write a little more for the coach to mark.</span>
              )}
            </div>
          )}

          {rating && !result && (
            <div className="mt-5 rounded-xl border border-dashed border-[color:var(--cc-hair-strong)] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="drill-self" className="st-label st-label--muted">
                  How did you do?
                </label>
                <span className="st-h text-2xl">
                  {score}
                  <span className="text-sm text-[color:var(--cc-ash)]">/10</span>
                </span>
              </div>
              <input
                id="drill-self"
                type="range"
                min={0}
                max={10}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="mt-3 w-full accent-[color:var(--cc-rust)]"
              />
              <div className="st-mono mt-1 flex justify-between text-[11px] text-[color:var(--cc-ash)]">
                <span>Struggled</span>
                <span>Nailed it</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => void check("self")} disabled={marking} className="cc-action cc-action--sm">
                  {busy === "self" ? "Recording…" : "Record my rating"}
                </button>
                <button type="button" onClick={() => setRating(false)} className="st-textbtn">
                  Back to writing
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-5 border-t border-dashed border-[color:var(--cc-hair-strong)] pt-6">
              <DrillMarks result={result} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <button type="button" onClick={() => void start()} className="cc-action">
                  Next drill
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => void start(current.scheduling.skill)} className="cc-action cc-action--ghost">
                  Another on this skill
                </button>
                <button type="button" onClick={reset} className="st-textbtn">
                  Done for now
                </button>
              </div>
            </div>
          )}

          {((current.exercise.idealAnswerPoints?.length ?? 0) > 0 || (current.exercise.selfCheck?.length ?? 0) > 0) && (
            <details className="st-fold mt-6">
              <summary>{result ? "What a strong answer covers" : "Peek at what a strong answer covers"}</summary>
              <div className="mt-3 grid gap-5 md:grid-cols-2">
                {(current.exercise.idealAnswerPoints?.length ?? 0) > 0 && (
                  <div>
                    <p className="st-label st-label--muted">A strong answer includes</p>
                    <ul className="mt-1">
                      {current.exercise.idealAnswerPoints.map((p, i) => (
                        <li key={i} className="st-check">
                          <span className="st-box" aria-hidden />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(current.exercise.selfCheck?.length ?? 0) > 0 && (
                  <div>
                    <p className="st-label st-label--muted">Ask yourself</p>
                    <ul className="mt-1">
                      {current.exercise.selfCheck.map((p, i) => (
                        <li key={i} className="st-check">
                          <span className="st-box" aria-hidden />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          )}
        </article>
      ) : (
        <div className="space-y-5">
          <p className="st-body max-w-2xl">
            One short exercise on the skill that's most due. Write your answer and the coach marks it point by point;
            the mark moves that skill's level and decides when it comes back.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void start()} className="cc-action">
              Start today's drill
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div>
            <p className="st-label st-label--muted">Or pick the skill</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {quickSkills.map((s) => (
                <button key={s} type="button" onClick={() => void start(s)} className="st-chip">
                  {s}
                </button>
              ))}
              <form
                className="flex min-w-[220px] flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (ownSkill.trim().length >= 2) void start(ownSkill.trim());
                }}
              >
                <input
                  value={ownSkill}
                  onChange={(e) => setOwnSkill(e.target.value)}
                  maxLength={100}
                  placeholder="Any other skill…"
                  aria-label="Drill a skill of your choice"
                  className="st-input"
                />
                <button type="submit" disabled={ownSkill.trim().length < 2} className="cc-action cc-action--ghost cc-action--sm">
                  Go
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {tray.length > 0 && (
        <div>
          <p className="st-label st-label--muted">Saved drills · {tray.length}</p>
          <div className="st-tray mt-3">
            {tray.map((row) => (
              <SavedSlip
                key={row.id}
                row={row}
                busy={busy !== null}
                onResume={() => void resume(row)}
                onDelete={() => void removeSaved(row.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SavedSlip({
  row,
  busy,
  onResume,
  onDelete,
}: {
  row: DrillRow;
  busy: boolean;
  onResume: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="st-slip">
      <div className="flex items-baseline justify-between gap-3">
        <span className="st-label">{row.skill}</span>
        <span className="st-small st-mono text-[11.5px]">{savedAgo(row.updatedAt).replace(/^Saved /, "")}</span>
      </div>
      <p className="st-slip__prompt">{row.exercise.prompt}</p>
      {row.answer && <p className="st-small">Half written · {words(row.answer)} words so far</p>}
      {confirming ? (
        <div className="st-confirm" role="group" aria-label="Delete this saved drill?">
          <span>Delete it?</span>
          <button type="button" onClick={onDelete} disabled={busy} className="cc-action cc-action--danger cc-action--sm">
            Delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="st-textbtn">
            Keep it
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={onResume} disabled={busy} className="cc-action cc-action--sm">
            {row.answer ? "Carry on" : "Start it"}
          </button>
          <button type="button" onClick={() => setConfirming(true)} className="st-textbtn st-textbtn--danger">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

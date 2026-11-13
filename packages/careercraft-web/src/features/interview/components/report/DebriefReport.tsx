/**
 * The debrief, laid out to be read: the verdict up top, then what the panel
 * said sorted into coloured groups (what worked, where it fell short, what
 * wasn't tested, what interviewers will expect), how each stage and skill
 * scored, and the next step: the plan, and a study plan built from it.
 *
 * Used straight after an interview (with the transcript below it, so question
 * numbers link to answers) and in History (compact, no transcript).
 */
import { useId, type ReactNode } from "react";
import { AlertCircle, Check, CircleDashed, StickyNote, Target, type LucideIcon } from "lucide-react";

import { CAREER_COACH_AVAILABLE } from "@/lib/careerCoach";
import type { CoachFinalEvaluation } from "@/lib/interviewCoach";

import type { NoteKind } from "../../lib/debriefText";
import { dashList, scoreBand, scoreOn10 } from "../../lib/debriefText";
import { normalizeScore100 } from "../../lib/sessions";
import { roundClass, type RoundType } from "../../lib/roundTypes";
import { RoundDebriefExtras } from "../RoundDebriefExtras";
import { debriefGroups, type GroupItem } from "./groups";
import { Marked } from "./Marked";
import { StudyPlanOffer } from "./StudyPlanOffer";
import "./report.css";

type ShownKind = Exclude<NoteKind, "next">;

const GROUPS: Array<{ kind: ShownKind; title: string; icon: LucideIcon }> = [
  { kind: "worked", title: "What worked", icon: Check },
  { kind: "gap", title: "Where it fell short", icon: AlertCircle },
  { kind: "untested", title: "Not tested yet", icon: CircleDashed },
  { kind: "expect", title: "What interviewers will expect", icon: Target },
  { kind: "note", title: "Also noted", icon: StickyNote },
];

function readinessTone(readiness: string): "good" | "close" | "far" {
  const r = readiness.toLowerCase();
  if (r.includes("almost")) return "close";
  if (r.includes("ready") && !r.includes("not")) return "good";
  return "far";
}

/* A no, however it's worded: "No Hire", "Would not hire", "Do not proceed",
   "Not yet ready to advance", "Reject". */
const NEGATIVE_CALL =
  /\b(?:no|not|never|don.?t|do not|would not|wouldn.?t|won.?t|cannot|can.?t)\b[\w\s'-]{0,24}?\b(?:hire|advance|proceed|recommend\w*|ready|forward)\b|\breject|\bdecline/;

/* The panel's call: any no is red, "Lean" is amber, only a plain hire or
   advance is green, and anything else stays neutral rather than guessed green. */
function recommendationTone(rec: string): "good" | "close" | "far" | "neutral" {
  const r = rec.toLowerCase();
  if (NEGATIVE_CALL.test(r)) return "far";
  if (/\blean\b/.test(r)) return "close";
  if (/\bhire\b|\badvance\b|\brecommend|\bput forward\b|\bproceed\b/.test(r)) return "good";
  return "neutral";
}

/** A score the model gave out of 10 or 100, on 0-10; null when there isn't one. */
const on10 = (score: number | null) => (score === null ? null : scoreOn10(score));

export function DebriefReport({
  evaluation: ev,
  roundType,
  field,
  compact = false,
  onQuestion,
  offerPlan = false,
  actions,
}: {
  evaluation: CoachFinalEvaluation;
  roundType: RoundType;
  field: string;
  compact?: boolean;
  /** Jump to an answer in the transcript, when one is on the page. */
  onQuestion?: (n: number) => void;
  /** Offer a study plan: only for the latest interview, which is what the coach plans from. */
  offerPlan?: boolean;
  /** Practise buttons, shown with the next step. */
  actions?: ReactNode;
}) {
  // History renders every stored debrief at once, so each report's anchors
  // need their own ids, and the jumps scroll instead of changing the URL.
  const uid = useId();
  const anchor = (kind: NoteKind) => `dr-${uid}-${kind}`;
  const jump = (kind: NoteKind) => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(anchor(kind))?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const groups = debriefGroups(ev);
  // No score on file shows as a dash, not as a failing 0.
  const overall = normalizeScore100(ev.overallScore);
  const shown = GROUPS.filter((g) => groups.items[g.kind].length > 0);
  const next = groups.items.next;
  const showPlan = offerPlan && CAREER_COACH_AVAILABLE;
  const nextCount = next.length + ev.improvementPlan.length;
  const hasScores = ev.stageBreakdown.length > 0 || ev.competencyMatrix.length > 0;
  const hasNext = ev.improvementPlan.length > 0 || next.length > 0 || showPlan || Boolean(actions);

  return (
    <div className={`dr ${roundClass(roundType)} ${compact ? "dr--compact" : ""}`}>
      {/* ── Verdict ─────────────────────────────────────────── */}
      <section className="dr-verdict">
        <div className="dr-verdict__score">
          <span className="dr-grade cc-font-display">{ev.grade || "—"}</span>
          <div>
            <p className="dr-points cc-tabular">
              {overall ?? "—"}
              {overall !== null && <span>/100</span>}
            </p>
            <span className="dr-ready" data-tone={readinessTone(ev.readiness)}>
              {ev.readiness}
            </span>
          </div>
          {ev.recommendation && (
            <span className="dr-stamp" data-tone={recommendationTone(ev.recommendation)} title="The panel's call">
              {ev.recommendation}
            </span>
          )}
        </div>
        <div className="dr-verdict__read">
          {groups.lead ? (
            <p className="dr-lead">
              <Marked text={groups.lead} onQuestion={onQuestion} />
            </p>
          ) : shown.length === 0 && nextCount === 0 ? (
            <p className="dr-lead text-[color:var(--cc-ash)]">
              {hasScores
                ? "No written notes came back for this session, only the scores below."
                : "No written feedback came back for this session."}
            </p>
          ) : (
            <>
              <p className="dr-verdict__label">The panel's notes, sorted</p>
              <ul className="dr-tally">
                {shown.map((g) => (
                  <li key={g.kind}>
                    <button type="button" onClick={() => jump(g.kind)} className="dr-tally__item" data-kind={g.kind}>
                      <span className="cc-tabular">{groups.items[g.kind].length}</span>
                      {g.title.toLowerCase()}
                    </button>
                  </li>
                ))}
                {nextCount > 0 && (
                  <li>
                    <button type="button" onClick={() => jump("next")} className="dr-tally__item" data-kind="next">
                      <span className="cc-tabular">{nextCount}</span>
                      what to do next
                    </button>
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* ── What the panel said, sorted ─────────────────────── */}
      {shown.length > 0 && (
        <section className="dr-groups">
          {shown.map((g) => (
            <Group
              key={g.kind}
              id={anchor(g.kind)}
              kind={g.kind}
              title={g.title}
              icon={g.icon}
              items={groups.items[g.kind]}
              onQuestion={onQuestion}
            />
          ))}
        </section>
      )}

      {/* ── How each stage and skill scored ─────────────────── */}
      {(ev.stageBreakdown.length > 0 || ev.competencyMatrix.length > 0) && (
        <section className="dr-scores">
          {ev.stageBreakdown.length > 0 && (
            <div className="dr-card">
              <h3 className="dr-card__title">How each stage went</h3>
              <ul className="dr-bars">
                {ev.stageBreakdown.map((s, i) => {
                  const v = on10(s.score);
                  return (
                    <li key={i}>
                      <div className="dr-bars__row">
                        <span className="dr-bars__name">{s.stage}</span>
                        {v !== null && <span className="dr-bars__num cc-tabular">{Math.round(v * 10) / 10}/10</span>}
                      </div>
                      {v !== null && (
                        <span className="dr-bar" data-band={scoreBand(v)}>
                          <i style={{ width: `${v * 10}%` }} />
                        </span>
                      )}
                      {s.verdict && (
                        <p className="dr-bars__note">
                          <Marked text={s.verdict} onQuestion={onQuestion} />
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {ev.competencyMatrix.length > 0 && (
            <div className="dr-card">
              <h3 className="dr-card__title">Skills it checked</h3>
              <ul className="dr-skills">
                {ev.competencyMatrix.map((c, i) => {
                  const v = on10(c.score);
                  const lit = v === null ? 0 : Math.max(1, Math.round(v / 2));
                  return (
                    <li key={i} className="dr-skills__row">
                      <span className="min-w-0">
                        <span className="dr-skills__name">{c.competency}</span>
                        {c.level && <span className="dr-skills__level">{c.level}</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {c.needsWork && <span className="dr-needs">Needs work</span>}
                        <span className="dr-pips" data-band={v === null ? "none" : scoreBand(v)} aria-label={v === null ? undefined : `${Math.round(v * 10) / 10} out of 10`}>
                          {[1, 2, 3, 4, 5].map((p) => (
                            <i key={p} className={p <= lit ? "on" : ""} />
                          ))}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* What only this kind of round produces: the recruiter's call, the
          story bank, or the depth map. */}
      <RoundDebriefExtras roundType={roundType} evaluation={ev} compact={compact} />

      {/* ── Next ─────────────────────────────────────────────── */}
      {hasNext && (
        <section id={anchor("next")} className="dr-next">
          <h2 className="dr-h2 cc-font-display">What to do next</h2>
          <div className={`dr-next__grid ${showPlan ? "has-plan" : ""}`}>
            {(ev.improvementPlan.length > 0 || next.length > 0) && (
              <ol className="dr-steps">
                {ev.improvementPlan.map((item, i) => (
                  <li key={`p${i}`}>
                    <span className="dr-steps__n cc-tabular">{i + 1}</span>
                    <div>
                      <p className="dr-steps__area">{item.area}</p>
                      <p className="dr-steps__text">
                        <Marked text={item.action} onQuestion={onQuestion} />
                      </p>
                      {item.timeline && <p className="dr-steps__when">{item.timeline}</p>}
                    </div>
                  </li>
                ))}
                {next.map((item, i) => (
                  <li key={`n${i}`}>
                    <span className="dr-steps__n cc-tabular">{ev.improvementPlan.length + i + 1}</span>
                    <p className="dr-steps__text">
                      <Marked text={item.text} onQuestion={onQuestion} />
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {showPlan && <StudyPlanOffer field={field} skills={ev.nextFocus.skills} why={ev.nextFocus.why} />}
          </div>
          {actions && <div className="dr-actions">{actions}</div>}
        </section>
      )}

      {groups.fullNote && (
        <details className="dr-full">
          <summary>Read the panel's full note</summary>
          <p>
            <Marked text={groups.fullNote} onQuestion={onQuestion} />
          </p>
        </details>
      )}
    </div>
  );
}

function Group({
  id,
  kind,
  title,
  icon: Icon,
  items,
  onQuestion,
}: {
  id: string;
  kind: ShownKind;
  title: string;
  icon: LucideIcon;
  items: GroupItem[];
  onQuestion?: (n: number) => void;
}) {
  return (
    <div id={id} className="dr-group" data-kind={kind}>
      <div className="dr-group__head">
        <span className="dr-group__icon" aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="dr-group__title">{title}</h3>
        <span className="dr-group__count cc-tabular">{items.length}</span>
      </div>
      {items.some((item) => item.chip) && (
        <div className="dr-chips dr-chips--head">
          {items
            .filter((item) => item.chip)
            .map((item, i) => (
              <span key={`${i}-${item.text}`} className="dr-chip">
                {item.text}
              </span>
            ))}
        </div>
      )}
      <ul className="dr-group__list">
        {items.filter((item) => !item.chip).map((item, i) => {
          // What wasn't tested is usually a list inside a sentence; show the
          // list as chips so it can be read at a glance.
          const list = kind === "untested" ? dashList(item.text) : null;
          return (
            <li key={i}>
              {item.fixFirst && <span className="dr-fixfirst">Fix first</span>}
              <Marked text={list ? list.rest : item.text} onQuestion={onQuestion} />
              {list && (
                <span className="dr-chips">
                  {list.items.map((c, j) => (
                    <span key={`${j}-${c}`} className="dr-chip">
                      {c}
                    </span>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

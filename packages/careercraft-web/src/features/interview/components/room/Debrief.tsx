/**
 * The Debrief: the report (verdict, what the panel said sorted by colour,
 * stage and skill scores, what to do next and a study plan), then the
 * per-question detail and the annotated transcript.
 * Overall scores display as /100; per-question as /10.
 */
import { ArrowRight, RotateCcw } from "lucide-react";
import type { CoachFinalEvaluation, CoachQuestion } from "@/lib/interviewCoach";
import { formatClock } from "../../lib/format";
import { parseRoundType, roundMeta } from "../../lib/roundTypes";
import type { AnswerRecord, SessionConfig } from "../../types";
import { ProofChip } from "../ProofChip";
import { RoundTag } from "../RoundMarks";
import { AnswerWorking } from "../AnswerFeedback";
import { DebriefReport } from "../report/DebriefReport";
import { debriefGroups } from "../report/groups";
import { scoreOn10 } from "../../lib/debriefText";

interface DebriefProps {
  config: SessionConfig;
  records: AnswerRecord[];
  evaluation: CoachFinalEvaluation;
  totalSeconds: number;
  onPracticeWeakAreas: (focusAreas: string[]) => void;
  /** Ask one question from this session again, on its own, coached. */
  onPracticeQuestion: (question: CoachQuestion) => void;
  onExit: () => void;
}

/** Open question n's entry in the transcript and bring it into view. */
function goToQuestion(n: number) {
  const el = document.getElementById(`debrief-q-${n}`);
  if (!(el instanceof HTMLDetailsElement)) return;
  el.open = true;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
}


function Trajectory({ records }: { records: AnswerRecord[] }) {
  const scored = records
    .map((r, i) => ({ i, score: r.evaluation?.score }))
    .filter((p): p is { i: number; score: number } => typeof p.score === "number");
  if (scored.length < 2) return null;

  const W = 560;
  const H = 72;
  const PAD = 8;
  const x = (idx: number) =>
    PAD + (idx / Math.max(1, records.length - 1)) * (W - PAD * 2);
  const y = (score: number) =>
    H - PAD - (scoreOn10(score) / 10) * (H - PAD * 2);
  const points = scored.map((p) => `${x(p.i)},${y(p.score)}`).join(" ");

  return (
    <div className="cc-surface p-5">
      <p className="cc-label-sm mb-3 text-[color:var(--cc-ash)]">
        Score trajectory <span className="opacity-70">(per question · /10)</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Per-question scores">
        <line
          x1={PAD}
          y1={y(5)}
          x2={W - PAD}
          y2={y(5)}
          stroke="var(--cc-hair)"
          strokeDasharray="3 4"
        />
        {/* The round's colour (set on the room), falling back to the accent. */}
        <polyline points={points} fill="none" stroke="var(--cc-iv, var(--cc-rust))" strokeWidth="2" />
        {scored.map((p) => (
          <g key={p.i}>
            <circle cx={x(p.i)} cy={y(p.score)} r="4" fill="var(--cc-iv, var(--cc-rust))" stroke="var(--cc-cream)" strokeWidth="2" />
            <text
              x={x(p.i)}
              y={H - 1}
              textAnchor="middle"
              fontSize="8"
              fill="var(--cc-ash)"
              fontFamily="JetBrains Mono, monospace"
            >
              Q{p.i + 1}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function TranscriptEntry({
  record,
  index,
  onPracticeQuestion,
}: {
  record: AnswerRecord;
  index: number;
  onPracticeQuestion: (question: CoachQuestion) => void;
}) {
  const ev = record.evaluation;
  const attemptScores = [...record.attempts.map((a) => a.evaluation?.score), ev?.score].filter(
    (s): s is number => typeof s === "number",
  );
  const over =
    record.question.timeAllocationMinutes &&
    record.timeTakenSeconds > record.question.timeAllocationMinutes * 60;
  const qScore =
    typeof ev?.score === "number"
      ? ev.score <= 10
        ? `${ev.score}/10`
        : `${Math.round(ev.score / 10)}/10`
      : null;

  return (
    <details id={`debrief-q-${index + 1}`} className="group cc-surface scroll-mt-24 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="cc-label-sm shrink-0 text-[color:var(--cc-ash)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="truncate text-sm text-[color:var(--cc-ink)]">
            {record.question.question}
          </span>
        </div>
        <span className="cc-font-mono shrink-0 text-xs tabular-nums text-[color:var(--cc-ink-soft)]">
          {record.skipped ? "skipped" : qScore ?? (record.evaluationFailed ? "—" : "…")}
        </span>
      </summary>

      <div className="space-y-5 border-t border-[color:var(--cc-hair)] px-5 py-5">
        <div className="cc-label-sm flex flex-wrap gap-x-4 gap-y-1 text-[color:var(--cc-ash)]">
          <span>{record.question.type?.replace(/_/g, " ")}</span>
          <span>{record.question.difficulty}</span>
          <span className={over ? "text-[color:var(--cc-wheat-deep)]" : ""}>
            {formatClock(record.timeTakenSeconds)}
            {record.question.timeAllocationMinutes
              ? ` / ${record.question.timeAllocationMinutes} min`
              : ""}
          </span>
          {record.hintsUsed > 0 && (
            <span>
              {record.hintsUsed} hint{record.hintsUsed === 1 ? "" : "s"}
            </span>
          )}
          {attemptScores.length > 1 && <span>attempts {attemptScores.join(" → ")}</span>}
        </div>

        {record.skipped ? (
          <p className="text-sm italic text-[color:var(--cc-ash)]">You skipped this question.</p>
        ) : ev?.highlights.length ? null : (
          // With highlights, the marked-up answer below shows it instead.
          <blockquote className="rounded-xl border-l-2 border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] px-4 py-3 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
            {record.answerText || "(no answer recorded)"}
          </blockquote>
        )}

        {ev ? (
          <>
            <AnswerWorking evaluation={ev} answer={record.answerText} delivery={record.delivery} compact />

            {!ev.scoring && Object.keys(ev.scoreBreakdown ?? {}).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(ev.scoreBreakdown).map(([key, value]) => (
                  <span
                    key={key}
                    className="cc-label-sm rounded-full border border-[color:var(--cc-hair)] px-2 py-1 text-[color:var(--cc-ink-soft)]"
                  >
                    {key.replace(/([a-z])([A-Z])/g, "$1 $2")} · {value}
                  </span>
                ))}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="cc-label-sm mb-1.5 text-[color:var(--cc-signal-deep)]">Landed</p>
                {ev.validation.correct.length ? (
                  <ul className="space-y-1 text-sm text-[color:var(--cc-ink-soft)]">
                    {ev.validation.correct.map((s, i) => (
                      <li key={i}>— {s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[color:var(--cc-ash)]">—</p>
                )}
              </div>
              <div>
                <p className="cc-label-sm mb-1.5 text-[color:var(--cc-wheat-deep)]">Missing</p>
                {ev.validation.missing.length ? (
                  <ul className="space-y-1 text-sm text-[color:var(--cc-ink-soft)]">
                    {ev.validation.missing.map((s, i) => (
                      <li key={i}>— {s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[color:var(--cc-ash)]">—</p>
                )}
              </div>
              <div>
                <p className="cc-label-sm mb-1.5 text-[color:var(--cc-rust-deep)]">Red flags</p>
                {ev.validation.redFlags.length ? (
                  <ul className="space-y-1 text-sm text-[color:var(--cc-ink-soft)]">
                    {ev.validation.redFlags.map((s, i) => (
                      <li key={i}>— {s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[color:var(--cc-ash)]">None detected.</p>
                )}
              </div>
            </div>

            {ev.bestAnswer && (
              <div>
                <p className="cc-label-sm mb-2 text-[color:var(--cc-ink)]">A stronger answer</p>
                <blockquote className="rounded-xl border-l-2 border-[color:var(--cc-rust)] bg-[color:var(--cc-cream-2)] px-4 py-3 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
                  {ev.bestAnswer}
                </blockquote>
              </div>
            )}

            {ev.improvement && (
              <p className="text-sm italic text-[color:var(--cc-ink-soft)]">
                Likely follow-up: "{ev.improvement}"
              </p>
            )}

            {ev.proof && <ProofChip proof={ev.proof} />}
          </>
        ) : record.skipped ? null : (
          <p className="text-sm text-[color:var(--cc-ash)]">
            Evaluation unavailable for this answer — its score still counts toward your history.
          </p>
        )}

        <button
          type="button"
          onClick={() => onPracticeQuestion(record.question)}
          className="cc-action cc-action--ghost cc-action--sm"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Practise this question again
        </button>
      </div>
    </details>
  );
}

export function Debrief({
  config,
  records,
  evaluation,
  totalSeconds,
  onPracticeWeakAreas,
  onPracticeQuestion,
  onExit,
}: DebriefProps) {
  const answered = records.filter((r) => r.answerText && !r.skipped);
  const skipped = records.filter((r) => r.skipped);
  const hints = records.reduce((n, r) => n + r.hintsUsed, 0);
  // What a weak-area drill aims at: the coach's lists, else its "focus next"
  // skills, else the gaps read out of a long summary.
  const improveItems = [...evaluation.mustFix, ...evaluation.weaknesses];
  const weakFocus = (
    improveItems.length
      ? improveItems
      : evaluation.nextFocus.skills.length
        ? evaluation.nextFocus.skills
        : debriefGroups(evaluation).items.gap.map((g) => g.text)
  ).slice(0, 6);
  const roundType = parseRoundType(config.roundType);
  const meta = roundMeta(roundType);

  const metaLine = [
    config.roundName && config.roundName !== meta.label ? config.roundName : null,
    config.field,
    config.seniority,
    config.mode === "realistic" ? "Realistic mode" : "Coached mode",
    `${answered.length} answered`,
    formatClock(totalSeconds),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-[900px] px-5 py-10 md:px-8 md:py-14">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="cc-eyebrow cc-tone-cobalt">The debrief</p>
          <RoundTag type={roundType} />
        </div>
        <h1 className="mt-4 cc-font-display text-4xl tracking-tight text-[color:var(--cc-ink)] md:text-5xl">
          {roundType === "screen" ? "How the call went" : "How you interviewed"}
        </h1>
        <p className="cc-label-sm mt-3 text-[color:var(--cc-ash)]">{metaLine}</p>
      </div>

      <DebriefReport
        evaluation={evaluation}
        roundType={roundType}
        field={config.field}
        onQuestion={goToQuestion}
        offerPlan
        actions={
          weakFocus.length > 0 ? (
            <button type="button" onClick={() => onPracticeWeakAreas(weakFocus)} className="cc-action cc-action--ghost">
              <RotateCcw className="h-4 w-4" />
              Drill the weak areas now
              <span className="font-normal text-[color:var(--cc-ash)]">a short coached {meta.noun}</span>
            </button>
          ) : null
        }
      />

      <div className="mt-8 space-y-6">
        <Trajectory records={records} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total time", value: formatClock(totalSeconds) },
            {
              label: "Avg / answer",
              value: answered.length
                ? formatClock(Math.round(totalSeconds / answered.length))
                : "—",
            },
            { label: "Hints used", value: String(hints) },
            {
              label: "Skipped",
              value: `${skipped.length} of ${records.length}`,
            },
          ].map((stat) => (
            <div key={stat.label} className="cc-surface p-4">
              <p className="cc-font-mono text-xl tabular-nums text-[color:var(--cc-ink)]">
                {stat.value}
              </p>
              <p className="cc-label-sm mt-1 text-[color:var(--cc-ash)]">{stat.label}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="cc-kicker mb-3">The transcript, annotated</p>
          <div className="space-y-3">
            {records.map((record, i) => (
              <TranscriptEntry key={i} record={record} index={i} onPracticeQuestion={onPracticeQuestion} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[color:var(--cc-hair-strong)] pt-6 sm:flex-row">
          <button type="button" onClick={onExit} className="cc-action flex-1">
            Back to interview prep
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

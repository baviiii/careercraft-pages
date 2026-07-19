/**
 * The Debrief — a hiring-committee packet for one session. Verdict, score
 * trajectory, assessment, improvement plan, then the full annotated
 * transcript. Everything renders from what the MCP returned; nothing invented.
 */
import { ArrowRight, BookOpen, RotateCcw } from "lucide-react";
import type { CoachFinalEvaluation } from "@/lib/interviewCoach";
import { formatClock } from "../../lib/format";
import type { AnswerRecord, SessionConfig } from "../../types";
import { ProofChip } from "../ProofChip";

interface DebriefProps {
  config: SessionConfig;
  records: AnswerRecord[];
  evaluation: CoachFinalEvaluation;
  totalSeconds: number;
  onPracticeWeakAreas: (focusAreas: string[]) => void;
  onResources: () => void;
  onExit: () => void;
}

function readinessTone(readiness: string): { color: string; bg: string } {
  const r = readiness.toLowerCase();
  if (r.includes("ready") && !r.includes("almost") && !r.includes("not")) {
    return { color: "var(--cc-signal-deep)", bg: "var(--cc-signal-soft)" };
  }
  if (r.includes("almost")) {
    return { color: "var(--cc-wheat-deep)", bg: "var(--cc-wheat-soft)" };
  }
  return { color: "var(--cc-rust-deep)", bg: "var(--cc-rust-soft)" };
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
  const y = (score: number) => H - PAD - (Math.max(0, Math.min(10, score)) / 10) * (H - PAD * 2);
  const points = scored.map((p) => `${x(p.i)},${y(p.score)}`).join(" ");

  return (
    <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-5">
      <p className="cc-label-sm mb-3 text-[color:var(--cc-ash)]">Score trajectory</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Per-question scores">
        <line x1={PAD} y1={y(5)} x2={W - PAD} y2={y(5)} stroke="var(--cc-hair)" strokeDasharray="3 4" />
        <polyline points={points} fill="none" stroke="var(--cc-rust)" strokeWidth="1.5" />
        {scored.map((p) => (
          <g key={p.i}>
            <circle cx={x(p.i)} cy={y(p.score)} r="3" fill="var(--cc-rust)" />
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

function AssessmentColumn({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-5">
      <p className="cc-label-sm mb-3" style={{ color: tone }}>
        {title}
      </p>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-[color:var(--cc-ink-soft)]">
              <span aria-hidden style={{ color: tone }}>
                —
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[color:var(--cc-ash)]">Nothing recorded.</p>
      )}
    </div>
  );
}

function TranscriptEntry({ record, index }: { record: AnswerRecord; index: number }) {
  const ev = record.evaluation;
  const over =
    record.question.timeAllocationMinutes &&
    record.timeTakenSeconds > record.question.timeAllocationMinutes * 60;

  return (
    <details className="group border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]">
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
          {record.skipped ? "skipped" : ev ? `${ev.score}/10` : record.evaluationFailed ? "—" : "…"}
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
        </div>

        {record.skipped ? (
          <p className="text-sm italic text-[color:var(--cc-ash)]">You skipped this question.</p>
        ) : (
          <blockquote className="border-l-2 border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] px-4 py-3 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
            {record.answerText || "(no answer recorded)"}
          </blockquote>
        )}

        {ev ? (
          <>
            {Object.keys(ev.scoreBreakdown ?? {}).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(ev.scoreBreakdown).map(([key, value]) => (
                  <span
                    key={key}
                    className="cc-label-sm border border-[color:var(--cc-hair)] px-2 py-1 text-[color:var(--cc-ink-soft)]"
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
                <blockquote className="border-l-2 border-[color:var(--cc-rust)] bg-[color:var(--cc-cream-2)] px-4 py-3 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
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
  onResources,
  onExit,
}: DebriefProps) {
  const tone = readinessTone(evaluation.readiness);
  const answered = records.filter((r) => r.answerText && !r.skipped);
  const skipped = records.filter((r) => r.skipped);
  const hints = records.reduce((n, r) => n + r.hintsUsed, 0);
  const weakFocus = [...evaluation.mustFix, ...evaluation.weaknesses].slice(0, 6);

  const metaLine = [
    config.roundName,
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
      {/* Masthead */}
      <div className="mb-8 border-b border-[color:var(--cc-ink)] pb-6">
        <p className="cc-label mb-3 text-[color:var(--cc-rust)]">The debrief</p>
        <h1 className="cc-font-display text-4xl tracking-tight text-[color:var(--cc-ink)] md:text-5xl">
          How you interviewed
        </h1>
        <p className="cc-label-sm mt-3 text-[color:var(--cc-ash)]">{metaLine}</p>
      </div>

      {/* Verdict */}
      <div className="mb-6 grid border border-[color:var(--cc-ink)] md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-6 border-b border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-ink)] p-6 md:border-b-0 md:border-r">
          <span className="cc-font-display text-7xl leading-none text-[color:var(--cc-cream)]">
            {evaluation.grade}
          </span>
          <div>
            <p className="cc-font-mono text-2xl tabular-nums text-[color:var(--cc-cream)]">
              {evaluation.overallScore}
              <span className="text-sm opacity-60">/100</span>
            </p>
            <span
              className="cc-label-sm mt-2 inline-block px-2 py-1"
              style={{ color: tone.color, background: "var(--cc-cream)" }}
            >
              {evaluation.readiness}
            </span>
          </div>
        </div>
        <div className="bg-[color:var(--cc-cream)] p-6">
          <p className="cc-label-sm mb-2 text-[color:var(--cc-ash)]">Committee summary</p>
          <p className="text-[15px] leading-relaxed text-[color:var(--cc-ink)]">
            {evaluation.summary || "No summary was produced for this session."}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Trajectory records={records} />

        <div className="grid gap-4 md:grid-cols-3">
          <AssessmentColumn
            title="Strengths"
            items={evaluation.strengths}
            tone="var(--cc-signal-deep)"
          />
          <AssessmentColumn
            title="Weaknesses"
            items={evaluation.weaknesses}
            tone="var(--cc-wheat-deep)"
          />
          <AssessmentColumn
            title="Fix before applying"
            items={evaluation.mustFix}
            tone="var(--cc-rust-deep)"
          />
        </div>

        {evaluation.improvementPlan.length > 0 && (
          <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]">
            <p className="cc-label border-b border-[color:var(--cc-hair)] px-5 py-4 text-[color:var(--cc-ink)]">
              Improvement plan
            </p>
            {evaluation.improvementPlan.map((item, i) => (
              <div
                key={i}
                className="flex gap-4 border-b border-[color:var(--cc-hair)] px-5 py-4 last:border-b-0"
              >
                <span className="cc-label-sm pt-0.5 text-[color:var(--cc-rust)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-sm font-medium text-[color:var(--cc-ink)]">{item.area}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
                    {item.action}
                  </p>
                  {item.timeline && (
                    <p className="cc-label-sm mt-2 text-[color:var(--cc-ash)]">{item.timeline}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delivery */}
        <div className="grid grid-cols-2 gap-px border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-hair-strong)] md:grid-cols-4">
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
            <div key={stat.label} className="bg-[color:var(--cc-cream)] p-4">
              <p className="cc-font-mono text-xl tabular-nums text-[color:var(--cc-ink)]">
                {stat.value}
              </p>
              <p className="cc-label-sm mt-1 text-[color:var(--cc-ash)]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Transcript */}
        <div>
          <p className="cc-label mb-3 text-[color:var(--cc-ink)]">The transcript, annotated</p>
          <div className="space-y-3">
            {records.map((record, i) => (
              <TranscriptEntry key={i} record={record} index={i} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t border-[color:var(--cc-ink)] pt-6 sm:flex-row">
          {weakFocus.length > 0 && (
            <button
              onClick={() => onPracticeWeakAreas(weakFocus)}
              className="cc-btn cc-btn-primary flex-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Drill your weak areas
            </button>
          )}
          <button onClick={onResources} className="cc-btn cc-btn-ghost flex-1">
            <BookOpen className="h-3.5 w-3.5" />
            Learning resources
          </button>
          <button onClick={onExit} className="cc-btn cc-btn-ghost flex-1">
            Back to interview prep
            <ArrowRight className="cc-arrow-right h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

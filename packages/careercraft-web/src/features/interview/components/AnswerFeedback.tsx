/**
 * The parts of answer feedback that show how the coach got there. Used after
 * each answer in the room and again in the debrief's transcript, so a learner
 * sees the same working in both places.
 *
 * Everything here is either counted (length, "I" vs "we", where each STAR
 * part sits) or arithmetic on the evaluator's own numbers (the score build).
 * Colour is the round's, and never the only signal: every bar has its number,
 * every highlight its label.
 */
import type {
  CoachAnswerEvaluation,
  LengthCheck,
  ScoreBuild,
  StarBreakdown,
  StarCoverage,
  StarHighlight,
  StarPart,
  StoryOutcome,
} from "@/lib/interviewCoach";
import { formatClock, spokenSeconds } from "../lib/format";
import type { DeliveryMetrics } from "../types";

const PART_LABEL: Record<StarPart, string> = {
  situation: "Situation",
  task: "Task",
  action: "Action",
  result: "Result",
  reflection: "Reflection",
};

/** What to add when a part is missing or thin — the fix, not just the gap. */
const PART_PROMPT: Record<StarPart, string> = {
  situation: "Set the scene: where, when, and what was at stake.",
  task: "Say what was yours to do.",
  action: "Say what you did — in “I”, not “we”.",
  result: "Say what changed because of you. A number if you have one.",
  reflection: "Say what you learned, or would do differently now.",
};

const COVERAGE_GLYPH: Record<StarCoverage, string> = { present: "●", thin: "◐", missing: "○" };

/* ── how the score was made ─────────────────────────────────────────────── */

export function ScoreBuildView({ build, compact = false }: { build: ScoreBuild; compact?: boolean }) {
  return (
    <div>
      {!compact && <p className="cc-label-sm mb-2.5 text-[color:var(--cc-ink)]">How this score was made</p>}
      <div className="space-y-2">
        {build.dimensions.map((d) => (
          <div key={d.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3" title={d.note || undefined}>
            <span className="truncate text-xs text-[color:var(--cc-ink-soft)]">
              {d.label} <span className="text-[color:var(--cc-ash)]">· {Math.round(d.weight * 100)}%</span>
            </span>
            <span className="cc-iv-scorebar" aria-hidden>
              <span style={{ width: `${Math.max(0, Math.min(10, d.score)) * 10}%` }} />
            </span>
            <span className="cc-font-mono text-xs tabular-nums text-[color:var(--cc-ink)]">{d.score}/10</span>
          </div>
        ))}
      </div>
      <p className="cc-font-mono mt-2.5 text-[11px] tabular-nums text-[color:var(--cc-ink-soft)]">
        {build.fellBack
          ? `The breakdown was incomplete, so the coach's overall ${build.final}/10 stands.`
          : `${build.dimensions.map((d) => `${d.score}×${Math.round(d.weight * 100)}%`).join(" + ")} = ${build.weighted}`}
        {build.cap && ` · capped at ${build.cap.max}`}
      </p>
      {build.cap && (
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--cc-ink-soft)]">
          <span className="font-semibold text-[color:var(--cc-ink)]">Capped at {build.cap.max}:</span> {build.cap.reason}
        </p>
      )}
      {!compact && build.dimensions.some((d) => d.note) && (
        <ul className="mt-2.5 space-y-1">
          {build.dimensions
            .filter((d) => d.note)
            .map((d) => (
              <li key={d.key} className="text-xs leading-relaxed text-[color:var(--cc-ink-soft)]">
                <span className="font-semibold text-[color:var(--cc-ink)]">{d.label}:</span> {d.note}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/* ── STAR(R) ────────────────────────────────────────────────────────────── */

export function StarRow({ star }: { star: StarBreakdown }) {
  const parts: Array<[StarPart, StarCoverage | null]> = [
    ["situation", star.situation],
    ["task", star.task],
    ["action", star.action],
    ["result", star.result],
    ["reflection", star.reflection],
  ];
  const shown = parts.filter((p): p is [StarPart, StarCoverage] => p[1] !== null);
  const gaps = shown.filter(([, c]) => c !== "present");
  return (
    <div>
      <p className="cc-label-sm mb-2 text-[color:var(--cc-ink)]">{star.reflection === null ? "STAR" : "STARR"} coverage</p>
      <div className="flex flex-wrap gap-2">
        {shown.map(([part, coverage]) => (
          <span
            key={part}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
              coverage === "present"
                ? "border-[color:var(--cc-ink)] text-[color:var(--cc-ink)]"
                : "border-dashed border-[color:var(--cc-hair-strong)] text-[color:var(--cc-ink-soft)]"
            }`}
          >
            <span aria-hidden>{COVERAGE_GLYPH[coverage]}</span>
            {PART_LABEL[part]} · {coverage}
          </span>
        ))}
      </div>
      {gaps.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {gaps.map(([part]) => (
            <li key={part} className="text-xs leading-relaxed text-[color:var(--cc-ink-soft)]">
              <span className="font-semibold text-[color:var(--cc-ink)]">{PART_LABEL[part]}:</span> {PART_PROMPT[part]}
            </li>
          ))}
        </ul>
      )}
      {star.note && <p className="mt-2 text-xs leading-relaxed text-[color:var(--cc-ash)]">{star.note}</p>}
    </div>
  );
}

/**
 * Their answer with each STAR part marked where it actually is. Offsets come
 * from the coach (quotes located server-side), so nothing is highlighted that
 * they didn't say.
 */
export function AnswerAnatomy({ answer, highlights }: { answer: string; highlights: StarHighlight[] }) {
  if (!highlights.length) return null;
  const pieces: Array<{ text: string; part?: StarPart }> = [];
  let at = 0;
  for (const h of highlights) {
    if (h.start < at || h.end > answer.length) continue;
    if (h.start > at) pieces.push({ text: answer.slice(at, h.start) });
    pieces.push({ text: answer.slice(h.start, h.end), part: h.part });
    at = h.end;
  }
  if (at < answer.length) pieces.push({ text: answer.slice(at) });

  return (
    <div>
      <p className="cc-label-sm mb-2 text-[color:var(--cc-ink)]">Your answer, marked up</p>
      <p className="whitespace-pre-wrap rounded-xl border border-[color:var(--cc-hair)] bg-white px-4 py-3 text-sm leading-[1.9] text-[color:var(--cc-ink-soft)]">
        {pieces.map((p, i) =>
          p.part ? (
            <mark key={i} className="cc-iv-mark">
              <span className="cc-iv-mark-label">{PART_LABEL[p.part]}</span>
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </p>
    </div>
  );
}

/* ── counted notes ──────────────────────────────────────────────────────── */

const LENGTH_VERDICT: Record<LengthCheck["verdict"], string> = {
  short: "Too short",
  ok: "About right",
  long: "Too long",
};

/** The coach's counted length, in speaking time. Shown when length was judged. */
export function LengthNote({ check }: { check: LengthCheck }) {
  return (
    <p className="text-sm text-[color:var(--cc-ink-soft)]">
      <span className="cc-label-sm mr-2 text-[color:var(--cc-ink)]">Length · {LENGTH_VERDICT[check.verdict]}</span>
      {check.words} words, about {formatClock(check.spokenSeconds)} said out loud. Aim for{" "}
      {formatClock(spokenSeconds(check.target.min))}–{formatClock(spokenSeconds(check.target.max))}.
    </p>
  );
}

/** "I" against "we" — counted. A story told in "we" never shows what they did. */
export function OwnershipNote({ ownership }: { ownership: { i: number; we: number } }) {
  const total = ownership.i + ownership.we;
  if (total === 0) return null;
  const share = Math.round((ownership.i / total) * 100);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[color:var(--cc-ink-soft)]">
      <span className="cc-label-sm text-[color:var(--cc-ink)]">I vs we</span>
      <span className="cc-iv-split" aria-hidden>
        <span style={{ width: `${share}%` }} />
      </span>
      <span>
        “I” {ownership.i} {ownership.i === 1 ? "time" : "times"}, “we” {ownership.we}.
        {ownership.we > ownership.i ? " Panels listen for what you did — say “I”." : ""}
      </span>
    </div>
  );
}

/** What this answer did to their story library. */
export function StoryNote({ story }: { story: StoryOutcome }) {
  const line =
    story.outcome === "new"
      ? `Saved to your stories under ${story.label}.`
      : story.outcome === "improved"
        ? `New best for ${story.label}: ${story.bestScore}/10${story.previousBest !== null ? ` (was ${story.previousBest})` : ""}.`
        : `Practice logged. Your best ${story.label} story still stands at ${story.bestScore}/10.`;
  return (
    <p className="text-sm text-[color:var(--cc-ink-soft)]">
      <span className="cc-label-sm mr-2 text-[color:var(--cc-ink)]">Your stories</span>
      {line}
      {story.title && story.outcome !== "kept" ? ` “${story.title}”` : ""}
    </p>
  );
}

export function RetryNote({ change }: { change: { from: number; to: number; attempt: number } }) {
  const delta = Math.round((change.to - change.from) * 10) / 10;
  return (
    <p className="cc-font-mono text-sm tabular-nums text-[color:var(--cc-ink)]">
      Attempt {change.attempt}: {change.from} → {change.to}{" "}
      <span className="text-[color:var(--cc-ink-soft)]">({delta > 0 ? "+" : delta < 0 ? "−" : "±"}{Math.abs(delta)})</span>
    </p>
  );
}

/** Spoken answers only: how it was delivered, from the browser's own measures. */
export function DeliveryNote({ delivery }: { delivery: DeliveryMetrics }) {
  const pace =
    delivery.wordsPerMinute < 110 ? "on the slow side" : delivery.wordsPerMinute > 175 ? "quick" : "a comfortable pace";
  return (
    <p className="text-sm text-[color:var(--cc-ink-soft)]">
      <span className="cc-label-sm mr-2 text-[color:var(--cc-ink)]">Delivery</span>
      {formatClock(delivery.speakingSeconds)} speaking at {delivery.wordsPerMinute} words a minute ({pace})
      {delivery.fillers ? `, ${delivery.fillers} filler ${delivery.fillers === 1 ? "phrase" : "phrases"}` : ""}
      {delivery.longPauses ? `, ${delivery.longPauses} long ${delivery.longPauses === 1 ? "pause" : "pauses"}` : ""}.
    </p>
  );
}

/** Everything above that applies to one evaluated answer, in reading order. */
export function AnswerWorking({
  evaluation,
  answer,
  delivery,
  compact = false,
}: {
  evaluation: CoachAnswerEvaluation;
  answer: string;
  delivery?: DeliveryMetrics | null;
  compact?: boolean;
}) {
  return (
    <div className="space-y-5">
      {evaluation.retryChange && <RetryNote change={evaluation.retryChange} />}
      {evaluation.scoring && <ScoreBuildView build={evaluation.scoring} compact={compact} />}
      {evaluation.starBreakdown && <StarRow star={evaluation.starBreakdown} />}
      {evaluation.highlights.length > 0 && <AnswerAnatomy answer={answer} highlights={evaluation.highlights} />}
      {(evaluation.ownership || evaluation.lengthCheck || delivery || evaluation.story) && (
        <div className="space-y-2">
          {evaluation.ownership && <OwnershipNote ownership={evaluation.ownership} />}
          {evaluation.lengthCheck && <LengthNote check={evaluation.lengthCheck} />}
          {delivery && <DeliveryNote delivery={delivery} />}
          {evaluation.story && <StoryNote story={evaluation.story} />}
        </div>
      )}
    </div>
  );
}

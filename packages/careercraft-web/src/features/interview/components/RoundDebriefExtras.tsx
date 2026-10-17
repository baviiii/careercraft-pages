/**
 * The part of a debrief that only one kind of round has: the recruiter's call
 * after a phone screen, the story bank after a behavioural round, the depth
 * map after a technical one. Shown in the room's debrief and in history.
 *
 * Verdicts are words with a three-dot meter in ink, not green/amber/red: the
 * round's own colour is already on screen, and teal "technical" beside a green
 * "solid" would read as the same signal.
 */
import type { CoachFinalEvaluation, RoundType } from "@/lib/interviewCoach";

import { roundClass } from "../lib/roundTypes";
import { LevelMeter } from "./RoundMarks";

const LEVEL: Record<string, number> = { strong: 3, solid: 3, usable: 2, shaky: 2, weak: 1, gap: 1 };

function Meter({ verdict }: { verdict: string }) {
  return <LevelMeter level={LEVEL[verdict] ?? 1} label={verdict.charAt(0).toUpperCase() + verdict.slice(1)} />;
}

function ScreenCall({ evaluation, compact }: { evaluation: CoachFinalEvaluation; compact: boolean }) {
  if (!evaluation.screenVerdict) return null;
  return (
    <div className="cc-iv-screen rounded-[1.25rem] border border-[color:var(--cc-iv-edge)] bg-[color:var(--cc-iv-wash)] p-5">
      <p className="cc-label-sm text-[color:var(--cc-ash)]">The recruiter's call</p>
      <p className={`mt-1 cc-font-display text-[color:var(--cc-ink)] ${compact ? "text-xl" : "text-2xl"}`}>
        {evaluation.screenVerdict}
      </p>
      {evaluation.recruiterNote && (
        <blockquote className="mt-3 border-l-2 border-[color:var(--cc-iv)] pl-3 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
          {evaluation.recruiterNote}
        </blockquote>
      )}
      {!compact && (
        <p className="mt-3 text-xs text-[color:var(--cc-ash)]">
          What they'd send the hiring manager about you, on this call alone.
        </p>
      )}
    </div>
  );
}

function StoryBank({ evaluation }: { evaluation: CoachFinalEvaluation }) {
  if (!evaluation.storyBank.length && !evaluation.missingStories.length) return null;
  return (
    <div className="cc-iv-behavioral overflow-hidden rounded-[1.25rem] border border-[color:var(--cc-hair)] bg-white">
      <div className="border-b border-[color:var(--cc-hair)] bg-[color:var(--cc-iv-wash)] px-5 py-3">
        <p className="font-semibold text-[color:var(--cc-ink)]">Your story bank</p>
        <p className="mt-0.5 text-xs text-[color:var(--cc-ink-soft)]">
          The stories you told, by the skill a panel would file them under. Strong ones are ready to reuse.
        </p>
      </div>
      {evaluation.storyBank.length > 0 && (
        <ul className="divide-y divide-[color:var(--cc-hair)]">
          {evaluation.storyBank.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[color:var(--cc-ink)]">{s.competency}</span>
                {s.story && <span className="block text-xs text-[color:var(--cc-ink-soft)]">{s.story}</span>}
              </span>
              <Meter verdict={s.verdict} />
            </li>
          ))}
        </ul>
      )}
      {evaluation.missingStories.length > 0 && (
        <div className="border-t border-[color:var(--cc-hair)] px-5 py-3">
          <p className="cc-label-sm text-[color:var(--cc-ash)]">No story yet for</p>
          <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">{evaluation.missingStories.join(" · ")}</p>
        </div>
      )}
    </div>
  );
}

function DepthMap({ evaluation }: { evaluation: CoachFinalEvaluation }) {
  if (!evaluation.depthMap.length) return null;
  return (
    <div className="cc-iv-technical overflow-hidden rounded-[1.25rem] border border-[color:var(--cc-hair)] bg-white">
      <div className="border-b border-[color:var(--cc-hair)] bg-[color:var(--cc-iv-wash)] px-5 py-3">
        <p className="font-semibold text-[color:var(--cc-ink)]">What held up</p>
        <p className="mt-0.5 text-xs text-[color:var(--cc-ink-soft)]">Each topic the round tested, and the evidence from your answers.</p>
      </div>
      <ul className="divide-y divide-[color:var(--cc-hair)]">
        {evaluation.depthMap.map((d, i) => (
          <li key={i} className="px-5 py-3">
            <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="text-sm font-medium text-[color:var(--cc-ink)]">{d.topic}</span>
              <Meter verdict={d.verdict} />
            </span>
            {d.evidence && <span className="mt-1 block text-xs leading-relaxed text-[color:var(--cc-ink-soft)]">{d.evidence}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoundDebriefExtras({
  roundType,
  evaluation,
  compact = false,
}: {
  roundType: RoundType;
  evaluation: CoachFinalEvaluation;
  /** History shows it inside a row; the room gives it room to breathe. */
  compact?: boolean;
}) {
  const body =
    roundType === "screen" ? (
      <ScreenCall evaluation={evaluation} compact={compact} />
    ) : roundType === "behavioral" ? (
      <StoryBank evaluation={evaluation} />
    ) : roundType === "technical" ? (
      <DepthMap evaluation={evaluation} />
    ) : null;
  return body ? <div className={roundClass(roundType)}>{body}</div> : null;
}

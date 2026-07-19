/**
 * The candidate's side of the table. Today: a writing sheet. This component is
 * deliberately the voice seam — when Horus grows audio, a VoiceComposer slots
 * in here (same submit/skip/hint contract) without touching the room.
 */
import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, Lightbulb, Loader2, SkipForward } from "lucide-react";
import { formatClock, useElapsedSeconds, wordCount } from "../../lib/format";

interface AnswerComposerProps {
  questionStartedAt: number;
  allottedMinutes?: number;
  disabled: boolean;
  evaluating: boolean;
  hintLoading: boolean;
  onSubmit: (text: string) => void;
  onSkip: () => void;
  onHint: (draft: string) => void;
}

export function AnswerComposer({
  questionStartedAt,
  allottedMinutes,
  disabled,
  evaluating,
  hintLoading,
  onSubmit,
  onSkip,
  onHint,
}: AnswerComposerProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const elapsed = useElapsedSeconds(questionStartedAt);
  const overTime = allottedMinutes ? elapsed > allottedMinutes * 60 : false;
  const words = wordCount(draft);
  const canSubmit = !disabled && !evaluating && draft.trim().length > 0;

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const submit = () => {
    if (canSubmit) onSubmit(draft);
  };

  return (
    <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]">
      <div className="flex items-center justify-between border-b border-[color:var(--cc-hair)] px-4 py-2.5">
        <span className="cc-label-sm text-[color:var(--cc-ash)]">Your answer</span>
        <div className="flex items-center gap-4">
          <span className="cc-font-mono text-[11px] tabular-nums text-[color:var(--cc-ash)]">
            {words} {words === 1 ? "word" : "words"}
          </span>
          <span
            className={[
              "cc-font-mono text-[11px] tabular-nums",
              overTime ? "text-[color:var(--cc-wheat-deep)]" : "text-[color:var(--cc-ash)]",
            ].join(" ")}
          >
            {formatClock(elapsed)}
            {allottedMinutes ? ` / ${formatClock(allottedMinutes * 60)}` : ""}
            {overTime ? " · over" : ""}
          </span>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        disabled={disabled || evaluating}
        placeholder="Answer as you would out loud — specifics, structure, trade-offs…"
        className="min-h-[220px] w-full resize-y bg-transparent px-4 py-4 text-[15px] leading-relaxed text-[color:var(--cc-ink)] outline-none placeholder:text-[color:var(--cc-ash)] disabled:opacity-50"
      />

      <div className="flex flex-col gap-3 border-t border-[color:var(--cc-hair)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onHint(draft)}
            disabled={disabled || evaluating || hintLoading}
            className="cc-label-sm inline-flex items-center gap-1.5 border border-[color:var(--cc-hair-strong)] px-3 py-2 text-[color:var(--cc-ink-soft)] transition-colors hover:border-[color:var(--cc-wheat-deep)] hover:text-[color:var(--cc-wheat-deep)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hintLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Lightbulb className="h-3 w-3" />
            )}
            I'm stuck
          </button>
          <button
            onClick={onSkip}
            disabled={disabled || evaluating}
            className="cc-label-sm inline-flex items-center gap-1.5 border border-transparent px-3 py-2 text-[color:var(--cc-ash)] transition-colors hover:text-[color:var(--cc-ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SkipForward className="h-3 w-3" />
            Skip
          </button>
        </div>

        <button onClick={submit} disabled={!canSubmit} className="cc-btn cc-btn-primary !py-3">
          {evaluating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Evaluating
            </>
          ) : (
            <>
              Submit answer
              <CornerDownLeft className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

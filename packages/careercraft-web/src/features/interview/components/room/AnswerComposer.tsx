/**
 * The candidate's side of the table: a writing sheet, and — when voice is
 * switched on (VOICE_ENABLED) — a microphone. A spoken answer streams in as
 * text through Horus (hooks/useSpokenAnswer.ts) and is submitted like a typed
 * one, with how it was delivered alongside; the room doesn't know the
 * difference.
 */
import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, Lightbulb, Loader2, Mic, SkipForward, Square, Volume2 } from "lucide-react";
import { VOICE_ENABLED, type WordBand } from "@/lib/interviewCoach";
import { useSpokenAnswer } from "../../hooks/useSpokenAnswer";
import type { DeliveryMetrics } from "../../types";
import { formatClock, spokenSeconds, useElapsedSeconds, wordCount } from "../../lib/format";

/**
 * How long this would take to say, against the healthy range for the
 * question. Answers are typed but stand in for spoken ones, so the meter
 * talks in speaking time. The band is the coach's (it set it on the question),
 * and the coach counts the same way when it scores the answer.
 */
function LengthMeter({ words, band }: { words: number; band: WordBand }) {
  const scaleMax = band.max * 1.4;
  const pct = (n: number) => `${(Math.min(n, scaleMax) / scaleMax) * 100}%`;
  const state = words === 0 ? null : words < band.min ? "Keep going" : words > band.max ? "Running long" : "Good length";
  return (
    <div className="flex flex-col gap-2 border-t border-[color:var(--cc-hair)] px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div
        className="cc-iv-meter flex-1"
        role="meter"
        aria-label="Answer length, as speaking time"
        aria-valuemin={0}
        aria-valuemax={Math.round(scaleMax)}
        aria-valuenow={Math.min(words, Math.round(scaleMax))}
        aria-valuetext={`about ${formatClock(spokenSeconds(words))} spoken; aim for ${formatClock(
          spokenSeconds(band.min),
        )} to ${formatClock(spokenSeconds(band.max))}`}
      >
        <span
          className="cc-iv-meter-band"
          style={{ left: pct(band.min), width: `calc(${pct(band.max)} - ${pct(band.min)})` }}
        />
        <span className="cc-iv-meter-mark" style={{ left: pct(words) }} />
      </div>
      <p className="cc-font-mono shrink-0 text-[11px] tabular-nums text-[color:var(--cc-ink-soft)]">
        ≈ {formatClock(spokenSeconds(words))} spoken · aim {formatClock(spokenSeconds(band.min))}–
        {formatClock(spokenSeconds(band.max))}
        {state && (
          <span className={state === "Running long" ? "font-semibold text-[color:var(--cc-ink)]" : ""}> · {state}</span>
        )}
      </p>
    </div>
  );
}

interface AnswerComposerProps {
  questionStartedAt: number;
  allottedMinutes?: number;
  /** Healthy answer length, when length is part of the question's brief. */
  targetWords?: WordBand | null;
  /** What a good answer to this kind of round sounds like, as a prompt. */
  placeholder?: string;
  /** The question, for reading it aloud in a spoken answer. */
  questionText?: string;
  disabled: boolean;
  evaluating: boolean;
  hintLoading: boolean;
  onSubmit: (text: string, delivery: DeliveryMetrics | null) => void;
  onSkip: () => void;
  onHint: (draft: string) => void;
}

export function AnswerComposer({
  questionStartedAt,
  allottedMinutes,
  targetWords,
  placeholder = "Answer as you would out loud — specifics, structure, trade-offs…",
  questionText,
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

  // Spoken answers: what was typed before speaking stays, and the transcript
  // streams in after it. Delivery is kept once they stop, for the feedback.
  const spoken = useSpokenAnswer();
  const [typedBefore, setTypedBefore] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMetrics | null>(null);
  const [hearFirst, setHearFirst] = useState(true);
  // "finishing": stopped, waiting for the last sentence to come back as text.
  const listening = spoken.state === "listening" || spoken.state === "connecting" || spoken.state === "finishing";
  const settling = spoken.state === "connecting" || spoken.state === "finishing";
  const shown = listening ? [typedBefore, spoken.transcript].filter((s) => s.trim()).join(" ") : draft;
  // One submit at a time: stopping a spoken answer takes a moment.
  const submittingRef = useRef(false);

  const words = wordCount(shown);
  const canSubmit = !disabled && !evaluating && shown.trim().length > 0 && !settling;

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const startSpeaking = () => {
    setTypedBefore(draft);
    setDelivery(null);
    void spoken.start({ readAloud: hearFirst ? questionText : undefined });
  };

  const stopSpeaking = async (): Promise<{ text: string; delivery: DeliveryMetrics | null }> => {
    const result = await spoken.stop();
    const text = [typedBefore, result.text].filter((s) => s.trim()).join(" ");
    setDraft(text);
    setDelivery(result.delivery);
    return { text, delivery: result.delivery };
  };

  const submit = async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    try {
      if (listening) {
        const result = await stopSpeaking();
        if (result.text.trim()) onSubmit(result.text, result.delivery);
        return;
      }
      onSubmit(draft, delivery);
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]">
      <div className="flex items-center justify-between border-b border-[color:var(--cc-hair)] px-4 py-2.5">
        <span className="cc-label-sm text-[color:var(--cc-ash)]">
          {listening ? (
            <span className="inline-flex items-center gap-1.5 text-[color:var(--cc-ink)]">
              <span aria-hidden className="cc-iv-live" />
              {spoken.state === "connecting"
                ? "Connecting the microphone…"
                : spoken.state === "finishing"
                  ? "Catching your last words…"
                  : "Listening — speak your answer"}
            </span>
          ) : (
            "Your answer"
          )}
        </span>
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
        value={shown}
        onChange={(e) => {
          setDraft(e.target.value);
          // An edited transcript is no longer what was said, so its delivery
          // numbers would describe something else.
          if (delivery) setDelivery(null);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        readOnly={listening}
        disabled={disabled || evaluating}
        placeholder={placeholder}
        aria-label="Your answer"
        className="min-h-[220px] w-full resize-y bg-transparent px-4 py-4 text-[15px] leading-relaxed text-[color:var(--cc-ink)] outline-none placeholder:text-[color:var(--cc-ash)] disabled:opacity-50"
      />

      {targetWords && <LengthMeter words={words} band={targetWords} />}

      {VOICE_ENABLED && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color:var(--cc-hair)] px-4 py-3">
          {listening ? (
            <>
              <button
                type="button"
                onClick={() => void stopSpeaking()}
                disabled={spoken.state === "finishing"}
                className="cc-label-sm inline-flex items-center gap-1.5 border border-[color:var(--cc-ink)] px-3 py-2 text-[color:var(--cc-ink)] disabled:opacity-50"
              >
                {spoken.state === "finishing" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Square className="h-3 w-3" />
                )}
                Stop
              </button>
              {questionText && spoken.state === "listening" && (
                <button
                  type="button"
                  onClick={() => spoken.readAloud(questionText)}
                  className="cc-label-sm inline-flex items-center gap-1.5 px-3 py-2 text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
                >
                  <Volume2 className="h-3 w-3" />
                  Hear the question again
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startSpeaking}
                disabled={disabled || evaluating}
                className="cc-label-sm inline-flex items-center gap-1.5 border border-[color:var(--cc-hair-strong)] px-3 py-2 text-[color:var(--cc-ink)] transition-colors hover:border-[color:var(--cc-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mic className="h-3 w-3" />
                Answer out loud
              </button>
              <label className="inline-flex items-center gap-1.5 text-xs text-[color:var(--cc-ink-soft)]">
                <input
                  type="checkbox"
                  checked={hearFirst}
                  onChange={(e) => setHearFirst(e.target.checked)}
                  className="accent-[color:var(--cc-ink)]"
                />
                Read the question to me first
              </label>
            </>
          )}
          {spoken.error && <p className="w-full text-xs text-[color:var(--cc-ink-soft)]">{spoken.error}</p>}
          {!listening && delivery && (
            <p className="w-full text-xs text-[color:var(--cc-ink-soft)]">
              You spoke for {formatClock(delivery.speakingSeconds)} at {delivery.wordsPerMinute} words a minute. Edit
              the text if the transcript misheard you.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[color:var(--cc-hair)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onHint(shown)}
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
            onClick={() => {
              if (listening) void spoken.stop();
              onSkip();
            }}
            disabled={disabled || evaluating}
            className="cc-label-sm inline-flex items-center gap-1.5 border border-transparent px-3 py-2 text-[color:var(--cc-ash)] transition-colors hover:text-[color:var(--cc-ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SkipForward className="h-3 w-3" />
            Skip
          </button>
        </div>

        <button onClick={() => void submit()} disabled={!canSubmit} className="cc-btn cc-btn-primary !py-3">
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

/**
 * The candidate's side of the table: a writing sheet, and — when voice is
 * switched on (VOICE_ENABLED) — a microphone. A spoken answer streams in as
 * text through Horus (hooks/useSpokenAnswer.ts) and is submitted like a typed
 * one, with how it was delivered alongside; the room doesn't know the
 * difference.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CornerDownLeft, Lightbulb, Loader2, Mic, SkipForward, Square, Volume2 } from "lucide-react";
import { VOICE_ENABLED, type WordBand } from "@/lib/interviewCoach";
import { useSpokenAnswer } from "../../hooks/useSpokenAnswer";
import type { DeliveryMetrics } from "../../types";
import { formatClock, spokenSeconds, useElapsedSeconds, wordCount } from "../../lib/format";

/** "0:17", "5:00" — a clock without the leading zero, as people write times. */
const clock = (seconds: number) => formatClock(seconds).replace(/^0(?=\d:)/, "");

/** How to submit from the keyboard, in the reader's own keys. */
const SUBMIT_KEYS =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ Enter" : "Ctrl + Enter";

/**
 * How long this would take to say, against the healthy range for the
 * question. Answers are typed but stand in for spoken ones, so the meter
 * talks in speaking time. The band is the coach's (it set it on the question),
 * and the coach counts the same way when it scores the answer.
 */
function LengthMeter({ words, band }: { words: number; band: WordBand }) {
  const scaleMax = band.max * 1.4;
  const pct = (n: number) => `${(Math.min(n, scaleMax) / scaleMax) * 100}%`;
  const state = words === 0 ? null : words < band.min ? "keep going" : words > band.max ? "running long" : "good length";
  const aim = `${clock(spokenSeconds(band.min))}–${clock(spokenSeconds(band.max))}`;
  return (
    <div className="flex flex-col gap-2 border-t border-[color:var(--cc-hair)] px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div
        className="cc-iv-meter w-full sm:w-auto sm:flex-1"
        role="meter"
        aria-label="Answer length, as speaking time"
        aria-valuemin={0}
        aria-valuemax={Math.round(scaleMax)}
        aria-valuenow={Math.min(words, Math.round(scaleMax))}
        aria-valuetext={`about ${clock(spokenSeconds(words))} spoken; aim for ${aim}`}
      >
        <span
          className="cc-iv-meter-band"
          style={{ left: pct(band.min), width: `calc(${pct(band.max)} - ${pct(band.min)})` }}
        />
        {words > 0 && <span className="cc-iv-meter-mark" style={{ left: pct(words) }} />}
      </div>
      <p className="shrink-0 text-[13px] tabular-nums text-[color:var(--cc-ink-soft)]">
        {words === 0 ? (
          <>Aim for {aim} spoken</>
        ) : (
          <>
            About {clock(spokenSeconds(words))} spoken · aim {aim}
            {state && (
              <span className={state === "running long" ? "font-semibold text-[color:var(--cc-ink)]" : ""}>
                {" "}
                · {state}
              </span>
            )}
          </>
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

  // The sheet grows with the answer, so a long one isn't read through a
  // slot; past most of the screen it scrolls.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.6))}px`;
  }, [shown]);

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
    <div className="cc-iv-sheet">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pb-1 pt-4">
        <span className="text-[14px] font-semibold text-[color:var(--cc-ink)]">
          {listening ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="cc-iv-live" />
              {spoken.state === "connecting"
                ? "Connecting the microphone…"
                : spoken.state === "finishing"
                  ? "Catching your last words…"
                  : "Listening — say your answer"}
            </span>
          ) : (
            "Your answer"
          )}
        </span>
        <span className="text-[13px] tabular-nums text-[color:var(--cc-ash)]">
          {words} {words === 1 ? "word" : "words"} ·{" "}
          <span className={overTime ? "font-semibold text-[color:var(--cc-wheat-deep)]" : ""}>
            {clock(elapsed)}
            {allottedMinutes ? ` of ${clock(allottedMinutes * 60)}` : ""}
            {overTime ? ", over time" : ""}
          </span>
        </span>
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
        className="min-h-[220px] w-full resize-none bg-transparent px-5 py-3 text-[16px] leading-relaxed text-[color:var(--cc-ink)] outline-none placeholder:text-[color:var(--cc-ash)] disabled:opacity-50"
      />

      {targetWords && <LengthMeter words={words} band={targetWords} />}

      {VOICE_ENABLED && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color:var(--cc-hair)] px-5 py-3">
          {listening ? (
            <>
              <button
                type="button"
                onClick={() => void stopSpeaking()}
                disabled={spoken.state === "finishing"}
                className="cc-action cc-action--ink cc-action--sm"
              >
                {spoken.state === "finishing" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}
                Stop
              </button>
              {questionText && spoken.state === "listening" && (
                <button
                  type="button"
                  onClick={() => spoken.readAloud(questionText)}
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-[13px] font-medium text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
                >
                  <Volume2 className="h-3.5 w-3.5" />
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
                className="cc-action cc-action--ghost cc-action--sm"
              >
                <Mic className="h-3.5 w-3.5" />
                Answer out loud
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[color:var(--cc-ink-soft)]">
                <input
                  type="checkbox"
                  checked={hearFirst}
                  onChange={(e) => setHearFirst(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[color:var(--cc-ink)]"
                />
                Read the question aloud first
              </label>
            </>
          )}
          {spoken.error && <p className="w-full text-[13px] text-[color:var(--cc-ink-soft)]">{spoken.error}</p>}
          {!listening && delivery && (
            <p className="w-full text-[13px] text-[color:var(--cc-ink-soft)]">
              You spoke for {clock(delivery.speakingSeconds)} at {delivery.wordsPerMinute} words a minute. Edit the
              text if the transcript misheard you.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[color:var(--cc-hair)] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onHint(shown)}
            disabled={disabled || evaluating || hintLoading}
            className="cc-action cc-action--ghost cc-action--sm"
          >
            {hintLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
            Get a hint
          </button>
          <button
            type="button"
            onClick={() => {
              if (listening) void spoken.stop();
              onSkip();
            }}
            disabled={disabled || evaluating}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-[color:var(--cc-ash)] transition-colors hover:text-[color:var(--cc-ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Skip
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-[12px] text-[color:var(--cc-ash)] md:inline">{SUBMIT_KEYS}</span>
          <button type="button" onClick={() => void submit()} disabled={!canSubmit} className="cc-action w-full sm:w-auto">
            {evaluating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scoring your answer
              </>
            ) : (
              <>
                Submit answer
                <CornerDownLeft className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

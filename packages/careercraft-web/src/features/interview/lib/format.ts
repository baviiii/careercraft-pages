import { useEffect, useState } from "react";

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Seconds a written answer would take to say out loud, at ~150 words a
 * minute — the same rate the coach uses (SPOKEN_WORDS_PER_MINUTE in
 * interview-coach-mcp), so the room's meter and the coach's verdict agree.
 */
export function spokenSeconds(words: number): number {
  return Math.round((words / 150) * 60);
}

/** Ticking seconds since `fromMs` (an epoch timestamp). 0 when fromMs is falsy. */
export function useElapsedSeconds(fromMs: number): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!fromMs) {
      setSeconds(0);
      return;
    }
    const tick = () => setSeconds(Math.floor((Date.now() - fromMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [fromMs]);
  return seconds;
}

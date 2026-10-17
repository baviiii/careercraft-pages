/**
 * Answering out loud. The coach mints a short-lived key through Horus; the
 * browser then opens a WebRTC call straight to the speech service, streams the
 * microphone, and gets the transcript back as the learner speaks. Nothing is
 * recorded or stored: audio goes to the speech service and the text comes
 * back; only the finished text is submitted, like a typed answer.
 *
 * The session is listen-only (Horus sets it never to reply on its own), so the
 * only time it speaks is when asked to read the question aloud.
 *
 * Delivery is measured here from the speech detector's own timestamps:
 * speaking time (not wall-clock time), words a minute, long pauses, and the
 * filler phrases a transcript keeps. Speech-to-text tends to drop "um"/"uh",
 * so fillers are a floor, and the label says "filler phrases", not "ums".
 *
 * Every start and stop bumps a run number. Each await in start() checks it,
 * so a stop (or unmount, or a second click) while still connecting cancels
 * that start cleanly — the microphone is released and no call is left open.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { interviewCoach, CoachUnavailableError } from "@/lib/interviewCoach";
import { wordCount } from "../lib/format";
import type { DeliveryMetrics } from "../types";

export type SpokenState = "idle" | "connecting" | "listening" | "finishing" | "error";

/** Phrases a transcript keeps; whole phrases only, so "I'd like" isn't one. */
const FILLERS = /\b(?:you know|sort of|kind of|basically|i mean|um+|uh+|erm+)\b/gi;
const LONG_PAUSE_MS = 3000;
/** How long stop() waits for the last thing said to come back as text. */
const FINAL_TEXT_WAIT_MS = 3000;

export function countFillers(text: string): number {
  return (text.match(FILLERS) ?? []).length;
}

/** Delivery from speech-detector spans [start, end] in ms and the final text. */
export function deliveryFrom(spans: Array<[number, number]>, transcript: string): DeliveryMetrics | null {
  const speakingMs = spans.reduce((sum, [s, e]) => sum + Math.max(0, e - s), 0);
  if (speakingMs < 1000) return null;
  let longPauses = 0;
  for (let i = 1; i < spans.length; i += 1) {
    if (spans[i]![0] - spans[i - 1]![1] > LONG_PAUSE_MS) longPauses += 1;
  }
  return {
    speakingSeconds: Math.round(speakingMs / 1000),
    wordsPerMinute: Math.round(wordCount(transcript) / (speakingMs / 60000)),
    fillers: countFillers(transcript),
    longPauses,
  };
}

interface RealtimeEvent {
  type?: string;
  item_id?: string;
  delta?: string;
  transcript?: string;
  audio_start_ms?: number;
  audio_end_ms?: number;
}

export interface SpokenAnswer {
  state: SpokenState;
  error: string | null;
  /** Everything said so far, in order. */
  transcript: string;
  start: (opts?: { readAloud?: string }) => Promise<void>;
  /**
   * Stop listening. Waits (briefly) for the last thing said to come back as
   * text, then returns the full transcript and how it was delivered.
   */
  stop: () => Promise<{ text: string; delivery: DeliveryMetrics | null }>;
  /** Ask the interviewer's voice to read a question aloud (while connected). */
  readAloud: (question: string) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useSpokenAnswer(): SpokenAnswer {
  const [state, setState] = useState<SpokenState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");

  const runRef = useRef(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Transcript items in the order they started, their text so far, and which are final.
  const itemsRef = useRef<{ order: string[]; text: Map<string, string>; done: Set<string> }>({
    order: [],
    text: new Map(),
    done: new Set(),
  });
  const spansRef = useRef<Array<[number, number]>>([]);
  // The speech span in progress: its audio-clock start, and the wall clock then.
  const openSpanRef = useRef<{ audioMs: number; wallMs: number } | null>(null);

  const said = useCallback(() => {
    const { order, text } = itemsRef.current;
    return order.map((id) => (text.get(id) ?? "").trim()).filter(Boolean).join(" ");
  }, []);

  const teardown = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    micRef.current?.getTracks().forEach((t) => t.stop());
    if (audioRef.current) audioRef.current.srcObject = null;
    dcRef.current = null;
    pcRef.current = null;
    micRef.current = null;
  }, []);

  // Leaving the room mid-answer cancels anything in flight and frees the mic.
  useEffect(
    () => () => {
      runRef.current += 1;
      teardown();
    },
    [teardown],
  );

  const onEvent = useCallback(
    (raw: string) => {
      let ev: RealtimeEvent;
      try {
        ev = JSON.parse(raw) as RealtimeEvent;
      } catch {
        return;
      }
      const items = itemsRef.current;
      const track = (id: string | undefined) => {
        if (id && !items.text.has(id)) {
          items.order.push(id);
          items.text.set(id, "");
        }
      };
      switch (ev.type) {
        case "input_audio_buffer.speech_started":
          openSpanRef.current = { audioMs: ev.audio_start_ms ?? 0, wallMs: Date.now() };
          track(ev.item_id);
          break;
        case "input_audio_buffer.speech_stopped":
          if (openSpanRef.current && typeof ev.audio_end_ms === "number") {
            spansRef.current.push([openSpanRef.current.audioMs, ev.audio_end_ms]);
          }
          openSpanRef.current = null;
          break;
        case "conversation.item.input_audio_transcription.delta":
          track(ev.item_id);
          if (ev.item_id) items.text.set(ev.item_id, (items.text.get(ev.item_id) ?? "") + (ev.delta ?? ""));
          setTranscript(said());
          break;
        case "conversation.item.input_audio_transcription.completed":
          track(ev.item_id);
          if (ev.item_id) {
            items.text.set(ev.item_id, ev.transcript ?? items.text.get(ev.item_id) ?? "");
            items.done.add(ev.item_id);
          }
          setTranscript(said());
          break;
        default:
          break;
      }
    },
    [said],
  );

  const readAloud = useCallback((question: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(
      JSON.stringify({
        type: "response.create",
        response: { instructions: `Read this interview question aloud, exactly as written: "${question}"` },
      }),
    );
  }, []);

  const start = useCallback(
    async (opts: { readAloud?: string } = {}) => {
      // One call at a time: a second click while connecting is ignored.
      if (pcRef.current || state === "connecting" || state === "finishing") return;
      const run = ++runRef.current;
      const cancelled = () => run !== runRef.current;
      setError(null);
      setState("connecting");
      itemsRef.current = { order: [], text: new Map(), done: new Set() };
      spansRef.current = [];
      openSpanRef.current = null;
      setTranscript("");
      try {
        const [key, mic] = await Promise.allSettled([
          interviewCoach.voiceSession(),
          navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }),
        ]);
        // Whatever happened, a microphone we were given is either kept or released here.
        const stream = mic.status === "fulfilled" ? mic.value : null;
        if (cancelled() || key.status === "rejected" || !stream) {
          stream?.getTracks().forEach((t) => t.stop());
          if (cancelled()) return;
          throw key.status === "rejected" ? key.reason : mic.status === "rejected" ? mic.reason : new Error("no microphone");
        }
        micRef.current = stream;
        const { ephemeralKey, webrtcUrl } = key.value;

        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        // The interviewer's voice (only used for reading a question aloud).
        const audio = audioRef.current ?? new Audio();
        audio.autoplay = true;
        audioRef.current = audio;
        pc.ontrack = (e) => {
          audio.srcObject = e.streams[0] ?? null;
        };

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.onmessage = (e) => onEvent(String(e.data));
        dc.onopen = () => {
          if (cancelled()) return;
          setState("listening");
          if (opts.readAloud) readAloud(opts.readAloud);
        };

        const offer = await pc.createOffer();
        if (cancelled()) return;
        await pc.setLocalDescription(offer);
        const res = await fetch(webrtcUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${ephemeralKey}`, "Content-Type": "application/sdp" },
          body: offer.sdp ?? "",
        });
        if (cancelled()) return;
        if (!res.ok) throw new CoachUnavailableError("Couldn't connect to the speech service.");
        const answer = await res.text();
        if (cancelled()) return;
        await pc.setRemoteDescription({ type: "answer", sdp: answer });
      } catch (e) {
        if (cancelled()) return;
        runRef.current += 1;
        teardown();
        setState("error");
        const name = (e as { name?: string })?.name;
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "The microphone is blocked. Allow it for this site in your browser, then try again."
            : name === "NotFoundError"
              ? "No microphone was found."
              : e instanceof CoachUnavailableError
                ? e.message
                : "Couldn't start a spoken answer. You can still type it.",
        );
      }
    },
    [onEvent, readAloud, state, teardown],
  );

  const stop = useCallback(async (): Promise<{ text: string; delivery: DeliveryMetrics | null }> => {
    // Cancels a start still connecting, and marks this stop as the latest.
    const run = ++runRef.current;
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") {
      setState("finishing");
      // Stop sending audio, and ask the service to finish what it has: the
      // last sentence is usually still being transcribed when they click.
      micRef.current?.getTracks().forEach((t) => {
        t.enabled = false;
      });
      try {
        dc.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      } catch {
        /* the channel closed under us; take what we have */
      }
      const deadline = Date.now() + FINAL_TEXT_WAIT_MS;
      const { order, done } = itemsRef.current;
      while (Date.now() < deadline && run === runRef.current) {
        const pending = openSpanRef.current !== null || order.some((id) => !done.has(id));
        if (!pending) break;
        await sleep(100);
      }
    }
    // Speech still going when they stopped: close its span at "now".
    const open = openSpanRef.current;
    if (open) {
      spansRef.current.push([open.audioMs, open.audioMs + (Date.now() - open.wallMs)]);
      openSpanRef.current = null;
    }
    if (run === runRef.current) {
      teardown();
      setState("idle");
    }
    const text = said();
    setTranscript(text);
    return { text, delivery: deliveryFrom(spansRef.current, text) };
  }, [said, teardown]);

  return { state, error, transcript, start, stop, readAloud };
}

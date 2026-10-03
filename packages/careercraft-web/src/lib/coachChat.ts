/**
 * coachChat — the browser end of the Career Coach stream.
 *
 * One request per question to the `coach-chat` edge function, which relays the
 * Horus agent's Server-Sent Events unchanged. This module turns that byte
 * stream back into typed events; it adds no meaning of its own.
 *
 * Wire format (Horus /api/sdk/chat, forwarded as-is): frames of
 * `data: <json>\n\n`, where the JSON's `kind` is one of the CoachEvent kinds
 * below. Order: session → (tool | token)* → citations? → done, or a final
 * error frame instead of done.
 *
 * `fetch`, not EventSource: EventSource cannot send the Authorization header
 * the function's JWT check needs, and cannot POST.
 */
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { QuotaExceededError, quotaFromResponse } from "@/lib/quota";

export interface CoachCitation {
  n: number;
  title: string;
  /** Present for web sources; corpus PDFs have none. */
  url?: string;
  sourceType: "url" | "pdf" | "web";
  snippet: string;
  pageNumber?: number;
}

export type CoachEvent =
  | { kind: "session"; id: string }
  | { kind: "token"; text: string }
  | { kind: "tool"; name: string; status: "start" | "end"; detail?: string }
  | { kind: "citations"; citations: CoachCitation[] }
  | { kind: "done"; usage: { inputTokens: number; outputTokens: number } }
  | { kind: "error"; message: string };

/** Horus forgot the session — start a new conversation and resend. */
export class CoachSessionExpiredError extends Error {
  constructor(message = "This conversation can't be continued. Start a new one.") {
    super(message);
    this.name = "CoachSessionExpiredError";
  }
}

export interface StreamCoachChatParams {
  message: string;
  sessionId?: string;
  focusArea: string;
  /** Display name for the persona, e.g. "Career Coach". */
  personaName?: string;
  signal?: AbortSignal;
}

async function errorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text.slice(0, 200) || `The coach could not answer (HTTP ${response.status}).`;
}

export async function* streamCoachChat(
  params: StreamCoachChatParams,
): AsyncGenerator<CoachEvent, void, undefined> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in to use the career coach.");

  const response = await fetch(`${SUPABASE_URL}/functions/v1/coach-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: params.message,
      ...(params.sessionId && { sessionId: params.sessionId }),
      focusArea: params.focusArea,
      ...(params.personaName && { personaName: params.personaName }),
    }),
    signal: params.signal,
  });

  if (!response.ok || !response.body) {
    const quota = await quotaFromResponse(response.clone());
    if (quota) throw new QuotaExceededError(quota);
    if (response.status === 409) throw new CoachSessionExpiredError(await errorMessage(response));
    throw new Error(await errorMessage(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const parse = (frame: string): CoachEvent | null => {
    const line = frame.split("\n").find((l) => l.startsWith("data:"));
    if (!line) return null;
    try {
      return JSON.parse(line.slice(5).trim()) as CoachEvent;
    } catch {
      return null; // A malformed frame is skipped, not fatal.
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let cut: number;
      while ((cut = buffer.indexOf("\n\n")) !== -1) {
        const event = parse(buffer.slice(0, cut));
        buffer = buffer.slice(cut + 2);
        if (event) yield event;
      }
    }
    const tail = parse(buffer);
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

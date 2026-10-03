/**
 * useCoachChat — the Career Coach conversation, driven by the Horus agent.
 *
 * Replaces three engines (useAgenticRAG, its "neo4j" alias, useEnterpriseRAG)
 * that all made the same single rag.query call behind different names. The
 * agent behind coach-chat decides its own steps, so this hook only records
 * what it reports:
 *
 *   tool start/end  → a thinking step, with the agent's own query as detail
 *   first token     → a "Writing the answer" step; the answer then streams in
 *   citations       → the sources list, numbered as the answer cites them
 *   done            → timing and token usage
 *
 * Nothing here plans, routes or guesses. The thinking panel shows what the
 * agent actually did, in the order it did it.
 *
 * Conversation memory lives in Horus, keyed by the session id from the first
 * frame. A new chat, a lens change, or Horus forgetting the session starts a
 * fresh one.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CoachSessionExpiredError,
  streamCoachChat,
  type CoachCitation,
  type CoachEvent,
} from "@/lib/coachChat";
import { QuotaExceededError } from "@/lib/quota";

export type ThinkingStatus = "active" | "done" | "skipped" | "failed";

export interface ThinkingStep {
  id: string;
  /** Human phase label, e.g. "Searching the documents". */
  label: string;
  /** What the agent passed to the tool — its search query or entity. */
  detail?: string;
  status: ThinkingStatus;
  /** Elapsed milliseconds, filled in when the step completes. */
  ms?: number;
  /** Epoch ms the step began; drives the live clock. */
  startedAt?: number;
}

export type CoachSource = CoachCitation;

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** True from send until the stream ends. */
  isLoading?: boolean;
  thinking?: ThinkingStep[];
  sources?: CoachSource[];
  responseTime?: number;
  tokens?: number;
  rating?: "helpful" | "not-helpful";
  /** The run failed; `content` holds the explanation, not an answer. */
  failed?: boolean;
}

/** Plain-language names for the agent's tools. */
function toolLabel(name: string): string {
  switch (name) {
    case "search_knowledge":
      return "Searching the documents";
    case "graph_lookup":
      return "Checking the knowledge graph";
    case "fetch_page":
      return "Reading a web page";
    case "web_search":
      return "Searching the web";
    default: {
      const mcp = /^mcp__([^_]+)__/.exec(name);
      return mcp ? `Using ${mcp[1]}` : name.replace(/_/g, " ");
    }
  }
}

const WRITE_STEP = "write";

export function useCoachChat(focusArea: string, personaName?: string) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const sessionRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  // A different persona is a different conversation.
  useEffect(() => {
    sessionRef.current = undefined;
  }, [focusArea]);

  // Leaving the page stops the agent run rather than letting it finish unseen.
  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = useCallback((id: string, fn: (m: CoachMessage) => CoachMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || abortRef.current) return;

      const assistantId = crypto.randomUUID();
      const startedAt = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: question, timestamp: new Date() },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isLoading: true,
          thinking: [],
        },
      ]);
      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      // Mutable run state; every change is copied into React state.
      let trace: ThinkingStep[] = [];
      const toolOf = new Map<string, string>(); // step id → tool name
      let answer = "";
      let sources: CoachSource[] = [];
      let usage: { inputTokens: number; outputTokens: number } | null = null;
      let seq = 0;

      const sync = () =>
        patch(assistantId, (m) => ({ ...m, content: answer, thinking: trace.map((s) => ({ ...s })) }));

      const close = (step: ThinkingStep, status: ThinkingStatus = "done") => {
        step.status = status;
        step.ms = Date.now() - (step.startedAt ?? Date.now());
      };

      const handle = (event: CoachEvent) => {
        switch (event.kind) {
          case "session":
            sessionRef.current = event.id;
            return;
          case "tool": {
            if (event.status === "start") {
              const id = `tool-${++seq}`;
              toolOf.set(id, event.name);
              trace.push({
                id,
                label: toolLabel(event.name),
                // The agent's own words for what it is looking up.
                detail: event.detail ? `“${event.detail}”` : undefined,
                status: "active",
                startedAt: Date.now(),
              });
            } else {
              // End frames carry only the tool name. With parallel calls the
              // oldest open step of that tool is the one finishing first.
              const step = trace.find((s) => s.status === "active" && toolOf.get(s.id) === event.name);
              if (step) close(step);
            }
            sync();
            return;
          }
          case "token":
            if (!trace.some((s) => s.id === WRITE_STEP)) {
              trace.push({ id: WRITE_STEP, label: "Writing the answer", status: "active", startedAt: Date.now() });
            }
            answer += event.text;
            sync();
            return;
          case "citations":
            sources = event.citations;
            return;
          case "done":
            usage = event.usage;
            return;
          case "error":
            throw new Error(event.message || "The coach hit an error while answering.");
        }
      };

      const run = async (sessionId: string | undefined) => {
        for await (const event of streamCoachChat({
          message: question,
          sessionId,
          focusArea,
          personaName,
          signal: controller.signal,
        })) {
          handle(event);
        }
      };

      try {
        try {
          await run(sessionRef.current);
        } catch (err) {
          // Horus no longer has this conversation: start over once, silently.
          if (!(err instanceof CoachSessionExpiredError) || !sessionRef.current) throw err;
          sessionRef.current = undefined;
          trace = [];
          answer = "";
          await run(undefined);
        }

        for (const step of trace) if (step.status === "active") close(step);
        const empty = answer.trim().length === 0;
        patch(assistantId, (m) => ({
          ...m,
          isLoading: false,
          content: empty ? "The coach didn't produce an answer. Try asking again." : answer,
          failed: empty || undefined,
          thinking: trace.map((s) => ({ ...s })),
          sources,
          responseTime: Date.now() - startedAt,
          tokens: usage ? usage.inputTokens + usage.outputTokens : undefined,
        }));
      } catch (err) {
        const aborted = controller.signal.aborted;
        for (const step of trace) if (step.status === "active") close(step, aborted ? "skipped" : "failed");
        const reason =
          err instanceof QuotaExceededError
            ? err.message
            : aborted
              ? "Stopped."
              : err instanceof Error
                ? err.message
                : "The coach hit an error. Try again.";
        patch(assistantId, (m) => ({
          ...m,
          isLoading: false,
          // Keep whatever had streamed; say why it stopped underneath.
          content: answer ? `${answer}\n\n— ${reason}` : reason,
          failed: true,
          thinking: trace.map((s) => ({ ...s })),
          sources,
          responseTime: Date.now() - startedAt,
        }));
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [focusArea, personaName, patch],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    sessionRef.current = undefined;
    setMessages([]);
  }, []);

  const rateMessage = useCallback(
    (id: string, rating: "helpful" | "not-helpful") => patch(id, (m) => ({ ...m, rating })),
    [patch],
  );

  return { messages, send, stop, clearChat, rateMessage, isStreaming };
}

// coach-chat — the Career Coach's door to the Horus agent.
//
// The coach used to call Horus's single-shot `rag.query` through horus-rag:
// one search, one model call, with a browser-side "planner" that was an
// 18-word regex deciding whether to look anything up in the graph. Horus has
// had a real agent all along — at /api/sdk/chat, built for exactly this
// consumer — that chooses its own tools (search, graph lookup), searches
// again when the first pass misses, numbers its citations across documents
// and graph, keeps the conversation, and streams tokens and tool steps as
// they happen. This function is the only thing between the two.
//
// ── WHAT IT ADDS ON TOP OF HORUS ──────────────────────────────────────────
// - The Horus key stays here. The browser authenticates to us with its
//   Supabase session; it never sees a Horus credential.
// - The user's plan is charged before the run, and refunded if Horus refuses
//   before generating anything.
// - The persona is read server-side from `chat_prompts` (admin-editable), so
//   the browser chooses a focus area, never the instructions themselves.
// - Spend lands in the token ledger when the stream ends, from the usage in
//   Horus's final `done` frame. horus-rag never recorded RAG spend at all.
//
// ── WHAT IT DELIBERATELY DOES NOT DO ──────────────────────────────────────
// It forwards Horus's SSE bytes unchanged. Frames are only *read* on the way
// past to find the usage; the browser parses the same wire format Horus
// documents (`data: {kind: session|token|tool|citations|done|error}`), so
// there is one contract, not a Horus one and a CareerCraft one.

import { z } from "npm:zod@3";

import { handler, sseStream } from "../_shared/http/responses.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { enforcePlanQuota, refundPlanQuota } from "../_shared/db/plan-quota.ts";
import { clampTier, meterFromQuota } from "../_shared/ai/meter.ts";
import { recordTokenSpend } from "../_shared/db/token-usage.ts";
import { authHeaders, baseUrl } from "../_shared/ai/horus-knowledge.ts";
import {
  AppError,
  ConfigError,
  ProviderError,
  RateLimitError,
  ValidationError,
} from "../_shared/ai/errors.ts";

/*
 * The chat draws on the same allowance the coach always has: it replaces
 * horus-rag's generative search for this surface rather than adding a new
 * kind of spend, so it keeps that plan_limits row.
 */
const RESOURCE = "horus-rag-search";
const RESOURCE_LABEL = "career intelligence search";
const TASK = "careercraft.coach_chat";

const BodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  /** Horus session id from a previous turn's `session` frame. */
  sessionId: z.string().uuid().optional(),
  /** Which persona row to use — the browser picks a lens, never the prompt. */
  focusArea: z.string().trim().min(1).max(60).default("careers"),
  /** Display name for the persona ("Career Coach"). Cosmetic. */
  personaName: z.string().trim().max(60).optional(),
});

/** Horus no longer knows the session (expired, or minted under another key). */
class SessionExpiredError extends AppError {
  constructor() {
    super("This conversation can't be continued. Start a new one.", 409, "SESSION_EXPIRED");
  }
}

interface Persona {
  prompt?: string;
}

/**
 * The admin-edited persona for this focus area, if one exists.
 *
 * A missing persona is not an error: Horus then uses its own default voice.
 * A failed read is logged and treated the same way — the chat should not go
 * down because the prompt table is unreachable.
 */
async function loadPersona(
  userClient: Awaited<ReturnType<typeof requireUser>>["userClient"],
  focusArea: string,
): Promise<Persona> {
  const { data, error } = await userClient.rpc("get_chat_prompt", { _focus_area: focusArea });
  if (error) {
    console.warn(`[coach-chat] persona lookup failed for "${focusArea}":`, error.message);
    return {};
  }
  const row = Array.isArray(data) ? data[0] : null;
  const prompt = typeof row?.system_prompt === "string" ? row.system_prompt.trim() : "";
  return prompt ? { prompt } : {};
}

/** Horus answers errors before streaming as `{ error }` JSON. */
async function upstreamMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    // Not JSON — an SSO redirect page or a proxy error. Fall through.
  }
  return text.slice(0, 300);
}

Deno.serve(
  handler(
    async (req) => {
      const { userId, userClient } = await requireUser(req);

      const parsed = BodySchema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) {
        throw new ValidationError("Invalid request body", parsed.error.flatten());
      }
      const { message, sessionId, focusArea, personaName } = parsed.data;

      // Charged up front so a 429 is an ordinary JSON response, not a broken
      // stream. Refunded below if Horus refuses before generating anything.
      const quota = await enforcePlanQuota({
        userId,
        resource: RESOURCE,
        resourceLabel: RESOURCE_LABEL,
      });
      const meter = meterFromQuota(quota, userId);
      const modelTier = clampTier("fast", meter.maxModelTier);
      const persona = await loadPersona(userClient, focusArea);
      const startedAt = Date.now();

      let upstream: Response;
      try {
        upstream = await fetch(`${baseUrl()}/api/sdk/chat`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            message,
            ...(sessionId && { sessionId }),
            model: modelTier,
            ...(persona.prompt && {
              persona: persona.prompt,
              ...(personaName && { personaName }),
            }),
          }),
          // The browser closing the tab stops the agent run, not just our relay.
          signal: req.signal,
        });
      } catch (err) {
        await refundPlanQuota(userId, RESOURCE);
        throw new ProviderError(
          `Horus unreachable: ${err instanceof Error ? err.message : String(err)}`,
          "horus",
        );
      }

      if (!upstream.ok || !upstream.body) {
        const status = upstream.status;
        const detail = await upstreamMessage(upstream);
        await refundPlanQuota(userId, RESOURCE);
        await recordTokenSpend(meter, {
          task: TASK,
          provider: "horus",
          modelTier,
          errorCode: `HTTP_${status}`,
          durationMs: Date.now() - startedAt,
        });

        if (status === 404 && sessionId) throw new SessionExpiredError();
        if (status === 429) throw new RateLimitError("The coach is busy right now. Try again in a minute.");
        // A refused key is our misconfiguration, never the user's fault.
        if (status === 401 || status === 403) {
          throw new ConfigError(`Horus refused the coach-chat key (${status}): ${detail}`);
        }
        // Moderation blocks and malformed bodies come back as 400.
        if (status === 400) throw new ValidationError(detail || "Horus could not accept that message");
        throw new ProviderError(`Horus ${status}: ${detail}`, "horus", status);
      }

      // ── Relay ──────────────────────────────────────────────────────────
      // Bytes go to the browser untouched. Frames are parsed on the way past
      // only to catch the final usage and any error the run reported.
      const decoder = new TextDecoder();
      let buffer = "";
      let usage: { inputTokens?: number; outputTokens?: number } | null = null;
      let runError: string | null = null;
      let recorded = false;

      const inspect = (frame: string) => {
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) return;
        try {
          const event = JSON.parse(line.slice(5).trim()) as {
            kind?: string;
            usage?: { inputTokens?: number; outputTokens?: number };
            message?: unknown;
          };
          if (event.kind === "done") usage = event.usage ?? null;
          else if (event.kind === "error") runError = String(event.message ?? "agent error");
        } catch {
          // A malformed frame is forwarded as-is; it is not ours to repair.
        }
      };

      const record = async (errorCode?: string) => {
        if (recorded) return;
        recorded = true;
        const code = errorCode ?? (runError ? "RUN_ERROR" : undefined);
        await recordTokenSpend(meter, {
          task: TASK,
          provider: "horus",
          modelTier,
          promptTokens: usage?.inputTokens,
          completionTokens: usage?.outputTokens,
          durationMs: Date.now() - startedAt,
          ...(code && { errorCode: code }),
          metadata: { focusArea, persona: Boolean(persona.prompt) },
        });
      };

      // A closed tab never reaches flush(); record what was spent so far.
      req.signal.addEventListener("abort", () => void record("ABORTED"), { once: true });

      const tap = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          controller.enqueue(chunk);
          buffer += decoder.decode(chunk, { stream: true });
          let cut: number;
          while ((cut = buffer.indexOf("\n\n")) !== -1) {
            inspect(buffer.slice(0, cut));
            buffer = buffer.slice(cut + 2);
          }
        },
        async flush() {
          if (buffer.trim()) inspect(buffer);
          await record();
        },
      });

      return sseStream(upstream.body.pipeThrough(tap));
    },
    { name: "coach-chat" },
  ),
);

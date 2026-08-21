// Horus inference client — CareerCraft's door to the model.
//
// All text generation in the edge functions goes through Horus's
// `POST /api/infer` gateway (deployed horus-platform, Vercel) using a
// tenant API key with the `intelligence:infer` scope. Horus maps the
// "fast" | "deep" tier to a concrete Azure deployment; CareerCraft never
// holds a model-vendor key for generation.
//
// Env:
//   HORUS_INFER_URL — full URL to the gateway, e.g. https://horus.example.com/api/infer
//   HORUS_API_KEY   — CareerCraft tenant API key
//
// The gateway always responds in JSON mode ({ content: "<json string>", ... }),
// so plain-text tasks are wrapped as {"text": "..."} and unwrapped here.

import { z } from "npm:zod@3";

import { ConfigError, ProviderError, RateLimitError } from "./errors.ts";
import { optEnv, reqEnv } from "../env.ts";
import { clampTier, clampTokens, dailyCeilingReached, type MeterContext } from "./meter.ts";
import { recordTokenSpend } from "../db/token-usage.ts";

export type HorusTier = "fast" | "deep";

export interface HorusMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface HorusUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface HorusInferOptions {
  /** Routing + telemetry key, e.g. "careercraft.onboard_analyze". */
  task: string;
  system: string;
  /** Either a single user prompt or full message array. */
  prompt?: string;
  messages?: HorusMessage[];
  model?: HorusTier;
  temperature?: number;
  maxTokens?: number;
  /**
   * Who pays, and what they are allowed to spend.
   *
   * Required on purpose: a missing meter is a compile error rather than an
   * unattributed call that only surfaces on the invoice. Paths with no user
   * (cron, backfills) pass systemMeter().
   */
  meter: MeterContext;
  /** Marks the retry inside horusGenerateObject so the second bill is visible. */
  attempt?: number;
}

export interface HorusInferResult {
  content: string;
  model: string;
  usage: HorusUsage;
}

export function horusConfigured(): boolean {
  return Boolean(optEnv("HORUS_INFER_URL") && optEnv("HORUS_API_KEY"));
}

export async function horusInfer(opts: HorusInferOptions): Promise<HorusInferResult> {
  const url = reqEnv("HORUS_INFER_URL");
  const apiKey = reqEnv("HORUS_API_KEY");
  const meter = opts.meter;

  const messages = opts.messages ??
    (opts.prompt !== undefined ? [{ role: "user" as const, content: opts.prompt }] : []);
  if (!messages.length) {
    throw new ConfigError("horusInfer: prompt or messages required");
  }

  // Daily backstop, checked here rather than only at the request edge so a
  // fan-out stops mid-request instead of completing every branch first.
  if (dailyCeilingReached(meter)) {
    throw new RateLimitError(
      "Daily AI usage limit reached. It resets at midnight UTC.",
      undefined,
      meter.dailyTokenLimit ?? undefined,
    );
  }

  // The plan decides the tier and the budget, never the caller. This is the
  // whole point on `infer`, where the request body used to pick both.
  const model = clampTier(opts.model, meter.maxModelTier);
  const maxTokens = clampTokens(opts.maxTokens, meter.maxTokensPerCall);

  const startedAt = Date.now();

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: opts.task,
        system: opts.system,
        messages,
        model,
        temperature: opts.temperature ?? 0.7,
        maxTokens,
        // Finally populated. Horus has accepted this field all along; nothing
        // ever sent it, so every call arrived anonymous under the tenant key.
        userRef: meter.userId ?? undefined,
      }),
    });
  } catch (err) {
    throw new ProviderError(
      `Horus request failed: ${err instanceof Error ? err.message : err}`,
      "horus",
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Record the failed attempt: a rejected call can still have burned tokens
    // upstream, and a gap in the ledger is worse than a zero.
    await recordTokenSpend(meter, {
      task: opts.task,
      provider: "horus",
      modelTier: model,
      attempt: opts.attempt ?? 1,
      errorCode: `HTTP_${res.status}`,
      durationMs: Date.now() - startedAt,
    });
    if (res.status === 429) {
      throw new RateLimitError("Horus inference rate limit exceeded");
    }
    throw new ProviderError(
      `Horus ${res.status}: ${text.slice(0, 300)}`,
      "horus",
      res.status,
    );
  }

  const out = (await res.json()) as {
    content?: string;
    model?: string;
    usage?: { inputTokens?: number; outputTokens?: number };
  };
  if (!out.content) {
    throw new ProviderError("Horus returned an empty response", "horus");
  }

  const usage: HorusUsage = {
    promptTokens: out.usage?.inputTokens,
    completionTokens: out.usage?.outputTokens,
  };

  await recordTokenSpend(meter, {
    task: opts.task,
    provider: "horus",
    model: out.model ?? "horus",
    modelTier: model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    attempt: opts.attempt ?? 1,
    durationMs: Date.now() - startedAt,
  });

  return {
    content: out.content,
    model: out.model ?? "horus",
    usage,
  };
}

/** Tolerant JSON extraction: strips code fences and surrounding prose. */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new ProviderError("Horus returned non-JSON content", "horus");
  }
}

export interface HorusObjectResult<T> {
  object: T;
  usage: HorusUsage;
  modelId: string;
}

/**
 * Structured generation: parse + zod-validate the gateway's JSON, with one
 * retry that feeds the validation issues back to the model.
 */
export async function horusGenerateObject<S extends z.ZodTypeAny>(
  schema: S,
  opts: HorusInferOptions,
): Promise<HorusObjectResult<z.infer<S>>> {
  const first = await horusInfer(opts);
  const firstParsed = schema.safeParse(extractJson(first.content));
  if (firstParsed.success) {
    return { object: firstParsed.data, usage: first.usage, modelId: first.model };
  }

  const issues = firstParsed.error.issues
    .slice(0, 10)
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  console.warn(`[horus] ${opts.task} schema issues, retrying: ${issues}`);

  const retryMessages: HorusMessage[] = [
    ...(opts.messages ?? [{ role: "user" as const, content: opts.prompt ?? "" }]),
    { role: "assistant", content: first.content.slice(0, 8000) },
    {
      role: "user",
      content:
        `Your previous JSON had these problems: ${issues}. ` +
        `Return the corrected, complete JSON object only.`,
    },
  ];

  // attempt: 2 is what makes this second, otherwise invisible, bill show up in
  // the ledger. If a task's attempt=2 rate is high, that is a prompt problem
  // rather than a quota one — and it can now be seen rather than guessed at.
  const second = await horusInfer({
    ...opts,
    prompt: undefined,
    messages: retryMessages,
    attempt: 2,
  });
  const secondParsed = schema.safeParse(extractJson(second.content));
  if (!secondParsed.success) {
    const preview = secondParsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ProviderError(
      `Horus output failed schema validation after retry (${preview})`,
      "horus",
    );
  }
  return { object: secondParsed.data, usage: second.usage, modelId: second.model };
}

const TEXT_WRAP_INSTRUCTION =
  `\n\nOUTPUT FORMAT: Return ONLY a JSON object of the shape {"text": "<your complete response>"} — ` +
  `the full response goes in the "text" string, correctly JSON-escaped. No other keys, no commentary.`;

export interface HorusTextResult {
  text: string;
  usage: HorusUsage;
  modelId: string;
}

/**
 * Plain-text generation through the JSON-only gateway: the model wraps its
 * answer as {"text": "..."} and we unwrap it. Falls back to the raw content
 * if the model ignored the wrapper (still usable text either way).
 */
export async function horusGenerateText(opts: HorusInferOptions): Promise<HorusTextResult> {
  const result = await horusInfer({
    ...opts,
    system: opts.system + TEXT_WRAP_INSTRUCTION,
  });

  let text = result.content;
  try {
    const parsed = extractJson(result.content) as Record<string, unknown>;
    if (typeof parsed.text === "string" && parsed.text.trim()) {
      text = parsed.text;
    }
  } catch {
    // Model returned bare text despite JSON mode — use as-is.
  }

  return { text, usage: result.usage, modelId: result.model };
}

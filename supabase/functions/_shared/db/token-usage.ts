// Writes to token_usage_ledger — the record of what each model call cost.
//
// Every write is best-effort. A ledger failure must never turn a successful
// analysis into an error for the user; the worst case is one unrecorded call,
// which the console.error leaves a trail for.

import { adminClient } from "./supabase.ts";
import type { MeterContext } from "../ai/meter.ts";

export interface TokenSpend {
  /** Horus routing key, e.g. 'careercraft.ats_full_analysis'. */
  task?: string;
  provider: "horus" | "azure" | "horus-knowledge";
  model?: string;
  modelTier?: "fast" | "deep";
  promptTokens?: number;
  completionTokens?: number;
  /** Set when only a total is known — horus-knowledge reports no split. */
  totalTokens?: number;
  /** 2 for horusGenerateObject's schema-failure retry. */
  attempt?: number;
  errorCode?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Record one model call and advance the request's running token total.
 *
 * Mutates meter.dailyTokensUsed so a fan-out (ats-analyze makes up to four
 * calls) sees its own spend accumulate without re-querying.
 */
export async function recordTokenSpend(
  meter: MeterContext,
  spend: TokenSpend,
): Promise<void> {
  const prompt = spend.promptTokens ?? 0;
  const completion = spend.completionTokens ?? 0;
  const total = spend.totalTokens ?? prompt + completion;

  // Advance the in-request total first: even if the insert fails, this request
  // must not keep spending as though nothing happened.
  meter.dailyTokensUsed += total;

  try {
    const { error } = await adminClient().from("token_usage_ledger").insert({
      user_id: meter.userId,
      resource: meter.resource,
      task: spend.task ?? null,
      provider: spend.provider,
      model: spend.model ?? null,
      model_tier: spend.modelTier ?? null,
      prompt_tokens: prompt,
      completion_tokens: completion,
      total_tokens: total,
      request_id: meter.requestId,
      attempt: spend.attempt ?? 1,
      error_code: spend.errorCode ?? null,
      duration_ms: spend.durationMs ?? null,
      metadata: spend.metadata ?? {},
    });

    if (error) {
      console.error(`[ledger] insert failed for ${meter.resource}: ${error.message}`);
    }
  } catch (err) {
    console.error(`[ledger] insert threw for ${meter.resource}:`, err);
  }
}

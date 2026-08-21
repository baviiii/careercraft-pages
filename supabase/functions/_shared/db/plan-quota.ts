// Plan-aware quota enforcement.
//
// Wraps consume_plan_quota, which resolves the caller's plan, applies any
// per-user override, and consumes from the monthly + hourly counters in one
// round trip. The limits live in the database so they can be retuned from the
// admin screen without a deploy.
//
// Relationship to rate-limit.ts: enforceWindowLimit() is still there and still
// works. It applies one hardcoded window and knows nothing about plans. Use
// this instead for anything that spends money.

import { RateLimitError } from "../ai/errors.ts";
import { adminClient } from "./supabase.ts";

export type ModelTier = "fast" | "deep";

/** Which layer refused the request. */
export type QuotaReason = "monthly" | "hourly" | "daily_tokens" | "not_in_plan";

export interface PlanQuota {
  allowed: boolean;
  reason: QuotaReason | null;
  planKey: string;
  resource: string;
  /** The limit that was hit; null when nothing was hit. */
  limit: number | null;
  used: number;
  remaining: number | null;
  /** When the exhausted window rolls over. */
  resetsAt: string | null;
  monthly: { limit: number | null; used: number };
  hourly: { limit: number | null; used: number };
  /** Clamps to apply to every model call made while serving this request. */
  maxModelTier: ModelTier;
  maxTokensPerCall: number;
  dailyTokens: { limit: number | null; used: number };
}

export interface PlanQuotaOpts {
  /** Must come from requireUser() — never from a request body. */
  userId: string;
  /** Server-owned resource key, matching a plan_limits row. */
  resource: string;
  /** Human-readable name used in the 429 message. */
  resourceLabel?: string;
  /**
   * Resolve and report, but consume nothing and never throw.
   *
   * This is how a function ships before its limits have been tuned against
   * real traffic: the ledger fills up and the numbers can be checked against
   * actual usage before anyone gets a 429.
   */
  observeOnly?: boolean;
}

interface RawQuota {
  allowed: boolean;
  reason: QuotaReason | null;
  plan_key: string;
  resource: string;
  limit: number | null;
  used: number | null;
  remaining: number | null;
  resets_at: string | null;
  monthly?: { limit: number | null; used: number | null };
  hourly?: { limit: number | null; used: number | null };
  max_model_tier: ModelTier;
  max_tokens_per_call: number;
  daily_tokens: { limit: number | null; used: number | null };
}

function shape(raw: RawQuota): PlanQuota {
  return {
    allowed: raw.allowed,
    reason: raw.reason,
    planKey: raw.plan_key,
    resource: raw.resource,
    limit: raw.limit,
    used: Number(raw.used ?? 0),
    remaining: raw.remaining,
    resetsAt: raw.resets_at,
    monthly: {
      limit: raw.monthly?.limit ?? null,
      used: Number(raw.monthly?.used ?? 0),
    },
    hourly: {
      limit: raw.hourly?.limit ?? null,
      used: Number(raw.hourly?.used ?? 0),
    },
    maxModelTier: raw.max_model_tier,
    maxTokensPerCall: raw.max_tokens_per_call,
    dailyTokens: {
      limit: raw.daily_tokens?.limit ?? null,
      used: Number(raw.daily_tokens?.used ?? 0),
    },
  };
}

/** Human-readable explanation for the 429 body. */
function explain(quota: PlanQuota, label: string): string {
  switch (quota.reason) {
    case "not_in_plan":
      return `${label} is not included in your plan.`;
    case "daily_tokens":
      return `You have reached today's AI usage limit. It resets at midnight UTC.`;
    case "monthly":
      return `You have used all ${quota.limit} of this month's ${label}. Your allowance resets on the 1st.`;
    case "hourly":
      return `Too many ${label} requests in the last hour. Try again shortly.`;
    default:
      return `Limit reached for ${label}.`;
  }
}

function retryAfterSec(quota: PlanQuota): number | undefined {
  if (!quota.resetsAt) return undefined;
  const ms = new Date(quota.resetsAt).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(1, Math.ceil(ms / 1000)) : undefined;
}

/**
 * Consume one unit of the user's allowance for a resource.
 *
 * Throws RateLimitError (429) when the allowance is spent. The error carries
 * the limit, the usage and the reset time so the client can render a real
 * upgrade prompt instead of a generic failure.
 */
export async function enforcePlanQuota(opts: PlanQuotaOpts): Promise<PlanQuota> {
  const label = opts.resourceLabel ?? opts.resource;

  const { data, error } = await adminClient().rpc("consume_plan_quota", {
    p_user_id: opts.userId,
    p_resource: opts.resource,
    p_dry_run: opts.observeOnly ?? false,
  });

  if (error) {
    throw new Error(`Quota check failed for ${opts.resource}: ${error.message}`);
  }
  if (!data) {
    throw new Error(`Quota check returned no result for ${opts.resource}`);
  }

  const quota = shape(data as RawQuota);

  if (opts.observeOnly) {
    if (!quota.allowed) {
      // The signal that matters while tuning: this request WOULD have been
      // refused. Nothing is blocked yet.
      console.warn(
        `[quota:observe] would deny ${opts.resource} for ${opts.userId}: ` +
          `${quota.reason} (used ${quota.used}/${quota.limit}, plan ${quota.planKey})`,
      );
    }
    return { ...quota, allowed: true };
  }

  if (!quota.allowed) {
    throw new RateLimitError(explain(quota, label), retryAfterSec(quota), quota.limit ?? undefined);
  }

  return quota;
}

/**
 * Hand back a consumed unit after an upstream failure.
 *
 * onboard-analyze historically counted only completed runs, so a provider
 * outage cost the user nothing. Consuming up front regresses that unless the
 * caller refunds on ProviderError — hence this.
 *
 * Never throws: a failed refund must not mask the original error.
 */
export async function refundPlanQuota(userId: string, resource: string): Promise<void> {
  try {
    const { error } = await adminClient().rpc("refund_plan_quota", {
      p_user_id: userId,
      p_resource: resource,
    });
    if (error) {
      console.error(`[quota] refund failed for ${resource}/${userId}: ${error.message}`);
    }
  } catch (err) {
    console.error(`[quota] refund threw for ${resource}/${userId}:`, err);
  }
}

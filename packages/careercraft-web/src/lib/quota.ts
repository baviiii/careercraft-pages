// Client-side reading of plan quotas and the 429s they produce.
//
// The edge functions answer a spent allowance with HTTP 429, code
// RATE_LIMITED, and a `details` object describing which layer refused and when
// it resets. supabase-js buries that body inside FunctionsHttpError.context,
// so it has to be unwrapped before it can be shown to anyone.
//
// readErrorBody here is the same helper that has been living privately in
// features/onboarding/lib/onboarding-api.ts; it is promoted rather than
// duplicated so every caller reads a 429 the same way.

import { supabase } from '@/integrations/supabase/client';

export type QuotaReason = 'monthly' | 'hourly' | 'daily_tokens' | 'not_in_plan';

export interface QuotaDetails {
  resource: string;
  resourceLabel: string;
  reason: QuotaReason;
  planKey: string;
  limit: number | null;
  used: number;
  resetsAt: string | null;
}

export interface EdgeErrorBody {
  error?: string;
  code?: string;
  limit?: number;
  retryAfterSec?: number;
  details?: unknown;
}

/** Unwraps the JSON body supabase-js hides inside FunctionsHttpError.context. */
export async function readErrorBody(error: unknown): Promise<EdgeErrorBody | null> {
  const ctx = (error as { context?: Response }).context;
  if (!ctx || typeof ctx.clone !== 'function') return null;
  try {
    return (await ctx.clone().json()) as EdgeErrorBody;
  } catch {
    return null;
  }
}

function isQuotaDetails(value: unknown): value is QuotaDetails {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  return typeof d.resource === 'string' && typeof d.reason === 'string';
}

/**
 * Returns quota details when an error is a plan-limit rejection, else null.
 *
 * Callers use the null case to fall through to their normal error handling —
 * a 429 is a product state to explain, not a failure to apologise for.
 */
export async function asQuotaError(error: unknown): Promise<QuotaDetails | null> {
  const body = await readErrorBody(error);
  if (!body || body.code !== 'RATE_LIMITED') return null;
  return isQuotaDetails(body.details) ? body.details : null;
}

/**
 * Thrown when a plan limit refuses a request.
 *
 * Carries the details so a caller can render QuotaNotice via an instanceof
 * check, instead of pattern-matching on an error string.
 */
export class QuotaExceededError extends Error {
  readonly details: QuotaDetails;

  constructor(details: QuotaDetails, message?: string) {
    super(message ?? quotaMessage(details));
    this.name = 'QuotaExceededError';
    this.details = details;
  }
}

/**
 * Quota details from a raw fetch Response, or null if it is not a 429.
 *
 * The lib/* AI callers use fetch directly rather than supabase.functions.invoke,
 * so they never produce a FunctionsHttpError for asQuotaError to unwrap.
 *
 * Consumes the body, so pass a clone if the caller still needs it.
 */
export async function quotaFromResponse(response: Response): Promise<QuotaDetails | null> {
  if (response.status !== 429) return null;
  try {
    const body = (await response.json()) as EdgeErrorBody;
    if (body.code !== 'RATE_LIMITED') return null;
    return isQuotaDetails(body.details) ? body.details : null;
  } catch {
    return null;
  }
}

/** Wording for the moment a user is actually blocked. */
export function quotaMessage(details: QuotaDetails): string {
  switch (details.reason) {
    case 'not_in_plan':
      return `${details.resourceLabel} isn't part of your current plan.`;
    case 'daily_tokens':
      return "You've reached today's AI usage limit.";
    case 'monthly':
      return `You've used all ${details.limit} of this month's ${details.resourceLabel.toLowerCase()}.`;
    case 'hourly':
      return `That's a lot of ${details.resourceLabel.toLowerCase()} in one hour. Take a short break and try again.`;
    default:
      return `Limit reached for ${details.resourceLabel}.`;
  }
}

/**
 * "in 3 days", "in 20 minutes".
 *
 * Windows reset in UTC, which for Australian users lands mid-morning rather
 * than at their local midnight — so this reports a relative time instead of a
 * clock time that would look wrong.
 */
export function formatResetsIn(resetsAt: string | null): string | null {
  if (!resetsAt) return null;
  const ms = new Date(resetsAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

// ── Usage, for the Settings screen ─────────────────────────────────────────

export interface ResourceUsage {
  resource: string;
  label: string;
  is_enabled: boolean;
  monthly_limit: number | null;
  monthly_used: number;
  hourly_limit: number | null;
  hourly_used: number;
}

export interface PlanUsage {
  plan_key: string;
  resets_at: string;
  daily_tokens_used: number;
  resources: ResourceUsage[];
}

/**
 * Current usage for the signed-in user.
 *
 * get_plan_usage is SECURITY DEFINER and refuses to report on anyone but the
 * caller (or for an admin, anyone), so the counter tables stay service-role
 * only while the UI still gets what it needs.
 */
export async function fetchPlanUsage(userId: string): Promise<PlanUsage | null> {
  const { data, error } = await supabase.rpc('get_plan_usage', { p_user_id: userId });
  if (error) {
    console.error('Error loading plan usage:', error);
    return null;
  }
  return (data as unknown as PlanUsage) ?? null;
}

/** -1 means uncapped; null means the plan has no opinion. */
export function isUnlimited(limit: number | null): boolean {
  return limit === null || limit === -1;
}

export function usageLabel(used: number, limit: number | null): string {
  if (isUnlimited(limit)) return `${used} used`;
  return `${used} / ${limit}`;
}

export function usagePercent(used: number, limit: number | null): number {
  if (isUnlimited(limit) || !limit) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

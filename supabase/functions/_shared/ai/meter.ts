// The billing context threaded through every model call.
//
// ── Why this is an explicit parameter rather than AsyncLocalStorage ────────
//
// horusInfer() knows what a call cost; the request handler knows who to bill.
// Something has to carry the identity down. Making `meter` a REQUIRED field on
// HorusInferOptions means `deno check` fails on any new call site that forgets
// it. AsyncLocalStorage would instead hand back `undefined` and quietly bill
// nobody — the exact failure this work exists to prevent, and one you would
// only discover on an invoice.
//
// It also happens to be necessary: ats-analyze makes up to four calls per
// request, and the fourth has to see the first three's spend without another
// database round trip. That requires one mutable object threaded through, which
// is what this is. ALS would have stored the same object and added a lookup.
//
// The isolate-reuse hazard seals it. The Supabase edge runtime reuses isolates
// between requests, so any continuation that escapes the request scope — a
// stray .catch(), a retry — reads a stale ALS store and bills the wrong user.
// Silent mis-attribution in a billing system is worse than a compile error.

import type { ModelTier, PlanQuota } from "../db/plan-quota.ts";

export interface MeterContext {
  /** The user whose plan pays. null on system/cron paths. */
  userId: string | null;
  /** The same server-owned key the quota was consumed under. */
  resource: string;
  /** Groups every model call made while serving one HTTP request. */
  requestId: string;
  /** Daily backstop from the plan. null = no ceiling. */
  dailyTokenLimit: number | null;
  /**
   * Running total for today, seeded from the quota RPC and incremented in
   * place after each call. Mutable on purpose: it is what lets a fan-out
   * self-limit mid-request rather than discovering the overspend afterwards.
   */
  dailyTokensUsed: number;
  /** Applied to every call made in this request. */
  maxModelTier: ModelTier;
  maxTokensPerCall: number;
}

export function meterFromQuota(quota: PlanQuota, userId: string): MeterContext {
  return {
    userId,
    resource: quota.resource,
    requestId: crypto.randomUUID(),
    dailyTokenLimit: quota.dailyTokens.limit,
    dailyTokensUsed: quota.dailyTokens.used,
    maxModelTier: quota.maxModelTier,
    maxTokensPerCall: quota.maxTokensPerCall,
  };
}

/**
 * For paths with no paying user — cron jobs, backfills, admin tooling.
 * Ledger rows are written with a null user_id so the spend is still visible.
 */
export function systemMeter(resource: string): MeterContext {
  return {
    userId: null,
    resource,
    requestId: crypto.randomUUID(),
    dailyTokenLimit: null,
    dailyTokensUsed: 0,
    maxModelTier: "deep",
    maxTokensPerCall: 16000,
  };
}

/** A plan can only ever lower the tier, never raise it. */
export function clampTier(want: ModelTier | undefined, cap: ModelTier): ModelTier {
  if (cap === "fast") return "fast";
  return want ?? "fast";
}

export function clampTokens(want: number | undefined, cap: number): number {
  if (want === undefined) return Math.min(4000, cap);
  return Math.min(want, cap);
}

/** True when this request has already spent its daily allowance. */
export function dailyCeilingReached(meter: MeterContext): boolean {
  return meter.dailyTokenLimit !== null && meter.dailyTokensUsed >= meter.dailyTokenLimit;
}

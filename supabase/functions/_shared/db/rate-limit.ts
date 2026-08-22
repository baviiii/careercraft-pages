// Fixed-window rate limiting for callers with no authenticated user.
//
// Anything with a verified user goes through ../db/plan-quota.ts instead,
// which resolves that user's plan rather than applying a hardcoded number.
// This file is what remains for the endpoints that cannot do that — today
// that means `infer`, when the interview-coach MCP presents only its shared
// secret.
//
// The plan-unaware enforceWindowLimit/enforceDailyLimit helpers that used to
// live here were removed once every AI function moved to plan quotas; git has
// them if a non-AI endpoint ever needs a flat limit again.

import { RateLimitError } from "../ai/errors.ts";
import { adminClient } from "./supabase.ts";

export interface AnonymousWindowLimitOpts {
  /** Stable server-owned resource key (never accept this from the request). */
  resource: string;
  /** Raw network principal — typically the client IP. Hashed before it leaves. */
  principal: string;
  /** Maximum requests allowed in the fixed window. */
  limit: number;
  /** Fixed-window duration in minutes. */
  windowMinutes: number;
  /** Human-readable resource name for error messages. */
  resourceLabel?: string;
}

/** Hex SHA-256 — the anonymous quota table stores only a one-way hash. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Fixed-window quota for endpoints with no authenticated user.
 *
 * Keyed by sha256(principal) — `consume_edge_function_quota` cannot be used
 * here because its p_user_id is a UUID and an IP will never cast to one.
 */
export async function enforceAnonymousWindowLimit(
  opts: AnonymousWindowLimitOpts,
): Promise<number> {
  const { data, error } = await adminClient().rpc("consume_anonymous_edge_quota", {
    p_principal_hash: await sha256Hex(opts.principal),
    p_resource: opts.resource,
    p_limit: opts.limit,
    p_window_minutes: opts.windowMinutes,
  });

  if (error) {
    throw new Error(`Rate-limit check failed: ${error.message}`);
  }

  const used = typeof data === "number" ? data : Number(data ?? 0);
  if (used <= 0) {
    throw new RateLimitError(
      `Rate limit reached for ${opts.resourceLabel ?? "this resource"}. Try again later.`,
      opts.windowMinutes * 60,
      opts.limit,
    );
  }

  return used;
}

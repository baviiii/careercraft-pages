// Generalised wrapper over the "count in last N hours" RPC pattern.
//
// The RPC must:
//   - have signature  (p_user_id UUID) RETURNS BIGINT
//   - be SECURITY DEFINER (so we don't need RLS on the audit table)
//
// Example RPCs in the schema:
//   onboarding_runs_in_last_24h(p_user_id UUID) -> bigint

import { RateLimitError } from "../ai/errors.ts";
import { adminClient } from "./supabase.ts";

export interface LimitOpts {
  /** Postgres function name. */
  rpcName: string;
  /** Authenticated user id. */
  userId: string;
  /** Max calls allowed in the window. */
  limit: number;
  /** Human-readable resource name for error messages. */
  resourceLabel?: string;
}

export interface LimitResult {
  /** Calls already used in the window (before this one). */
  used: number;
  /** Calls remaining AFTER this one is recorded. */
  remaining: number;
}

export interface WindowLimitOpts {
  /** Stable server-owned resource key (never accept this from the request). */
  resource: string;
  /** Authenticated user id. */
  userId: string;
  /** Maximum requests allowed in the fixed window. */
  limit: number;
  /** Fixed-window duration in minutes. */
  windowMinutes: number;
  /** Human-readable resource name for error messages. */
  resourceLabel?: string;
}

/**
 * Atomically consumes one request from a fixed-window quota.
 *
 * The backing RPC is executable only by the service role. The user id must
 * always come from requireUser()/requireAdmin(), never from a request body.
 */
export async function enforceWindowLimit(opts: WindowLimitOpts): Promise<number> {
  const { data, error } = await adminClient().rpc("consume_edge_function_quota", {
    p_user_id: opts.userId,
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

export async function enforceDailyLimit(opts: LimitOpts): Promise<LimitResult> {
  const { data, error } = await adminClient().rpc(opts.rpcName, {
    p_user_id: opts.userId,
  });

  if (error) {
    // Treat as 5xx so caller knows it's a server-side failure, not a quota issue.
    throw new Error(
      `Rate-limit check failed via ${opts.rpcName}: ${error.message}`,
    );
  }

  const used = typeof data === "number" ? data : Number(data ?? 0);
  if (used >= opts.limit) {
    throw new RateLimitError(
      `Daily limit reached for ${opts.resourceLabel ?? "this resource"} (${opts.limit} per 24h). Try again later.`,
      undefined,
      opts.limit,
    );
  }

  return { used, remaining: Math.max(0, opts.limit - used - 1) };
}

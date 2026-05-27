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

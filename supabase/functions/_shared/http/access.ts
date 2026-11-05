// Bans and IP blocks, enforced in every edge function.
//
// The decision is made in one place — access_check() in the database
// (20261105000000_admin_user_management.sql) — and asked from two:
//
//   assertIpAllowed(req)      by handler(), before any function runs, so a
//                             blocked network can't reach anything, guest or
//                             signed in.
//   assertUserAllowed(userId) by verifyUserToken(), the moment a caller is
//                             identified, so a banned account is refused even
//                             while its access token is still valid.
//
// Admins are exempt from both (the database decides that too), so no block
// can ever lock an admin out of the admin screens.
//
// Results are cached per isolate for a short while: a busy page makes several
// calls a second and the answer rarely changes. A new block or ban therefore
// takes up to CACHE_MS to reach an isolate that has just checked the same
// caller. If the check itself fails, the request is allowed and the failure
// logged: an outage in the blocklist must not take every feature down with it.

import { createClient } from "npm:@supabase/supabase-js@2";

import { AccessBlockedError } from "../ai/errors.ts";
import { adminClient } from "../db/supabase.ts";
import { reqEnv } from "../env.ts";

const CACHE_MS = 30_000;

interface AccessResult {
  blocked: boolean;
  reason?: "banned" | "ip";
  until?: string | null;
  note?: string | null;
}

const cache = new Map<string, { at: number; value: AccessResult }>();

/**
 * The caller's address, as the platform vouches for it. null when there is none.
 *
 * cf-connecting-ip is set by Cloudflare and can't be forged. Failing that, the
 * LAST X-Forwarded-For entry: proxies append the address they saw, so the
 * last hop is the gateway's word. The FIRST entry is whatever the client put
 * there — curl -H "X-Forwarded-For: 1.2.3.4" — so using it would let anyone
 * walk round an IP block, or plant a stranger's address in our records.
 * check_request's _request_ip() in the database uses the same rule.
 */
export function clientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const chain = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ip = chain[chain.length - 1] || req.headers.get("x-real-ip")?.trim();
  return ip && ip !== "unknown" ? ip : null;
}

async function check(ip: string | null, userId: string | null): Promise<AccessResult> {
  const key = `${ip ?? "-"}|${userId ?? "-"}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const { data, error } = await adminClient().rpc("access_check", {
    p_ip: ip,
    p_user_id: userId,
  });
  if (error || !data) {
    console.error(`[access] check failed, allowing: ${error?.message ?? "no result"}`);
    return { blocked: false };
  }

  const value = data as AccessResult;
  if (cache.size > 5000) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}

function blockedError(result: AccessResult): AccessBlockedError {
  const message = result.reason === "banned"
    ? "This account has been suspended."
    : "Access from your network has been blocked.";
  return new AccessBlockedError(message, { reason: result.reason, until: result.until ?? null });
}

/** The token's claims, unverified — only to skip lookups that can't succeed. */
function claimsOf(jwt: string): { role?: string } | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * The user a token belongs to, with its signature checked by the data API —
 * not by Auth, which also refuses a token whose session has been ended. That
 * difference is the point: a banned account's sessions are ended at once,
 * but its token still proves who it is. Never checks bans itself (it's used
 * by the checks), and returns null on any failure.
 */
async function verifiedTokenOwner(jwt: string): Promise<string | null> {
  if (claimsOf(jwt)?.role !== "authenticated") return null;
  try {
    const client = createClient(reqEnv("SUPABASE_URL"), reqEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const { data, error } = await client.rpc("whoami");
    // With the data API gate on, a banned token is refused before whoami runs.
    // The gate refuses blocked networks with the same code — here, that would
    // be this function's own outbound address — so read which it was: only a
    // ban says anything about the token's owner.
    if (error?.code === "PT403") {
      let reason: unknown;
      try {
        reason = (JSON.parse(error.hint ?? "") as AccessResult).reason;
      } catch {
        reason = undefined;
      }
      return reason === "banned" ? "__blocked__" : null;
    }
    return typeof data === "string" ? data : null;
  } catch {
    return null;
  }
}

/** Throws AccessBlockedError when the request comes from a blocked network. */
export async function assertIpAllowed(req: Request): Promise<void> {
  const ip = clientIp(req);
  if (!ip) return;

  const result = await check(ip, null);
  if (!result.blocked) return;

  // Blocked network — but an admin on it is let through. Only worth a token
  // lookup in this rare case, and only for a signed-in user's token (the
  // public anon key can't belong to an admin).
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const userToken = (req.headers.get("x-user-token") ?? "").replace(/^Bearer\s+/i, "").trim();
  for (const jwt of [userToken, bearer]) {
    if (!jwt) continue;
    const userId = await verifiedTokenOwner(jwt);
    if (userId && userId !== "__blocked__" && !(await check(ip, userId)).blocked) return;
  }

  throw blockedError(result);
}

/**
 * For a token Auth has refused: if it belongs to a banned account, say so
 * (403 ACCESS_BLOCKED) rather than letting the caller fall back to "signed
 * out" — which is what the site's guest path would otherwise make of it.
 */
export async function assertTokenNotBanned(jwt: string): Promise<void> {
  const userId = await verifiedTokenOwner(jwt);
  if (!userId) return;
  if (userId === "__blocked__") {
    throw new AccessBlockedError("This account has been suspended.", { reason: "banned", until: null });
  }
  await assertUserAllowed(userId);
}

/** Throws AccessBlockedError when the account is banned. */
export async function assertUserAllowed(userId: string): Promise<void> {
  const result = await check(null, userId);
  if (result.blocked) throw blockedError(result);
}

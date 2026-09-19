// Auth helpers for edge functions.
//
// requireUser():    throws UnauthorizedError on missing/invalid JWT.
// optionalUser():   resolves a user when there is one, null for guests.
// requireAdmin():   additionally checks the caller has an admin role (uses RPC `is_admin`).

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import { ForbiddenError, UnauthorizedError } from "../ai/errors.ts";
import { reqEnv } from "../env.ts";

export interface AuthContext {
  userId: string;
  email: string | null;
  /** RLS-scoped client (calls run as the user). */
  userClient: SupabaseClient;
  /** Raw JWT — pass to downstream services that re-verify. */
  jwt: string;
}

export async function requireUser(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new UnauthorizedError("Missing Authorization header");

  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) throw new UnauthorizedError("Invalid Authorization header");

  return await verifyUserToken(jwt);
}

/**
 * Resolve the caller when they have a real session, null when they don't.
 *
 * Guest-capable endpoints need this because header presence cannot answer
 * "is this a guest?" — supabase-js always sends an Authorization header, and
 * with no session it sends the anon key, which is a well-formed JWT that
 * simply resolves to no user. The only reliable test is to try verifying it.
 *
 * An expired session therefore lands on the guest path instead of a 401. That
 * is deliberate on endpoints that serve guests anyway: the caller gets a
 * usable result under anonymous limits rather than an error they can't act on
 * without re-authenticating in the middle of a task. Endpoints that must know
 * who is calling — anything that reads or writes user data — keep using
 * requireUser() and still reject them.
 */
export async function optionalUser(req: Request): Promise<AuthContext | null> {
  try {
    return await requireUser(req);
  } catch (err) {
    /* ONLY "this token does not identify a user" means guest. A bare catch
       here would turn a missing SUPABASE_URL, or any unexpected throw, into
       "everyone is a guest" — signed-in users would silently drop to guest
       rate limits instead of their plan quota, and the misconfiguration that
       caused it would never surface. Let anything else propagate as a 5xx. */
    if (err instanceof UnauthorizedError) return null;
    throw err;
  }
}

/**
 * Verify a JWT that did not arrive in the Authorization header.
 *
 * The interview-coach MCP is a server calling on a user's behalf: its
 * Authorization header carries its own service credential, so the end user's
 * token travels alongside it in `x-user-token`. Both are needed — one says
 * which service is calling, the other says for whom.
 *
 * The verification is identical to requireUser's. A token is trusted because
 * Supabase confirms its signature, never because of the header it arrived in.
 */
export async function verifyUserToken(jwt: string): Promise<AuthContext> {
  if (!jwt) throw new UnauthorizedError("Empty user token");

  const url = reqEnv("SUPABASE_URL");
  const anonKey = reqEnv("SUPABASE_ANON_KEY");

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) throw new UnauthorizedError("Invalid session");

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    userClient,
    jwt,
  };
}

export async function requireAdmin(req: Request): Promise<AuthContext> {
  const ctx = await requireUser(req);
  const { data, error } = await ctx.userClient.rpc("is_admin", { p_user_id: ctx.userId });
  if (error) throw new ForbiddenError(`Admin check failed: ${error.message}`);
  if (data !== true) throw new ForbiddenError("Admin role required");
  return ctx;
}

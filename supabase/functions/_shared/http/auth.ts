// Auth helpers for edge functions.
//
// requireUser():    throws UnauthorizedError on missing/invalid JWT.
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

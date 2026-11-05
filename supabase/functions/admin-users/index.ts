// admin-users — the account actions that need Supabase Auth's admin API.
//
//   ban       stop an account signing in (Auth's own ban), end its sessions,
//             and optionally block every IP it has used
//   unban     lift the ban
//   sign_out  end every session the account has
//   delete    delete everything we hold about the account, then the login —
//             the same delete_user_data the user's own "Delete account" uses
//   invite    send a Supabase invite email to a new address
//
// Admin only (requireAdmin: role AND whitelist). Before acting on an account,
// admin_check_target() refuses the caller's own account and any admin's, so
// no admin can lock out or delete another. Every action is written to
// admin_audit_log under the admin who did it.
//
// The browser can't do any of this itself: the Auth admin API needs the
// service role key, which never leaves the server. (The old User Management
// screen called it from the browser with the public key, so suspend and
// delete had never worked.)

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "npm:zod@3";

import { ForbiddenError, NotFoundError, ValidationError } from "../_shared/ai/errors.ts";
import { adminClient } from "../_shared/db/supabase.ts";
import { optEnv } from "../_shared/env.ts";
import { type AuthContext, requireAdmin } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

// Go duration strings, as Supabase Auth expects. "Permanent" is a century.
const BAN_DURATIONS = {
  "1d": "24h",
  "7d": "168h",
  "30d": "720h",
  "permanent": "876000h",
} as const;

const UserId = z.string().uuid();

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ban"),
    userId: UserId,
    duration: z.enum(["1d", "7d", "30d", "permanent"]),
    reason: z.string().trim().min(1, "Give a reason").max(500),
    blockIps: z.boolean().optional(),
  }),
  z.object({ action: z.literal("unban"), userId: UserId }),
  z.object({ action: z.literal("sign_out"), userId: UserId }),
  z.object({
    action: z.literal("delete"),
    userId: UserId,
    // The admin types the account's email to confirm; checked here too, so a
    // stale or mistaken id can't delete the wrong person.
    confirmEmail: z.string().trim().min(1),
    reason: z.string().trim().max(500).optional(),
    blockIps: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("invite"),
    email: z.string().trim().toLowerCase().email().max(254),
  }),
]);

/** Refuses self, admins and missing accounts; returns the account's email. */
async function checkTarget(ctx: AuthContext, userId: string): Promise<string> {
  const { data, error } = await ctx.userClient.rpc("admin_check_target", { p_user_id: userId });
  if (error) {
    if (error.code === "P0002") throw new NotFoundError(error.message);
    if (error.code === "42501") throw new ForbiddenError(error.message);
    throw new Error(`Account check failed: ${error.message}`);
  }
  return (data as { email: string | null }).email ?? "";
}

/** Ends every session; -1 when the database refused (the ban still holds). */
async function endSessions(userId: string): Promise<number> {
  const { data, error } = await adminClient().rpc("admin_revoke_sessions", { p_user_id: userId });
  if (error) {
    console.error(`[admin-users] ending sessions failed for ${userId}: ${error.message}`);
    return -1;
  }
  return Number(data ?? 0);
}

interface IpResult {
  blocked: number;
  skipped_shared: number;
  already_blocked?: number;
  /** From the old sign-in records, which may be forged; never blocked automatically. */
  skipped_old?: number;
  /** Set when blocking failed; the main action still went through. */
  error?: string;
}

/** A row of admin_user_ips, as far as the delete path needs it. */
interface IpRow {
  ip: string;
  source: string;
  other_accounts: number;
  block_id: number | null;
}

/**
 * Block the IPs the account has used. Run as the admin, so it's logged as
 * theirs. Never throws: it runs after the main action has already happened,
 * and a failure here mustn't make that action look like it failed.
 */
async function blockIps(ctx: AuthContext, userId: string, reason: string): Promise<IpResult> {
  const { data, error } = await ctx.userClient.rpc("admin_block_user_ips", {
    p_user_id: userId,
    p_reason: reason,
  });
  if (error) {
    console.error(`[admin-users] blocking IPs failed for ${userId}: ${error.message}`);
    return { blocked: 0, skipped_shared: 0, error: error.message };
  }
  return data as IpResult;
}

/**
 * Block a list of addresses one by one — for deletion, where the account (and
 * so its IP history) is already gone by the time the blocks go in.
 */
async function blockAddresses(
  ctx: AuthContext,
  ips: string[],
  reason: string,
  skipped: Omit<IpResult, "blocked">,
): Promise<IpResult> {
  let blocked = 0;
  for (const ip of ips) {
    const { error } = await ctx.userClient.rpc("admin_block_ip", {
      p_network: ip,
      p_reason: reason,
      p_expires_at: null,
    });
    if (error) {
      console.error(`[admin-users] blocking ${ip} failed: ${error.message}`);
      return { ...skipped, blocked, error: error.message };
    }
    blocked += 1;
  }
  return { ...skipped, blocked };
}

/** Best-effort: the action has already happened, so a failed log mustn't undo the response. */
async function audit(
  ctx: AuthContext,
  entry: {
    action: "INSERT" | "UPDATE" | "DELETE";
    user_id: string | null;
    row_key: Record<string, unknown>;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
  },
) {
  const { error } = await adminClient().from("admin_audit_log").insert({
    actor_id: ctx.userId,
    actor_email: ctx.email,
    table_name: "account",
    ...entry,
  });
  if (error) console.error(`[admin-users] audit write failed: ${error.message}`);
}

/** Supabase Auth's 4xx answers are the admin's to read; anything else is ours. */
function authFailure(what: string, error: { message: string; status?: number }): Error {
  if (error.status && error.status < 500) return new ValidationError(`${what}: ${error.message}`);
  return new Error(`${what}: ${error.message}`);
}

serve(handler(async (req) => {
  const ctx = await requireAdmin(req);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    throw new ValidationError("Invalid request", parsed.error.flatten());
  }
  const body = parsed.data;
  const auth = adminClient().auth.admin;

  switch (body.action) {
    case "ban": {
      const email = await checkTarget(ctx, body.userId);
      const { data, error } = await auth.updateUserById(body.userId, {
        ban_duration: BAN_DURATIONS[body.duration],
        // Who banned them is in the audit log, not here: app_metadata travels
        // in the user's own token, and a short ban that simply runs out is
        // never cleared by "unban".
        app_metadata: {
          ban_reason: body.reason,
          banned_at: new Date().toISOString(),
        },
      });
      if (error) throw authFailure("Couldn't ban the account", error);

      const sessionsEnded = await endSessions(body.userId);

      // Logged as soon as the ban holds, before anything else can go wrong.
      await audit(ctx, {
        action: "UPDATE",
        user_id: body.userId,
        row_key: { user_id: body.userId, email },
        new_values: {
          banned_until: data.user?.banned_until ?? null,
          ban_reason: body.reason,
          sessions_ended: sessionsEnded,
        },
      });

      // Each block is logged under the admin by the database's own trigger.
      const ips = body.blockIps ? await blockIps(ctx, body.userId, `Banned: ${body.reason}`) : null;

      return json({
        ok: true,
        bannedUntil: data.user?.banned_until ?? null,
        sessionsEnded,
        ips,
      });
    }

    case "unban": {
      const email = await checkTarget(ctx, body.userId);
      // A null value deletes that key from app_metadata.
      const { error } = await auth.updateUserById(body.userId, {
        ban_duration: "none",
        app_metadata: { ban_reason: null, banned_by: null, banned_at: null },
      });
      if (error) throw authFailure("Couldn't lift the ban", error);

      await audit(ctx, {
        action: "UPDATE",
        user_id: body.userId,
        row_key: { user_id: body.userId, email },
        new_values: { banned_until: null },
      });
      return json({ ok: true });
    }

    case "sign_out": {
      const email = await checkTarget(ctx, body.userId);
      const sessionsEnded = await endSessions(body.userId);
      if (sessionsEnded < 0) {
        throw new Error("The database wouldn't let us end their sessions.");
      }
      await audit(ctx, {
        action: "UPDATE",
        user_id: body.userId,
        row_key: { user_id: body.userId, email },
        new_values: { sessions_ended: sessionsEnded },
      });
      return json({ ok: true, sessionsEnded });
    }

    case "delete": {
      const email = await checkTarget(ctx, body.userId);
      if (!email || body.confirmEmail.toLowerCase() !== email.toLowerCase()) {
        throw new ValidationError("The email you typed doesn't match this account.");
      }

      // Work out which addresses to block now — the IP history is part of
      // what gets deleted — but only block them once the deletion has
      // actually happened. Same rule as "Block their IPs": skip addresses
      // already blocked, ones from the old (forgeable) sign-in records, and
      // ones other accounts share.
      const toBlock: string[] = [];
      const skipped = { skipped_shared: 0, already_blocked: 0, skipped_old: 0 };
      if (body.blockIps) {
        const { data: ipRows, error: ipError } = await ctx.userClient.rpc("admin_user_ips", {
          p_user_id: body.userId,
        });
        if (ipError) throw new Error(`Couldn't read their IP addresses, so nothing was deleted: ${ipError.message}`);
        for (const r of (ipRows ?? []) as IpRow[]) {
          if (r.block_id !== null) skipped.already_blocked += 1;
          else if (r.source !== "site") skipped.skipped_old += 1;
          else if (Number(r.other_accounts) > 0) skipped.skipped_shared += 1;
          else toBlock.push(r.ip);
        }
      }

      const service = adminClient();
      const { data: removed, error: dataError } = await service.rpc("delete_user_data", {
        p_user: body.userId,
      });
      if (dataError) {
        // One transaction: nothing was removed.
        throw new Error(`Couldn't delete their data, so nothing was removed: ${dataError.message}`);
      }

      const { error: authError } = await auth.deleteUser(body.userId);
      if (authError) {
        throw authFailure("Their data was deleted, but the login wasn't — try again to finish", authError);
      }

      const ips = body.blockIps ? await blockAddresses(ctx, toBlock, `Deleted account: ${email}`, skipped) : null;

      // user_id stays NULL: the account is gone, and a row pointing at it
      // would be swept away with it. The email is kept on purpose — an
      // admin deletion has to say who was deleted.
      await audit(ctx, {
        action: "DELETE",
        user_id: null,
        row_key: { deleted_user_id: body.userId, email },
        old_values: {
          reason: body.reason || null,
          ...(ips && { ips_blocked: ips.blocked }),
        },
      });

      console.log("[admin-users] deleted", { userId: body.userId, by: ctx.userId, removed });
      return json({ ok: true, removed, ips });
    }

    case "invite": {
      const site = optEnv("SITE_URL", "https://www.faircopy.au")!.replace(/\/+$/, "");
      const { data, error } = await auth.inviteUserByEmail(body.email, {
        redirectTo: `${site}/auth`,
      });
      if (error) throw authFailure("Couldn't send the invite", error);

      await audit(ctx, {
        action: "INSERT",
        user_id: data.user?.id ?? null,
        row_key: { email: body.email },
        new_values: { invited: true },
      });
      return json({ ok: true, userId: data.user?.id ?? null });
    }
  }
}, { name: "admin-users" }));

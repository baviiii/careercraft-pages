// Admin user management: the reads (admin RPCs) and the account actions (the
// admin-users edge function). See 20261105000000_admin_user_management.sql.
//
// Every RPC here refuses anyone who isn't a whitelisted admin, and every action
// refuses the admin's own account and any other admin's.

import { supabase } from '@/integrations/supabase/client';
import { readErrorBody } from '@/lib/quota';

// ── Reads ──────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  providers: string[];
  is_admin: boolean;
  roles: string[];
  /** Set only while the ban is in force. */
  banned_until: string | null;
  ban_reason: string | null;
  plan_key: string | null;
  plan_source: string | null;
  last_seen_at: string | null;
  last_ip: string | null;
  ip_count: number;
  /** One of their IPs is inside a live block. */
  ip_blocked: boolean;
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return (data ?? []) as AdminUserRow[];
}

/** One account — for its own page, without loading everyone. */
export async function fetchAdminUser(userId: string): Promise<AdminUserRow | null> {
  const { data, error } = await supabase.rpc('admin_list_users', { p_user_id: userId });
  if (error) throw error;
  return ((data ?? []) as AdminUserRow[])[0] ?? null;
}

/**
 * Admin as far as actions are concerned: the server refuses to act on anyone
 * with the admin role, whitelisted or not, so the UI treats them the same.
 */
export function isAdminLike(row: Pick<AdminUserRow, 'is_admin' | 'roles'>): boolean {
  return row.is_admin || row.roles.includes('admin');
}

export interface UserIpRow {
  ip: string;
  first_seen: string;
  last_seen: string;
  hits: number;
  country: string | null;
  /** 'site' (recorded on a visit) or 'earlier sign-in' (from the old records). */
  source: string;
  /** The live block that covers this IP, if any. */
  block_id: number | null;
  /** That block's network, e.g. "203.0.113.7/32". */
  blocked_by: string | null;
  /** How many OTHER accounts have used this IP. */
  other_accounts: number;
}

export async function fetchUserIps(userId: string): Promise<UserIpRow[]> {
  const { data, error } = await supabase.rpc('admin_user_ips', { p_user_id: userId });
  if (error) throw error;
  return (data ?? []) as UserIpRow[];
}

export interface NetworkAccount {
  user_id: string;
  email: string | null;
  is_admin: boolean;
  last_seen: string | null;
}

/** Who a block on this address or range would catch. Throws on a bad or too-wide range. */
export async function fetchNetworkAccounts(network: string): Promise<NetworkAccount[]> {
  const { data, error } = await supabase.rpc('admin_network_accounts', { p_network: network });
  if (error) throw error;
  return (data ?? []) as NetworkAccount[];
}

export interface BlockedIpRow {
  id: number;
  network: string;
  reason: string | null;
  expires_at: string | null;
  active: boolean;
  created_by_email: string | null;
  created_at: string;
  accounts: number;
}

export async function fetchBlockedIps(): Promise<BlockedIpRow[]> {
  const { data, error } = await supabase.rpc('admin_list_blocked_ips');
  if (error) throw error;
  return (data ?? []) as BlockedIpRow[];
}

/** Whether the data API gate (check_request) is switched on in this project. */
export async function fetchEnforcementStatus(): Promise<{ data_api_gate: boolean } | null> {
  const { data, error } = await supabase.rpc('admin_enforcement_status');
  if (error) return null;
  return data as unknown as { data_api_gate: boolean };
}

// ── Database writes ────────────────────────────────────────────────────────

export interface BlockIpResult {
  id: number;
  /** An active block on exactly this range existed and has been changed. */
  replaced: boolean;
  previous_reason?: string | null;
  previous_expires_at?: string | null;
}

export async function blockIp(network: string, reason: string | null, expiresAt: string | null): Promise<BlockIpResult> {
  const { data, error } = await supabase.rpc('admin_block_ip', {
    p_network: network,
    p_reason: reason,
    p_expires_at: expiresAt,
  });
  if (error) throw error;
  return data as unknown as BlockIpResult;
}

export async function unblockIp(id: number): Promise<void> {
  const { error } = await supabase.rpc('admin_unblock_ip', { p_id: id });
  if (error) throw error;
}

export interface IpBlockResult {
  blocked: number;
  skipped_shared: number;
  already_blocked?: number;
  /** From the old sign-in records, which may be forged; never blocked automatically. */
  skipped_old?: number;
  /** Set when blocking failed after the main action (ban, delete) succeeded. */
  error?: string;
}

export async function blockUserIps(
  userId: string,
  reason: string | null,
  includeShared = false,
): Promise<IpBlockResult> {
  const { data, error } = await supabase.rpc('admin_block_user_ips', {
    p_user_id: userId,
    p_reason: reason,
    p_include_shared: includeShared,
  });
  if (error) throw error;
  return data as unknown as IpBlockResult;
}

/** "2 IPs blocked. 1 shared with other accounts left open. 1 was already blocked." */
export function ipResultText(r: IpBlockResult): string {
  if (r.error) return ` Blocking their IPs failed: ${r.error}`;
  const parts = [`${r.blocked} IP${r.blocked === 1 ? '' : 's'} blocked.`];
  if (r.skipped_shared) parts.push(`${r.skipped_shared} shared with other accounts left open.`);
  if (r.already_blocked) parts.push(`${r.already_blocked} already blocked.`);
  if (r.skipped_old) {
    parts.push(`${r.skipped_old} from old sign-in records left open (those could be forged; block them one by one if you're sure).`);
  }
  return ` ${parts.join(' ')}`;
}

/** Admin = role AND whitelist; this sets or clears both together. */
export async function setAdmin(userId: string, makeAdmin: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_admin', {
    p_user_id: userId,
    p_make_admin: makeAdmin,
  });
  if (error) throw error;
}

// ── Account actions (admin-users edge function) ────────────────────────────

export type BanDuration = '1d' | '7d' | '30d' | 'permanent';

export const BAN_DURATIONS: { value: BanDuration; label: string }[] = [
  { value: '1d', label: '1 day' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'permanent', label: 'Permanently' },
];

type AccountAction =
  | { action: 'ban'; userId: string; duration: BanDuration; reason: string; blockIps?: boolean }
  | { action: 'unban'; userId: string }
  | { action: 'sign_out'; userId: string }
  | { action: 'delete'; userId: string; confirmEmail: string; reason?: string; blockIps?: boolean }
  | { action: 'invite'; email: string };

export interface AccountActionResult {
  ok: boolean;
  bannedUntil?: string | null;
  /** -1 = the database wouldn't let us end them; the ban still holds. */
  sessionsEnded?: number;
  ips?: IpBlockResult | null;
  userId?: string | null;
}

/** Runs an account action; throws an Error carrying the server's own message. */
export async function accountAction(body: AccountAction): Promise<AccountActionResult> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    const detail = await readErrorBody(error);
    throw new Error(detail?.error ?? error.message ?? 'The action failed');
  }
  return data as AccountActionResult;
}

// ── Display helpers ────────────────────────────────────────────────────────

/** Postgres errors from the admin RPCs carry a readable message; surface it. */
export function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { message?: string } | null)?.message;
  return message && message.length < 300 ? message : fallback;
}

export function isBanned(row: Pick<AdminUserRow, 'banned_until'>): boolean {
  return Boolean(row.banned_until && new Date(row.banned_until) > new Date());
}

/** "Banned until 4 Dec" — or "Banned permanently" for the century-long ban. */
export function banLabel(until: string | null): string {
  if (!until) return 'Banned';
  const d = new Date(until);
  if (d.getFullYear() - new Date().getFullYear() > 50) return 'Banned permanently';
  return `Banned until ${d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function providerLabel(p: string): string {
  return p === 'email' ? 'Email' : p.charAt(0).toUpperCase() + p.slice(1);
}

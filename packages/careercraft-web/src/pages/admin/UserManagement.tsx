// /admin/users — every account, what state it's in, and what an admin can do
// about it.
//
// The actions run on the server: bans, sign-outs, deletion and invites in the
// admin-users edge function (Supabase's Auth admin API needs the service role
// key), IP blocks and admin access in admin_* database functions. The browser
// version this replaced called the Auth admin API directly with the public
// key, so suspend and delete had never worked, and "Invite" sent nothing.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, RefreshCw, Search, Shield, ShieldOff, UserCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { PlanBadge, StatTile } from '@/components/admin/usage/UsageBits';
import { formatDay, relativeTime } from '@/components/admin/usage/usageHelpers';
import { AdminRoleDialog, BanDialog, DeleteDialog, type DialogTarget } from '@/components/admin/users/AccountDialogs';
import { InviteDialog } from '@/components/admin/users/InviteDialog';
import { UserRowActions } from '@/components/admin/users/UserRowActions';
import {
  accountAction,
  banLabel,
  blockUserIps,
  errorMessage,
  fetchAdminUsers,
  ipResultText,
  isAdminLike,
  isBanned,
  providerLabel,
  type AdminUserRow,
} from '@/lib/adminUsers';

type StatusFilter = 'all' | 'active' | 'banned' | 'ip_blocked' | 'admins' | 'unconfirmed';

const WEEK_MS = 7 * 864e5;

function matchesStatus(u: AdminUserRow, status: StatusFilter): boolean {
  switch (status) {
    case 'active':
      return !isBanned(u) && !u.ip_blocked;
    case 'banned':
      return isBanned(u);
    case 'ip_blocked':
      return u.ip_blocked;
    case 'admins':
      return isAdminLike(u);
    case 'unconfirmed':
      return !u.email_confirmed;
    default:
      return true;
  }
}

function StatusBadges({ u }: { u: AdminUserRow }) {
  const banned = isBanned(u);
  return (
    <div className="flex flex-wrap gap-1">
      {u.is_admin && (
        <Badge className="gap-1">
          <Shield className="h-3 w-3" /> Admin
        </Badge>
      )}
      {!u.is_admin && isAdminLike(u) && (
        // The admin role without a whitelist entry: not a working admin, but
        // the server still treats the account as one and won't act on it.
        <Badge variant="outline" className="gap-1" title="Has the admin role but isn't on the whitelist">
          <Shield className="h-3 w-3" /> Admin role only
        </Badge>
      )}
      {banned && (
        <Badge variant="destructive" className="gap-1" title={u.ban_reason ?? undefined}>
          <Ban className="h-3 w-3" /> {banLabel(u.banned_until)}
        </Badge>
      )}
      {u.ip_blocked && (
        <Badge variant="outline" className="gap-1 border-red-500/40 text-red-700 dark:text-red-400">
          <ShieldOff className="h-3 w-3" /> Blocked IP
        </Badge>
      )}
      {!isAdminLike(u) && !banned && !u.ip_blocked && (
        <Badge variant="outline" className="gap-1 border-green-500/30 text-green-700 dark:text-green-400">
          <UserCheck className="h-3 w-3" /> Active
        </Badge>
      )}
    </div>
  );
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<DialogTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DialogTarget | null>(null);
  const [roleTarget, setRoleTarget] = useState<(DialogTarget & { makeAdmin: boolean }) | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Only the latest load may write, so a slow refresh can't overwrite a newer one.
  const ticket = useRef(0);
  const load = useCallback(async () => {
    const mine = ++ticket.current;
    setLoading(true);
    try {
      const rows = await fetchAdminUsers();
      if (mine === ticket.current) setUsers(rows);
    } catch (err) {
      if (mine === ticket.current) toast.error(errorMessage(err, 'Couldn\'t load users'));
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        matchesStatus(u, status) &&
        (!q ||
          u.email?.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q) ||
          u.last_ip?.includes(q) ||
          u.user_id.startsWith(q)),
    );
  }, [users, search, status]);

  const stats = useMemo(
    () => ({
      total: users.length,
      banned: users.filter(isBanned).length,
      ipBlocked: users.filter((u) => u.ip_blocked).length,
      admins: users.filter(isAdminLike).length,
      recent: users.filter((u) => u.last_seen_at && Date.now() - new Date(u.last_seen_at).getTime() < WEEK_MS).length,
    }),
    [users],
  );

  const quick = async (u: AdminUserRow, label: string, fn: () => Promise<string>) => {
    setBusyId(u.user_id);
    try {
      toast.success(await fn());
      await load();
    } catch (err) {
      toast.error(errorMessage(err, `${label} failed`));
    } finally {
      setBusyId(null);
    }
  };

  const sessions = (n: number | undefined) => `${n ?? 0} session${n === 1 ? '' : 's'}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Every account: status, where it signs in from, and what you can do about it</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile label="Accounts" value={stats.total} />
        <StatTile label="Seen this week" value={stats.recent} />
        <StatTile label="Banned" value={stats.banned} />
        <StatTile label="On a blocked IP" value={stats.ipBlocked} />
        <StatTile label="Admins" value={stats.admins} />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email, name or IP…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="ip_blocked">On a blocked IP</SelectItem>
                <SelectItem value="admins">Admins</SelectItem>
                <SelectItem value="unconfirmed">Email not confirmed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="usage-scroll">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((u) => {
                const isSelf = u.user_id === meId;
                const target: DialogTarget = { user_id: u.user_id, email: u.email };
                const open = () => navigate(`/admin/usage/${u.user_id}`);
                return (
                  <TableRow key={u.user_id} className="cursor-pointer border-border/50" onClick={open}>
                    <TableCell>
                      <div className="font-medium">
                        {u.full_name || '—'}
                        {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {u.providers.map(providerLabel).join(' · ') || 'no sign-in method'}
                        {!u.email_confirmed && ' · unconfirmed'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadges u={u} />
                    </TableCell>
                    <TableCell>
                      <PlanBadge planKey={u.plan_key} source={u.plan_source} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <div>{relativeTime(u.last_seen_at ?? u.last_sign_in_at)}</div>
                      {u.last_ip && (
                        <code className="text-[11px] text-muted-foreground">
                          {u.last_ip}
                          {u.ip_count > 1 && ` +${u.ip_count - 1}`}
                        </code>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDay(u.created_at)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <UserRowActions
                        user={u}
                        isSelf={isSelf}
                        busy={busyId === u.user_id}
                        on={{
                          view: open,
                          ban: () => setBanTarget(target),
                          unban: () =>
                            quick(u, 'Unban', async () => {
                              await accountAction({ action: 'unban', userId: u.user_id });
                              return `${u.email} can sign in again.`;
                            }),
                          signOut: () =>
                            quick(u, 'Sign out', async () => {
                              const r = await accountAction({ action: 'sign_out', userId: u.user_id });
                              return `${u.email} has been signed out everywhere (${sessions(r.sessionsEnded)}).`;
                            }),
                          blockIps: () =>
                            quick(u, 'Blocking their IPs', async () => {
                              const r = await blockUserIps(u.user_id, null);
                              return ipResultText(r).trim();
                            }),
                          toggleAdmin: () => setRoleTarget({ ...target, makeAdmin: !isAdminLike(u) }),
                          remove: () => setDeleteTarget(target),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {shown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {loading ? (
                      'Loading users…'
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4" /> No accounts match.
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BanDialog target={banTarget} onClose={() => setBanTarget(null)} onDone={() => void load()} />
      <DeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={() => void load()} />
      <AdminRoleDialog
        target={roleTarget}
        makeAdmin={roleTarget?.makeAdmin ?? false}
        onClose={() => setRoleTarget(null)}
        onDone={() => void load()}
      />
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={() => void load()} />
    </div>
  );
}

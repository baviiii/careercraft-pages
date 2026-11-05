// "Account & access" on an admin's view of one user: their status, every
// action an admin can take on them, and every IP they've been seen from.

import { useCallback, useEffect, useState } from 'react';
import { Ban, LogOut, ShieldCheck, ShieldOff, ShieldPlus, Trash2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  accountAction,
  banLabel,
  blockUserIps,
  errorMessage,
  fetchAdminUser,
  fetchUserIps,
  ipResultText,
  isAdminLike,
  isBanned,
  providerLabel,
  unblockIp,
  type AdminUserRow,
  type UserIpRow,
} from '@/lib/adminUsers';
import { formatWhen, relativeTime } from '@/components/admin/usage/usageHelpers';
import { AdminRoleDialog, BanDialog, BlockIpDialog, DeleteDialog, type DialogTarget } from './AccountDialogs';

interface Props {
  userId: string;
  /** The signed-in admin, so their own account shows no actions. */
  meId: string | null;
  /** After a deletion the page has nothing left to show. */
  onDeleted: () => void;
  /** Anything that changes the account (plan history, change log) refreshes the page. */
  onChanged: () => void;
}

export function UserAccessPanel({ userId, meId, onDeleted, onChanged }: Props) {
  const [user, setUser] = useState<AdminUserRow | null>(null);
  const [ips, setIps] = useState<UserIpRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [banTarget, setBanTarget] = useState<DialogTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DialogTarget | null>(null);
  const [roleTarget, setRoleTarget] = useState<DialogTarget | null>(null);
  const [blockNetwork, setBlockNetwork] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [row, ipRows] = await Promise.all([fetchAdminUser(userId), fetchUserIps(userId)]);
      setUser(row);
      setIps(ipRows);
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn\'t load this account\'s access details'));
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => {
    void load();
    onChanged();
  };

  if (!user) return null;

  const target: DialogTarget = { user_id: user.user_id, email: user.email };
  const isSelf = user.user_id === meId;
  const banned = isBanned(user);
  // Admins (even role-only ones) and the admin's own account can't be acted
  // on; the server refuses too.
  const adminLike = isAdminLike(user);
  const actionable = !isSelf && !adminLike;

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(true);
    try {
      toast.success(await fn());
      refresh();
    } catch (err) {
      toast.error(errorMessage(err, `${label} failed`));
    } finally {
      setBusy(false);
    }
  };

  const unban = () =>
    run('Unban', async () => {
      await accountAction({ action: 'unban', userId });
      return `${user.email} can sign in again.`;
    });

  const signOut = () =>
    run('Sign out', async () => {
      const r = await accountAction({ action: 'sign_out', userId });
      return `${user.email} has been signed out everywhere (${r.sessionsEnded ?? 0} session${r.sessionsEnded === 1 ? '' : 's'}).`;
    });

  const blockAll = () =>
    run('Blocking their IPs', async () => {
      const r = await blockUserIps(userId, null);
      return `${ipResultText(r).trim()}${r.skipped_shared ? ' Block shared ones one by one below if you need to.' : ''}`;
    });

  const unblock = (ip: UserIpRow) =>
    run('Unblocking', async () => {
      if (ip.block_id === null) return `${ip.ip} wasn't blocked.`;
      await unblockIp(ip.block_id);
      return `${ip.blocked_by ?? ip.ip} is unblocked.`;
    });

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Account &amp; access</CardTitle>
            <CardDescription>
              {user.providers.length ? `Signs in with ${user.providers.map(providerLabel).join(' and ')}` : 'No sign-in method recorded'}
              {!user.email_confirmed && ' · email not confirmed'}
              {user.last_seen_at && ` · last seen ${relativeTime(user.last_seen_at)}${user.last_ip ? ` from ${user.last_ip}` : ''}`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {adminLike && (
              <Badge className="gap-1" variant={user.is_admin ? 'default' : 'outline'}>
                <ShieldCheck className="h-3 w-3" /> {user.is_admin ? 'Admin' : 'Admin role only'}
              </Badge>
            )}
            {banned && (
              <Badge variant="destructive" className="gap-1">
                <Ban className="h-3 w-3" /> {banLabel(user.banned_until)}
              </Badge>
            )}
            {user.ip_blocked && (
              <Badge variant="outline" className="gap-1 border-red-500/40 text-red-700 dark:text-red-400">
                <ShieldOff className="h-3 w-3" /> On a blocked IP
              </Badge>
            )}
            {!banned && !user.ip_blocked && !adminLike && (
              <Badge variant="outline" className="gap-1 border-green-500/30 text-green-700 dark:text-green-400">
                <UserCheck className="h-3 w-3" /> Active
              </Badge>
            )}
          </div>
        </div>
        {banned && user.ban_reason && (
          <p className="text-sm text-muted-foreground">Reason: &ldquo;{user.ban_reason}&rdquo;</p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {isSelf ? (
          <p className="text-sm text-muted-foreground">This is your own account, so there are no actions here.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {actionable &&
              (banned ? (
                <Button variant="outline" size="sm" onClick={unban} disabled={busy}>
                  <UserCheck className="mr-1.5 h-4 w-4" /> Unban
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setBanTarget(target)} disabled={busy}>
                  <Ban className="mr-1.5 h-4 w-4" /> Ban
                </Button>
              ))}
            {actionable && (
              <Button variant="outline" size="sm" onClick={signOut} disabled={busy}>
                <LogOut className="mr-1.5 h-4 w-4" /> Sign out everywhere
              </Button>
            )}
            {actionable && ips.length > 0 && (
              <Button variant="outline" size="sm" onClick={blockAll} disabled={busy}>
                <ShieldOff className="mr-1.5 h-4 w-4" /> Block their IPs
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setRoleTarget(target)} disabled={busy || banned}>
              <ShieldPlus className="mr-1.5 h-4 w-4" /> {adminLike ? 'Remove admin' : 'Make admin'}
            </Button>
            {actionable && (
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteTarget(target)} disabled={busy}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete account
              </Button>
            )}
          </div>
        )}
        {adminLike && !isSelf && (
          <p className="text-xs text-muted-foreground">
            Admins can't be banned, signed out, IP-blocked or deleted. Remove their admin access first.
          </p>
        )}

        <div className="usage-scroll rounded-md border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>IP address</TableHead>
                <TableHead>Where</TableHead>
                <TableHead>First seen</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead>Other accounts</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ips.map((ip) => (
                <TableRow key={ip.ip} className="border-border/50">
                  <TableCell>
                    <code className="text-sm">{ip.ip}</code>
                    <span
                      className="ml-2 text-[11px] text-muted-foreground"
                      title={
                        ip.source === 'site'
                          ? 'Seen by the site itself; the address is checked.'
                          : 'From the old sign-in records. Those took the address the browser claimed, so it may be forged. Not blocked automatically.'
                      }
                    >
                      {ip.source === 'site' ? 'checked' : 'old record, unchecked'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{ip.country ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatWhen(ip.first_seen)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatWhen(ip.last_seen)}</TableCell>
                  <TableCell className="text-right tabular-nums">{ip.hits}</TableCell>
                  <TableCell className="text-sm">
                    {ip.other_accounts > 0 ? (
                      <span className="text-amber-700 dark:text-amber-400">
                        {ip.other_accounts} other{ip.other_accounts === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">only them</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {ip.blocked_by ? (
                      <Button variant="ghost" size="sm" onClick={() => unblock(ip)} disabled={busy}>
                        Unblock {ip.blocked_by.endsWith('/32') || ip.blocked_by.endsWith('/128') ? '' : ip.blocked_by}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setBlockNetwork(ip.ip)} disabled={busy}>
                        Block
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {ips.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No IP addresses recorded yet. They're recorded each time they open the site.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <BanDialog target={banTarget} onClose={() => setBanTarget(null)} onDone={refresh} />
      <DeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={onDeleted} />
      <AdminRoleDialog
        target={roleTarget}
        makeAdmin={!adminLike}
        onClose={() => setRoleTarget(null)}
        onDone={refresh}
      />
      <BlockIpDialog
        open={blockNetwork !== null}
        initialNetwork={blockNetwork ?? undefined}
        onClose={() => setBlockNetwork(null)}
        onDone={refresh}
      />
    </Card>
  );
}

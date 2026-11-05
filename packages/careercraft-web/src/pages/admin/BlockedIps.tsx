// /admin/blocked-ips — every blocked address and range, and how to add or
// lift one.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BlockIpDialog } from '@/components/admin/users/AccountDialogs';
import { formatWhen } from '@/components/admin/usage/usageHelpers';
import { errorMessage, fetchBlockedIps, fetchEnforcementStatus, unblockIp, type BlockedIpRow } from '@/lib/adminUsers';
import '@/components/admin/usage/usage.css';

function expiryText(row: BlockedIpRow): string {
  if (!row.expires_at) return 'Until removed';
  return row.active ? `Until ${formatWhen(row.expires_at)}` : `Ended ${formatWhen(row.expires_at)}`;
}

export default function BlockedIps() {
  const [rows, setRows] = useState<BlockedIpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  // null until known; false means the data API gate couldn't be switched on.
  const [dataApiGate, setDataApiGate] = useState<boolean | null>(null);

  const ticket = useRef(0);
  const load = useCallback(async () => {
    const mine = ++ticket.current;
    setLoading(true);
    try {
      const data = await fetchBlockedIps();
      if (mine === ticket.current) setRows(data);
    } catch (err) {
      if (mine === ticket.current) toast.error(errorMessage(err, 'Couldn\'t load blocked IPs'));
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    fetchEnforcementStatus().then((s) => setDataApiGate(s?.data_api_gate ?? null));
  }, [load]);

  const unblock = async (row: BlockedIpRow) => {
    setBusyId(row.id);
    try {
      await unblockIp(row.id);
      toast.success(`${row.network} is unblocked.`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn\'t unblock that'));
    } finally {
      setBusyId(null);
    }
  };

  const active = rows.filter((r) => r.active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Blocked IPs</h1>
          <p className="text-muted-foreground">
            {active} active block{active === 1 ? '' : 's'}. Add one here, or from any account's page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Block an IP or range
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="space-y-1.5 p-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">What a block does:</strong> anyone on that address or range is
            refused by every AI feature and edge function straight away, is signed out of the site and sees a
            blocked screen. Admins are never blocked, so you can't lock yourself out.
          </p>
          <p>
            <strong className="text-foreground">What it doesn't do:</strong> stop someone switching networks (a
            phone on mobile data, a VPN). Ban the account as well if it's a person rather than a network you're
            stopping. And be careful with shared addresses: an office, university or mobile carrier puts many
            people behind one IP.
          </p>
          {dataApiGate === true && (
            <p>
              <strong className="text-foreground">Data protection is on:</strong> blocked networks and banned
              accounts are also refused by the database API itself, so they can't read or change data by going
              round the site.
            </p>
          )}
          {dataApiGate === false && (
            <p className="text-amber-700 dark:text-amber-400">
              <strong>Data protection is off</strong> in this project: blocks and bans apply to the site and every
              AI feature, but someone calling the database API directly with a token they already hold isn't
              stopped until that token expires (within an hour).
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Blocks</CardTitle>
          <CardDescription>Accounts = how many accounts have been seen on that address or range</CardDescription>
        </CardHeader>
        <CardContent className="usage-scroll">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Address or range</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead>Lasts</TableHead>
                <TableHead>Blocked by</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="border-border/50">
                  <TableCell>
                    <code className="text-sm">{r.network.replace(/\/(32|128)$/, '')}</code>
                    {!r.active && (
                      <Badge variant="secondary" className="ml-2">
                        expired
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{r.reason ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.accounts}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{expiryText(r)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.created_by_email ?? 'unknown'}
                    <span className="block text-[11px]">{formatWhen(r.created_at)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => unblock(r)} disabled={busyId === r.id}>
                      {r.active ? 'Unblock' : 'Remove'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {loading ? (
                      'Loading…'
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <ShieldOff className="h-4 w-4" /> Nothing is blocked.
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BlockIpDialog open={adding} onClose={() => setAdding(false)} onDone={() => void load()} />
    </div>
  );
}

// Who changed what: plans, limits, prices, user plans, overrides and roles.
//
// Written by database triggers (log_admin_change), so a change made from the
// SQL editor shows up here as surely as one made on these screens — with
// "SQL / migration" in place of an admin's email.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auditTableLabel, fetchAuditLog, type AuditEntry } from '@/lib/aiUsage';
import { formatWhen } from './usageHelpers';

const PAGE = 100;

// Columns that say nothing useful in a diff.
const QUIET = new Set(['updated_at', 'created_at', 'id', 'granted_by', 'user_id']);

function show(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (value === -1) return 'unlimited';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function Diff({ entry }: { entry: AuditEntry }) {
  const before = entry.old_values ?? {};
  const after = entry.new_values ?? {};
  // An added or removed row lists only the fields it actually set; the row
  // key is already in the "Which" column.
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (k) =>
      !QUIET.has(k) &&
      !(k in entry.row_key) &&
      (entry.action === 'UPDATE' || (entry.action === 'DELETE' ? before[k] : after[k]) !== null),
  );

  if (entry.action === 'DELETE' && keys.length > 4) {
    return <span className="text-xs text-muted-foreground">Row removed</span>;
  }
  if (keys.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <ul className="space-y-0.5 text-xs">
      {keys.map((k) => (
        <li key={k} className="tabular-nums">
          <code className="text-muted-foreground">{k}</code>{' '}
          {entry.action === 'UPDATE' ? (
            <>
              <span className="line-through opacity-60">{show(before[k])}</span>
              {' → '}
              <span className="font-medium">{show(after[k])}</span>
            </>
          ) : (
            <span className="font-medium">{show(entry.action === 'DELETE' ? before[k] : after[k])}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Target({ entry }: { entry: AuditEntry }) {
  if (entry.target_user_id) {
    return (
      <Link to={`/admin/usage/${entry.target_user_id}`} className="text-sm hover:underline">
        {entry.target_email ?? entry.target_user_id.slice(0, 8)}
        {typeof entry.row_key.resource === 'string' && (
          <code className="ml-1.5 text-xs text-muted-foreground">{entry.row_key.resource}</code>
        )}
      </Link>
    );
  }
  const parts = Object.values(entry.row_key).map((v) => String(v));
  return <code className="text-xs">{parts.join(' · ') || '—'}</code>;
}

const ACTION_LABEL: Record<AuditEntry['action'], string> = {
  INSERT: 'added',
  UPDATE: 'changed',
  DELETE: 'removed',
};

export function AuditLogTable({ userId, reloadKey = 0 }: { userId?: string; reloadKey?: number }) {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  // Only the latest load may write, so an older page can't land on a newer list.
  const ticket = useRef(0);

  const load = useCallback(
    async (beforeId: number | null) => {
      const mine = ++ticket.current;
      setLoading(true);
      try {
        const page = await fetchAuditLog({ limit: PAGE, beforeId, userId: userId ?? null });
        if (mine !== ticket.current) return;
        setRows((prev) => (beforeId ? [...prev, ...page] : page));
        setHasMore(page.length === PAGE);
      } catch (err) {
        if (mine !== ticket.current) return;
        console.error('Error loading audit log:', err);
        toast.error('Failed to load the change log');
      } finally {
        if (mine === ticket.current) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void load(null);
  }, [load, reloadKey]);

  return (
    <div className="space-y-3">
      <div className="usage-scroll rounded-md border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="w-40">When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>What</TableHead>
              <TableHead>Which</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id} className="border-border/50 align-top">
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{formatWhen(e.created_at)}</TableCell>
                <TableCell className="text-sm">
                  {e.actor_email ?? <span className="text-muted-foreground">SQL / migration</span>}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{auditTableLabel(e.table_name)}</span>{' '}
                  <Badge variant="outline" className="ml-1">
                    {ACTION_LABEL[e.action]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Target entry={e} />
                </TableCell>
                <TableCell>
                  <Diff entry={e} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {loading ? 'Loading…' : 'No changes recorded yet. Changes are logged from when this went live.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => load(rows[rows.length - 1]?.id ?? null)}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load older changes
          </Button>
        </div>
      )}
    </div>
  );
}

// The audit trail: every model call, grouped into the user action it served.
//
// One ATS analysis is up to four calls (analysis, rewrite, a retry when the
// rewrite came back short, a polish pass). Grouping by request_id shows the
// action; expanding it shows each call's model, tokens, cost and outcome.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CALL_CSV_COLUMNS,
  downloadCsv,
  fetchAllUsageCalls,
  fetchUsageCalls,
  fileDate,
  formatTokens,
  formatTokensExact,
  formatUsd,
  groupCallsByRequest,
  resourceLabel,
  taskLabel,
  toCsv,
  type CallScope,
  type DateRange,
  type UsageCall,
} from '@/lib/aiUsage';
import { formatWhen } from './usageHelpers';

const PAGE = 200;

interface CallLogProps {
  range: DateRange;
  /** Pin the log to one account (the user detail page). */
  userId?: string;
  /** Feature keys to offer in the filter. */
  resources: string[];
  /** Bump to refetch, e.g. from a page-level Refresh button. */
  reloadKey?: number;
}

function Flags({ retries, errors }: { retries: number; errors: number }) {
  return (
    <span className="inline-flex gap-1">
      {retries > 0 && (
        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
          {retries} retry
        </Badge>
      )}
      {errors > 0 && (
        <Badge variant="outline" className="border-red-500/40 text-red-700 dark:text-red-400">
          {errors} failed
        </Badge>
      )}
    </span>
  );
}

function UserCell({ userId, email, planKey }: { userId: string | null; email: string | null; planKey: string | null }) {
  if (!userId) {
    return <span className="text-xs text-muted-foreground">No user (script, guest or system)</span>;
  }
  return (
    <Link to={`/admin/usage/${userId}`} className="hover:underline">
      <span className="text-sm">{email ?? userId.slice(0, 8)}</span>
      {planKey && <span className="ml-1.5 text-[11px] uppercase text-muted-foreground">{planKey}</span>}
    </Link>
  );
}

function CallDetail({ call, withUserColumn }: { call: UsageCall; withUserColumn: boolean }) {
  const meta = call.metadata && Object.keys(call.metadata).length > 0 ? call.metadata : null;
  return (
    <TableRow className="border-border/30 bg-muted/30 text-xs">
      <TableCell className="pl-10 text-muted-foreground tabular-nums">
        {new Date(call.created_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
      </TableCell>
      {withUserColumn && <TableCell />}
      <TableCell>
        <div>{call.model ?? <span className="text-muted-foreground">model not reported</span>}</div>
        <div className="text-[11px] text-muted-foreground">
          {call.provider}
          {call.model_tier && ` · ${call.model_tier}`}
          {call.duration_ms !== null && ` · ${(call.duration_ms / 1000).toFixed(1)}s`}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{taskLabel(call.task)}</div>
        <code className="text-[11px] text-muted-foreground">{call.task ?? '—'}</code>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <div>{formatTokensExact(call.total_tokens)}</div>
        <div className="text-[11px] text-muted-foreground">
          {call.prompt_tokens || call.completion_tokens
            ? `${formatTokens(call.prompt_tokens)} in · ${formatTokens(call.completion_tokens)} out`
            : 'no in/out split'}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatUsd(call.cost_usd, true)}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {call.attempt > 1 && <Badge variant="outline">attempt {call.attempt}</Badge>}
          {call.error_code && (
            <Badge variant="outline" className="border-red-500/40 text-red-700 dark:text-red-400">
              {call.error_code}
            </Badge>
          )}
        </div>
        {meta && <code className="mt-1 block break-all text-[11px] text-muted-foreground">{JSON.stringify(meta)}</code>}
      </TableCell>
    </TableRow>
  );
}

export function CallLog({ range, userId, resources, reloadKey = 0 }: CallLogProps) {
  const [scope, setScope] = useState<CallScope>('all');
  const [resource, setResource] = useState<string>('all');
  const [calls, setCalls] = useState<UsageCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const query = useMemo(
    () => ({
      range,
      userId: userId ?? null,
      scope: userId ? ('all' as const) : scope,
      resource: resource === 'all' ? null : resource,
    }),
    [range, userId, scope, resource],
  );

  // Each load takes a ticket; only the latest may write. Without it, a
  // "Load older" page that lands after a filter change gets appended to the
  // new filter's rows (signed-in users' calls under "No user").
  const ticket = useRef(0);

  const load = useCallback(
    async (beforeId: number | null) => {
      const mine = ++ticket.current;
      setLoading(true);
      try {
        const page = await fetchUsageCalls({ ...query, limit: PAGE, beforeId });
        if (mine !== ticket.current) return;
        setCalls((prev) => (beforeId ? [...prev, ...page] : page));
        setHasMore(page.length === PAGE);
      } catch (err) {
        if (mine !== ticket.current) return;
        console.error('Error loading calls:', err);
        toast.error('Failed to load the call log');
      } finally {
        if (mine === ticket.current) setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    setOpen(new Set());
    void load(null);
  }, [load, reloadKey]);

  const groups = useMemo(() => groupCallsByRequest(calls), [calls]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { calls: all, truncated } = await fetchAllUsageCalls(query);
      downloadCsv(
        `ai-calls${userId ? `-${userId.slice(0, 8)}` : ''}-${fileDate()}.csv`,
        toCsv(all, CALL_CSV_COLUMNS),
      );
      if (truncated) {
        toast.warning(
          `Exported only the newest ${all.length.toLocaleString('en-AU')} calls. Pick a shorter date range for a complete file.`,
        );
      } else {
        toast.success(`Exported ${all.length.toLocaleString('en-AU')} calls`);
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!userId && (
          <Select value={scope} onValueChange={(v) => setScope(v as CallScope)}>
            <SelectTrigger className="h-9 w-48 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value="users">Signed-in users only</SelectItem>
              <SelectItem value="unattributed">No user (scripts, guests)</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={resource} onValueChange={setResource}>
          <SelectTrigger className="h-9 w-56 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All features</SelectItem>
            {resources.map((r) => (
              <SelectItem key={r} value={r}>
                {resourceLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {groups.length} actions · {calls.length} calls{hasMore ? ' loaded so far' : ''}
        </span>
        <Button variant="outline" size="sm" className="ml-auto" onClick={exportCsv} disabled={exporting}>
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export CSV
        </Button>
      </div>

      <div className="usage-scroll rounded-md border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="w-40">When</TableHead>
              {!userId && <TableHead>User</TableHead>}
              <TableHead>Feature</TableHead>
              <TableHead>What ran</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">Est. cost</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => {
              const isOpen = open.has(g.key);
              return (
                <Fragment key={g.key}>
                  <TableRow
                    className="cursor-pointer border-border/50"
                    onClick={() => toggle(g.key)}
                    aria-expanded={isOpen}
                  >
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {formatWhen(g.startedAt)}
                      </span>
                    </TableCell>
                    {!userId && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <UserCell userId={g.userId} email={g.email} planKey={g.planKey} />
                      </TableCell>
                    )}
                    <TableCell className="text-sm">{resourceLabel(g.resource)}</TableCell>
                    <TableCell className="text-sm">
                      {[...new Set(g.calls.map((c) => taskLabel(c.task)))].join(' → ')}
                      {g.calls.length > 1 && (
                        <span className="ml-1.5 text-xs text-muted-foreground">({g.calls.length} calls)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatTokens(g.tokens)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(g.costUsd)}</TableCell>
                    <TableCell>
                      <Flags retries={g.retries} errors={g.errors} />
                    </TableCell>
                  </TableRow>
                  {isOpen &&
                    g.calls.map((c) => <CallDetail key={c.id} call={c} withUserColumn={!userId} />)}
                </Fragment>
              );
            })}
            {groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={userId ? 6 : 7} className="py-10 text-center text-muted-foreground">
                  {loading ? 'Loading…' : 'No AI calls match.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => load(calls[calls.length - 1]?.id ?? null)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load older calls
          </Button>
        </div>
      )}
    </div>
  );
}


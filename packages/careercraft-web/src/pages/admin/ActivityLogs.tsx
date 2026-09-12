import { useMemo, useState } from 'react';
import { Search, Filter, Download, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useAdminData } from '@/hooks/useAdminData';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';

type EntryType = 'activity' | 'login';

interface ActivityEntry {
  id: string;
  type: EntryType;
  action: string;
  entity: string | null;
  email: string | null;
  ip: string | null;
  details: unknown;
  severity: string;
  created_at: string;
}

function detailsSnippet(details: unknown): string {
  if (details == null) return '—';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return '—';
  }
}

export default function ActivityLogs() {
  const {
    activityLogs,
    loginAttempts,
    fetchActivityLogs,
    fetchLoginAttempts,
    loading,
  } = useAdminData();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const entries = useMemo<ActivityEntry[]>(() => {
    const fromLogs: ActivityEntry[] = activityLogs.map((log) => ({
      id: log.id,
      type: 'activity',
      action: log.action,
      entity: log.entity_type,
      email: log.user_email ?? null,
      ip: log.ip_address ?? null,
      details: log.details,
      severity: log.severity,
      created_at: log.created_at,
    }));

    const fromLogins: ActivityEntry[] = loginAttempts.map((attempt) => ({
      id: attempt.id,
      type: 'login',
      action: attempt.success ? 'Successful Login' : 'Failed Login',
      entity: 'authentication',
      email: attempt.email,
      ip: attempt.ip_address,
      details: {
        email: attempt.email,
        ip: attempt.ip_address,
        city: attempt.city,
        country: attempt.country,
      },
      severity: attempt.success ? 'info' : 'warning',
      created_at: attempt.created_at,
    }));

    return [...fromLogs, ...fromLogins].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [activityLogs, loginAttempts]);

  const uniqueEntities = useMemo(
    () => [...new Set(entries.map((e) => e.entity).filter(Boolean))] as string[],
    [entries],
  );

  const filteredEntries = entries.filter((entry) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      entry.action.toLowerCase().includes(q) ||
      entry.entity?.toLowerCase().includes(q) ||
      entry.email?.toLowerCase().includes(q) ||
      entry.ip?.toLowerCase().includes(q);

    const matchesSeverity = severityFilter === 'all' || entry.severity === severityFilter;
    const matchesType = typeFilter === 'all' || entry.type === typeFilter;
    const matchesEntity = entityFilter === 'all' || entry.entity === entityFilter;

    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      matchesDate = isWithinInterval(new Date(entry.created_at), {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to),
      });
    } else if (dateRange?.from) {
      matchesDate = new Date(entry.created_at) >= startOfDay(dateRange.from);
    }

    return matchesSearch && matchesSeverity && matchesType && matchesEntity && matchesDate;
  });

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleRefresh = () => {
    fetchActivityLogs();
    fetchLoginAttempts();
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Type', 'Action', 'Entity', 'Email', 'IP', 'Severity', 'Timestamp', 'Details'].join(','),
      ...filteredEntries.map((entry) =>
        [
          entry.id,
          entry.type,
          `"${entry.action.replace(/"/g, '""')}"`,
          entry.entity || '',
          entry.email || '',
          entry.ip || '',
          entry.severity,
          entry.created_at,
          `"${detailsSnippet(entry.details).replace(/"/g, '""')}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Activity exported');
  };

  const successLogins = loginAttempts.filter((a) => a.success).length;
  const failedLogins = loginAttempts.filter((a) => !a.success).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-muted-foreground">Who did what, and who signed in.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{entries.length}</p>
            <p className="text-sm text-muted-foreground">Total events</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{activityLogs.length}</p>
            <p className="text-sm text-muted-foreground">Activity logs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{successLogins}</p>
            <p className="text-sm text-muted-foreground">Successful logins</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-orange-500">{failedLogins}</p>
            <p className="text-sm text-muted-foreground">Failed logins</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search action, entity, email, IP..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="login">Login</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {uniqueEntities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd')} – {format(dateRange.to, 'LLL dd')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, yyyy')
                    )
                  ) : (
                    'Pick date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
                {dateRange && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange(undefined)}
                    >
                      Clear dates
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Type</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity / Email</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.slice(0, 100).map((entry) => (
                <TableRow key={`${entry.type}-${entry.id}`} className="border-border/50">
                  <TableCell>
                    <Badge variant="outline">
                      {entry.type === 'login' ? 'Login' : 'Activity'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{entry.action}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div>{entry.entity || '—'}</div>
                    {entry.email && (
                      <div className="text-xs truncate max-w-[200px]">{entry.email}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {entry.ip || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityVariant(entry.severity)}>
                      {entry.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[220px] truncate">
                    {detailsSnippet(entry.details)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    <div>{format(new Date(entry.created_at), 'MMM d, yyyy')}</div>
                    <div className="text-xs">{format(new Date(entry.created_at), 'HH:mm:ss')}</div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {loading ? 'Loading activity…' : 'No activity found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {filteredEntries.length > 100 && (
            <div className="text-center text-sm text-muted-foreground mt-4">
              Showing 100 of {filteredEntries.length} entries. Use filters to narrow results.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Search, Download, Calendar, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useAdminData } from '@/hooks/useAdminData';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';

export default function AuditTrail() {
  const { activityLogs, loginAttempts, fetchActivityLogs, loading } = useAdminData();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Combine activity logs with login attempts for comprehensive audit
  const auditEntries = [
    ...activityLogs.map(log => ({
      id: log.id,
      type: 'activity' as const,
      action: log.action,
      entity: log.entity_type,
      details: log.details,
      severity: log.severity,
      created_at: log.created_at,
      user_id: log.user_id,
    })),
    ...loginAttempts.map(attempt => ({
      id: attempt.id,
      type: 'login' as const,
      action: attempt.success ? 'Successful Login' : 'Failed Login',
      entity: 'authentication',
      details: { email: attempt.email, ip: attempt.ip_address },
      severity: attempt.success ? 'info' : 'warning',
      created_at: attempt.created_at,
      user_id: attempt.user_id,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredEntries = auditEntries.filter(entry => {
    const matchesSearch = 
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.entity?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEntity = entityFilter === 'all' || entry.entity === entityFilter;
    
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      matchesDate = isWithinInterval(new Date(entry.created_at), {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to),
      });
    }
    
    return matchesSearch && matchesEntity && matchesDate;
  });

  const uniqueEntities = [...new Set(auditEntries.map(e => e.entity).filter(Boolean))];

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Type', 'Action', 'Entity', 'Severity', 'Timestamp'].join(','),
      ...filteredEntries.map(entry => [
        entry.id,
        entry.type,
        entry.action,
        entry.entity || '',
        entry.severity,
        entry.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Audit trail exported');
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">Complete history of all system events for compliance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => fetchActivityLogs()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{auditEntries.length}</p>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{loginAttempts.filter(a => a.success).length}</p>
            <p className="text-sm text-muted-foreground">Successful Logins</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-orange-500">{loginAttempts.filter(a => !a.success).length}</p>
            <p className="text-sm text-muted-foreground">Failed Logins</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{uniqueEntities.length}</p>
            <p className="text-sm text-muted-foreground">Entity Types</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search audit trail..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntities.map(entity => (
                  <SelectItem key={entity} value={entity!}>{entity}</SelectItem>
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
                        {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
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
                <TableHead>Entity</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.slice(0, 100).map((entry) => (
                <TableRow key={`${entry.type}-${entry.id}`} className="border-border/50">
                  <TableCell>
                    <Badge variant="outline">
                      {entry.type === 'login' ? 'Auth' : 'Activity'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{entry.action}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.entity || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityVariant(entry.severity)}>
                      {entry.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    <div>{format(new Date(entry.created_at), 'MMM d, yyyy')}</div>
                    <div className="text-xs">{format(new Date(entry.created_at), 'HH:mm:ss')}</div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {loading ? 'Loading audit trail...' : 'No audit entries found'}
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

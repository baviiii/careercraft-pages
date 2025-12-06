import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  severity: string;
  created_at: string;
}

interface RecentActivityTableProps {
  activityLogs: ActivityLog[];
}

export function RecentActivityTable({ activityLogs }: RecentActivityTableProps) {
  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        <Badge variant="outline" className="text-xs">
          Last 24 hours
        </Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-muted-foreground">Action</TableHead>
              <TableHead className="text-muted-foreground">Entity</TableHead>
              <TableHead className="text-muted-foreground">Severity</TableHead>
              <TableHead className="text-muted-foreground text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activityLogs.slice(0, 10).map((log) => (
              <TableRow key={log.id} className="border-border/50 hover:bg-muted/50">
                <TableCell className="font-medium">{log.action}</TableCell>
                <TableCell className="text-muted-foreground">
                  {log.entity_type || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={getSeverityVariant(log.severity)}>
                    {log.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
            {activityLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No recent activity
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

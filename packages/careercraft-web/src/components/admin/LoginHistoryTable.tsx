import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Globe, MapPin, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { getCountryFlag, formatShortLocation } from '@/lib/geoLocation';

interface LoginAttempt {
  id: string;
  email: string;
  user_id: string | null;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  created_at: string;
}

interface LoginHistoryTableProps {
  loginAttempts: LoginAttempt[];
  onRefresh?: () => void;
  loading?: boolean;
  compact?: boolean;
}

export function LoginHistoryTable({ 
  loginAttempts, 
  onRefresh, 
  loading,
  compact = false 
}: LoginHistoryTableProps) {
  const displayAttempts = compact ? loginAttempts.slice(0, 8) : loginAttempts;

  const getBrowserInfo = (userAgent: string | null): string => {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Login History</CardTitle>
          {!compact && (
            <p className="text-sm text-muted-foreground mt-1">
              Recent authentication attempts across the platform
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {loginAttempts.length} attempts
          </Badge>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="w-[40px]">Status</TableHead>
              <TableHead>Email</TableHead>
              {!compact && <TableHead>Location</TableHead>}
              <TableHead>IP Address</TableHead>
              {!compact && <TableHead>Browser</TableHead>}
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayAttempts.map((attempt) => (
              <TableRow key={attempt.id} className="border-border/50 hover:bg-muted/50">
                <TableCell>
                  {attempt.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm truncate max-w-[200px]">
                      {attempt.email}
                    </span>
                    {compact && attempt.country_code && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <span>{getCountryFlag(attempt.country_code)}</span>
                        {formatShortLocation(attempt.city, attempt.country)}
                      </span>
                    )}
                  </div>
                </TableCell>
                {!compact && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCountryFlag(attempt.country_code)}</span>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {formatShortLocation(attempt.city, attempt.country)}
                        </span>
                        {attempt.region && (
                          <span className="text-xs text-muted-foreground">{attempt.region}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                )}
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {attempt.ip_address || 'N/A'}
                </TableCell>
                {!compact && (
                  <TableCell className="text-sm text-muted-foreground">
                    {getBrowserInfo(attempt.user_agent)}
                  </TableCell>
                )}
                <TableCell className="text-right text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
            {displayAttempts.length === 0 && (
              <TableRow>
                <TableCell colSpan={compact ? 4 : 6} className="text-center text-muted-foreground py-8">
                  No login attempts recorded
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

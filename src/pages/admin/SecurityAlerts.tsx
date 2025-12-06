import { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, XCircle, Shield, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminData } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

export default function SecurityAlerts() {
  const { suspiciousActivities, loginAttempts, fetchSuspiciousActivities, loading } = useAdminData();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('unresolved');

  const filteredAlerts = suspiciousActivities.filter(alert => {
    const matchesSearch = alert.activity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'resolved' && alert.resolved) ||
      (statusFilter === 'unresolved' && !alert.resolved);
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const failedLogins = loginAttempts.filter(a => !a.success);

  const handleResolve = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('suspicious_activities')
        .update({ 
          resolved: true, 
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      
      toast.success('Alert resolved');
      fetchSuspiciousActivities();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return XCircle;
      case 'medium':
        return AlertTriangle;
      default:
        return Shield;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Alerts</h1>
          <p className="text-muted-foreground">Monitor and respond to security threats</p>
        </div>
        <Button variant="outline" onClick={() => fetchSuspiciousActivities()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{suspiciousActivities.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unresolved</p>
                <p className="text-2xl font-bold text-red-500">
                  {suspiciousActivities.filter(a => !a.resolved).length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Logins</p>
                <p className="text-2xl font-bold text-orange-500">{failedLogins.length}</p>
              </div>
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-500">
                  {suspiciousActivities.filter(a => a.resolved).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Security Incidents</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.map((alert) => {
                const SeverityIcon = getSeverityIcon(alert.severity);
                
                return (
                  <TableRow key={alert.id} className="border-border/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <SeverityIcon className={`w-4 h-4 ${
                          alert.severity === 'critical' || alert.severity === 'high' 
                            ? 'text-red-500' 
                            : 'text-yellow-500'
                        }`} />
                        <span className="font-medium">{alert.activity_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {alert.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={alert.resolved ? 'secondary' : 'destructive'}>
                        {alert.resolved ? 'Resolved' : 'Open'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      {!alert.resolved && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-green-500 hover:text-green-500 hover:bg-green-500/10"
                          onClick={() => handleResolve(alert.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredAlerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {loading ? 'Loading alerts...' : 'No security alerts found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

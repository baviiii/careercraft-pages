import { useState } from 'react';
import { Search, Monitor, RefreshCw, LogOut, Globe, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminData } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

export default function SessionsManagement() {
  const { sessions, fetchSessions, stats, loading } = useAdminData();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(session => {
    return session.ip_address?.includes(searchQuery) ||
      session.user_agent?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleForceLogout = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;
      
      toast.success('Session terminated');
      fetchSessions();
    } catch (error) {
      console.error('Error terminating session:', error);
      toast.error('Failed to terminate session');
    }
  };

  const handleForceLogoutAll = async () => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('is_active', true);

      if (error) throw error;
      
      toast.success('All sessions terminated');
      fetchSessions();
    } catch (error) {
      console.error('Error terminating sessions:', error);
      toast.error('Failed to terminate sessions');
    }
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown' };
    
    let browser = 'Unknown';
    let os = 'Unknown';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    return { browser, os };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Active Sessions</h1>
          <p className="text-muted-foreground">Monitor and manage active user sessions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={handleForceLogoutAll}
            disabled={sessions.length === 0}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Terminate All
          </Button>
          <Button variant="outline" onClick={() => fetchSessions()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Monitor className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unique IPs</p>
                <p className="text-2xl font-bold">
                  {new Set(sessions.map(s => s.ip_address)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Session</p>
                <p className="text-2xl font-bold">24m</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by IP or device..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>User ID</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => {
                const device = getDeviceInfo(session.user_agent);
                
                return (
                  <TableRow key={session.id} className="border-border/50">
                    <TableCell className="font-mono text-sm">
                      {session.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{device.browser}</p>
                          <p className="text-xs text-muted-foreground">{device.os}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {session.ip_address || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(session.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge className={session.is_active 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : 'bg-muted text-muted-foreground'
                      }>
                        {session.is_active ? 'Active' : 'Expired'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleForceLogout(session.id)}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredSessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {loading ? 'Loading sessions...' : 'No active sessions'}
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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, Globe, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserSession {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  created_at: string;
  is_active: boolean;
}

interface ActiveSessionsListProps {
  sessions: UserSession[];
  onForceLogout?: (sessionId: string) => void;
}

export function ActiveSessionsList({ sessions, onForceLogout }: ActiveSessionsListProps) {
  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return Monitor;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return Smartphone;
    }
    return Monitor;
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown Device';
    
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    
    return 'Unknown Browser';
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Active Sessions</CardTitle>
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          {sessions.length} active
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.slice(0, 5).map((session) => {
            const DeviceIcon = getDeviceIcon(session.user_agent);
            
            return (
              <div 
                key={session.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    <DeviceIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{getDeviceInfo(session.user_agent)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="w-3 h-3" />
                      <span>{session.ip_address || 'Unknown IP'}</span>
                      <span>•</span>
                      <span>
                        Active {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                
                {onForceLogout && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onForceLogout(session.id)}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
          
          {sessions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No active sessions
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

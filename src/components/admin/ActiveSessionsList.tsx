import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, Globe, LogOut, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getCountryFlag, formatShortLocation } from '@/lib/geoLocation';

interface UserSession {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  created_at: string;
  is_active: boolean;
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
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
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    
    return 'Unknown Browser';
  };

  const getOSInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown OS';
    
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    
    return 'Unknown OS';
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
        <div className="space-y-3">
          {sessions.slice(0, 5).map((session) => {
            const DeviceIcon = getDeviceIcon(session.user_agent);
            const hasLocation = session.country_code || session.city;
            
            return (
              <div 
                key={session.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    <DeviceIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{getDeviceInfo(session.user_agent)}</p>
                      <span className="text-xs text-muted-foreground">on {getOSInfo(session.user_agent)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {hasLocation ? (
                        <>
                          <span className="text-base">{getCountryFlag(session.country_code)}</span>
                          <span>{formatShortLocation(session.city, session.country)}</span>
                          <span>•</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3 h-3" />
                          <span>{session.ip_address || 'Unknown IP'}</span>
                          <span>•</span>
                        </>
                      )}
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
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
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

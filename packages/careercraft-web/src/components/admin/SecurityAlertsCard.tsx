import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuspiciousActivity {
  id: string;
  user_id: string | null;
  activity_type: string;
  description: string | null;
  severity: string;
  resolved: boolean;
  created_at: string;
}

interface SecurityAlertsCardProps {
  alerts: SuspiciousActivity[];
  onRefresh: () => void;
}

export function SecurityAlertsCard({ alerts, onRefresh }: SecurityAlertsCardProps) {
  const unresolvedAlerts = alerts.filter(a => !a.resolved);

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
      
      toast.success('Alert marked as resolved');
      onRefresh();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Security Alerts</CardTitle>
        <Badge 
          className={unresolvedAlerts.length > 0 
            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
            : 'bg-green-500/10 text-green-500 border-green-500/20'
          }
        >
          {unresolvedAlerts.length} unresolved
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {unresolvedAlerts.slice(0, 5).map((alert) => {
            const SeverityIcon = getSeverityIcon(alert.severity);
            
            return (
              <div 
                key={alert.id} 
                className="flex items-start justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                    <SeverityIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{alert.activity_type}</p>
                    {alert.description && (
                      <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-green-500 hover:text-green-500 hover:bg-green-500/10"
                  onClick={() => handleResolve(alert.id)}
                >
                  <CheckCircle className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
          
          {unresolvedAlerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
              <p className="text-sm font-medium">All Clear</p>
              <p className="text-xs text-muted-foreground">No security alerts at this time</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

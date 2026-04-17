import { RefreshCw, AlertCircle, CheckCircle2, Bug, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCards } from '@/components/admin/StatsCards';
import { UserGrowthChart } from '@/components/admin/UserGrowthChart';
import { ActivityHeatmap } from '@/components/admin/ActivityHeatmap';
import { RecentActivityTable } from '@/components/admin/RecentActivityTable';
import { ActiveSessionsList } from '@/components/admin/ActiveSessionsList';
import { SecurityAlertsCard } from '@/components/admin/SecurityAlertsCard';
import { LoginHistoryTable } from '@/components/admin/LoginHistoryTable';
import { SessionsMapCard } from '@/components/admin/SessionsMapCard';
import { useAdminData } from '@/hooks/useAdminData';
import { testSessionTracking } from '@/lib/testSessionTracking';
import { testHorusChatTables } from '@/lib/testHorusChatTables';

export default function AdminOverview() {
  const { 
    users, 
    activityLogs,
    loginAttempts,
    sessions, 
    suspiciousActivities, 
    stats, 
    loading,
    refreshAll,
    fetchLoginAttempts,
  } = useAdminData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor your platform's health and activity</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshAll}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => testSessionTracking()}
            title="Test session tracking (opens in console)"
          >
            <Bug className="w-4 h-4 mr-2" />
            Test Tracking
          </Button>
          <Button 
            variant="outline" 
            onClick={() => testHorusChatTables()}
            title="Test if PDF tables are indexed (opens in console)"
          >
            <Table className="w-4 h-4 mr-2" />
            Test Tables
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      {sessions.length === 0 && activityLogs.length === 0 && loginAttempts.length === 0 && !loading && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  No tracking data detected
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  Sessions, activity logs, and login attempts will appear here once users start using the platform.
                  Make sure the track-session edge function is deployed and working.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sessions.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-sm font-medium">Session Tracking</span>
              </div>
              <Badge variant={sessions.length > 0 ? "default" : "secondary"}>
                {sessions.length} active
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activityLogs.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-sm font-medium">Activity Logs</span>
              </div>
              <Badge variant={activityLogs.length > 0 ? "default" : "secondary"}>
                {activityLogs.length} entries
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {loginAttempts.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-sm font-medium">Login Attempts</span>
              </div>
              <Badge variant={loginAttempts.length > 0 ? "default" : "secondary"}>
                {loginAttempts.length} recorded
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserGrowthChart users={users} />
        <ActivityHeatmap activityLogs={activityLogs} />
      </div>

      {/* Login History and Location Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LoginHistoryTable 
            loginAttempts={loginAttempts} 
            onRefresh={fetchLoginAttempts}
            loading={loading}
            compact
          />
        </div>
        <SessionsMapCard sessions={sessions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivityTable activityLogs={activityLogs} />
        </div>
        <div className="space-y-6">
          <ActiveSessionsList sessions={sessions} />
          <SecurityAlertsCard 
            alerts={suspiciousActivities} 
            onRefresh={refreshAll}
          />
        </div>
      </div>
    </div>
  );
}

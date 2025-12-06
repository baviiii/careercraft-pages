import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCards } from '@/components/admin/StatsCards';
import { UserGrowthChart } from '@/components/admin/UserGrowthChart';
import { ActivityHeatmap } from '@/components/admin/ActivityHeatmap';
import { RecentActivityTable } from '@/components/admin/RecentActivityTable';
import { ActiveSessionsList } from '@/components/admin/ActiveSessionsList';
import { SecurityAlertsCard } from '@/components/admin/SecurityAlertsCard';
import { useAdminData } from '@/hooks/useAdminData';

export default function AdminOverview() {
  const { 
    users, 
    activityLogs, 
    sessions, 
    suspiciousActivities, 
    stats, 
    loading,
    refreshAll 
  } = useAdminData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor your platform's health and activity</p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshAll}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserGrowthChart users={users} />
        <ActivityHeatmap activityLogs={activityLogs} />
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

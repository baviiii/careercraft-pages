import { Users, UserCheck, UserPlus, Monitor, AlertTriangle, TrendingUp, LogIn, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardsProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    totalSessions: number;
    suspiciousActivities: number;
    totalLoginAttempts?: number;
    failedLogins24h?: number;
    successfulLogins24h?: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      change: `${stats.newUsersThisWeek} new this week`,
      changeType: stats.newUsersThisWeek > 0 ? 'positive' as const : 'neutral' as const,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Active Sessions',
      value: stats.totalSessions,
      icon: Monitor,
      change: 'Live now',
      changeType: 'neutral' as const,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Logins Today',
      value: (stats.successfulLogins24h || 0),
      icon: LogIn,
      change: `${stats.failedLogins24h || 0} failed attempts`,
      changeType: (stats.failedLogins24h || 0) > 5 ? 'negative' as const : 'neutral' as const,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Security Alerts',
      value: stats.suspiciousActivities,
      icon: AlertTriangle,
      change: stats.suspiciousActivities > 0 ? 'Needs attention' : 'All clear',
      changeType: stats.suspiciousActivities > 0 ? 'negative' as const : 'positive' as const,
      color: stats.suspiciousActivities > 0 ? 'text-red-500' : 'text-green-500',
      bgColor: stats.suspiciousActivities > 0 ? 'bg-red-500/10' : 'bg-green-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50 hover:border-border transition-colors">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-3xl font-bold mt-1">{card.value.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2">
                  {card.changeType === 'positive' && (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  )}
                  {card.changeType === 'negative' && (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs ${
                    card.changeType === 'positive' ? 'text-green-500' :
                    card.changeType === 'negative' ? 'text-red-500' :
                    'text-muted-foreground'
                  }`}>
                    {card.change}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

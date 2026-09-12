import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  role: string;
}

interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: unknown;
  ip_address: string | null;
  severity: string;
  created_at: string;
  user_email?: string;
}

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
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface UserSession {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  created_at: string;
  is_active: boolean;
  user_email?: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface SuspiciousActivity {
  id: string;
  user_id: string | null;
  activity_type: string;
  description: string | null;
  severity: string;
  resolved: boolean;
  created_at: string;
  user_email?: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalSessions: number;
  suspiciousActivities: number;
  totalLoginAttempts: number;
  failedLogins24h: number;
  successfulLogins24h: number;
}

export function useAdminData() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    totalSessions: 0,
    suspiciousActivities: 0,
    totalLoginAttempts: 0,
    failedLogins24h: 0,
    successfulLogins24h: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, updated_at');

      if (error) throw error;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const usersWithRoles = profiles?.map(profile => ({
        id: profile.id,
        email: '', // Will be populated from auth if needed
        created_at: profile.created_at,
        last_sign_in_at: profile.updated_at,
        full_name: profile.full_name,
        role: roles?.find(r => r.user_id === profile.id)?.role || 'user',
      })) || [];

      setUsers(usersWithRoles);
      
      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const newToday = usersWithRoles.filter(u => new Date(u.created_at) >= today).length;
      const newThisWeek = usersWithRoles.filter(u => new Date(u.created_at) >= weekAgo).length;

      setStats(prev => ({
        ...prev,
        totalUsers: usersWithRoles.length,
        newUsersToday: newToday,
        newUsersThisWeek: newThisWeek,
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      console.log('[AdminData] Fetching activity logs...');
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[AdminData] Error fetching activity logs:', error);
        throw error;
      }
      
      console.log('[AdminData] Activity logs fetched:', data?.length || 0);
      setActivityLogs(data || []);
    } catch (error) {
      console.error('[AdminData] Error fetching activity logs:', error);
    }
  };

  const fetchLoginAttempts = async () => {
    try {
      console.log('[AdminData] Fetching login attempts...');
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[AdminData] Error fetching login attempts:', error);
        throw error;
      }
      
      console.log('[AdminData] Login attempts fetched:', data?.length || 0);
      setLoginAttempts(data || []);
      
      // Calculate login stats for last 24 hours
      const last24h = new Date();
      last24h.setHours(last24h.getHours() - 24);
      
      const recent = (data || []).filter(a => new Date(a.created_at) >= last24h);
      const failed = recent.filter(a => !a.success).length;
      const successful = recent.filter(a => a.success).length;
      
      setStats(prev => ({
        ...prev,
        totalLoginAttempts: data?.length || 0,
        failedLogins24h: failed,
        successfulLogins24h: successful,
      }));
    } catch (error) {
      console.error('[AdminData] Error fetching login attempts:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      // Get all sessions and filter for active ones
      // A session is considered active if:
      // 1. is_active = true AND last_activity is within last 30 minutes, OR
      // 2. last_activity is within last 5 minutes (even if is_active is false, might be stale)
      const thirtyMinutesAgo = new Date();
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      console.log('[AdminData] Fetching sessions...');
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('last_activity', thirtyMinutesAgo.toISOString())
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('[AdminData] Error fetching sessions:', error);
        throw error;
      }
      
      console.log('[AdminData] Raw sessions data:', data?.length || 0, 'sessions found');
      
      // Filter to only truly active sessions
      const activeSessions = (data || []).filter(session => {
        const lastActivity = new Date(session.last_activity);
        // Active if: (is_active AND recent) OR very recent (within 5 min)
        const isActive = (session.is_active === true && lastActivity >= thirtyMinutesAgo) ||
               lastActivity >= fiveMinutesAgo;
        return isActive;
      });
      
      console.log('[AdminData] Active sessions:', activeSessions.length);
      
      setSessions(activeSessions);
      setStats(prev => ({
        ...prev,
        totalSessions: activeSessions.length,
        activeUsers: activeSessions.length,
      }));
    } catch (error) {
      console.error('[AdminData] Error fetching sessions:', error);
      // Don't set sessions to empty on error, keep previous data
    }
  };

  const fetchSuspiciousActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('suspicious_activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuspiciousActivities(data || []);
      setStats(prev => ({
        ...prev,
        suspiciousActivities: data?.filter(a => !a.resolved).length || 0,
      }));
    } catch (error) {
      console.error('Error fetching suspicious activities:', error);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchActivityLogs(),
      fetchLoginAttempts(),
      fetchSessions(),
      fetchSuspiciousActivities(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();

    // Set up realtime subscriptions for live updates
    const sessionsChannel = supabase
      .channel('admin-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_sessions' },
        () => {
          console.log('[AdminData] Session change detected, refreshing...');
          fetchSessions();
        }
      )
      .subscribe();

    const activityChannel = supabase
      .channel('admin-activity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        () => {
          console.log('[AdminData] New activity detected, refreshing...');
          fetchActivityLogs();
        }
      )
      .subscribe();

    const loginChannel = supabase
      .channel('admin-logins')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'login_attempts' },
        () => {
          console.log('[AdminData] New login attempt detected, refreshing...');
          fetchLoginAttempts();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds to catch any missed updates
    const autoRefreshInterval = setInterval(() => {
      console.log('[AdminData] Auto-refreshing data...');
      refreshAll();
    }, 30000);

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(loginChannel);
      clearInterval(autoRefreshInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    users,
    activityLogs,
    loginAttempts,
    sessions,
    suspiciousActivities,
    stats,
    loading,
    refreshAll,
    fetchUsers,
    fetchActivityLogs,
    fetchLoginAttempts,
    fetchSessions,
    fetchSuspiciousActivities,
  };
}

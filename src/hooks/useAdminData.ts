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
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const fetchLoginAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLoginAttempts(data || []);
    } catch (error) {
      console.error('Error fetching login attempts:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
      setStats(prev => ({
        ...prev,
        totalSessions: data?.length || 0,
        activeUsers: data?.length || 0,
      }));
    } catch (error) {
      console.error('Error fetching sessions:', error);
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

    // Set up realtime subscription for sessions
    const channel = supabase
      .channel('admin-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_sessions' },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

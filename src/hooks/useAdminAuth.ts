import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  isWhitelistedAdmin: boolean;
  loading: boolean;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    isAdmin: false,
    isWhitelistedAdmin: false,
    loading: true,
  });

  useEffect(() => {
    const checkAdminStatus = async (user: User | null) => {
      if (!user) {
        setState({ user: null, isAdmin: false, isWhitelistedAdmin: false, loading: false });
        return;
      }

      try {
        // Check if user has admin role
        const { data: hasRole } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        // Check if user is whitelisted admin
        const { data: isWhitelisted } = await supabase.rpc('is_whitelisted_admin', {
          _user_id: user.id
        });

        setState({
          user,
          isAdmin: !!hasRole,
          isWhitelistedAdmin: !!isWhitelisted,
          loading: false,
        });
      } catch (error) {
        console.error('Error checking admin status:', error);
        setState({ user, isAdmin: false, isWhitelistedAdmin: false, loading: false });
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      checkAdminStatus(session?.user ?? null);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdminStatus(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}

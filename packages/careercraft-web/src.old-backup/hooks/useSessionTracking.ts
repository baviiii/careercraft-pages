import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SESSION_TOKEN_KEY = 'horus_session_token';

// All supported session tracking events
export type SessionTrackingEvent = 
  | 'login_success' 
  | 'login_failure' 
  | 'signup_success'
  | 'signup_failure'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'password_reset_failure'
  | 'session_heartbeat' 
  | 'logout';

export interface TrackEventOptions {
  email?: string;
  userId?: string;
  reason?: string;
}

export function useSessionTracking(session: Session | null) {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  // Load session token from storage
  useEffect(() => {
    const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (storedToken) {
      sessionTokenRef.current = storedToken;
    }
  }, []);

  const trackEvent = useCallback(async (
    event: SessionTrackingEvent,
    options?: TrackEventOptions
  ) => {
    try {
      console.log('[SessionTracking] Tracking event:', event, {
        email: options?.email || session?.user?.email,
        userId: options?.userId || session?.user?.id,
      });

      const response = await supabase.functions.invoke('track-session', {
        body: {
          event,
          email: options?.email || session?.user?.email,
          userId: options?.userId || session?.user?.id,
          userAgent: navigator.userAgent,
          sessionToken: sessionTokenRef.current,
          reason: options?.reason,
        },
      });

      if (response.error) {
        console.error('[SessionTracking] Error tracking session event:', response.error);
        return null;
      }

      console.log('[SessionTracking] Event tracked successfully:', response.data);

      // If login success, store the session token
      if (event === 'login_success' && response.data?.sessionToken) {
        sessionTokenRef.current = response.data.sessionToken;
        localStorage.setItem(SESSION_TOKEN_KEY, response.data.sessionToken);
      }

      // If logout, clear the session token
      if (event === 'logout') {
        sessionTokenRef.current = null;
        localStorage.removeItem(SESSION_TOKEN_KEY);
      }

      return response.data;
    } catch (error) {
      console.error('Error invoking track-session:', error);
      return null;
    }
  }, [session]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!session?.user?.id || !sessionTokenRef.current) return;
    
    await trackEvent('session_heartbeat');
  }, [session, trackEvent]);

  // Start heartbeat interval when user is logged in
  useEffect(() => {
    if (!session?.user?.id) {
      // Clear heartbeat when logged out
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    // Start heartbeat
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Send initial heartbeat
    sendHeartbeat();

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [session?.user?.id, sendHeartbeat]);

  // Handle page unload - mark session as inactive
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session?.user?.id && sessionTokenRef.current) {
        // Use sendBeacon for reliable delivery on page unload
        const url = `https://hfchxjytxhsiuwqaugmv.supabase.co/functions/v1/track-session`;
        const data = JSON.stringify({
          event: 'logout',
          userId: session.user.id,
          sessionToken: sessionTokenRef.current,
        });
        
        navigator.sendBeacon(url, data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session]);

  return {
    trackEvent,
    sessionToken: sessionTokenRef.current,
  };
}

export default useSessionTracking;

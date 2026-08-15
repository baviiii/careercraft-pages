import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { UnauthorizedError } from "../_shared/ai/errors.ts";
import { requireUser } from "../_shared/http/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeoLocation {
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

type SessionEvent = 
  | 'login_success' 
  | 'login_failure' 
  | 'signup_success'
  | 'signup_failure'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'password_reset_failure'
  | 'session_heartbeat' 
  | 'logout';

const SESSION_EVENTS = new Set<SessionEvent>([
  'login_success',
  'login_failure',
  'signup_success',
  'signup_failure',
  'password_reset_request',
  'password_reset_complete',
  'password_reset_failure',
  'session_heartbeat',
  'logout',
]);

// These happen before a Supabase session exists. They may be recorded as
// anonymous security signals, but they can never assert a user_id or trigger
// session mutations.
const PRE_AUTH_EVENTS = new Set<SessionEvent>([
  'login_failure',
  'signup_failure',
  'password_reset_request',
  'password_reset_failure',
]);

interface TrackSessionRequest {
  event: SessionEvent;
  email?: string;
  userId?: string;
  userAgent?: string;
  sessionToken?: string;
  reason?: string;
}

async function getGeoLocation(ip: string): Promise<GeoLocation> {
  const defaultGeo: GeoLocation = {
    country: null,
    country_code: null,
    region: null,
    city: null,
    latitude: null,
    longitude: null,
  };

  // Skip for localhost/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    console.log('Skipping geo lookup for private/localhost IP:', ip);
    return defaultGeo;
  }

  try {
    // Using ip-api.com free tier (no API key required, 45 requests/minute limit)
    // Note: Using HTTPS to avoid mixed content warnings in browsers
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,lat,lon`);
    
    if (!response.ok) {
      console.error('Geo API response not OK:', response.status);
      return defaultGeo;
    }

    const data = await response.json();
    console.log('Geo API response:', data);

    if (data.status === 'success') {
      return {
        country: data.country || null,
        country_code: data.countryCode || null,
        region: data.regionName || null,
        city: data.city || null,
        latitude: data.lat || null,
        longitude: data.lon || null,
      };
    }

    console.log('Geo lookup failed:', data.message);
    return defaultGeo;
  } catch (error) {
    console.error('Error fetching geo location:', error);
    return defaultGeo;
  }
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getEventSeverity(event: SessionEvent): string {
  switch (event) {
    case 'login_failure':
    case 'signup_failure':
    case 'password_reset_failure':
      return 'warning';
    case 'login_success':
    case 'signup_success':
    case 'password_reset_complete':
      return 'info';
    case 'password_reset_request':
      return 'info';
    case 'logout':
    case 'session_heartbeat':
      return 'info';
    default:
      return 'info';
  }
}

function getEventAction(event: SessionEvent): string {
  switch (event) {
    case 'login_success':
      return 'user.login.success';
    case 'login_failure':
      return 'user.login.failure';
    case 'signup_success':
      return 'user.signup.success';
    case 'signup_failure':
      return 'user.signup.failure';
    case 'password_reset_request':
      return 'user.password.reset_request';
    case 'password_reset_complete':
      return 'user.password.reset_complete';
    case 'password_reset_failure':
      return 'user.password.reset_failure';
    case 'logout':
      return 'user.logout';
    case 'session_heartbeat':
      return 'session.heartbeat';
    default:
      return 'unknown';
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: TrackSessionRequest = await req.json();
    if (!SESSION_EVENTS.has(body.event)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const event = body.event;
    const isPreAuthEvent = PRE_AUTH_EVENTS.has(event);
    const auth = isPreAuthEvent ? null : await requireUser(req);

    // Authenticated identities always come from the verified JWT. Pre-auth
    // events are anonymous and cannot forge a database user identity.
    const userId = auth?.userId ?? null;
    const email = auth?.email ?? (
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase().slice(0, 254)
        : null
    );
    const userAgent = (req.headers.get('user-agent') || body.userAgent || '').slice(0, 500);
    const sessionToken =
      !isPreAuthEvent && typeof body.sessionToken === 'string'
        ? body.sessionToken.slice(0, 128)
        : null;
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;

    // Get IP from headers (Supabase edge functions provide this)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';

    if (isPreAuthEvent) {
      const { data: quotaCount, error: quotaError } = await supabase.rpc(
        'consume_anonymous_edge_quota',
        {
          p_principal_hash: await sha256(ip),
          p_resource: 'track-session-preauth',
          p_limit: 30,
          p_window_minutes: 15,
        },
      );
      if (quotaError) {
        throw new Error(`Pre-auth rate-limit check failed: ${quotaError.message}`);
      }
      if (Number(quotaCount ?? 0) <= 0) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Try again later.' }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': '900',
            },
          },
        );
      }
    } else if (userId) {
      const { data: quotaCount, error: quotaError } = await supabase.rpc(
        'consume_edge_function_quota',
        {
          p_user_id: userId,
          p_resource: 'track-session',
          p_limit: 300,
          p_window_minutes: 60,
        },
      );
      if (quotaError) {
        throw new Error(`Session rate-limit check failed: ${quotaError.message}`);
      }
      if (Number(quotaCount ?? 0) <= 0) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Try again later.' }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': '3600',
            },
          },
        );
      }
    }

    console.log(`Processing ${event} event`);

    // Get geo-location
    const geo = await getGeoLocation(ip);
    const now = new Date().toISOString();

    // Log activity for all events
    const activityLogData = {
      action: getEventAction(event),
      user_id: userId || null,
      entity_type: 'auth',
      entity_id: null,
      severity: getEventSeverity(event),
      details: {
        email: email || null,
        event_type: event,
        reason: reason || null,
        timestamp: now,
      },
      ip_address: ip !== 'unknown' ? ip : null,
      user_agent: userAgent || null,
      country: geo.country,
      country_code: geo.country_code,
      city: geo.city,
    };

    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert(activityLogData);

    if (activityError) {
      console.error('Error logging activity:', activityError);
    } else {
      console.log('Activity logged successfully');
    }

    // Handle login events
    if (event === 'login_success' || event === 'login_failure') {
      // Record login attempt
      const loginAttemptData = {
        email: email || 'unknown',
        user_id: userId || null,
        success: event === 'login_success',
        ip_address: ip !== 'unknown' ? ip : null,
        user_agent: userAgent || null,
        country: geo.country,
        country_code: geo.country_code,
        region: geo.region,
        city: geo.city,
        latitude: geo.latitude,
        longitude: geo.longitude,
      };

      const { error: loginError } = await supabase
        .from('login_attempts')
        .insert(loginAttemptData);

      if (loginError) {
        console.error('Error recording login attempt:', loginError);
      } else {
        console.log('Login attempt recorded successfully');
      }

      // If login was successful, create or update session
      if (event === 'login_success' && userId) {
        let currentSessionToken = sessionToken || generateSessionToken();
        let sessionResult;

        // If a session token was provided, try to find and update existing session
        if (currentSessionToken && sessionToken) {
          const { data: existingSession, error: findError } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('session_token', sessionToken)
            .eq('user_id', userId)
            .maybeSingle();

          if (!findError && existingSession) {
            // Update existing session
            const { data: updated, error: updateError } = await supabase
              .from('user_sessions')
              .update({
                is_active: true,
                last_activity: now,
                ip_address: ip !== 'unknown' ? ip : null,
                user_agent: userAgent || null,
                country: geo.country,
                country_code: geo.country_code,
                region: geo.region,
                city: geo.city,
                latitude: geo.latitude,
                longitude: geo.longitude,
              })
              .eq('id', existingSession.id)
              .select('session_token')
              .single();

            if (!updateError && updated) {
              sessionResult = updated;
            }
          }
        }

        // If no existing session found, create a new one
        if (!sessionResult) {
          currentSessionToken = generateSessionToken();
          
          // Only deactivate very old sessions (older than 24 hours) to allow multiple concurrent sessions
          const oneDayAgo = new Date();
          oneDayAgo.setHours(oneDayAgo.getHours() - 24);
          
          const { error: deactivateError } = await supabase
            .from('user_sessions')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('is_active', true)
            .lt('last_activity', oneDayAgo.toISOString());

          if (deactivateError) {
            console.error('Error deactivating old sessions:', deactivateError);
          }

          // Create new session
          const sessionData = {
            user_id: userId,
            session_token: currentSessionToken,
            ip_address: ip !== 'unknown' ? ip : null,
            user_agent: userAgent || null,
            is_active: true,
            last_activity: now,
            country: geo.country,
            country_code: geo.country_code,
            region: geo.region,
            city: geo.city,
            latitude: geo.latitude,
            longitude: geo.longitude,
          };

          const { data: newSession, error: sessionError } = await supabase
            .from('user_sessions')
            .insert(sessionData)
            .select('session_token')
            .single();

          if (sessionError) {
            console.error('Error creating session:', sessionError);
          } else {
            sessionResult = newSession;
            console.log('Session created successfully');
          }
        }

        if (sessionResult) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              sessionToken: currentSessionToken,
              geo 
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    } 
    // Handle signup events - also log to login_attempts for unified admin view
    else if (event === 'signup_success' || event === 'signup_failure') {
      console.log(`Signup ${event === 'signup_success' ? 'success' : 'failure'} recorded`);
      
      // Record signup attempt to login_attempts for admin visibility
      const signupAttemptData = {
        email: email || 'unknown',
        user_id: userId || null,
        success: event === 'signup_success',
        ip_address: ip !== 'unknown' ? ip : null,
        user_agent: userAgent || null,
        country: geo.country,
        country_code: geo.country_code,
        region: geo.region,
        city: geo.city,
        latitude: geo.latitude,
        longitude: geo.longitude,
      };

      const { error: signupError } = await supabase
        .from('login_attempts')
        .insert(signupAttemptData);

      if (signupError) {
        console.error('Error recording signup attempt:', signupError);
      } else {
        console.log('Signup attempt recorded successfully');
      }

      // For signup success, create a session if we have a userId
      if (event === 'signup_success' && userId) {
        const newSessionToken = generateSessionToken();
        
        const sessionData = {
          user_id: userId,
          session_token: newSessionToken,
          ip_address: ip !== 'unknown' ? ip : null,
          user_agent: userAgent || null,
          is_active: true,
          last_activity: now,
          country: geo.country,
          country_code: geo.country_code,
          region: geo.region,
          city: geo.city,
          latitude: geo.latitude,
          longitude: geo.longitude,
        };

        const { error: sessionError } = await supabase
          .from('user_sessions')
          .insert(sessionData);

        if (sessionError) {
          console.error('Error creating session for signup:', sessionError);
        } else {
          console.log('Session created for new signup');
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              sessionToken: newSessionToken,
              geo 
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    }
    // Handle password reset events
    else if (event === 'password_reset_request' || event === 'password_reset_complete' || event === 'password_reset_failure') {
      console.log(`Password reset event ${event} recorded`);
      
      // For password reset complete, if we have a userId, we should invalidate old sessions
      if (event === 'password_reset_complete' && userId) {
        const { error: invalidateError } = await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', userId);

        if (invalidateError) {
          console.error('Error invalidating sessions after password reset:', invalidateError);
        } else {
          console.log('Old sessions invalidated after password reset');
        }
      }
    }
    // Handle session heartbeat
    else if (event === 'session_heartbeat' && sessionToken && userId) {
      // Update session last_activity
      const { error: heartbeatError } = await supabase
        .from('user_sessions')
        .update({ last_activity: now })
        .eq('session_token', sessionToken)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (heartbeatError) {
        console.error('Error updating session heartbeat:', heartbeatError);
      } else {
        console.log('Session heartbeat updated');
      }
    } 
    // Handle logout
    else if (event === 'logout' && (sessionToken || userId)) {
      // Mark session as inactive
      let query = supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('is_active', true);

      if (sessionToken) {
        query = query.eq('session_token', sessionToken);
      } else if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error: logoutError } = await query;

      if (logoutError) {
        console.error('Error marking session inactive:', logoutError);
      } else {
        console.log('Session marked as inactive');
      }
    }

    return new Response(
      JSON.stringify({ success: true, geo }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in track-session function:', error);
    const unauthorized = error instanceof UnauthorizedError;
    const errorMessage = unauthorized
      ? 'Authentication required'
      : error instanceof Error
        ? error.message
        : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: unauthorized ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Keeps banned accounts and blocked networks out of the site.
//
// Asks the access-gate edge function on load, on sign-in, when the tab comes
// back into focus, and every ten minutes while open. The server decides
// (bans and IP blocks, with admins exempt) and, for a signed-in user, records
// the IP they came from — which is what gives admins a current picture of
// where each account is used.
//
// A "blocked" answer signs the person out and replaces the page with the
// blocked screen. /auth and /reset-password stay reachable, so an admin on a
// blocked network can still sign in (the server lets admins through); anyone
// else who signs in there is checked again straight away.
//
// The page renders as normal while the check is in flight, and a failed check
// lets the person in: an outage in this check must never lock everyone out.
// The edge functions refuse a blocked caller on their own, so this screen is
// the friendly half of the enforcement, not the only half.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { setMyIp } from '@/hooks/useMyIp';
import { readErrorBody } from '@/lib/quota';

interface BlockInfo {
  reason: 'banned' | 'ip';
  until: string | null;
}

const EXEMPT_PATHS = new Set(['/auth', '/reset-password']);
const RECHECK_MS = 10 * 60 * 1000;
const FOCUS_THROTTLE_MS = 60 * 1000;

interface GateAnswer {
  blocked: BlockInfo | null;
  ip: string | null;
  /** Whether the server recognised the session we sent. */
  signedIn: boolean;
}

async function askGate(): Promise<GateAnswer | null> {
  const { data, error } = await supabase.functions.invoke('access-gate', { body: {} });
  if (!error) {
    const d = (data ?? {}) as { ip?: string | null; signedIn?: boolean };
    return { blocked: null, ip: d.ip ?? null, signedIn: d.signedIn === true };
  }

  const body = await readErrorBody(error);
  if (body?.code === 'ACCESS_BLOCKED') {
    const details = (body.details ?? {}) as Partial<BlockInfo>;
    return {
      blocked: { reason: details.reason === 'banned' ? 'banned' : 'ip', until: details.until ?? null },
      ip: null,
      signedIn: false,
    };
  }
  // Anything else — network trouble, a 500 — lets the person in.
  return null;
}

export function AccessGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [blocked, setBlocked] = useState<BlockInfo | null>(null);
  const blockedRef = useRef<BlockInfo | null>(null);
  const lastCheck = useRef(0);
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    lastCheck.current = Date.now();
    try {
      const result = await askGate();
      if (!result) return;
      setMyIp(result.ip);
      const { data } = await supabase.auth.getSession();
      if (result.blocked) {
        // Local only: a banned account's sign-out call to Auth may itself be
        // refused, and the local session is what keeps them in.
        if (data.session) await supabase.auth.signOut({ scope: 'local' });
      } else if (data.session && !result.signedIn) {
        // We sent a session and the server didn't recognise it — an admin
        // used "Sign out everywhere", say. Ask Auth directly before acting,
        // so a passing hiccup can't sign anyone out: only a definite "this
        // session no longer exists" (401/403) does.
        const { error } = await supabase.auth.getUser();
        const status = (error as { status?: number } | null)?.status;
        if (status === 401 || status === 403) await supabase.auth.signOut({ scope: 'local' });
      }
      // A suspension stays on screen until someone signs in again. Its session
      // is gone, so the next check goes out as a guest and comes back
      // "allowed" — which says nothing about the suspended account.
      const keepSuspension = !result.blocked && blockedRef.current?.reason === 'banned' && !result.signedIn;
      if (!keepSuspension) {
        blockedRef.current = result.blocked;
        setBlocked(result.blocked);
      }
    } catch (err) {
      console.error('[access-gate] check failed, letting through:', err);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void check();
    });

    const onFocus = () => {
      if (Date.now() - lastCheck.current > FOCUS_THROTTLE_MS) void check();
    };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, RECHECK_MS);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [check]);

  if (blocked && !EXEMPT_PATHS.has(pathname)) return <BlockedScreen info={blocked} />;
  return <>{children}</>;
}

function untilText(until: string | null): string | null {
  if (!until) return null;
  const d = new Date(until);
  if (d.getFullYear() - new Date().getFullYear() > 50) return null;
  return d.toLocaleString('en-AU', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
}

function BlockedScreen({ info }: { info: BlockInfo }) {
  const until = untilText(info.until);
  const title = info.reason === 'banned' ? 'This account has been suspended' : 'Access from your network is blocked';
  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--cc-cream)] px-4">
      <div className="cc-surface w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--cc-cream-2)]">
          <ShieldOff className="h-5 w-5 text-[color:var(--cc-ink)]" aria-hidden />
        </span>
        <h1 className="cc-font-display text-2xl tracking-tight text-[color:var(--cc-ink)]">{title}</h1>
        <p className="mt-3 cc-font-editorial text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">
          {until ? <>This lasts until {until}. </> : null}
          If you think this is a mistake, email{' '}
          <a className="cc-link" href="mailto:support@faircopy.au">support@faircopy.au</a>.
        </p>
      </div>
    </main>
  );
}

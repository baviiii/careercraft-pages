// The signed-in user's plan usage — monthly feature counts and today's AI
// token budget — kept current while they spend it.
//
// One shared store, so the sidebar meter and the Settings page show the same
// number and fetch it once.
//
// ── How it notices spending ────────────────────────────────────────────────
// AI calls start from more than twenty places (supabase.functions.invoke,
// raw fetch in lib/*, the interview coach on its own host). Threading a
// "refresh" into each would be twenty chances to forget one. Instead a
// PerformanceObserver watches finished network requests and, when one was to
// an AI endpoint, refetches shortly after. The edge functions write the
// ledger before they respond, so by the time the response has fully arrived
// the spend is already recorded; the delay only covers coach-chat, which
// writes once its stream closes.
//
// Focus, tab-visibility and a slow interval cover everything else (another
// tab, another device).

import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchPlanUsage, type PlanUsage } from '@/lib/quota';

interface State {
  usage: PlanUsage | null;
  loading: boolean;
  userId: string | null;
}

let state: State = { usage: null, loading: true, userId: null };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

let inflight: Promise<void> | null = null;
let rerun = false;
let lastFetchAt = 0;

async function load(force = false): Promise<void> {
  if (!state.userId) {
    set({ usage: null, loading: false });
    return;
  }
  // Focus and visibility fire together; one fetch serves both.
  if (!force && Date.now() - lastFetchAt < 3000) return;
  if (inflight) {
    // A forced load means something changed AFTER that fetch started (a call
    // just spent tokens, or the account switched). Joining it would show the
    // older number, so go again once it lands.
    if (force) rerun = true;
    return inflight;
  }

  const userId = state.userId;
  lastFetchAt = Date.now();
  inflight = fetchPlanUsage(userId)
    .then((usage) => {
      // Signed out (or switched account) while this was in flight.
      if (state.userId !== userId) return;
      set({ usage: usage ?? state.usage, loading: false });
    })
    .finally(() => {
      inflight = null;
      if (rerun) {
        rerun = false;
        void load(true);
      }
    });
  return inflight;
}

/** Refetch now — for a caller that knows it just spent something. */
export function refreshPlanUsage(): Promise<void> {
  return load(true);
}

// ── Watching for AI calls ──────────────────────────────────────────────────

// Edge functions that can spend tokens. Anything else under /functions/v1/
// (track-session, job-email-events) is not worth a refetch.
const AI_FUNCTIONS = /\/functions\/v1\/(ats-analyze|rewrite-resume|parse-resume|onboard-analyze|coach-chat|horus-rag|infer|job-news|generate-prompt|voice-session)\b/;

const COACH_ORIGIN = (() => {
  const raw = import.meta.env.VITE_INTERVIEW_MCP_URL as string | undefined;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

function isAiRequest(url: string): boolean {
  if (AI_FUNCTIONS.test(url)) return true;
  return COACH_ORIGIN !== null && url.startsWith(COACH_ORIGIN);
}

let debounce: ReturnType<typeof setTimeout> | null = null;
function scheduleAfterSpend() {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    debounce = null;
    void load(true);
  }, 1500);
}

let started = false;
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;

  supabase.auth.getSession().then(({ data: { session } }) => {
    set({ userId: session?.user?.id ?? null });
    void load(true);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const userId = session?.user?.id ?? null;
    if (userId === state.userId) return;
    set({ userId, usage: null, loading: Boolean(userId) });
    void load(true);
  });

  if (typeof PerformanceObserver !== 'undefined') {
    try {
      const observer = new PerformanceObserver((list) => {
        if (list.getEntries().some((e) => isAiRequest(e.name))) scheduleAfterSpend();
      });
      observer.observe({ type: 'resource', buffered: false });
    } catch {
      // Older engines without the `type` option: focus and the interval still work.
    }
  }

  window.addEventListener('focus', () => void load());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void load();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') void load();
  }, 60_000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

export function usePlanUsage() {
  useEffect(start, []);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { usage: snap.usage, loading: snap.loading, refresh: refreshPlanUsage };
}

// ── Today's budget, derived ────────────────────────────────────────────────

export interface DailyBudget {
  used: number;
  /** null = this plan has no daily ceiling. */
  limit: number | null;
  remaining: number | null;
  /** 0–100, how much of the budget is spent. */
  percentUsed: number;
  resetsAt: string | null;
}

export function dailyBudget(usage: PlanUsage | null): DailyBudget | null {
  if (!usage) return null;
  const used = Number(usage.daily_tokens_used ?? 0);
  const limit = usage.daily_tokens_limit ?? null;
  const remaining = limit === null ? null : Math.max(0, limit - used);
  const percentUsed = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return { used, limit, remaining, percentUsed, resetsAt: usage.daily_resets_at ?? null };
}


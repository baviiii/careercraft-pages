import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActiveRoleContext, type ActiveRole } from "@/hooks/useActiveRole";
import { useTargetRole } from "@/hooks/useTargetRole";

type Override = { role: string; level: string | null } | null;

// Kept for the browser tab, not just this page: the provider unmounts when the
// learner goes into the interview room, and "just this session" must still
// hold when they come back. Closing the tab ends it. Stored with the user it
// belongs to, so someone else signing in on the same tab never inherits it.
const OVERRIDE_KEY = "faircopy.roleOverride";

function readOverride(userId: string): Override {
  try {
    const raw = sessionStorage.getItem(OVERRIDE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { userId?: string; role?: unknown; level?: unknown }) : null;
    if (!parsed || parsed.userId !== userId || typeof parsed.role !== "string" || !parsed.role) return null;
    return { role: parsed.role, level: typeof parsed.level === "string" ? parsed.level : null };
  } catch {
    return null; // storage blocked or corrupt: no override
  }
}

function writeOverride(userId: string, value: Override) {
  try {
    if (value) sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify({ userId, ...value }));
    else sessionStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* storage blocked: the override lasts for this page only */
  }
}

/** Saved role from the profile, with an optional "just this once" role on top for the browser session. */
export default function ActiveRoleProvider({ children }: { children: ReactNode }) {
  const saved = useTargetRole();
  const { saveRole: persist, userId } = saved;
  // Which user the override belongs to travels with it, so a sign-in change can
  // never show one person's override to another, even for a render.
  const [state, setState] = useState<{ userId: string | null; override: Override }>({ userId: null, override: null });

  useEffect(() => {
    setState({ userId, override: userId ? readOverride(userId) : null });
  }, [userId]);

  const override = state.userId === userId ? state.override : null;

  const setOverride = useCallback(
    (next: Override) => {
      if (!userId) return;
      writeOverride(userId, next);
      setState({ userId, override: next });
    },
    [userId],
  );

  const saveRole = useCallback(
    async (role: string, level?: string | null) => {
      await persist(role, level);
      setOverride(null); // the saved role is now this one
    },
    [persist, setOverride],
  );

  const value = useMemo<ActiveRole>(
    () => ({
      ...saved,
      role: override?.role ?? saved.role,
      level: override ? override.level : saved.level,
      overridden: override !== null,
      savedRole: saved.role,
      saveRole,
      practiseJustOnce: (role, level) => setOverride({ role, level: level ?? null }),
      clearOverride: () => setOverride(null),
    }),
    [saved, override, saveRole, setOverride],
  );

  return <ActiveRoleContext.Provider value={value}>{children}</ActiveRoleContext.Provider>;
}

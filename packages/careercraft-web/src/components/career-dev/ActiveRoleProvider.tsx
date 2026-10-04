import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActiveRoleContext, type ActiveRole } from "@/hooks/useActiveRole";
import { useTargetRole } from "@/hooks/useTargetRole";

type Override = { role: string; level: string | null } | null;

// Kept for the browser tab, not just this page: the provider unmounts when the
// learner goes into the interview room, and "just this session" must still
// hold when they come back. Closing the tab ends it.
const OVERRIDE_KEY = "faircopy.roleOverride";

function readOverride(): Override {
  try {
    const raw = sessionStorage.getItem(OVERRIDE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Override) : null;
    return parsed && typeof parsed.role === "string" && parsed.role ? parsed : null;
  } catch {
    return null; // storage blocked or corrupt: no override
  }
}

function writeOverride(value: Override) {
  try {
    if (value) sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* storage blocked: the override lasts for this page only */
  }
}

/** Saved role from the profile, with an optional "just this once" role on top for the browser session. */
export default function ActiveRoleProvider({ children }: { children: ReactNode }) {
  const saved = useTargetRole();
  const [override, setOverride] = useState<Override>(readOverride);
  const { saveRole: persist } = saved;

  useEffect(() => writeOverride(override), [override]);

  const saveRole = useCallback(
    async (role: string, level?: string | null) => {
      await persist(role, level);
      setOverride(null); // the saved role is now this one
    },
    [persist],
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
    [saved, override, saveRole],
  );

  return <ActiveRoleContext.Provider value={value}>{children}</ActiveRoleContext.Provider>;
}

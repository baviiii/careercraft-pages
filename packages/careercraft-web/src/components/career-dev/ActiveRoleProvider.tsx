import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ActiveRoleContext, type ActiveRole } from "@/hooks/useActiveRole";
import { useTargetRole } from "@/hooks/useTargetRole";

/** Saved role from the profile, with an optional in-memory "just this once" role on top. */
export default function ActiveRoleProvider({ children }: { children: ReactNode }) {
  const saved = useTargetRole();
  const [override, setOverride] = useState<{ role: string; level: string | null } | null>(null);
  const { saveRole: persist } = saved;

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

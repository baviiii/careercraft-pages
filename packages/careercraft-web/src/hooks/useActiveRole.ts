/**
 * The role Interview Prep is working with right now: the saved one from the
 * profile, unless the learner chose a different role "just this once" — to
 * practise for a backup job without changing what the rest of the app uses.
 * The override lives only in memory, so it ends when they leave the page.
 */
import { createContext, useContext } from "react";
import type { SavedRole } from "./useTargetRole";

export interface ActiveRole extends SavedRole {
  /** True while a "just this once" role is in use instead of the saved one. */
  overridden: boolean;
  /** The profile's role, even while overridden — for "Back to <saved role>". */
  savedRole: string | null;
  loading: boolean;
  saving: boolean;
  saveRole: (role: string, level?: string | null) => Promise<void>;
  practiseJustOnce: (role: string, level?: string | null) => void;
  clearOverride: () => void;
}

export const ActiveRoleContext = createContext<ActiveRole | null>(null);

export function useActiveRole(): ActiveRole {
  const ctx = useContext(ActiveRoleContext);
  if (!ctx) throw new Error("useActiveRole must be used inside <ActiveRoleProvider>");
  return ctx;
}

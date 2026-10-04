/**
 * The role someone is going for — one answer for the whole app.
 *
 * It lives on their profile: getting-started writes it, Settings edits it, and
 * the interview coach reads it from there too, in the same order as here
 * (interview-coach-mcp `resolveGoal`). Interview Prep and the career tabs used
 * to ask again through a fixed list of 18 mostly-tech fields, so an electrician
 * who'd already said "Electrician" couldn't find their own job.
 *
 * Read through React Query so every tab shares one copy: saving a new role on
 * one tab updates all of them, without a reload.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cleanList } from "@/features/onboarding/lib/normalize";

export type RoleSource = "getting-started" | "current-job" | "persona" | "none";

export interface SavedRole {
  role: string | null;
  /** As `profiles.career_level` stores it: entry, mid, senior, lead, manager, director, vp, c-level. */
  level: string | null;
  source: RoleSource;
  /** The learner's own phrasings — target titles, job-board terms, current job — best suggestions first. */
  ownRoles: string[];
}

const NO_ROLE: SavedRole = { role: null, level: null, source: "none", ownRoles: [] };

/** Trimmed and de-duplicated ignoring case, order kept, nothing dropped. */
const uniqueRoles = (values: unknown[]): string[] =>
  cleanList(values.map((v) => (typeof v === "string" ? v.replace(/\s+/g, " ") : null)), Infinity);

/**
 * The new role first and every existing title after it. Nothing is dropped:
 * Settings lets people keep any number of titles, and they drive job search.
 */
export function withRoleFirst(existing: unknown, role: string): string[] {
  return uniqueRoles([role, ...(Array.isArray(existing) ? existing : [])]);
}

/** Keyed into the cache, so switching accounts never shows the previous person's role. */
function useSessionUserId(): string | null | undefined {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (live) setUserId(data.session?.user.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return userId;
}

interface RoleRow {
  target_job_titles: unknown;
  current_job_title: unknown;
  career_level: unknown;
  // Not in the generated types yet (added by 20260903000000_retire_jobs_catalog).
  search_terms: unknown;
  ai_persona: { function?: unknown } | null;
}

async function fetchSavedRole(userId: string): Promise<SavedRole> {
  const { data, error } = await supabase
    .from("profiles")
    .select("target_job_titles, current_job_title, career_level, search_terms, ai_persona")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const row = data as unknown as RoleRow | null;
  const list = (v: unknown) => (Array.isArray(v) ? v : []);

  const [title] = uniqueRoles(list(row?.target_job_titles));
  const [current] = uniqueRoles([row?.current_job_title]);
  const [persona] = uniqueRoles([row?.ai_persona?.function]);
  const [role, source]: [string | null, RoleSource] = title
    ? [title, "getting-started"]
    : current
      ? [current, "current-job"]
      : persona
        ? [persona, "persona"]
        : [null, "none"];

  return {
    role,
    level: uniqueRoles([row?.career_level])[0] ?? null,
    source,
    ownRoles: uniqueRoles([...list(row?.target_job_titles), ...list(row?.search_terms), row?.current_job_title]),
  };
}

export function useTargetRole() {
  const userId = useSessionUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["target-role", userId],
    queryFn: () => fetchSavedRole(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ role, level }: { role: string; level?: string | null }) => {
      if (!userId) throw new Error("Sign in to save your role.");
      // Read the current titles at save time, so a Settings edit in another tab
      // isn't lost — and never write a list that couldn't be read, or a network
      // blip would replace every saved title with this one.
      const { data, error: readError } = await supabase
        .from("profiles")
        .select("target_job_titles")
        .eq("id", userId)
        .maybeSingle();
      if (readError) throw readError;
      const updates: { target_job_titles: string[]; career_level?: string | null } = {
        target_job_titles: withRoleFirst(data?.target_job_titles, role),
      };
      if (level !== undefined) updates.career_level = level;
      const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["target-role"] }),
  });

  const saveRole = useCallback(
    async (role: string, level?: string | null) => {
      await mutateAsync({ role, level });
    },
    [mutateAsync],
  );

  const saved = query.data ?? NO_ROLE;
  const loading = userId === undefined || (Boolean(userId) && query.isLoading);

  return useMemo(
    () => ({ ...saved, loading, userId: userId ?? null, signedIn: Boolean(userId), saveRole, saving: isPending }),
    [saved, loading, userId, saveRole, isPending],
  );
}

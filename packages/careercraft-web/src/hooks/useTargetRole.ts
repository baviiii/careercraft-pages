/**
 * The role someone is going for — one answer for the whole app.
 *
 * It lives on their profile: getting-started writes it, Settings edits it, and
 * the interview coach reads it from there too. Interview Prep and the career
 * tabs used to ask again through a fixed list of 18 mostly-tech fields, so an
 * electrician who'd already said "Electrician" couldn't find their own job.
 *
 * Read through React Query so every tab shares one copy: saving a new role on
 * one tab updates all of them, without a reload.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Same cap getting-started uses for target job titles. */
const MAX_TARGET_TITLES = 6;

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

const clean = (v: unknown): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Trimmed, de-duplicated ignoring case, order kept. */
export function uniqueRoles(values: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = clean(v);
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      out.push(s);
    }
  }
  return out;
}

/** The new role first, the rest after it, within the cap. */
export function withRoleFirst(existing: string[] | null | undefined, role: string): string[] {
  return uniqueRoles([role, ...(existing ?? [])]).slice(0, MAX_TARGET_TITLES);
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
  target_job_titles: string[] | null;
  current_job_title: string | null;
  career_level: string | null;
  // Not in the generated types yet (added by 20260903000000_retire_jobs_catalog).
  search_terms: string[] | null;
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

  const titles = uniqueRoles(row?.target_job_titles ?? []);
  const current = clean(row?.current_job_title);
  const persona = clean(row?.ai_persona?.function);
  const [role, source]: [string | null, RoleSource] = titles[0]
    ? [titles[0], "getting-started"]
    : current
      ? [current, "current-job"]
      : persona
        ? [persona, "persona"]
        : [null, "none"];

  return {
    role,
    level: clean(row?.career_level) || null,
    source,
    ownRoles: uniqueRoles([...titles, ...(row?.search_terms ?? []), current]),
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

  const save = useMutation({
    mutationFn: async ({ role, level }: { role: string; level?: string | null }) => {
      if (!userId) throw new Error("Sign in to save your role.");
      // Read the current titles at save time, so a Settings edit in another tab isn't lost.
      const { data } = await supabase.from("profiles").select("target_job_titles").eq("id", userId).maybeSingle();
      const updates: { target_job_titles: string[]; career_level?: string | null } = {
        target_job_titles: withRoleFirst(data?.target_job_titles, role),
      };
      if (level !== undefined) updates.career_level = level;
      const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["target-role"] }),
  });

  return {
    ...(query.data ?? NO_ROLE),
    loading: userId === undefined || (Boolean(userId) && query.isLoading),
    signedIn: Boolean(userId),
    saveRole: (role: string, level?: string | null) => save.mutateAsync({ role, level }),
    saving: save.isPending,
  };
}

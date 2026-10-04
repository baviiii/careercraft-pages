/**
 * Skills are stored by id against the shared `skill_tags` dictionary. Users
 * can't write that dictionary directly; the `ensure_skill_tags` database
 * function (migration 20261006000000) is the one way to add a name. Onboarding,
 * Settings and the interview coach all go through it, so any skill someone
 * actually has can be saved — not only the ones already listed.
 */
import { supabase } from "@/integrations/supabase/client";

/** How a name is matched to its dictionary entry: trimmed, single-spaced, case-insensitive. */
export const skillNameKey = (name: string) => name.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Skill names → skill_tags ids (keyed by skillNameKey), adding any the
 * dictionary doesn't have. Names over 60 characters or empty are skipped by the
 * database; at most 30 per call.
 */
export async function ensureSkillTags(
  names: string[],
  categories?: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  if (names.length === 0) return ids;
  // Untyped until the generated types are refreshed after the migration is
  // applied (`supabase gen types typescript --linked`); then drop this cast.
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fn: "ensure_skill_tags",
        args: { p_names: string[]; p_categories: Array<string | null> | null },
      ) => Promise<{ data: Array<{ requested: string; id: string }> | null; error: Error | null }>;
    }
  ).rpc("ensure_skill_tags", {
    p_names: names.slice(0, 30),
    p_categories: categories ? categories.slice(0, 30).map((c) => c ?? null) : null,
  });
  if (error) throw error;
  for (const row of data ?? []) ids.set(skillNameKey(row.requested), row.id);
  return ids;
}

/**
 * A proficiency band as a 0–100 level — the same mapping the interview coach
 * uses (bandToProficiency), so a self-reported "advanced" means 75 on both
 * sides. Without it, proficiency_level stayed at its default 0 and the coach
 * read every self-reported skill as the weakest possible.
 */
export function bandToLevel(band: string | null | undefined): number {
  switch ((band ?? "").toLowerCase()) {
    case "expert":
      return 90;
    case "advanced":
      return 75;
    case "intermediate":
      return 50;
    case "beginner":
      return 25;
    default:
      return 0;
  }
}

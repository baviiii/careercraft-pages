/* Whole-word matching shared by the profile scorers (hooks/usePersonalization)
   and Market News, so a term matches the same way on jobs and on news. */

/**
 * True when `term` appears in `text` as whole words. A plain `includes` let
 * the skill "Excel" match "excellent" and a role of "Lead" match "misleading".
 *
 * `+`, `#` and `&` are left out of the boundary classes, which is what makes
 * one-character skills safe on job ads:
 *   - "C++" and "C#" match as themselves, and a bare "C" does not match the C
 *     inside them
 *   - "R" matches "Excel, R and SQL" but not "our R&D team"
 * `plural` also accepts "Teachers" for "Teacher": news writes about
 * occupations in the plural, job ads rarely do.
 */
export function containsTerm(text: string, term: string, { plural = false } = {}): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return false;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tail = plural ? "(?:'?s|es)?" : '';
  return new RegExp(`(^|[^a-z0-9+#&])${escaped}${tail}([^a-z0-9+#&]|$)`, 'i').test(text);
}

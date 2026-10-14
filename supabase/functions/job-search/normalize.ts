export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeJobType(contractTime: string | null | undefined): string | null {
  if (contractTime === "full_time") return "full-time";
  if (contractTime === "part_time") return "part-time";
  return contractTime || null;
}

/* Phrases about how the job is done, not where the patients live. A bare
   "remote" also appears in "rural and remote communities", "remote area
   allowance" and "remote Aboriginal communities": on-site roles that must
   not be tagged Remote. */
const REMOTE_WORK =
  /\b(work(ing)? from home|wfh|work(ing)? remotely|fully remote|100% remote|remote[- ](first|role|position|job|work|working|based|friendly|option|opportunity)|hybrid[ /-]remote)\b/;
const REMOTE_PLACE = /\b(rural and remote|remote (and|or) rural|remote areas?|remote communit(y|ies)|remote (area |locality )?allowance|regional and remote|remote (site|location)s?)\b/;

export function detectRemote(title: string | null | undefined, description: string | null | undefined): boolean {
  const t = (title || "").toLowerCase();
  const d = (description || "").toLowerCase();
  // In a title, "(Remote)" or "- Remote" is the job; in a title or text, a
  // remote place isn't.
  if (/\bremote\b/.test(t) && !REMOTE_PLACE.test(t)) return true;
  return REMOTE_WORK.test(`${t} ${d}`);
}

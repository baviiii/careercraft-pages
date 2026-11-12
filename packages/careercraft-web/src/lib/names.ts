/* Picking a person's name to show. Some accounts have their email address
   saved as their name (profiles.full_name, or the sign-up metadata), so
   nothing should greet anyone by a string with an "@" in it:
   "Good evening." reads better than "Good evening, someone@gmail.com." */

/** The first candidate that is a real name: a non-empty string with no "@". */
export function realNameOf(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const name = c.trim();
    if (name && !name.includes("@")) return name;
  }
  return "";
}

/** Its first word, for a greeting; "" when there's no real name. */
export function firstNameOf(...candidates: unknown[]): string {
  return realNameOf(...candidates).split(/\s+/)[0] ?? "";
}

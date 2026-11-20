/* The same ad, more than once: the browser's copy of the rules in
   supabase/functions/job-search/normalize.ts. A Deno test there runs both
   copies over the same cases (normalize_test.ts), so they can't drift apart
   unnoticed. The function already merges copies within a page; this catches a
   copy that turns up again on the next page, and counts a company once in
   "Hiring more than once" when the board spells its name two ways. */

const LEGAL_FORM = /\b(pty|ltd|limited|inc|incorporated|llc|plc|corp|corporation)\b/g;
/* Stand-in names for hidden advertisers. They aren't one company. */
const PLACEHOLDER_COMPANY = /^(unknown company|company|confidential|private advertiser)$/;

/** "Flywire Pacific Pty [Australia]" → "flywire pacific". */
export function companyKey(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(LEGAL_FORM, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A placeholder rather than a real employer's name. */
export const isPlaceholderCompany = (name: string | null | undefined) =>
  PLACEHOLDER_COMPANY.test(companyKey(name));

/** The same company, or one name a longer form of the other ("Saab" / "Saab Australia"). */
export function sameCompany(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = companyKey(a);
  const y = companyKey(b);
  if (!x || !y || PLACEHOLDER_COMPANY.test(x) || PLACEHOLDER_COMPANY.test(y)) return false;
  return x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `);
}

export const titleKey = (t: string | null | undefined) =>
  (t ?? "").toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim();

const placeParts = (location: string | null | undefined) =>
  (location ?? "")
    .toLowerCase()
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * The same place, or one said more broadly: "Adelaide CBD, Adelaide" and
 * "Adelaide, Adelaide Region" are; "Marion, Adelaide" and "Elizabeth,
 * Adelaide" (two Woolworths stores, say) are not. A copy without a place
 * can't be told apart by it.
 */
export function samePlace(a: string | null | undefined, b: string | null | undefined): boolean {
  const pa = placeParts(a);
  const pb = placeParts(b);
  if (!pa.length || !pb.length) return true;
  return pb.includes(pa[0]) || pa.includes(pb[0]);
}

function words(text: string | null | undefined): Set<string> {
  return new Set((text ?? "").toLowerCase().slice(0, 600).match(/[a-z0-9]{3,}/g) ?? []);
}

interface AdText {
  title: string;
  company: string;
  location?: string | null;
  description_snippet?: string | null;
}

/**
 * Two copies of one ad: the same title, company and place, and most of their
 * words shared. Not half: one employer's ads open with the same paragraph
 * about the employer.
 */
export function isSameJob(a: AdText, b: AdText): boolean {
  if (titleKey(a.title) !== titleKey(b.title) || !sameCompany(a.company, b.company)) return false;
  if (!samePlace(a.location, b.location)) return false;
  const wa = words(a.description_snippet);
  const wb = words(b.description_snippet);
  // Nothing to compare: the same title at the same company and place.
  if (!wa.size || !wb.size) return true;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / (wa.size + wb.size - shared) >= 0.6;
}

interface AdPay {
  salary_min?: number | null;
  salary_max?: number | null;
  salary_is_predicted?: boolean;
}

/** The employer gave a figure (not the board's estimate). */
export const statesPay = (j: AdPay) => !j.salary_is_predicted && Boolean(j.salary_min || j.salary_max);

/* ── Browser only ── */

/**
 * The next page added to what's on screen. A copy of an ad already shown is
 * dropped, unless it states the pay the shown one only estimates, in which
 * case it takes that one's place. Only ads with the same title are compared,
 * so a long list stays quick.
 */
export function mergeCopies<T extends AdText & AdPay & { id: string; related?: boolean }>(
  shown: T[],
  next: T[],
): T[] {
  const out = [...shown];
  const ids = new Set(shown.map((j) => j.id));
  const byTitle = new Map<string, number[]>();
  out.forEach((j, i) => {
    const key = titleKey(j.title);
    byTitle.set(key, [...(byTitle.get(key) ?? []), i]);
  });
  for (const job of next) {
    if (ids.has(job.id)) continue;
    ids.add(job.id);
    const key = titleKey(job.title);
    const same = (byTitle.get(key) ?? []).find((i) => isSameJob(out[i], job));
    if (same === undefined) {
      byTitle.set(key, [...(byTitle.get(key) ?? []), out.length]);
      out.push(job);
    } else if (!statesPay(out[same]) && statesPay(job)) {
      // Its pay, not its standing: a match stays a match even when the copy
      // that states the pay came in with the similar ads.
      out[same] = { ...job, related: out[same].related };
    }
  }
  return out;
}

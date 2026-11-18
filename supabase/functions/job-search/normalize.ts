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

/* ── The same ad, more than once ─────────────────────────────────────────────
   An employer and an agency both post it, or the board lists it twice under
   slightly different names ("Softtest pays pty" and "Softtest pays pty ltd",
   "Topcon Positioning" and "Topcon Positioning Systems, Inc"). Each copy has
   its own id and link, so copies are compared by what they say: the same
   title, the same company give or take its legal suffix, and mostly the same
   words. Keep in step with the browser's copy in
   packages/careercraft-web/src/features/browse-jobs/lib/sameJob.ts. */

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

/**
 * One of each ad, in order. A copy keeps the place of the first one seen, but
 * the details of whichever copy states its pay.
 */
export function dedupeJobs<T extends AdText & AdPay>(jobs: T[]): T[] {
  const kept: T[] = [];
  for (const job of jobs) {
    const i = kept.findIndex((k) => isSameJob(k, job));
    if (i === -1) kept.push(job);
    else if (!statesPay(kept[i]) && statesPay(job)) kept[i] = job;
  }
  return kept;
}

export function detectRemote(title: string | null | undefined, description: string | null | undefined): boolean {
  const t = (title || "").toLowerCase();
  const d = (description || "").toLowerCase();
  // In a title, "(Remote)" or "- Remote" is the job; in a title or text, a
  // remote place isn't.
  if (/\bremote\b/.test(t) && !REMOTE_PLACE.test(t)) return true;
  return REMOTE_WORK.test(`${t} ${d}`);
}

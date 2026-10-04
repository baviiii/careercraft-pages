/**
 * Canonicalisation layer between the AI analysis and the profile tables.
 *
 * Settings (and every personalization consumer) reads enum-valued columns —
 * `industry` must be one of INDUSTRIES, `career_level` one of CAREER_LEVELS,
 * etc. The model is prompted to emit these exact values, but this module is
 * the hard guarantee: whatever arrives (model drift, older runs, free-text
 * user edits in the reveal step) is coerced onto the canonical vocabulary
 * before it touches the database.
 */

import { INDUSTRIES } from '@/hooks/useUserProfile';
import type {
  OnboardingAnalysis,
  OnboardingInferredProfile,
  OnboardingPersona,
} from '../types';

const lower = (v: string | null | undefined) => (v ?? '').toString().trim().toLowerCase();

/** First canonical value whose keyword list hits the input; null when input is empty. */
function matchKeyword<T extends string>(
  value: string | null | undefined,
  table: Array<[T, string[]]>,
  fallback: T | null = null,
): T | null {
  const v = lower(value);
  if (!v) return null;
  for (const [canonical] of table) {
    if (canonical.toLowerCase() === v) return canonical;
  }
  for (const [canonical, keys] of table) {
    if (keys.some((k) => v.includes(k))) return canonical;
  }
  return fallback;
}

/* ── industry ────────────────────────────────────────────────────────────── */

const INDUSTRY_KEYWORDS: Array<[string, string[]]> = [
  ['Technology', ['tech', 'software', 'information technology', 'saas', 'cyber', 'data', ' ai', 'artificial intelligence', 'internet', 'computer']],
  ['Healthcare', ['health', 'medical', 'nurs', 'aged care', 'childcare', 'hospital', 'clinic', 'allied', 'disability']],
  ['Finance & Banking', ['financ', 'bank', 'fintech', 'account', 'insurance', 'superannuation', 'invest', 'audit', 'wealth']],
  ['Education', ['educat', 'teach', 'academ', 'school', 'universit', 'training', 'tutor']],
  ['Manufacturing', ['manufactur', 'production', 'industrial', 'automotive', 'defence', 'defense', 'aerospace', 'fabricat']],
  ['Retail', ['retail', 'e-commerce', 'ecommerce', 'fmcg', 'supermarket', 'store']],
  ['Consulting', ['consult', 'advisory', 'professional services']],
  ['Media & Entertainment', ['media', 'entertain', 'advertis', 'journalis', 'film', 'gaming', 'creative', 'publish', 'music']],
  ['Real Estate', ['real estate', 'property', 'realty']],
  ['Government', ['government', 'public sector', 'public service', 'council', 'federal', 'state gov']],
  ['Non-Profit', ['non-profit', 'nonprofit', 'ngo', 'charity', 'community service', 'not-for-profit']],
  ['Energy', ['energy', 'mining', 'oil', 'gas', 'utilit', 'resources', 'renewable', 'solar']],
  ['Transportation', ['transport', 'logistic', 'aviation', 'shipping', 'freight', 'supply chain', 'airline']],
  ['Hospitality', ['hospitality', 'tourism', 'hotel', 'restaurant', 'food service', 'travel', 'chef', 'barista']],
  ['Legal', ['legal', 'law ', 'lawyer', 'solicitor']],
  ['Agriculture', ['agricultur', 'farm', 'agri', 'viticult', 'wine', 'horticult']],
  ['Construction', ['construct', 'building', 'trades', 'civil', 'infrastructure', 'carpent', 'plumb', 'electric']],
  ['Telecommunications', ['telecom', 'telco']],
  ['Pharmaceuticals', ['pharma', 'biotech', 'life science']],
];

const INDUSTRY_ALIASES: Record<string, string> = {
  it: 'Technology',
  ict: 'Technology',
  fintech: 'Finance & Banking',
  defence: 'Manufacturing',
  mining: 'Energy',
};

export function normalizeIndustry(value: string | null | undefined): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const exact = INDUSTRIES.find((i) => i.toLowerCase() === v.toLowerCase());
  if (exact) return exact;
  const alias = INDUSTRY_ALIASES[v.toLowerCase()];
  if (alias) return alias;
  return matchKeyword(v, INDUSTRY_KEYWORDS, 'Other');
}

/* ── career level / years / status ───────────────────────────────────────── */

const CAREER_LEVEL_KEYWORDS: Array<[string, string[]]> = [
  ['c-level', ['c-level', 'chief', 'ceo', 'cto', 'cfo', 'coo', 'cio', 'founder', 'owner']],
  ['vp', ['vp', 'vice president', 'general manager', 'executive']],
  ['director', ['director', 'head of']],
  ['manager', ['manager', 'management', 'supervisor']],
  ['lead', ['lead', 'staff', 'principal']],
  ['senior', ['senior', 'sr.', 'sr ']],
  ['entry', ['entry', 'junior', 'graduate', 'grad', 'intern', 'trainee', 'apprentice', 'student', 'associate']],
  ['mid', ['mid', 'intermediate']],
];

export function normalizeCareerLevel(value: string | null | undefined): string | null {
  return matchKeyword(value, CAREER_LEVEL_KEYWORDS);
}

const YEARS_BUCKETS = ['0-1', '1-3', '3-5', '5-10', '10-15', '15+'];

export function normalizeYearsOfExperience(value: string | null | undefined): string | null {
  const v = lower(value);
  if (!v) return null;
  const exact = YEARS_BUCKETS.find((b) => b === v || b === v.replace(/\s/g, ''));
  if (exact) return exact;
  const nums = v.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length) return /less than|under|<|new|none/.test(v) ? '0-1' : null;
  // "10+" means at least 10 — nudge past the bucket boundary.
  const n = Math.max(...nums) + (v.includes('+') ? 0.1 : 0);
  if (n <= 1) return '0-1';
  if (n <= 3) return '1-3';
  if (n <= 5) return '3-5';
  if (n <= 10) return '5-10';
  if (n <= 15) return '10-15';
  return '15+';
}

const STATUS_KEYWORDS: Array<[string, string[]]> = [
  ['not_looking', ['not looking', 'not interested', 'staying', 'happy where']],
  ['actively_looking', ['activ', 'unemployed', 'seeking', 'searching', 'looking for', 'job hunt', 'laid off', 'redundan', 'between']],
  ['open', ['open', 'passive', 'receptive', 'considering', 'curious']],
  ['employed', ['employed', 'working', 'currently at', 'in a role']],
];

export function normalizeEmploymentStatus(value: string | null | undefined): string | null {
  return matchKeyword(value, STATUS_KEYWORDS);
}

/* ── arrangements / timeline / remote preference ─────────────────────────── */

const ARRANGEMENT_KEYWORDS: Array<[string, string[]]> = [
  ['remote', ['remote', 'wfh', 'work from home', 'telecommut', 'anywhere']],
  ['hybrid', ['hybrid', 'flex', 'mix']],
  ['onsite', ['onsite', 'on-site', 'on site', 'office', 'in-person', 'in person']],
];

export function normalizeWorkArrangement(values: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const v of values ?? []) {
    const m = matchKeyword(v, ARRANGEMENT_KEYWORDS);
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}

export function normalizeTimeline(value: string | null | undefined): string | null {
  const v = lower(value);
  if (!v) return null;
  if (['immediately', '1-3_months', '3-6_months', 'exploring'].includes(v)) return v;
  if (/immediat|asap|now|urgent/.test(v)) return 'immediately';
  if (/explor|browse|someday|no rush|passive|next year|12/.test(v)) return 'exploring';
  const nums = v.match(/\d+/g)?.map(Number) ?? [];
  const n = nums.length ? Math.max(...nums) : null;
  if (n !== null) return n <= 3 ? '1-3_months' : n <= 6 ? '3-6_months' : 'exploring';
  if (/soon|month/.test(v)) return '1-3_months';
  return null;
}

export function normalizeRemotePreference(value: string | null | undefined): string {
  const v = lower(value);
  if (['remote', 'hybrid', 'onsite', 'any'].includes(v)) return v;
  return matchKeyword(v, ARRANGEMENT_KEYWORDS) ?? 'any';
}

/* ── job types / company sizes ───────────────────────────────────────────── */

const JOB_TYPE_KEYWORDS: Array<[string, string[]]> = [
  ['full-time', ['full', 'permanent']],
  ['part-time', ['part']],
  ['contract', ['contract', 'fixed-term', 'fixed term', 'temp']],
  ['freelance', ['freelance', 'gig', 'self-employed']],
  ['internship', ['intern', 'placement', 'cadet']],
];

const COMPANY_SIZE_KEYWORDS: Array<[string, string[]]> = [
  ['startup', ['startup', 'start-up', 'early stage']],
  ['small', ['small', 'smb', 'boutique']],
  ['medium', ['medium', 'mid-size', 'midsize', 'scale-up', 'scaleup']],
  ['enterprise', ['enterprise', 'corporate', 'multinational', 'global']],
  ['large', ['large', 'big']],
];

function normalizeSet(values: Array<string | null | undefined>, table: Array<[string, string[]]>): string[] {
  const out: string[] = [];
  for (const v of values ?? []) {
    const m = matchKeyword(v, table);
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}

/* ── skills ──────────────────────────────────────────────────────────────── */

const PROFICIENCY_KEYWORDS: Array<[string, string[]]> = [
  ['beginner', ['beginner', 'basic', 'novice', 'familiar', 'learning']],
  ['advanced', ['advanced', 'strong', 'senior']],
  ['expert', ['expert', 'master', 'deep', 'specialist']],
  ['intermediate', ['intermediate', 'working', 'competent', 'proficient', 'solid']],
];

const SKILL_CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ['technical', ['technical', 'tech', 'tool', 'software', 'hard', 'programming']],
  ['behavioral', ['behavioral', 'behavioural', 'soft', 'interpersonal', 'communication']],
  ['leadership', ['leadership', 'management', 'people']],
  ['language', ['language', 'linguistic']],
  ['domain', ['domain', 'industry', 'functional', 'business']],
];

export function normalizeProficiency(value: string | null | undefined): string {
  return matchKeyword(value, PROFICIENCY_KEYWORDS) ?? 'intermediate';
}

export function normalizeSkillCategory(value: string | null | undefined): string {
  return matchKeyword(value, SKILL_CATEGORY_KEYWORDS) ?? 'domain';
}

/* ── persona ─────────────────────────────────────────────────────────────── */

const SENIORITY_KEYWORDS: Array<[OnboardingPersona['seniority'], string[]]> = [
  ['student', ['student', 'undergrad', 'study']],
  ['exec', ['exec', 'chief', 'director', 'vp', 'founder', 'c-level']],
  ['principal', ['principal', 'distinguished']],
  ['lead', ['lead', 'staff', 'manager']],
  ['senior', ['senior', 'sr']],
  ['entry', ['entry', 'junior', 'graduate', 'intern', 'apprentice']],
  ['mid', ['mid', 'intermediate']],
];

/* ── helpers ─────────────────────────────────────────────────────────────── */

const cleanStr = (v: string | null | undefined): string | null => {
  const s = (v ?? '').toString().trim();
  return s.length ? s : null;
};

export function cleanList(values: Array<string | null | undefined>, cap: number): string[] {
  const out: string[] = [];
  for (const v of values ?? []) {
    const s = (v ?? '').toString().trim();
    if (s && !out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

const toInt = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;

/* ── the full pass ───────────────────────────────────────────────────────── */

export function normalizeAnalysis(a: OnboardingAnalysis): OnboardingAnalysis {
  const ip = (a.inferredProfile ?? {}) as OnboardingInferredProfile;

  let salaryMin = toInt(a.targets?.desired_salary_min);
  let salaryMax = toInt(a.targets?.desired_salary_max);
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    [salaryMin, salaryMax] = [salaryMax, salaryMin];
  }
  const currency = (cleanStr(a.targets?.desired_salary_currency) ?? 'AUD').toUpperCase().slice(0, 3);

  return {
    ...a,
    persona: {
      ...a.persona,
      archetype: cleanStr(a.persona?.archetype) ?? 'Professional in Motion',
      seniority: matchKeyword(a.persona?.seniority, SENIORITY_KEYWORDS) ?? 'mid',
      function: cleanStr(a.persona?.function) ?? 'General',
      subFunction: cleanStr(a.persona?.subFunction),
      vertical: cleanStr(a.persona?.vertical),
      narrative: cleanStr(a.persona?.narrative) ?? '',
    },
    inferredProfile: {
      full_name: cleanStr(ip.full_name),
      phone: cleanStr(ip.phone),
      headline: cleanStr(ip.headline),
      bio: cleanStr(ip.bio),
      current_job_title: cleanStr(ip.current_job_title),
      current_company: cleanStr(ip.current_company),
      years_of_experience: normalizeYearsOfExperience(ip.years_of_experience),
      industry: normalizeIndustry(ip.industry),
      career_level: normalizeCareerLevel(ip.career_level),
      location_city: cleanStr(ip.location_city),
      location_country: cleanStr(ip.location_country),
      employment_status: normalizeEmploymentStatus(ip.employment_status),
    },
    targets: {
      target_job_titles: cleanList(a.targets?.target_job_titles, 6),
      target_companies: cleanList(a.targets?.target_companies, 10),
      preferred_locations: cleanList(a.targets?.preferred_locations, 6),
      work_arrangement: normalizeWorkArrangement(a.targets?.work_arrangement),
      desired_salary_min: salaryMin,
      desired_salary_max: salaryMax,
      desired_salary_currency: currency,
      job_change_timeline: normalizeTimeline(a.targets?.job_change_timeline),
      // Capped at 5 — each term becomes its own paid board call at search time.
      search_terms: cleanList(a.targets?.search_terms, 5),
    },
    jobPreferences: {
      industries: cleanList(a.jobPreferences?.industries, 5)
        .map((i) => normalizeIndustry(i))
        .filter((i, idx, arr): i is string => !!i && arr.indexOf(i) === idx),
      job_types: normalizeSet(a.jobPreferences?.job_types, JOB_TYPE_KEYWORDS),
      company_sizes: normalizeSet(a.jobPreferences?.company_sizes, COMPANY_SIZE_KEYWORDS),
      remote_preference: normalizeRemotePreference(a.jobPreferences?.remote_preference),
      min_salary: toInt(a.jobPreferences?.min_salary) ?? salaryMin,
    },
    skills: (a.skills ?? [])
      .filter((s) => cleanStr(s?.name))
      .slice(0, 20)
      .map((s) => ({
        name: s.name.trim(),
        category: normalizeSkillCategory(s.category),
        proficiency: normalizeProficiency(s.proficiency),
        years_experience: toInt(s.years_experience),
      })),
    certifications: (a.certifications ?? []).filter((c) => cleanStr(c?.name)),
    cvStandards: {
      recommended_length: cleanStr(a.cvStandards?.recommended_length) ?? '1 page',
      format: cleanStr(a.cvStandards?.format) ?? 'reverse-chronological',
      ats_notes: cleanList(a.cvStandards?.ats_notes, 8),
      improvements: cleanList(a.cvStandards?.improvements, 8),
    },
    confidence: a.confidence ?? { overall: 0.5, persona: 0.5, skills: 0.5 },
  };
}

/* ── Diagnostics ─────────────────────────────────────────────────────────────
   Onboarding is two stages with very different characters. Extraction is AI
   (`onboard-analyze` → horusGenerateObject) and copes with any résumé, any
   profession, any phrasing. Normalisation — everything above — then forces that
   onto closed enums, and that is where a versatile answer can become a narrow
   one.

   `normalizeIndustry` is the sharp edge. It tries an exact match against the 20
   INDUSTRIES, then five aliases (it, ict, fintech, defence, mining), then a
   keyword list, and failing all three returns 'Other'. A résumé that reads
   "Aged Care" or "Allied Health" very likely lands on 'Other' — and 'Other'
   never matches a job or an article again, because `industryMatches` treats it
   as a stop word. Silently, permanently, for that user.

   Whether that is worth fixing depends entirely on how often it happens, and
   that is a measurement, not an argument. This reports what was lost so the
   caller can record it; it does no I/O itself, because this module is pure and
   should stay that way.

   Delete this once the question is answered. */

export interface NormalizationLoss {
  field: string;
  /** What the AI actually said. */
  raw: string;
  /** What it became — 'Other', or null when the value was dropped. */
  normalized: string | null;
}

export function describeNormalizationLoss(a: OnboardingAnalysis): NormalizationLoss[] {
  const losses: NormalizationLoss[] = [];
  const ip = (a.inferredProfile ?? {}) as OnboardingInferredProfile;

  const rawIndustry = cleanStr(ip.industry);
  if (rawIndustry) {
    const got = normalizeIndustry(rawIndustry);
    /* 'Other' is only a loss when the AI said something else — a résumé that
       genuinely reads "Other" was normalised correctly. */
    if (got === 'Other' && rawIndustry.toLowerCase() !== 'other') {
      losses.push({ field: 'industry', raw: rawIndustry, normalized: got });
    }
  }

  const rawLevel = cleanStr(ip.career_level);
  if (rawLevel && normalizeCareerLevel(rawLevel) === null) {
    losses.push({ field: 'career_level', raw: rawLevel, normalized: null });
  }

  const rawYears = cleanStr(ip.years_of_experience);
  if (rawYears && normalizeYearsOfExperience(rawYears) === null) {
    losses.push({ field: 'years_of_experience', raw: rawYears, normalized: null });
  }

  const rawStatus = cleanStr(ip.employment_status);
  if (rawStatus && normalizeEmploymentStatus(rawStatus) === null) {
    losses.push({ field: 'employment_status', raw: rawStatus, normalized: null });
  }

  /* Preferred industries go through the same funnel, and a dropped entry here
     costs the user a job-preference filter rather than the whole signal. */
  for (const raw of cleanList(a.jobPreferences?.industries, 5)) {
    const got = normalizeIndustry(raw);
    if (got === 'Other' && raw.toLowerCase() !== 'other') {
      losses.push({ field: 'jobPreferences.industries', raw, normalized: got });
    }
  }

  return losses;
}

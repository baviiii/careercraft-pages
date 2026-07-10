import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  normalizeAnalysis,
  normalizeProficiency,
  normalizeSkillCategory,
} from './normalize';
import type {
  OnboardAnalyzeResponse,
  OnboardingAnalysis,
  OnboardingMode,
  OnboardingSource,
} from '../types';

const asJson = (value: unknown): Json => value as Json;

interface AnalyzeInput {
  mode: OnboardingMode;
  text?: string;
  resumeText?: string;
  resumePath?: string;
}

export interface AnalyzeSuccess {
  analysis: OnboardingAnalysis;
  runId: string;
  runsRemaining: number;
}

export class OnboardingRateLimitError extends Error {
  constructor(message: string, public runsRemaining = 0) {
    super(message);
    this.name = 'OnboardingRateLimitError';
  }
}

export async function analyzeOnboarding(input: AnalyzeInput): Promise<AnalyzeSuccess> {
  const { data, error } = await supabase.functions.invoke<OnboardAnalyzeResponse>(
    'onboard-analyze',
    { body: input },
  );

  if (error) {
    // supabase-js wraps non-2xx as FunctionsHttpError with the raw Response in `context`.
    // Parse the JSON body so we can surface typed errors (rate limits, validation, etc.).
    const body = await readErrorBody(error);
    if (body?.code === 'RATE_LIMITED') {
      throw new OnboardingRateLimitError(
        body.error || 'Daily analysis limit reached — try again tomorrow.',
        0,
      );
    }
    throw new Error(body?.error || error.message || 'AI analysis failed');
  }

  if (!data?.ok || !data.analysis || !data.runId) {
    throw new Error(data?.error || 'AI analysis returned no result');
  }
  return {
    // Canonicalise up-front so the reveal UI edits (and saves) enum values
    // that Settings and the personalization scorers actually understand.
    analysis: normalizeAnalysis(data.analysis),
    runId: data.runId,
    runsRemaining: data.runsRemaining ?? 0,
  };
}

interface EdgeErrorBody {
  error?: string;
  code?: string;
  limit?: number;
  details?: unknown;
}

async function readErrorBody(error: unknown): Promise<EdgeErrorBody | null> {
  const ctx = (error as { context?: Response }).context;
  if (!ctx || typeof ctx.clone !== 'function') return null;
  try {
    return (await ctx.clone().json()) as EdgeErrorBody;
  } catch {
    return null;
  }
}

export async function markOnboardingStarted(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ onboarding_started_at: new Date().toISOString() })
    .eq('id', userId);
}

interface ApplyInput {
  userId: string;
  analysis: OnboardingAnalysis;
  source: Exclude<OnboardingSource, 'skipped'>;
}

/** Coerce loose AI date strings into a Postgres DATE (YYYY-MM-DD) or null. */
function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`;
  if (/^\d{4}$/.test(v)) return `${v}-01-01`;
  return null;
}

/** Drop null/empty values so a sparse re-run never wipes fields the user already has. */
function compactPatch<T extends Record<string, unknown>>(patch: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

const mergeUnique = (...lists: Array<string[] | null | undefined>): string[] => {
  const out: string[] = [];
  for (const list of lists) {
    for (const raw of list ?? []) {
      const v = (raw ?? '').toString().trim();
      if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
    }
  }
  return out;
};

/**
 * Persist onboarding analysis to the user's profile — this is what makes the
 * profile "literally made" the moment onboarding finishes: identity, career
 * fields (canonical enums, so every Settings dropdown lights up), targets,
 * job/news/interview preferences, skills, and certifications.
 *
 * Order matters: enrichment writes (preferences, skills, certifications) run
 * BEFORE the completion flag so a failure there can't lock the user out of
 * re-running onboarding. Enrichment failures are logged, not fatal — only the
 * core profile patch and the final completion flag are required to succeed.
 */
export async function applyOnboarding({ userId, analysis: edited, source }: ApplyInput): Promise<void> {
  const now = new Date().toISOString();
  // The reveal step lets the user type anything — canonicalise once more.
  const analysis = normalizeAnalysis(edited);

  // Identity fields fill blanks only; onboarding must never overwrite a name
  // or phone the user set themselves.
  const { data: current } = await supabase
    .from('profiles')
    .select('full_name,phone')
    .eq('id', userId)
    .maybeSingle();

  const { full_name, phone, ...inferredRest } = analysis.inferredProfile;

  // 1. Core profile patch (persona, inferred fields, targets, cv_standards) — required.
  const profilePatch = {
    ...compactPatch({
      ...inferredRest,
      ...analysis.targets,
      full_name: current?.full_name ? null : full_name,
      phone: current?.phone ? null : phone,
    }),
    ai_persona: asJson(analysis.persona),
    cv_standards: asJson(analysis.cvStandards),
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profilePatch)
    .eq('id', userId);
  if (profileError) throw profileError;

  // 2. Enrichment — non-fatal. A bad enum/date shouldn't fail the whole save.
  try {
    await applyPreferences(userId, analysis);
  } catch (e) {
    console.warn('[onboarding] user_preferences write failed (non-fatal):', e);
  }

  try {
    await applySkills(userId, analysis);
  } catch (e) {
    console.warn('[onboarding] skills write failed (non-fatal):', e);
  }

  try {
    await applyCertifications(userId, analysis);
  } catch (e) {
    console.warn('[onboarding] certifications write failed (non-fatal):', e);
  }

  // 3. Mark complete LAST — only reached if the core profile patch succeeded.
  const { error: completeError } = await supabase
    .from('profiles')
    .update({ onboarding_source: source, onboarding_completed_at: now })
    .eq('id', userId);
  if (completeError) throw completeError;
}

/**
 * Seed job, news, and interview preferences from the analysis so every
 * personalized surface (AU Jobs, Market News, Interview Prep) works from
 * day one. Merges with any existing preferences rather than replacing them.
 */
async function applyPreferences(userId: string, analysis: OnboardingAnalysis): Promise<void> {
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('job_preferences,news_preferences,interview_preferences')
    .eq('user_id', userId)
    .maybeSingle();

  const prevJob = (existing?.job_preferences ?? {}) as Record<string, unknown>;
  const prevNews = (existing?.news_preferences ?? {}) as Record<string, unknown>;
  const prevInterview = (existing?.interview_preferences ?? {}) as Record<string, unknown>;

  const industries = mergeUnique(
    analysis.inferredProfile.industry ? [analysis.inferredProfile.industry] : [],
    analysis.jobPreferences.industries,
  );

  const jobPreferences = {
    ...prevJob,
    industries,
    job_types: analysis.jobPreferences.job_types.length
      ? analysis.jobPreferences.job_types
      : (prevJob.job_types as string[] | undefined) ?? ['full-time'],
    company_sizes: analysis.jobPreferences.company_sizes.length
      ? analysis.jobPreferences.company_sizes
      : (prevJob.company_sizes as string[] | undefined) ?? [],
    remote_preference: analysis.jobPreferences.remote_preference,
    min_salary: analysis.jobPreferences.min_salary ?? (prevJob.min_salary as number | null) ?? null,
  };

  const newsPreferences = {
    ...prevNews,
    followed_industries: mergeUnique(
      prevNews.followed_industries as string[] | undefined,
      industries,
    ).slice(0, 6),
    followed_companies: mergeUnique(
      prevNews.followed_companies as string[] | undefined,
      analysis.targets.target_companies,
      analysis.inferredProfile.current_company ? [analysis.inferredProfile.current_company] : [],
    ).slice(0, 10),
  };

  const focusAreas = analysis.skills.slice(0, 4).map((s) => s.name);
  const interviewPreferences = {
    ...prevInterview,
    default_field:
      analysis.inferredProfile.industry ??
      analysis.persona.function ??
      (prevInterview.default_field as string | undefined) ??
      'general',
    focus_areas: focusAreas.length
      ? focusAreas
      : (prevInterview.focus_areas as string[] | undefined) ?? [],
  };

  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: userId,
      job_preferences: asJson(jobPreferences),
      news_preferences: asJson(newsPreferences),
      interview_preferences: asJson(interviewPreferences),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

// Upsert skills, resolving names to canonical skill_tags (user_skills.skill_id FK).
async function applySkills(userId: string, analysis: OnboardingAnalysis): Promise<void> {
  if (!analysis.skills.length) return;

  const uniqueNames = Array.from(
    new Set(
      analysis.skills
        .slice(0, 20)
        .map((s) => s.name.trim())
        .filter(Boolean),
    ),
  );
  if (!uniqueNames.length) return;

  const { data: existingTags, error: tagError } = await supabase
    .from('skill_tags')
    .select('id,name')
    .in('name', uniqueNames);
  if (tagError) throw tagError;

  const existingByLower = new Map((existingTags || []).map((t) => [t.name.toLowerCase(), t]));
  const missingNames = uniqueNames.filter((n) => !existingByLower.has(n.toLowerCase()));

  if (missingNames.length) {
    const categoryByName = new Map(
      analysis.skills
        .slice(0, 20)
        .map((s) => [s.name.trim().toLowerCase(), normalizeSkillCategory(s.category)]),
    );
    const rows = missingNames.map((name) => ({
      name,
      category: categoryByName.get(name.toLowerCase()) || 'domain',
    }));
    const { error: insertTagError } = await supabase
      .from('skill_tags')
      .upsert(rows, { onConflict: 'name' });
    if (insertTagError) throw insertTagError;
  }

  const { data: allTags, error: allTagsError } = await supabase
    .from('skill_tags')
    .select('id,name')
    .in('name', uniqueNames);
  if (allTagsError) throw allTagsError;

  const idByName = new Map((allTags || []).map((t) => [t.name.toLowerCase(), t.id]));
  const skillRows = analysis.skills
    .slice(0, 20)
    .map((s, index) => {
      const skillId = idByName.get(s.name.trim().toLowerCase());
      if (!skillId) return null;
      return {
        user_id: userId,
        skill_id: skillId,
        proficiency: normalizeProficiency(s.proficiency),
        category: normalizeSkillCategory(s.category),
        years_experience: s.years_experience,
        // The model orders skills by relevance — surface the top ones as
        // primary so job matching and resume autofill lead with them.
        is_primary: index < 3,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (skillRows.length) {
    const { error: skillError } = await supabase
      .from('user_skills')
      .upsert(skillRows, { onConflict: 'user_id,skill_id' });
    if (skillError) throw skillError;
  }
}

async function applyCertifications(userId: string, analysis: OnboardingAnalysis): Promise<void> {
  if (!analysis.certifications.length) return;

  // Re-running onboarding must not duplicate certifications.
  const { data: existing, error: existingError } = await supabase
    .from('user_certifications')
    .select('name')
    .eq('user_id', userId);
  if (existingError) throw existingError;
  const existingNames = new Set((existing || []).map((c) => c.name.trim().toLowerCase()));

  const certRows = analysis.certifications
    .filter((c) => c.name?.trim() && !existingNames.has(c.name.trim().toLowerCase()))
    .map((c) => ({
      user_id: userId,
      name: c.name.trim(),
      issuer: c.issuer,
      issue_date: normalizeDate(c.issue_date),
      expiry_date: normalizeDate(c.expiry_date),
    }));
  if (!certRows.length) return;
  const { error: certError } = await supabase.from('user_certifications').insert(certRows);
  if (certError) throw certError;
}

export async function skipOnboarding(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      onboarding_source: 'skipped',
      onboarding_completed_at: null,
    })
    .eq('id', userId);
  if (error) throw error;
}

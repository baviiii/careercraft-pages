import { supabase } from '@/integrations/supabase/client';
import type {
  OnboardAnalyzeResponse,
  OnboardingAnalysis,
  OnboardingMode,
  OnboardingSource,
} from '../types';

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
        body.error || 'Daily limit reached (4 runs / 24h)',
        0,
      );
    }
    throw new Error(body?.error || error.message || 'AI analysis failed');
  }

  if (!data?.ok || !data.analysis || !data.runId) {
    throw new Error(data?.error || 'AI analysis returned no result');
  }
  return {
    analysis: data.analysis,
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

export async function applyOnboarding({ userId, analysis, source }: ApplyInput): Promise<void> {
  const now = new Date().toISOString();

  // 1. Patch profile with persona, inferred fields, targets, cv_standards
  const profilePatch = {
    ...analysis.inferredProfile,
    ...analysis.targets,
    ai_persona: analysis.persona,
    cv_standards: analysis.cvStandards,
    onboarding_source: source,
    onboarding_completed_at: now,
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profilePatch)
    .eq('id', userId);
  if (profileError) throw profileError;

  // 2. Patch user_preferences.job_preferences
  const { error: prefError } = await supabase
    .from('user_preferences')
    .update({ job_preferences: analysis.jobPreferences })
    .eq('user_id', userId);
  if (prefError) throw prefError;

  // 3. Upsert skills.
  // Current schema stores `user_skills.skill_id` (FK -> skill_tags.id), so we
  // resolve inferred names to existing canonical tags before writing.
  if (analysis.skills.length) {
    const uniqueNames = Array.from(
      new Set(
        analysis.skills
          .slice(0, 20)
          .map((s) => s.name.trim())
          .filter(Boolean),
      ),
    );

    if (uniqueNames.length) {
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
            .map((s) => [s.name.trim().toLowerCase(), (s.category || 'domain').toLowerCase()]),
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
        .map((s) => {
          const skillId = idByName.get(s.name.trim().toLowerCase());
          if (!skillId) return null;
          return {
            user_id: userId,
            skill_id: skillId,
            proficiency: s.proficiency,
            category: s.category,
            years_experience: s.years_experience,
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
  }

  // 4. Insert certifications (no unique constraint, so we dedupe on name client-side)
  if (analysis.certifications.length) {
    const certRows = analysis.certifications.map((c) => ({
      user_id: userId,
      name: c.name,
      issuer: c.issuer,
      issue_date: c.issue_date,
      expiry_date: c.expiry_date,
    }));
    const { error: certError } = await supabase.from('user_certifications').insert(certRows);
    if (certError) throw certError;
  }
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

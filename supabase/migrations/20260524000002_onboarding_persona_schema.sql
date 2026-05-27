-- =====================================================
-- Phase 1a: Onboarding persona, CV standards, and audit table
--
-- Adds AI-derived context to `profiles`, replaces the unused
-- `onboarding_completed` boolean with a started/completed timestamp pair,
-- and introduces `onboarding_runs` so every Claude analysis is auditable
-- and rate-limitable (4 runs / user / 24h, enforced in edge function).
-- =====================================================

-- 1. Extend profiles with AI-derived context
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_persona JSONB,
  ADD COLUMN IF NOT EXISTS cv_standards JSONB,
  ADD COLUMN IF NOT EXISTS onboarding_source TEXT
    CHECK (onboarding_source IN ('resume', 'describe', 'hybrid', 'skipped')),
  ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 2. Drop the bare boolean: completion is now derived from the timestamp.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_completed;

-- 3. Audit table: one row per AI analysis attempt
CREATE TABLE IF NOT EXISTS public.onboarding_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('resume', 'describe', 'hybrid')),
  raw_text TEXT,
  resume_path TEXT,
  ai_analysis JSONB,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'streaming', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_onboarding_runs_user_created
  ON public.onboarding_runs(user_id, created_at DESC);

ALTER TABLE public.onboarding_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding runs" ON public.onboarding_runs;
CREATE POLICY "Users can view own onboarding runs" ON public.onboarding_runs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own onboarding runs" ON public.onboarding_runs;
CREATE POLICY "Users can insert own onboarding runs" ON public.onboarding_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE policy by design: only the edge function (service role)
-- mutates a run after insert, so users cannot tamper with their own audit trail.

-- 4. Rate-limit helper: how many runs has this user fired in the last 24h?
CREATE OR REPLACE FUNCTION public.onboarding_runs_in_last_24h(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.onboarding_runs
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.onboarding_runs_in_last_24h(UUID) TO authenticated;

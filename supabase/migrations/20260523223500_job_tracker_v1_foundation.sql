-- Job Tracker V1 foundation schema
-- Non-breaking additions to support discovery, scoring, automation, and telemetry.

-- 1) Shared jobs catalog (normalized ingested postings)
CREATE TABLE IF NOT EXISTS public.jobs_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_job_id TEXT,
  canonical_url TEXT,
  dedupe_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  currency TEXT,
  job_type TEXT,
  is_remote BOOLEAN DEFAULT false,
  description_snippet TEXT,
  full_description TEXT,
  posted_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_catalog_source ON public.jobs_catalog(source);
CREATE INDEX IF NOT EXISTS idx_jobs_catalog_company ON public.jobs_catalog(company);
CREATE INDEX IF NOT EXISTS idx_jobs_catalog_location ON public.jobs_catalog(location);
CREATE INDEX IF NOT EXISTS idx_jobs_catalog_posted_at ON public.jobs_catalog(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_catalog_last_seen ON public.jobs_catalog(last_seen_at DESC);

ALTER TABLE public.jobs_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read jobs catalog" ON public.jobs_catalog;
CREATE POLICY "Authenticated users can read jobs catalog"
ON public.jobs_catalog
FOR SELECT
TO authenticated
USING (true);

-- 2) Search/ingestion telemetry runs
CREATE TABLE IF NOT EXISTS public.job_search_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'adzuna',
  query TEXT,
  location TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_count INTEGER NOT NULL DEFAULT 0,
  deduped_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_search_runs_user_started ON public.job_search_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_search_runs_status ON public.job_search_runs(status);

ALTER TABLE public.job_search_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own job search runs" ON public.job_search_runs;
CREATE POLICY "Users can view their own job search runs"
ON public.job_search_runs
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own job search runs" ON public.job_search_runs;
CREATE POLICY "Users can create their own job search runs"
ON public.job_search_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3) Application events timeline (manual + automated)
CREATE TABLE IF NOT EXISTS public.application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual', -- manual, email, system
  event_type TEXT NOT NULL,              -- status_changed, reminder_set, interview, offer, rejection, note
  summary TEXT NOT NULL,
  confidence NUMERIC(5,2),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  auto_applied BOOLEAN NOT NULL DEFAULT false,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_events_application ON public.application_events(application_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_events_user ON public.application_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_events_type ON public.application_events(event_type);

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own application events" ON public.application_events;
CREATE POLICY "Users can view their own application events"
ON public.application_events
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own application events" ON public.application_events;
CREATE POLICY "Users can create their own application events"
ON public.application_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own application events" ON public.application_events;
CREATE POLICY "Users can update their own application events"
ON public.application_events
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own application events" ON public.application_events;
CREATE POLICY "Users can delete their own application events"
ON public.application_events
FOR DELETE
USING (auth.uid() = user_id);

-- 4) Persisted fit scoring snapshots
CREATE TABLE IF NOT EXISTS public.job_fit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.job_applications(id) ON DELETE CASCADE,
  jobs_catalog_id UUID REFERENCES public.jobs_catalog(id) ON DELETE SET NULL,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_bullet_rewrites JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  scoring_version TEXT NOT NULL DEFAULT 'v1',
  raw_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_fit_scores_user_created ON public.job_fit_scores(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_fit_scores_app_created ON public.job_fit_scores(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_fit_scores_job_created ON public.job_fit_scores(jobs_catalog_id, created_at DESC);

ALTER TABLE public.job_fit_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own fit scores" ON public.job_fit_scores;
CREATE POLICY "Users can view their own fit scores"
ON public.job_fit_scores
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own fit scores" ON public.job_fit_scores;
CREATE POLICY "Users can create their own fit scores"
ON public.job_fit_scores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own fit scores" ON public.job_fit_scores;
CREATE POLICY "Users can update their own fit scores"
ON public.job_fit_scores
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own fit scores" ON public.job_fit_scores;
CREATE POLICY "Users can delete their own fit scores"
ON public.job_fit_scores
FOR DELETE
USING (auth.uid() = user_id);

-- 5) Extend existing tracker links/derived fields
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS jobs_catalog_id UUID REFERENCES public.jobs_catalog(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS fit_score_latest INTEGER;

CREATE INDEX IF NOT EXISTS idx_job_applications_catalog ON public.job_applications(jobs_catalog_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status_applied ON public.job_applications(status, applied_date DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_company ON public.job_applications(company);
CREATE INDEX IF NOT EXISTS idx_job_applications_location ON public.job_applications(location);

-- Retire jobs_catalog: job search goes live instead of cached.
--
-- The catalog was a shared cache — each person's search warmed it for the
-- next. That only works with traffic. With none, it accumulated 125 rows from
-- three dev-testing pulls months apart (2026-05-23, 07-09, 07-28, all with an
-- empty query), and the list endpoint served them with no freshness filter, so
-- a May posting still appeared in September.
--
-- Filtering by age would have hidden 120 of the 125 rows, leaving a tracker
-- that was empty rather than wrong. The honest fix at this size is to stop
-- caching: search the board directly, and store only what a person saves.
--
-- Nothing a user chose is lost. job_applications already carries its own
-- job_title, company, job_url, job_description, location, salary_range and
-- job_type — the catalog link was never the source of that data.

-- ═══ 1. Allowances for the new resource ════════════════════════════════════
-- Live search spends an Adzuna call per term, so it needs a real limit rather
-- than the "no row means unlimited" default. Hourly is what protects the API
-- allowance; the monthly figure is deliberately loose because browsing for work
-- is the product and rationing it would be the wrong instinct.
INSERT INTO public.plan_limits
  (plan_key, resource, label, is_enabled, monthly_limit, hourly_limit)
VALUES
  ('free',    'job-search', 'Job search', TRUE, 600, 40),
  ('premium', 'job-search', 'Job search', TRUE,  -1, 120)
ON CONFLICT (plan_key, resource) DO NOTHING;

-- The retired function's flat counters. Harmless, but they describe a resource
-- that no longer exists.
DELETE FROM public.edge_anonymous_rate_limits WHERE resource = 'job-ingest-adzuna';


-- ═══ 1b. Search terms on the profile ═══════════════════════════════════════
-- Job boards match keywords, so a target title only finds the phrasing the
-- user happened to type: "ICU Nurse" misses "Critical Care Registered Nurse",
-- "React Developer" misses "Frontend Engineer". onboard-analyze now returns
-- three to five ways employers advertise this person's role, generated once
-- during an analysis already being paid for rather than on every search.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS search_terms TEXT[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.profiles.search_terms IS
  'Job-board phrasings of this person''s role, from onboard-analyze. Fed to job-search.';


-- ═══ 2. Drop the foreign keys before the table ═════════════════════════════
-- job_fit_scores only ever copied this through from job_applications; it never
-- read the catalog itself. job-fit-score/index.ts drops both references in the
-- same change.
DROP INDEX IF EXISTS idx_job_fit_scores_job_created;
ALTER TABLE public.job_fit_scores  DROP COLUMN IF EXISTS jobs_catalog_id;

DROP INDEX IF EXISTS idx_job_applications_catalog;
ALTER TABLE public.job_applications DROP COLUMN IF EXISTS jobs_catalog_id;

-- Replaces the dropped composite index, which led on the removed column.
CREATE INDEX IF NOT EXISTS idx_job_fit_scores_application_created
  ON public.job_fit_scores (application_id, created_at DESC);


-- ═══ 3. Drop the tables ════════════════════════════════════════════════════
-- job_search_runs logged bulk ingests. There are no bulk ingests now, and its
-- rows describe a pipeline that no longer exists.
DROP TABLE IF EXISTS public.jobs_catalog CASCADE;
DROP TABLE IF EXISTS public.job_search_runs CASCADE;

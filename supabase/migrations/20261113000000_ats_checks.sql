-- ATS checks are kept, so a result is never a one-off.
--
-- Until now a check lived only in the page's memory: leave /analysis or
-- refresh and the result was gone, and the only trace was resumes.ats_score
-- (and only for a saved résumé). Each check is now a row: the result as the
-- page shows it, plus the job ad and the résumé text it was run on, so it can
-- be reopened exactly — rewrites and the cover letter work from those too.
--
-- ats-analyze writes the row itself, as the person (their own RLS-scoped
-- client), right after a full analysis. That means a check is saved even if
-- they leave the page during the 15-30 s it takes.
--
-- Rows are never updated: a check is a record of what it said at the time.
-- Deleting the account removes them (user_id cascades from auth.users, and
-- delete_user_data sweeps every table with a user_id column).

CREATE TABLE IF NOT EXISTS public.ats_checks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The saved résumé that was checked, if it was one (an upload has none).
  resume_id       uuid REFERENCES public.resumes(id) ON DELETE SET NULL,
  -- Its name, or the uploaded file's, as it was at the time.
  resume_name     text CHECK (resume_name IS NULL OR char_length(resume_name) <= 200),
  -- A short line for the history list: the first line of the job ad.
  job_label       text CHECK (job_label IS NULL OR char_length(job_label) <= 160),
  job_description text NOT NULL CHECK (char_length(job_description) <= 20000),
  resume_text     text NOT NULL CHECK (char_length(resume_text) <= 40000),
  overall_score   smallint NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  analysis        jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ats_checks_user_recent
  ON public.ats_checks (user_id, created_at DESC);
-- For ON DELETE SET NULL when a résumé is deleted.
CREATE INDEX IF NOT EXISTS ats_checks_resume
  ON public.ats_checks (resume_id) WHERE resume_id IS NOT NULL;

ALTER TABLE public.ats_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ats_checks: read own" ON public.ats_checks;
CREATE POLICY "ats_checks: read own" ON public.ats_checks
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- A check can only point at the person's own résumé.
DROP POLICY IF EXISTS "ats_checks: add own" ON public.ats_checks;
CREATE POLICY "ats_checks: add own" ON public.ats_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      resume_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.resumes r
        WHERE r.id = resume_id AND r.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "ats_checks: remove own" ON public.ats_checks;
CREATE POLICY "ats_checks: remove own" ON public.ats_checks
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- No UPDATE policy, so no one can change a past check.
REVOKE UPDATE ON public.ats_checks FROM anon, authenticated;
REVOKE ALL ON public.ats_checks FROM anon;

COMMENT ON TABLE public.ats_checks IS
  'Every full ATS check, so results can be reopened from the history on /analysis. Written by ats-analyze as the user; read-only afterwards.';

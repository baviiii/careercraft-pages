-- Link ATS checks to tracked job applications.
--
-- Until now, ats_checks knew which résumé was checked (resume_id) and kept a
-- first-line job_label, but had no link to job_applications. Opening /analysis
-- from a tracked job couldn't attach the check back to that job, so the
-- tracker never showed whether a job had been checked or let you reopen it.

ALTER TABLE public.ats_checks
  ADD COLUMN IF NOT EXISTS application_id uuid
    REFERENCES public.job_applications(id) ON DELETE SET NULL;

-- Covers both ON DELETE SET NULL when a tracked job is removed and looking up
-- the latest check for each application on the tracker board.
CREATE INDEX IF NOT EXISTS ats_checks_application
  ON public.ats_checks (application_id, created_at DESC)
  WHERE application_id IS NOT NULL;

-- A check can only point at the person's own résumé and their own application.
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
    AND (
      application_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.job_applications a
        WHERE a.id = application_id AND a.user_id = (SELECT auth.uid())
      )
    )
  );

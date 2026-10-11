-- Add a "saved" stage to job applications.
--
-- The tracker only knew applied / interview / offer / rejected, so anything
-- you hadn't applied for yet still had to be filed as "applied". Saving a job
-- from Browse Jobs did exactly that (job-search's save action), and so will
-- the "Save to Faircopy" browser extension. Every saved-but-not-applied job
-- then counted against the reply rate as an application that never heard back.
--
-- The original constraint was declared inline in 20251127110308, so Postgres
-- named it job_applications_status_check. Re-running this is harmless.

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('saved', 'applied', 'interview', 'offer', 'rejected'));

-- Add resume and cover letter linking to job_applications
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cover_letter_id UUID REFERENCES public.cover_letters(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS job_description TEXT,
ADD COLUMN IF NOT EXISTS job_url TEXT,
ADD COLUMN IF NOT EXISTS salary_range TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS job_type TEXT; -- full-time, part-time, contract, remote

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_applications_resume ON public.job_applications(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_cover_letter ON public.job_applications(cover_letter_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);

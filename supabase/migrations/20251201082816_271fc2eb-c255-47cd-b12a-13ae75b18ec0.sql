-- Add categories, tags, and notes to resumes table
ALTER TABLE public.resumes
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS job_application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL;

-- Create index for faster tag searches
CREATE INDEX IF NOT EXISTS idx_resumes_tags ON public.resumes USING GIN(tags);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_resumes_category ON public.resumes(category);

-- Create index for job application assignment
CREATE INDEX IF NOT EXISTS idx_resumes_job_application ON public.resumes(job_application_id);
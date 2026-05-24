-- Lightweight telemetry for job tracker reliability monitoring
CREATE TABLE IF NOT EXISTS public.job_tracker_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metric_type TEXT NOT NULL, -- ingest, fit_score, email_classification
  status TEXT NOT NULL DEFAULT 'success',
  duration_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_tracker_telemetry_metric_created
ON public.job_tracker_telemetry(metric_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_tracker_telemetry_user_created
ON public.job_tracker_telemetry(user_id, created_at DESC);

ALTER TABLE public.job_tracker_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tracker telemetry" ON public.job_tracker_telemetry;
CREATE POLICY "Users can view their own tracker telemetry"
ON public.job_tracker_telemetry
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own tracker telemetry" ON public.job_tracker_telemetry;
CREATE POLICY "Users can create their own tracker telemetry"
ON public.job_tracker_telemetry
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Job tracker automation controls per user
CREATE TABLE IF NOT EXISTS public.job_automation_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  confidence_threshold NUMERIC(5,2) NOT NULL DEFAULT 72.00,
  auto_apply_non_destructive BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own automation settings" ON public.job_automation_settings;
CREATE POLICY "Users can view their own automation settings"
ON public.job_automation_settings
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own automation settings" ON public.job_automation_settings;
CREATE POLICY "Users can create their own automation settings"
ON public.job_automation_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own automation settings" ON public.job_automation_settings;
CREATE POLICY "Users can update their own automation settings"
ON public.job_automation_settings
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own automation settings" ON public.job_automation_settings;
CREATE POLICY "Users can delete their own automation settings"
ON public.job_automation_settings
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_job_automation_settings_updated_at
BEFORE UPDATE ON public.job_automation_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add location columns to user_sessions table
ALTER TABLE public.user_sessions
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Add location columns to login_attempts table (if missing)
ALTER TABLE public.login_attempts
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Update RLS policies to allow service role inserts
-- The edge function uses service role key, so it bypasses RLS, but let's ensure policies are correct

-- Allow system/service role to insert into user_sessions
DROP POLICY IF EXISTS "System can insert sessions" ON public.user_sessions;
CREATE POLICY "System can insert sessions"
ON public.user_sessions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow system/service role to update user_sessions
DROP POLICY IF EXISTS "System can update sessions" ON public.user_sessions;
CREATE POLICY "System can update sessions"
ON public.user_sessions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure activity_logs can be inserted by system
-- (This should already exist, but let's make sure)
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
CREATE POLICY "System can insert activity logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure login_attempts can be inserted by system
-- (This should already exist, but let's make sure)
DROP POLICY IF EXISTS "System can insert login attempts" ON public.login_attempts;
CREATE POLICY "System can insert login attempts"
ON public.login_attempts FOR INSERT
TO authenticated
WITH CHECK (true);


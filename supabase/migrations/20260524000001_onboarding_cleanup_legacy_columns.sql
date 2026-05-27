-- =====================================================
-- Phase 0: Drop legacy redundant columns from user_preferences
--
-- All eight columns below are shadowed by either JSONB structures
-- (notification_settings, job_preferences) or by columns on `profiles`
-- (career_level, preferred_locations, industry). No frontend or edge
-- function reads them — verified via repo-wide grep before authoring.
-- =====================================================

ALTER TABLE public.user_preferences
  DROP COLUMN IF EXISTS preferred_field,
  DROP COLUMN IF EXISTS preferred_industries,
  DROP COLUMN IF EXISTS preferred_countries,
  DROP COLUMN IF EXISTS seniority_level,
  DROP COLUMN IF EXISTS seniority_levels,
  DROP COLUMN IF EXISTS email_notifications,
  DROP COLUMN IF EXISTS push_notifications,
  DROP COLUMN IF EXISTS summary_frequency;

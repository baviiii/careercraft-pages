-- =====================================================
-- Phase 1b: Canonicalize user_skills around skill_tags
--
-- Why:
-- - Older migrations in this repo introduced two competing schemas:
--   1) user_skills.skill_id (FK -> skill_tags.id)
--   2) user_skills.skill_name (free text)
-- - Current app/edge code now standardizes on skill_id.
--
-- What this migration does:
-- - Ensures skill_tags exists
-- - Ensures user_skills.skill_id exists
-- - Backfills skill_id from skill_name where possible
-- - Enforces uniqueness on (user_id, skill_id)
-- - Drops legacy skill_name once migrated
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure canonical dictionary table exists.
CREATE TABLE IF NOT EXISTS public.skill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'domain',
  description TEXT,
  difficulty_weight DECIMAL(3,2) DEFAULT 1.0,
  career_paths UUID[] DEFAULT '{}'::uuid[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_skills'
  ) THEN
    -- Canonical reference column.
    ALTER TABLE public.user_skills
      ADD COLUMN IF NOT EXISTS skill_id UUID;

    -- If legacy skill_name exists, make sure names exist in skill_tags.
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_skills'
        AND column_name = 'skill_name'
    ) THEN
      INSERT INTO public.skill_tags (name, category)
      SELECT DISTINCT us.skill_name, COALESCE(NULLIF(us.category, ''), 'domain')
      FROM public.user_skills us
      WHERE us.skill_name IS NOT NULL
        AND us.skill_name <> ''
      ON CONFLICT (name) DO NOTHING;

      UPDATE public.user_skills us
      SET skill_id = st.id
      FROM public.skill_tags st
      WHERE us.skill_id IS NULL
        AND us.skill_name IS NOT NULL
        AND lower(us.skill_name) = lower(st.name);
    END IF;

    -- Ensure FK exists.
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'user_skills_skill_id_fkey'
        AND conrelid = 'public.user_skills'::regclass
    ) THEN
      ALTER TABLE public.user_skills
        ADD CONSTRAINT user_skills_skill_id_fkey
        FOREIGN KEY (skill_id)
        REFERENCES public.skill_tags(id)
        ON DELETE CASCADE;
    END IF;

    -- Remove legacy unique constraints on skill_name if present.
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'user_skills_user_id_skill_name_key'
        AND conrelid = 'public.user_skills'::regclass
    ) THEN
      ALTER TABLE public.user_skills
        DROP CONSTRAINT user_skills_user_id_skill_name_key;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'user_skills_skill_name_key'
        AND conrelid = 'public.user_skills'::regclass
    ) THEN
      ALTER TABLE public.user_skills
        DROP CONSTRAINT user_skills_skill_name_key;
    END IF;

    -- Canonical uniqueness by dictionary id.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_skills_user_skill_id_unique
      ON public.user_skills(user_id, skill_id)
      WHERE skill_id IS NOT NULL;

    -- Remove free-text drift column after backfill.
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_skills'
        AND column_name = 'skill_name'
    ) THEN
      ALTER TABLE public.user_skills
        DROP COLUMN skill_name;
    END IF;
  END IF;
END $$;

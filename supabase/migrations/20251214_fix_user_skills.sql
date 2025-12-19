-- =====================================================
-- Fix Migration: Ensure all user profile tables exist with correct schema
-- Run this BEFORE the main migration if you encounter errors
-- =====================================================

-- Drop and recreate user_skills table if it exists with wrong schema
DO $$
BEGIN
  -- Check if user_skills exists but is missing columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_skills' AND table_schema = 'public') THEN
    -- Check if category column is missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_skills' AND column_name = 'category' AND table_schema = 'public') THEN
      -- Add missing columns
      ALTER TABLE public.user_skills ADD COLUMN IF NOT EXISTS category TEXT;
      ALTER TABLE public.user_skills ADD COLUMN IF NOT EXISTS proficiency TEXT;
      ALTER TABLE public.user_skills ADD COLUMN IF NOT EXISTS years_experience INTEGER;
      ALTER TABLE public.user_skills ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.user_skills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  ELSE
    -- Create the table from scratch
    CREATE TABLE public.user_skills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      skill_name TEXT NOT NULL,
      proficiency TEXT,
      category TEXT,
      years_experience INTEGER,
      is_primary BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, skill_name)
    );
    
    -- Enable RLS
    ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view own skills" ON public.user_skills 
      FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own skills" ON public.user_skills 
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own skills" ON public.user_skills 
      FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own skills" ON public.user_skills 
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create user_certifications table if not exists
CREATE TABLE IF NOT EXISTS public.user_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  issuer TEXT,
  issue_date DATE,
  expiry_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_certifications if not already
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user_certifications (drop first to avoid duplicates)
DROP POLICY IF EXISTS "Users can view own certifications" ON public.user_certifications;
CREATE POLICY "Users can view own certifications" ON public.user_certifications 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own certifications" ON public.user_certifications;
CREATE POLICY "Users can insert own certifications" ON public.user_certifications 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own certifications" ON public.user_certifications;
CREATE POLICY "Users can update own certifications" ON public.user_certifications 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own certifications" ON public.user_certifications;
CREATE POLICY "Users can delete own certifications" ON public.user_certifications 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes safely
DO $$
BEGIN
  -- user_skills indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_skills' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills(user_id);
  END IF;
  
  -- user_certifications indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_certifications' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_user_certifications_user_id ON public.user_certifications(user_id);
  END IF;
END $$;

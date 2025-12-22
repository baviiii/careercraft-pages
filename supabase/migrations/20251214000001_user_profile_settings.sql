-- =====================================================
-- User Profile & Settings System Migration
-- Extends existing profiles table and user_preferences
-- =====================================================

-- Extend the profiles table with career information
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS current_job_title TEXT,
ADD COLUMN IF NOT EXISTS current_company TEXT,
ADD COLUMN IF NOT EXISTS years_of_experience TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS career_level TEXT,
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'employed',
ADD COLUMN IF NOT EXISTS target_job_titles TEXT[],
ADD COLUMN IF NOT EXISTS target_companies TEXT[],
ADD COLUMN IF NOT EXISTS desired_salary_min INTEGER,
ADD COLUMN IF NOT EXISTS desired_salary_max INTEGER,
ADD COLUMN IF NOT EXISTS desired_salary_currency TEXT DEFAULT 'AUD',
ADD COLUMN IF NOT EXISTS work_arrangement TEXT[],
ADD COLUMN IF NOT EXISTS preferred_locations TEXT[],
ADD COLUMN IF NOT EXISTS job_change_timeline TEXT,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  proficiency TEXT CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  category TEXT CHECK (category IN ('technical', 'behavioral', 'leadership', 'domain', 'language')),
  years_experience INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);

-- Create user_certifications table
CREATE TABLE IF NOT EXISTS user_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  issuer TEXT,
  issue_date DATE,
  expiry_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend user_preferences with comprehensive settings
-- First check if columns exist and add them
DO $$ 
BEGIN
  -- Job preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'job_preferences') THEN
    ALTER TABLE user_preferences ADD COLUMN job_preferences JSONB DEFAULT '{
      "industries": [],
      "excluded_companies": [],
      "min_salary": null,
      "job_types": ["full-time"],
      "company_sizes": [],
      "benefits_priorities": [],
      "remote_preference": "any"
    }'::jsonb;
  END IF;

  -- Interview preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'interview_preferences') THEN
    ALTER TABLE user_preferences ADD COLUMN interview_preferences JSONB DEFAULT '{
      "default_field": "general",
      "default_difficulty": "medium",
      "focus_areas": [],
      "session_duration": 30,
      "feedback_verbosity": "detailed",
      "question_types": ["behavioral", "technical"]
    }'::jsonb;
  END IF;

  -- News preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'news_preferences') THEN
    ALTER TABLE user_preferences ADD COLUMN news_preferences JSONB DEFAULT '{
      "followed_industries": [],
      "followed_companies": [],
      "content_types": ["trends", "insights", "salary"],
      "digest_frequency": "weekly"
    }'::jsonb;
  END IF;

  -- Notification settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'notification_settings') THEN
    ALTER TABLE user_preferences ADD COLUMN notification_settings JSONB DEFAULT '{
      "email_job_matches": true,
      "email_interview_reminders": true,
      "email_weekly_digest": true,
      "email_news_alerts": false,
      "email_application_updates": true,
      "push_enabled": false,
      "quiet_hours_start": null,
      "quiet_hours_end": null,
      "marketing_emails": false
    }'::jsonb;
  END IF;

  -- Display settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'display_settings') THEN
    ALTER TABLE user_preferences ADD COLUMN display_settings JSONB DEFAULT '{
      "theme": "system",
      "language": "en",
      "date_format": "DD/MM/YYYY",
      "reduced_motion": false,
      "high_contrast": false,
      "compact_mode": false
    }'::jsonb;
  END IF;

  -- Privacy settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'privacy_settings') THEN
    ALTER TABLE user_preferences ADD COLUMN privacy_settings JSONB DEFAULT '{
      "profile_visibility": "private",
      "allow_recruiter_contact": false,
      "share_anonymous_data": true,
      "show_activity_status": false
    }'::jsonb;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_certifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_skills
DROP POLICY IF EXISTS "Users can view own skills" ON user_skills;
CREATE POLICY "Users can view own skills" ON user_skills 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own skills" ON user_skills;
CREATE POLICY "Users can insert own skills" ON user_skills 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own skills" ON user_skills;
CREATE POLICY "Users can update own skills" ON user_skills 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own skills" ON user_skills;
CREATE POLICY "Users can delete own skills" ON user_skills 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_certifications
DROP POLICY IF EXISTS "Users can view own certifications" ON user_certifications;
CREATE POLICY "Users can view own certifications" ON user_certifications 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own certifications" ON user_certifications;
CREATE POLICY "Users can insert own certifications" ON user_certifications 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own certifications" ON user_certifications;
CREATE POLICY "Users can update own certifications" ON user_certifications 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own certifications" ON user_certifications;
CREATE POLICY "Users can delete own certifications" ON user_certifications 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance (wrapped in DO block to handle errors gracefully)
DO $$
BEGIN
  -- user_skills indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_skills') THEN
    CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_skills' AND column_name = 'category') THEN
      CREATE INDEX IF NOT EXISTS idx_user_skills_category ON user_skills(category);
    END IF;
  END IF;
  
  -- user_certifications indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_certifications') THEN
    CREATE INDEX IF NOT EXISTS idx_user_certifications_user_id ON user_certifications(user_id);
  END IF;
  
  -- profiles indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'industry') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_industry ON profiles(industry);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'career_level') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_career_level ON profiles(career_level);
  END IF;
END $$;

-- Function to calculate profile completeness
CREATE OR REPLACE FUNCTION calculate_profile_completeness(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completeness INTEGER := 0;
  profile_record RECORD;
  skills_count INTEGER;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = p_user_id;
  
  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Basic info (30%)
  IF profile_record.full_name IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF profile_record.avatar_url IS NOT NULL THEN completeness := completeness + 5; END IF;
  IF profile_record.headline IS NOT NULL THEN completeness := completeness + 5; END IF;
  IF profile_record.bio IS NOT NULL THEN completeness := completeness + 5; END IF;
  IF profile_record.location_city IS NOT NULL THEN completeness := completeness + 5; END IF;
  
  -- Career info (40%)
  IF profile_record.current_job_title IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF profile_record.current_company IS NOT NULL THEN completeness := completeness + 5; END IF;
  IF profile_record.years_of_experience IS NOT NULL THEN completeness := completeness + 5; END IF;
  IF profile_record.industry IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF profile_record.career_level IS NOT NULL THEN completeness := completeness + 10; END IF;
  
  -- Skills (20%)
  SELECT COUNT(*) INTO skills_count FROM user_skills WHERE user_id = p_user_id;
  IF skills_count >= 5 THEN 
    completeness := completeness + 20;
  ELSIF skills_count >= 3 THEN
    completeness := completeness + 15;
  ELSIF skills_count >= 1 THEN
    completeness := completeness + 10;
  END IF;
  
  -- Career goals (10%)
  IF profile_record.target_job_titles IS NOT NULL AND array_length(profile_record.target_job_titles, 1) > 0 THEN 
    completeness := completeness + 10; 
  END IF;
  
  RETURN LEAST(completeness, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with preferences
CREATE OR REPLACE FUNCTION get_user_profile_complete(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  profile_data JSONB;
  preferences_data JSONB;
  skills_data JSONB;
  certs_data JSONB;
  completeness INTEGER;
BEGIN
  -- Get profile
  SELECT to_jsonb(p.*) INTO profile_data 
  FROM profiles p WHERE p.id = p_user_id;
  
  -- Get preferences
  SELECT to_jsonb(up.*) INTO preferences_data 
  FROM user_preferences up WHERE up.user_id = p_user_id;
  
  -- Get skills
  SELECT COALESCE(jsonb_agg(to_jsonb(s.*)), '[]'::jsonb) INTO skills_data 
  FROM user_skills s WHERE s.user_id = p_user_id;
  
  -- Get certifications
  SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb) INTO certs_data 
  FROM user_certifications c WHERE c.user_id = p_user_id;
  
  -- Calculate completeness
  completeness := calculate_profile_completeness(p_user_id);
  
  result := jsonb_build_object(
    'profile', COALESCE(profile_data, '{}'::jsonb),
    'preferences', COALESCE(preferences_data, '{}'::jsonb),
    'skills', skills_data,
    'certifications', certs_data,
    'completeness', completeness
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at on profiles
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- Trigger to update updated_at on user_skills
DROP TRIGGER IF EXISTS user_skills_updated_at ON user_skills;
CREATE TRIGGER user_skills_updated_at
  BEFORE UPDATE ON user_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- Trigger to update updated_at on user_certifications
DROP TRIGGER IF EXISTS user_certifications_updated_at ON user_certifications;
CREATE TRIGGER user_certifications_updated_at
  BEFORE UPDATE ON user_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- Ensure user_preferences row exists when profile is created
CREATE OR REPLACE FUNCTION ensure_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_user_preferences_trigger ON profiles;
CREATE TRIGGER ensure_user_preferences_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_preferences();

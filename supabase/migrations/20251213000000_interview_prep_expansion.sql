-- ============================================================================
-- AI-POWERED INTERVIEW PREP & GROWTH SYSTEM - DATABASE EXPANSION
-- ============================================================================
-- This migration expands the interview prep system with:
-- - Career paths & role-specific tracks
-- - Granular question & answer tracking
-- - Skill tags & competency mapping
-- - Score history for time-series analysis
-- - Learning resources & recommendations
-- - Behavioral pattern detection
-- - Streak & milestone tracking
-- ============================================================================

-- ============================================================================
-- 1. CAREER PATHS & ROLES
-- ============================================================================

-- Career paths define broad career categories
CREATE TABLE IF NOT EXISTS public.career_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- lucide icon name
  color TEXT, -- theme color
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Specific roles within career paths
CREATE TABLE IF NOT EXISTS public.interview_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_path_id UUID REFERENCES public.career_paths(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  seniority_levels TEXT[] DEFAULT '{Junior,Mid-Level,Senior,Lead,Manager}'::text[],
  common_titles TEXT[] DEFAULT '{}'::text[], -- e.g., "Software Engineer", "SDE", "Developer"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(career_path_id, name)
);

-- ============================================================================
-- 2. SKILL TAGS & COMPETENCIES
-- ============================================================================

-- Master list of skills/competencies
CREATE TABLE IF NOT EXISTS public.skill_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'technical', 'behavioral', 'soft_skill', 'domain'
  description TEXT,
  difficulty_weight DECIMAL(3,2) DEFAULT 1.0, -- for scoring adjustments
  career_paths UUID[] DEFAULT '{}'::uuid[], -- which career paths this skill applies to
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User's skill proficiency tracking
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_id UUID REFERENCES public.skill_tags(id) ON DELETE CASCADE,
  proficiency_level INTEGER DEFAULT 0 CHECK (proficiency_level >= 0 AND proficiency_level <= 100),
  times_tested INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  trend TEXT DEFAULT 'stable', -- 'improving', 'stable', 'declining'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- ============================================================================
-- 3. QUESTION BANK (Reusable Questions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interview_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'technical', 'behavioral', 'system_design', 'scenario', 'coding'
  difficulty TEXT NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard', 'expert'
  career_path_id UUID REFERENCES public.career_paths(id),
  role_id UUID REFERENCES public.interview_roles(id),
  skill_tags UUID[] DEFAULT '{}'::uuid[], -- references skill_tags
  expected_topics TEXT[] DEFAULT '{}'::text[],
  ideal_answer_points TEXT[] DEFAULT '{}'::text[],
  time_limit_seconds INTEGER, -- suggested time to answer
  is_ai_generated BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  avg_score DECIMAL(4,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. ENHANCED INTERVIEW SESSIONS
-- ============================================================================

-- Add columns to existing interview_sessions table
ALTER TABLE public.interview_sessions 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.interview_roles(id),
ADD COLUMN IF NOT EXISTS career_path_id UUID REFERENCES public.career_paths(id),
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_score DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS skill_breakdown JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 5. INDIVIDUAL ANSWER TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interview_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question_id UUID REFERENCES public.interview_questions(id),
  question_text TEXT NOT NULL, -- store for AI-generated questions
  question_type TEXT,
  answer_text TEXT NOT NULL,
  
  -- Scoring breakdown
  overall_score DECIMAL(4,2),
  relevance_score DECIMAL(4,2),
  clarity_score DECIMAL(4,2),
  depth_score DECIMAL(4,2),
  structure_score DECIMAL(4,2),
  confidence_score DECIMAL(4,2),
  
  -- AI evaluation details
  correct_points TEXT[] DEFAULT '{}'::text[],
  missing_points TEXT[] DEFAULT '{}'::text[],
  red_flags TEXT[] DEFAULT '{}'::text[],
  improvement_tips TEXT[] DEFAULT '{}'::text[],
  best_answer TEXT,
  
  -- Skill mapping
  skill_tags_tested UUID[] DEFAULT '{}'::uuid[],
  
  -- Timing
  time_taken_seconds INTEGER,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. SCORE HISTORY (Time-Series Analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
  
  -- Score dimensions
  overall_score DECIMAL(4,2) NOT NULL,
  technical_score DECIMAL(4,2),
  behavioral_score DECIMAL(4,2),
  communication_score DECIMAL(4,2),
  problem_solving_score DECIMAL(4,2),
  
  -- Context
  career_path_id UUID REFERENCES public.career_paths(id),
  role_id UUID REFERENCES public.interview_roles(id),
  seniority TEXT,
  
  -- Metadata
  question_count INTEGER,
  session_duration_seconds INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for time-series queries
CREATE INDEX IF NOT EXISTS idx_score_history_user_time 
ON public.score_history(user_id, recorded_at DESC);

-- ============================================================================
-- 7. LEARNING RESOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.learning_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL, -- 'article', 'video', 'course', 'practice', 'book', 'tool'
  url TEXT,
  provider TEXT, -- 'YouTube', 'Udemy', 'LeetCode', 'internal', etc.
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  difficulty TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  
  -- Targeting
  skill_tags UUID[] DEFAULT '{}'::uuid[],
  career_paths UUID[] DEFAULT '{}'::uuid[],
  
  -- Quality metrics
  rating DECIMAL(3,2),
  times_recommended INTEGER DEFAULT 0,
  times_completed INTEGER DEFAULT 0,
  
  is_free BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User's saved/completed resources
CREATE TABLE IF NOT EXISTS public.user_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_id UUID REFERENCES public.learning_resources(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'saved', -- 'saved', 'in_progress', 'completed'
  progress_percent INTEGER DEFAULT 0,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_id)
);

-- ============================================================================
-- 8. AI RECOMMENDATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL, -- 'skill_focus', 'resource', 'practice_area', 'milestone'
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important
  
  -- Targeting
  skill_id UUID REFERENCES public.skill_tags(id),
  resource_id UUID REFERENCES public.learning_resources(id),
  career_path_id UUID REFERENCES public.career_paths(id),
  
  -- AI reasoning
  ai_reasoning TEXT,
  confidence_score DECIMAL(3,2),
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'dismissed', 'completed', 'expired'
  dismissed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. BEHAVIORAL PATTERNS (Derived Analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Practice patterns
  avg_session_duration_seconds INTEGER,
  preferred_practice_time TEXT, -- 'morning', 'afternoon', 'evening', 'night'
  sessions_per_week DECIMAL(4,2),
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_practice_date DATE,
  
  -- Performance patterns
  strongest_question_type TEXT,
  weakest_question_type TEXT,
  strongest_skills UUID[] DEFAULT '{}'::uuid[],
  weakest_skills UUID[] DEFAULT '{}'::uuid[],
  
  -- Improvement trends
  overall_trend TEXT DEFAULT 'stable', -- 'improving', 'stable', 'declining'
  improvement_rate_weekly DECIMAL(5,2), -- percentage change per week
  
  -- Communication patterns
  avg_answer_length INTEGER,
  uses_star_method_percent DECIMAL(5,2),
  clarity_trend TEXT DEFAULT 'stable',
  
  -- Engagement
  total_sessions INTEGER DEFAULT 0,
  total_questions_answered INTEGER DEFAULT 0,
  total_practice_time_seconds INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. MILESTONES & ACHIEVEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL, -- 'streak', 'score', 'practice', 'skill', 'special'
  requirement_type TEXT NOT NULL, -- 'count', 'score', 'streak', 'skill_level'
  requirement_value INTEGER NOT NULL,
  points INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone_id)
);

-- ============================================================================
-- 11. WEEKLY INSIGHTS (AI-Generated Summaries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  -- Summary stats
  sessions_completed INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  practice_time_seconds INTEGER DEFAULT 0,
  avg_score DECIMAL(4,2),
  score_change DECIMAL(5,2), -- vs previous week
  
  -- AI-generated insights
  summary TEXT,
  top_improvement TEXT,
  focus_area TEXT,
  encouragement TEXT,
  next_week_goals TEXT[] DEFAULT '{}'::text[],
  
  -- Skill changes
  skills_improved UUID[] DEFAULT '{}'::uuid[],
  skills_declined UUID[] DEFAULT '{}'::uuid[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- ============================================================================
-- 12. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.career_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_insights ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 13. RLS POLICIES
-- ============================================================================

-- Public read for reference tables
CREATE POLICY "Anyone can view career paths" ON public.career_paths FOR SELECT USING (true);
CREATE POLICY "Anyone can view interview roles" ON public.interview_roles FOR SELECT USING (true);
CREATE POLICY "Anyone can view skill tags" ON public.skill_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can view interview questions" ON public.interview_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can view learning resources" ON public.learning_resources FOR SELECT USING (true);
CREATE POLICY "Anyone can view milestones" ON public.milestones FOR SELECT USING (true);

-- User-specific data
CREATE POLICY "Users can view own skills" ON public.user_skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own skills" ON public.user_skills FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own answers" ON public.interview_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own answers" ON public.interview_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own score history" ON public.score_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own score history" ON public.score_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own resources" ON public.user_resources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own resources" ON public.user_resources FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendations" ON public.ai_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own recommendations" ON public.ai_recommendations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own patterns" ON public.user_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own patterns" ON public.user_patterns FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own milestones" ON public.user_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own milestones" ON public.user_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own insights" ON public.weekly_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own insights" ON public.weekly_insights FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 14. SEED DATA - CAREER PATHS
-- ============================================================================

INSERT INTO public.career_paths (name, description, icon, color, sort_order) VALUES
('Software Engineering', 'Full-stack, backend, frontend, mobile development', 'Code', 'blue', 1),
('DevOps & SRE', 'Infrastructure, CI/CD, reliability engineering', 'Server', 'orange', 2),
('Cloud & Infrastructure', 'AWS, Azure, GCP, cloud architecture', 'Cloud', 'cyan', 3),
('Data Science & ML', 'Machine learning, analytics, data engineering', 'Brain', 'purple', 4),
('Product Management', 'Product strategy, roadmaps, stakeholder management', 'Target', 'green', 5),
('UX/UI Design', 'User experience, interface design, research', 'Palette', 'pink', 6),
('Cybersecurity', 'Security engineering, penetration testing, compliance', 'Shield', 'red', 7),
('Sales & Business Dev', 'Enterprise sales, partnerships, account management', 'TrendingUp', 'emerald', 8),
('Marketing', 'Digital marketing, growth, content strategy', 'Megaphone', 'amber', 9),
('Finance & Accounting', 'Financial analysis, accounting, FP&A', 'DollarSign', 'slate', 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 15. SEED DATA - SKILL TAGS
-- ============================================================================

INSERT INTO public.skill_tags (name, category, description) VALUES
-- Technical Skills
('Data Structures', 'technical', 'Arrays, trees, graphs, hash tables'),
('Algorithms', 'technical', 'Sorting, searching, dynamic programming'),
('System Design', 'technical', 'Scalability, distributed systems, architecture'),
('API Design', 'technical', 'REST, GraphQL, API best practices'),
('Database Design', 'technical', 'SQL, NoSQL, data modeling'),
('Cloud Services', 'technical', 'AWS, Azure, GCP services'),
('CI/CD', 'technical', 'Continuous integration and deployment'),
('Containerization', 'technical', 'Docker, Kubernetes, orchestration'),
('Networking', 'technical', 'TCP/IP, DNS, load balancing'),
('Security', 'technical', 'Authentication, encryption, OWASP'),

-- Behavioral Skills
('STAR Method', 'behavioral', 'Situation, Task, Action, Result framework'),
('Leadership', 'behavioral', 'Team leadership and influence'),
('Conflict Resolution', 'behavioral', 'Handling disagreements professionally'),
('Problem Solving', 'behavioral', 'Analytical thinking and solutions'),
('Teamwork', 'behavioral', 'Collaboration and team dynamics'),
('Communication', 'behavioral', 'Clear and effective communication'),
('Time Management', 'behavioral', 'Prioritization and deadline management'),
('Adaptability', 'behavioral', 'Flexibility and learning agility'),

-- Soft Skills
('Presentation', 'soft_skill', 'Public speaking and presenting ideas'),
('Negotiation', 'soft_skill', 'Negotiating outcomes and agreements'),
('Stakeholder Management', 'soft_skill', 'Managing expectations and relationships'),
('Critical Thinking', 'soft_skill', 'Analytical and logical reasoning'),
('Emotional Intelligence', 'soft_skill', 'Self-awareness and empathy')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 16. SEED DATA - MILESTONES
-- ============================================================================

INSERT INTO public.milestones (name, description, icon, category, requirement_type, requirement_value, points) VALUES
-- Streak milestones
('First Steps', 'Complete your first practice session', 'Play', 'practice', 'count', 1, 10),
('Getting Warmed Up', 'Complete 5 practice sessions', 'Flame', 'practice', 'count', 5, 25),
('Dedicated Learner', 'Complete 25 practice sessions', 'Award', 'practice', 'count', 25, 100),
('Interview Master', 'Complete 100 practice sessions', 'Trophy', 'practice', 'count', 100, 500),

-- Streak milestones
('3-Day Streak', 'Practice 3 days in a row', 'Zap', 'streak', 'streak', 3, 30),
('Week Warrior', 'Practice 7 days in a row', 'Calendar', 'streak', 'streak', 7, 75),
('Monthly Champion', 'Practice 30 days in a row', 'Crown', 'streak', 'streak', 30, 300),

-- Score milestones
('Rising Star', 'Achieve an average score of 70%', 'Star', 'score', 'score', 70, 50),
('High Performer', 'Achieve an average score of 85%', 'Sparkles', 'score', 'score', 85, 150),
('Excellence', 'Achieve an average score of 95%', 'Medal', 'score', 'score', 95, 300),

-- Question milestones
('Question Explorer', 'Answer 50 questions', 'HelpCircle', 'practice', 'count', 50, 50),
('Question Master', 'Answer 200 questions', 'MessageSquare', 'practice', 'count', 200, 200)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 17. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_answers_session ON public.interview_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_answers_user ON public.interview_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user ON public.ai_recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_patterns_user ON public.user_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_insights_user ON public.weekly_insights(user_id, week_start DESC);

-- ============================================================================
-- 18. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_skills_updated_at
BEFORE UPDATE ON public.user_skills
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_patterns_updated_at
BEFORE UPDATE ON public.user_patterns
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

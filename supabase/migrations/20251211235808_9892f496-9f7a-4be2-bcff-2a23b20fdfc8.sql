-- Create interview_sessions table for storing interview prep data
CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  field TEXT NOT NULL,
  seniority TEXT,
  job_description TEXT,
  questions JSONB DEFAULT '[]'::jsonb,
  answers JSONB DEFAULT '[]'::jsonb,
  scores JSONB DEFAULT '[]'::jsonb,
  final_evaluation JSONB,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_preferences table for job prep and news settings
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Job Prep Preferences
  preferred_field TEXT,
  seniority_level TEXT,
  job_role_type TEXT,
  interview_types TEXT[] DEFAULT '{}'::text[],
  -- News Preferences
  preferred_industries TEXT[] DEFAULT '{}'::text[],
  preferred_countries TEXT[] DEFAULT '{}'::text[],
  alert_types TEXT[] DEFAULT '{}'::text[],
  summary_frequency TEXT DEFAULT 'daily',
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved_news table for bookmarking job market news
CREATE TABLE public.saved_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  source TEXT,
  category TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_news ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interview_sessions
CREATE POLICY "Users can view their own interview sessions" 
ON public.interview_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interview sessions" 
ON public.interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview sessions" 
ON public.interview_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interview sessions" 
ON public.interview_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" 
ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for saved_news
CREATE POLICY "Users can view their own saved news" 
ON public.saved_news FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved news" 
ON public.saved_news FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved news" 
ON public.saved_news FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_interview_sessions_updated_at
BEFORE UPDATE ON public.interview_sessions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
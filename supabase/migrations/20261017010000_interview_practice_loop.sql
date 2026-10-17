-- Interview Prep: what the practice loop needs to remember.
--
-- 1. interview_answers.evaluation / attempt
--    The coach now shows how each score was made (weighted dimensions, any
--    cap, where each STAR part sits in the answer, "I" vs "we"). Only the
--    overall score was stored, so none of that could be shown again in
--    history or counted over time ("Result missing in 4 of your last 5
--    stories"). attempt numbers a retry of the same question.
--
-- 2. interview_sessions.framework / job_application_id
--    Which public-sector capability framework a session practised against
--    (APS ILS or the NSW capability framework), and which tracker job it was
--    practice for, so the tracker can show "2 practice sessions" on that job.
--
-- 3. interview_stories
--    The learner's story library: their best answer per competency, kept
--    across sessions. Behavioural rounds aim at the competencies with no or
--    weak story; the selection-criteria drafter writes only from these.
--
-- 4. job_applications.interview_date
--    When the interview is booked. Interview Prep counts down to it and sizes
--    the practice plan to the days left. reminder_date is the "follow up on"
--    reminder, not the interview, so it can't stand in for this.
--
-- All columns are nullable or defaulted, and the interview-coach-mcp server
-- writes them in separate best-effort updates, so deploying the server or
-- the site before this migration loses the extra detail, never a session.
-- (The tracker saves a job without interview_date if the column isn't there.)
-- Deploy order: this migration first, then interview-coach-mcp (its CI checks
-- these columns exist), then the site.
--
-- delete_user_data() already removes every public table with a user_id
-- column, so interview_stories is covered without editing it.

-- 1 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.interview_answers
  ADD COLUMN IF NOT EXISTS evaluation jsonb,
  ADD COLUMN IF NOT EXISTS attempt integer NOT NULL DEFAULT 1;

ALTER TABLE public.interview_answers
  DROP CONSTRAINT IF EXISTS interview_answers_attempt_check;
ALTER TABLE public.interview_answers
  ADD CONSTRAINT interview_answers_attempt_check CHECK (attempt >= 1);

-- Progress reads "this user's recent answers, newest first".
CREATE INDEX IF NOT EXISTS interview_answers_user_answered_idx
  ON public.interview_answers (user_id, answered_at DESC);

-- 2 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS framework text,
  ADD COLUMN IF NOT EXISTS job_application_id uuid
    REFERENCES public.job_applications(id) ON DELETE SET NULL;

ALTER TABLE public.interview_sessions
  DROP CONSTRAINT IF EXISTS interview_sessions_framework_check;
ALTER TABLE public.interview_sessions
  ADD CONSTRAINT interview_sessions_framework_check
  CHECK (framework IS NULL OR framework IN ('aps', 'nsw'));

CREATE INDEX IF NOT EXISTS interview_sessions_job_application_idx
  ON public.interview_sessions (job_application_id)
  WHERE job_application_id IS NOT NULL;

-- 3 ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_stories (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- A key from interview-coach-mcp's domain/competencies.ts:
  -- "ownership", "aps:results", "nsw:deliver", …
  competency        text NOT NULL CHECK (char_length(competency) BETWEEN 1 AND 60),
  title             text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  best_answer       text NOT NULL,
  best_score        numeric(4,2) CHECK (best_score IS NULL OR (best_score >= 0 AND best_score <= 10)),
  -- The STAR(R) coverage of the best answer, as the evaluator gave it.
  star              jsonb,
  source_session_id uuid REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
  times_practised   integer NOT NULL DEFAULT 1 CHECK (times_practised >= 0),
  last_practised_at timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- One best story per competency.
  UNIQUE (user_id, competency)
);

ALTER TABLE public.interview_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own stories" ON public.interview_stories;
CREATE POLICY "Users read their own stories"
  ON public.interview_stories FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users add their own stories" ON public.interview_stories;
CREATE POLICY "Users add their own stories"
  ON public.interview_stories FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their own stories" ON public.interview_stories;
CREATE POLICY "Users update their own stories"
  ON public.interview_stories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their own stories" ON public.interview_stories;
CREATE POLICY "Users delete their own stories"
  ON public.interview_stories FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_interview_stories_updated_at ON public.interview_stories;
CREATE TRIGGER update_interview_stories_updated_at
  BEFORE UPDATE ON public.interview_stories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS interview_date date;

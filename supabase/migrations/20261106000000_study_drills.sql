-- Study drills the learner keeps: ones put aside to finish later, and every
-- one they finish, with what they wrote and how it was marked.
--
-- Until now a finished drill only moved the skill's level in the skill matrix.
-- The drill itself, the answer and the coach's marks were gone once the page
-- closed, so drills never showed in History or on Home, and a drill couldn't
-- be saved and picked up later.
--
-- The site reads and writes these rows itself, own rows only, the way it reads
-- interview history. "Delete account" removes them through delete_user_data's
-- sweep of every public table with a user_id (and the cascade from auth.users).

CREATE TABLE IF NOT EXISTS public.study_drills (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill         text NOT NULL CHECK (char_length(skill) BETWEEN 1 AND 100),
  field         text CHECK (field IS NULL OR char_length(field) <= 100),
  -- The exercise as the coach's next_drill gave it (prompt, ideal points,
  -- self-check), and why it was scheduled.
  drill         jsonb NOT NULL,
  -- 'saved': put aside, maybe with a half-written answer. 'done': finished.
  status        text NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'done')),
  answer        text CHECK (answer IS NULL OR char_length(answer) <= 8000),
  score         numeric(4,2) CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
  -- 'coach' when the written answer was marked, 'self' for a self-rating.
  scored_by     text CHECK (scored_by IS NULL OR scored_by IN ('coach', 'self')),
  -- The marks point by point, and the skill's level before and after.
  result        jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  -- A finished drill always has its mark.
  CONSTRAINT study_drills_done_has_score CHECK (status <> 'done' OR (score IS NOT NULL AND completed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS study_drills_user_created_idx
  ON public.study_drills (user_id, created_at DESC);

ALTER TABLE public.study_drills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own drills" ON public.study_drills;
CREATE POLICY "Users read their own drills"
  ON public.study_drills FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users add their own drills" ON public.study_drills;
CREATE POLICY "Users add their own drills"
  ON public.study_drills FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their own drills" ON public.study_drills;
CREATE POLICY "Users update their own drills"
  ON public.study_drills FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their own drills" ON public.study_drills;
CREATE POLICY "Users delete their own drills"
  ON public.study_drills FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_study_drills_updated_at ON public.study_drills;
CREATE TRIGGER update_study_drills_updated_at
  BEFORE UPDATE ON public.study_drills
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

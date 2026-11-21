-- Notes from signed-in people: a question, a bug, or an idea.
--
-- The public /contact page can only open the visitor's mail app. Inside the
-- app we already know who they are, so the message is stored here and an
-- admin reads it. They cannot edit or delete it, and they cannot see anyone
-- else's.

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Copied from the session so a reply doesn't need a join to auth.users.
  -- The insert policy checks it matches the signed-in address.
  email      TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('question', 'bug', 'idea')),
  message    TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created
  ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can send their own message" ON public.contact_messages;
CREATE POLICY "Users can send their own message"
  ON public.contact_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND email = (auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Users can read their own messages" ON public.contact_messages;
CREATE POLICY "Users can read their own messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read every message" ON public.contact_messages;
CREATE POLICY "Admins can read every message"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

REVOKE UPDATE, DELETE ON public.contact_messages FROM anon, authenticated;

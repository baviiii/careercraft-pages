-- Give cover letters a name.
--
-- The cover letter page has always asked for a name when you save, then
-- thrown it away: the table had nowhere to put it. The library could only
-- show a date and the first 200 characters, and the tracker's picker showed
-- "11/10/2026 — Dear Hiring Manager, I am…" for every letter.
--
-- Nullable on purpose. Letters saved before this have no title and fall back
-- to a derived label in the app (the application they went with, else the
-- first line of the ad, else the date). RLS on cover_letters already scopes
-- every row to its owner; a new column needs no new policy.

ALTER TABLE public.cover_letters
  ADD COLUMN IF NOT EXISTS title text;

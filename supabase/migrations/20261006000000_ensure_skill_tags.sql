-- =====================================================
-- ensure_skill_tags: the one safe way to add a skill name
--
-- user_skills rows point at the shared skill_tags dictionary by id
-- (20260524000003_user_skills_canonicalize). Users may read skill_tags but not
-- write it — it has only a SELECT policy — which broke three things:
--   - onboarding upserted new names into skill_tags; one unknown name failed
--     the whole skills save, so new users could end up with no skills at all;
--   - Settings refused any skill not already listed ("Unknown skill");
--   - the interview coach couldn't record the skills it measured.
--
-- This function is the single door. It validates each name, reuses an existing
-- tag case-insensitively, adds the rest, and returns an id for every name.
-- skill_tags' row-level security is unchanged: nobody can write it directly.
-- =====================================================

CREATE OR REPLACE FUNCTION public.ensure_skill_tags(
  p_names text[],
  p_categories text[] DEFAULT NULL
)
RETURNS TABLE (requested text, id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  i int;
  v_name text;
  v_category text;
  v_id uuid;
  v_tag_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ensure_skill_tags requires a signed-in user' USING ERRCODE = '42501';
  END IF;
  IF coalesce(array_length(p_names, 1), 0) > 30 THEN
    RAISE EXCEPTION 'ensure_skill_tags takes at most 30 names per call' USING ERRCODE = '22023';
  END IF;

  FOR i IN 1 .. coalesce(array_length(p_names, 1), 0) LOOP
    -- Trimmed and single-spaced; empty or over-long names are skipped, not stored.
    v_name := btrim(regexp_replace(coalesce(p_names[i], ''), '\s+', ' ', 'g'));
    CONTINUE WHEN v_name = '' OR char_length(v_name) > 60;

    -- The user_skills category vocabulary; anything else is 'domain'.
    v_category := lower(btrim(coalesce(p_categories[i], '')));
    IF v_category NOT IN ('technical', 'behavioral', 'leadership', 'domain', 'language') THEN
      v_category := 'domain';
    END IF;

    v_id := NULL;
    v_tag_name := NULL;

    -- Reuse an existing tag whatever its case: "communication" is "Communication".
    SELECT st.id, st.name INTO v_id, v_tag_name
    FROM public.skill_tags st
    WHERE lower(st.name) = lower(v_name)
    ORDER BY st.created_at
    LIMIT 1;

    IF v_id IS NULL THEN
      INSERT INTO public.skill_tags AS st (name, category)
      VALUES (v_name, v_category)
      ON CONFLICT (name) DO NOTHING
      RETURNING st.id, st.name INTO v_id, v_tag_name;

      -- Someone added the same name at the same moment: use theirs.
      IF v_id IS NULL THEN
        SELECT st.id, st.name INTO v_id, v_tag_name
        FROM public.skill_tags st
        WHERE st.name = v_name;
      END IF;
    END IF;

    requested := v_name;
    id := v_id;
    name := v_tag_name;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.ensure_skill_tags(text[], text[]) IS
  'Skill names -> skill_tags ids, adding unknown names (validated). The only way users add to skill_tags. Used by onboarding, Settings and interview-coach-mcp.';

REVOKE ALL ON FUNCTION public.ensure_skill_tags(text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_skill_tags(text[], text[]) TO authenticated;

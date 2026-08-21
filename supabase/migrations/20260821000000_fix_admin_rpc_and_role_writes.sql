-- Prerequisite fixes for plan-based metering.
--
-- Two independent defects, both pre-existing, both blocking:
--
--   1. `_shared/http/auth.ts:48` calls RPC `is_admin`, which was never defined
--      in any migration. Every requireAdmin() call therefore threw
--      ForbiddenError, so `generate-prompt` (its only caller) was dead for
--      everyone including real admins.
--
--   2. `user_roles` shipped with a SELECT policy only
--      (20251127102622_…:40-43). `pages/admin/UserManagement.tsx:68-75`
--      deletes + inserts rows from the browser, so every role change was
--      silently swallowed by RLS.

-- ═══ 1. The missing is_admin RPC ═══════════════════════════════════════════
--
-- Deliberately strict: role AND whitelist, mirroring `is_whitelisted_admin`
-- (20251206035511_…:125-140). The frontend gate in `hooks/useAdminAuth.ts:29-38`
-- already requires BOTH, so defining is_admin as the weaker has_role() check
-- would let an edge function accept a caller the UI rejects. One notion of
-- "admin" across the whole system is worth more than the extra join.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN auth.users u          ON ur.user_id = u.id
    JOIN public.admin_whitelist aw ON u.email = aw.email
    WHERE ur.user_id = p_user_id
      AND ur.role = 'admin'
  )
$$;

COMMENT ON FUNCTION public.is_admin(UUID) IS
  'True when the user holds the admin role AND their email is whitelisted. '
  'Called by requireAdmin() in edge functions; mirrors the useAdminAuth gate.';


-- ═══ 2. user_roles write policies ══════════════════════════════════════════
--
-- Admin-gated via has_role() rather than is_admin(): an admin must be able to
-- repair the role table even if the whitelist row is missing, otherwise a
-- mistake here is unrecoverable without a service-role key.
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Guard against an admin removing their own last admin row and locking
-- everyone out of /admin.
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND NOT (user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

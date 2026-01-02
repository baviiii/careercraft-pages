-- Create demo admin user setup
-- This migration sets up a demo admin account

-- Step 1: Add demo admin email to whitelist
INSERT INTO public.admin_whitelist (email)
VALUES ('demo@careercraft.au')
ON CONFLICT (email) DO NOTHING;

-- Step 2: Create a function to promote a user to admin
CREATE OR REPLACE FUNCTION public.promote_to_admin(_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;

  -- Check if user exists
  IF _user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found', _email;
    RETURN FALSE;
  END IF;

  -- Add to admin whitelist if not already there
  INSERT INTO public.admin_whitelist (email)
  VALUES (_email)
  ON CONFLICT (email) DO NOTHING;

  -- Add admin role if not already assigned
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'User % promoted to admin successfully', _email;
  RETURN TRUE;
END;
$$;

-- Step 3: Add comment for documentation
COMMENT ON FUNCTION public.promote_to_admin(TEXT) IS
'Promotes a user to admin role by their email address. Also adds them to admin whitelist.';

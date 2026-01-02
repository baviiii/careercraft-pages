-- =====================================================
-- DEMO ADMIN USER SETUP SCRIPT
-- =====================================================
-- Run this script in Supabase SQL Editor after creating
-- the demo user account through the sign-up process
-- =====================================================

-- Demo User Credentials:
-- Email: demo@careercraft.au
-- Password: DemoAdmin123! (change this after first login)

-- Step 1: Verify the user exists
-- Replace 'demo@careercraft.au' with your demo email if different
DO $$
DECLARE
  _user_id UUID;
  _user_email TEXT := 'demo@careercraft.au';
BEGIN
  -- Get user ID
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _user_email;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please sign up first through the app.', _user_email;
  ELSE
    RAISE NOTICE 'User found: % (ID: %)', _user_email, _user_id;
  END IF;
END $$;

-- Step 2: Add to admin whitelist
INSERT INTO public.admin_whitelist (email)
VALUES ('demo@careercraft.au')
ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email;

-- Step 3: Assign admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'demo@careercraft.au'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Verify admin setup
SELECT
  u.id as user_id,
  u.email,
  p.full_name,
  ur.role,
  aw.email as whitelisted_email,
  public.has_role(u.id, 'admin') as is_admin,
  public.is_whitelisted_admin(u.id) as is_whitelisted_admin
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.admin_whitelist aw ON aw.email = u.email
WHERE u.email = 'demo@careercraft.au';

-- Step 5: Log the admin creation
INSERT INTO public.activity_logs (
  user_id,
  action,
  entity_type,
  details,
  severity
)
SELECT
  id,
  'admin_role_assigned',
  'user',
  jsonb_build_object(
    'email', email,
    'method', 'manual_setup',
    'reason', 'demo_account'
  ),
  'info'
FROM auth.users
WHERE email = 'demo@careercraft.au';

RAISE NOTICE '✓ Demo admin setup complete!';
RAISE NOTICE 'Email: demo@careercraft.au';
RAISE NOTICE 'You can now log in with admin privileges.';

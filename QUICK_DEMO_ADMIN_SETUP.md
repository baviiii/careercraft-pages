# Quick Demo Admin Setup - 3 Steps

## Step 1: Sign Up Through Your App

1. Open your CareerCraft application
2. Go to the sign-up page
3. Create account with:
   - **Email:** `demo@careercraft.au`
   - **Password:** `DemoAdmin123!`
4. Complete the sign-up process

## Step 2: Run This SQL in Supabase Dashboard

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste this code:

```sql
-- Add to admin whitelist
INSERT INTO public.admin_whitelist (email)
VALUES ('demo@careercraft.au')
ON CONFLICT (email) DO NOTHING;

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'demo@careercraft.au'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify setup
SELECT
  u.email,
  ur.role,
  public.has_role(u.id, 'admin') as is_admin
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'demo@careercraft.au';
```

6. Click **Run** or press `Ctrl+Enter`

## Step 3: Verify

1. Log out of the app
2. Log back in with `demo@careercraft.au`
3. You should now see admin features
4. Navigate to `/admin` to access the admin dashboard

---

## ✅ That's it! You now have a demo admin account.

### Quick Commands

**Promote any user to admin:**
```sql
-- Just change the email
INSERT INTO public.admin_whitelist (email) VALUES ('user@example.com') ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'user@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

**Remove admin access:**
```sql
DELETE FROM public.admin_whitelist WHERE email = 'demo@careercraft.au';
DELETE FROM public.user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@careercraft.au') AND role = 'admin';
```

**Check who are admins:**
```sql
SELECT u.email, ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

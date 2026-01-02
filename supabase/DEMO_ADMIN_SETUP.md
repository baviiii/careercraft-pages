# Demo Admin User Setup Guide

This guide will help you create a demo admin user account with full administrative privileges.

## Demo Account Credentials

```
Email: demo@careercraft.au
Password: DemoAdmin123!
```

> **Important:** Change the password after first login for security.

## Setup Methods

### Method 1: Quick Setup (Recommended)

1. **Sign up through the app:**
   - Go to your CareerCraft application
   - Navigate to the sign-up page
   - Create an account with email: `demo@careercraft.au`
   - Use password: `DemoAdmin123!` (or your preferred password)
   - Complete the sign-up process

2. **Promote to admin:**
   - Open Supabase Dashboard
   - Navigate to: SQL Editor
   - Run this command:
   ```sql
   SELECT public.promote_to_admin('demo@careercraft.au');
   ```

3. **Verify:**
   - Log out and log back in
   - You should now have access to admin features

### Method 2: Complete Setup via SQL

1. **Create the user account through the app** (same as Method 1, Step 1)

2. **Run the complete setup script:**
   - Open Supabase Dashboard
   - Navigate to: SQL Editor
   - Copy and paste the contents of `demo-admin-setup.sql`
   - Execute the script

3. **Check the results:**
   - The script will output verification details
   - Look for: `✓ Demo admin setup complete!`

## Verification

After setup, verify the admin account by running:

```sql
SELECT
  u.email,
  p.full_name,
  ur.role,
  public.has_role(u.id, 'admin') as is_admin,
  public.is_whitelisted_admin(u.id) as is_whitelisted_admin
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'demo@careercraft.au';
```

Expected results:
- `is_admin`: `true`
- `is_whitelisted_admin`: `true`
- `role`: `admin`

## Manual Promotion (Alternative)

If you need to promote an existing user to admin:

```sql
-- Promote any user to admin by email
SELECT public.promote_to_admin('user@example.com');
```

## Admin Features Access

Once logged in as admin, you'll have access to:

- **Admin Dashboard:** `/admin`
- **User Management:** Manage all user accounts
- **Access Control:** Configure permissions
- **Activity Logs:** View system audit trails
- **Security Alerts:** Monitor suspicious activities
- **Admin Settings:** Configure system settings

## Troubleshooting

### User not found error
- Make sure you've completed the sign-up process through the app
- Check that the email is spelled correctly
- Verify the user exists in Supabase Auth

### Admin role not working
1. Check user_roles table:
   ```sql
   SELECT * FROM public.user_roles
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@careercraft.au');
   ```

2. Check admin whitelist:
   ```sql
   SELECT * FROM public.admin_whitelist
   WHERE email = 'demo@careercraft.au';
   ```

3. Re-run the promotion function:
   ```sql
   SELECT public.promote_to_admin('demo@careercraft.au');
   ```

### Still having issues?
- Clear browser cache and cookies
- Log out completely and log back in
- Check browser console for errors
- Verify Supabase connection

## Security Notes

⚠️ **Important Security Considerations:**

1. **Change Default Password:** Always change the default password after first login
2. **Production Use:** Remove or disable demo accounts in production
3. **Email Verification:** Consider requiring email verification for admin accounts
4. **2FA:** Enable two-factor authentication for admin accounts when available
5. **Regular Audits:** Monitor admin activity logs regularly

## Removing Demo Admin

To remove the demo admin account:

```sql
-- Remove from whitelist
DELETE FROM public.admin_whitelist WHERE email = 'demo@careercraft.au';

-- Remove admin role
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@careercraft.au')
AND role = 'admin';

-- Optional: Delete the entire user account
-- This will cascade delete profile, roles, and related data
DELETE FROM auth.users WHERE email = 'demo@careercraft.au';
```

## Next Steps

After setting up the demo admin:

1. Log in with the demo credentials
2. Explore the admin dashboard
3. Test user management features
4. Review activity logs
5. Configure admin settings as needed

---

**Created:** 2026-01-02
**Version:** 1.0
**Maintained by:** CareerCraft Team

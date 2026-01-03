
-- Add existing admin user to whitelist
INSERT INTO public.admin_whitelist (email)
VALUES ('aseeshan11@gmail.com')
ON CONFLICT (email) DO NOTHING;

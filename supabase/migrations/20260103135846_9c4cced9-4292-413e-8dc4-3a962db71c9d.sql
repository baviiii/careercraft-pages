-- Add bavindud11@gmail.com to admin whitelist
INSERT INTO public.admin_whitelist (email)
VALUES ('bavindud11@gmail.com')
ON CONFLICT (email) DO NOTHING;
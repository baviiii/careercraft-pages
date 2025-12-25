-- Add demo admin to whitelist
INSERT INTO public.admin_whitelist (email)
VALUES ('demo@bavi.au')
ON CONFLICT (email) DO NOTHING;
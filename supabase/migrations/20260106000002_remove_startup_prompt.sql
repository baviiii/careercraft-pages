-- Remove startup_mentor prompt to simplify testing
-- Keep only main entrepreneur_advisor for entrepreneurship focus area

-- Delete the startup_mentor prompt
DELETE FROM public.chat_prompts 
WHERE name = 'startup_mentor';

-- Ensure entrepreneur_advisor is the default for entrepreneurship
UPDATE public.chat_prompts 
SET is_default = TRUE 
WHERE name = 'entrepreneur_advisor' AND focus_area = 'entrepreneurship';

-- Ensure only one default per focus area
UPDATE public.chat_prompts 
SET is_default = FALSE 
WHERE focus_area = 'entrepreneurship' 
AND name != 'entrepreneur_advisor';

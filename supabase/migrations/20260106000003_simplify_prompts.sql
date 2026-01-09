-- Simplify prompts to main ones only for easier testing
-- Keep: career_coach (careers), entrepreneur_advisor (entrepreneurship), policy_analyst (policies)

-- Remove basic/general prompt
DELETE FROM public.chat_prompts 
WHERE name = 'sa_general_assistant';

-- Ensure we have clear defaults for each focus area
UPDATE public.chat_prompts 
SET is_default = TRUE 
WHERE name IN ('career_coach', 'entrepreneur_advisor', 'policy_analyst');

-- Remove any other non-default prompts to keep it simple
DELETE FROM public.chat_prompts 
WHERE is_default = FALSE 
AND focus_area IN ('careers', 'entrepreneurship', 'policies');

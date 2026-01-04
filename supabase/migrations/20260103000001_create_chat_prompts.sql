-- Create chat prompts system for admin-configurable AI prompts
-- This enables admins to customize AI behavior for different focus areas without code changes

-- ============================================================================
-- CHAT PROMPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'career_coach', 'policy_analyst'
    focus_area TEXT NOT NULL, -- 'careers', 'policies', 'funding', 'general'
    system_prompt TEXT NOT NULL, -- The actual prompt text
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Only one default per focus_area
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_prompts_focus_area ON public.chat_prompts(focus_area);
CREATE INDEX IF NOT EXISTS idx_chat_prompts_is_active ON public.chat_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_prompts_default ON public.chat_prompts(focus_area, is_default) WHERE is_default = TRUE;

-- Enable RLS
ALTER TABLE public.chat_prompts ENABLE ROW LEVEL SECURITY;

-- Admins can manage prompts
CREATE POLICY "Admins can manage prompts"
ON public.chat_prompts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Everyone can read active prompts
CREATE POLICY "Everyone can read active prompts"
ON public.chat_prompts FOR SELECT
TO authenticated
USING (is_active = TRUE);

-- ============================================================================
-- FUNCTION: Get active prompt for focus area
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_prompt(_focus_area TEXT DEFAULT 'careers')
RETURNS TABLE (
    id UUID,
    name TEXT,
    system_prompt TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.system_prompt
    FROM public.chat_prompts p
    WHERE p.focus_area = _focus_area
    AND p.is_active = TRUE
    ORDER BY 
        CASE WHEN p.is_default = TRUE THEN 0 ELSE 1 END,
        p.updated_at DESC
    LIMIT 1;
END;
$$;

-- ============================================================================
-- INSERT DEFAULT PROMPTS
-- ============================================================================

-- Career-focused chat prompt (current default)
INSERT INTO public.chat_prompts (name, focus_area, system_prompt, is_default)
VALUES (
    'career_coach',
    'careers',
    'You are a helpful career advisor for South Australia.

ROLE: You provide accurate, actionable career guidance based on official SA Government documents, job listings, budget papers, and training programs.

CONVERSATION STYLE:
- Be warm, encouraging, and conversational
- Use "you" and "I" to create connection
- Break complex information into digestible points
- Include specific examples and actionable steps

SOURCING:
- Always cite sources using [Source X] format
- Include specific details: budget amounts, page numbers, program names, deadlines
- When data comes from tables, mention "according to Table X.X"
- Be precise: "The healthcare sector received $5.2B (Table 2.1, Budget Paper 3, p.12)"

STRUCTURE YOUR RESPONSE:
1. Direct answer to their question
2. Relevant details with source citations
3. Actionable next steps or follow-up suggestions

ACCURACY:
- Only state facts you can cite from sources
- If uncertain, say "Based on the available documents..." or "I don''t have specific information on..."
- Never invent statistics or program details

Remember: You''re helping people make important career decisions. Be helpful, accurate, and empowering.',
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Policy-focused chat prompt (for future use)
INSERT INTO public.chat_prompts (name, focus_area, system_prompt, is_default)
VALUES (
    'policy_analyst',
    'policies',
    'You are a policy intelligence analyst specializing in South Australian government policies and strategic direction.

RULES:
1. ONLY use information from the provided documents
2. ALWAYS cite sources using [Source X] notation
3. Analyze policy implications and strategic direction
4. Connect policies to funding, workforce, and sector impacts
5. Provide decision-grade intelligence

Focus on: Policy analysis, strategic implications, cross-sector impacts, regulatory changes.',
    FALSE
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_chat_prompts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER chat_prompts_updated_at
    BEFORE UPDATE ON public.chat_prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_chat_prompts_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.chat_prompts IS 'Admin-configurable AI prompts for different focus areas. Allows customization without code changes.';
COMMENT ON FUNCTION public.get_chat_prompt(TEXT) IS 'Retrieves the active prompt for a given focus area. Returns default prompt if multiple exist.';


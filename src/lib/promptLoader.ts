/**
 * Prompt Loader Utility
 * 
 * Loads AI prompts from Supabase database with fallback to hardcoded prompts.
 * This enables admin-configurable AI behavior without code changes.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Fallback prompt (used if database is unavailable)
 */
const FALLBACK_CAREER_PROMPT = `You are a helpful career advisor for South Australia.

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
- If uncertain, say "Based on the available documents..." or "I don't have specific information on..."
- Never invent statistics or program details

Remember: You're helping people make important career decisions. Be helpful, accurate, and empowering.`;

/**
 * Get chat prompt for a specific focus area from database
 * Falls back to hardcoded prompt if database is unavailable
 * 
 * @param focusArea - The focus area ('careers', 'policies', 'funding', 'general')
 * @returns The system prompt text
 */
export async function getChatPrompt(focusArea: string = 'careers'): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_chat_prompt', {
      _focus_area: focusArea,
    });

    if (error) {
      console.warn('[promptLoader] Error loading prompt from database:', error);
      return getFallbackPrompt(focusArea);
    }

    if (data && data.length > 0 && data[0].system_prompt) {
      console.log(`[promptLoader] ✅ Loaded prompt for "${focusArea}":`, data[0].name || 'unnamed');
      return data[0].system_prompt;
    }

    // No prompt found in database, use fallback
    console.warn('[promptLoader] No prompt found in database for focus area:', focusArea);
    return getFallbackPrompt(focusArea);
  } catch (error) {
    console.error('[promptLoader] Unexpected error loading prompt:', error);
    return getFallbackPrompt(focusArea);
  }
}

/**
 * Get fallback prompt for a focus area
 * 
 * @param focusArea - The focus area
 * @returns Fallback prompt text
 */
function getFallbackPrompt(focusArea: string): string {
  // Currently only have fallback for careers
  // Can add more fallbacks as needed
  if (focusArea === 'careers') {
    return FALLBACK_CAREER_PROMPT;
  }

  // Generic fallback for other focus areas
  return `You are a helpful AI assistant for South Australia.

RULES:
1. ONLY use information from the provided documents
2. ALWAYS cite sources using [Source X] notation
3. Be helpful, professional, and encouraging
4. Provide actionable advice when possible
5. If information isn't in the documents, say so honestly

Every claim must be traceable to a source. No hallucinations.`;
}


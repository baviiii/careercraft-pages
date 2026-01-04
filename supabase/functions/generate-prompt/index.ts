/**
 * ============================================================================
 * PROMPT GENERATOR - AI-Assisted Prompt Generation for RAG Systems
 * ============================================================================
 * 
 * Uses Gemini 2.5 Flash to generate and improve AI system prompts for
 * different focus areas (careers, policies, funding, etc.)
 * 
 * Features:
 * - Generate new prompts from scratch
 * - Improve existing prompts
 * - Optimize for specific focus areas
 * - Include best practices (citations, accuracy, tone)
 * ============================================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_MODEL = "google/gemini-2.5-flash";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface WizardData {
  name: string;
  focusArea: string;
  customFocusArea: string;
  targetAudience: string;
  audienceExpertise: 'beginner' | 'intermediate' | 'expert' | 'mixed';
  audienceGoals: string[];
  customGoals: string;
  tone: string[];
  responseLength: 'concise' | 'detailed' | 'adaptive';
  personality: string;
  topicFocus: string;
  mustInclude: string[];
  mustAvoid: string[];
  customMustInclude: string;
  customMustAvoid: string;
  citationStyle: 'strict' | 'moderate' | 'flexible';
  accuracyLevel: 'high' | 'very_high' | 'absolute';
  sourcePreferences: string[];
  specialInstructions: string;
  exampleQuestions: string;
  desiredOutcomes: string;
}

interface GeneratePromptRequest {
  action: 'generate' | 'improve' | 'generate_guided';
  focus_area?: string;
  description?: string;
  current_prompt?: string;
  requirements?: string[];
  wizard_data?: WizardData;
}

interface PromptResponse {
  prompt: string;
  explanation?: string;
  suggestions?: string[];
}

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GeneratePromptRequest = await req.json();
    const { action, focus_area, description, current_prompt, requirements, wizard_data } = body;

    // Validate action
    if (!action || (action !== 'generate' && action !== 'improve' && action !== 'generate_guided')) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'generate', 'improve', or 'generate_guided'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For guided generation, wizard_data is required
    if (action === 'generate_guided' && !wizard_data) {
      return new Response(
        JSON.stringify({ error: "wizard_data is required for 'generate_guided' action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action !== 'generate_guided' && !focus_area) {
      return new Response(
        JSON.stringify({ error: "focus_area is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt based on action
    let systemPrompt: string;
    let userPrompt: string;

    if (action === 'generate_guided' && wizard_data) {
      // Advanced guided generation using structured wizard data
      systemPrompt = `You are a world-class expert at writing AI system prompts for RAG (Retrieval-Augmented Generation) systems.

Your task is to transform the user's structured requirements into a powerful, professional system prompt that will guide an AI assistant to provide excellent responses using retrieved documents.

CRITICAL REQUIREMENTS FOR THE GENERATED PROMPT:
1. It MUST include strict citation requirements using [Source X] format
2. It MUST define clear accuracy and fact-checking guidelines
3. It MUST be optimized for RAG - meaning it should instruct the AI to base ALL responses on the provided context/documents
4. It MUST include response structure guidelines
5. It should be comprehensive yet concise - no fluff, every sentence should serve a purpose
6. It should be written in second person ("You are...", "You should...")

The prompt you generate should:
- Start with a clear role definition
- Include specific guidelines for citation and accuracy based on user preferences
- Set the appropriate tone and conversation style
- Include topic focus and boundaries
- Have clear structure guidelines for responses
- End with a reminder about accuracy and source-based responses

OUTPUT: Return ONLY the system prompt text. No explanations, no markdown formatting, no prefixes like "Here is your prompt:". Just the raw prompt text ready to be used.`;

      // Build comprehensive user prompt from wizard data
      const expertiseMap = {
        beginner: 'new to the topic and need explanations of basic concepts',
        intermediate: 'have some knowledge and understand basics',
        expert: 'deeply knowledgeable and want advanced insights',
        mixed: 'vary in expertise level, so adapt explanations accordingly',
      };

      const citationMap = {
        strict: 'EVERY factual claim must have a [Source X] citation. No exceptions.',
        moderate: 'Key facts and statistics need citations, but general context can flow naturally.',
        flexible: 'Major claims should be cited, but maintain conversational flow.',
      };

      const accuracyMap = {
        absolute: 'Only state facts that can be directly cited from sources. Say "I don\'t have information on that" if uncertain. Never infer or assume.',
        very_high: 'Strong preference for cited facts. Can make reasonable inferences but must indicate when doing so.',
        high: 'Prioritize accuracy but allow helpful context and general knowledge to supplement sources.',
      };

      const responseLengthMap = {
        concise: 'Keep responses brief and to-the-point. Focus on key information.',
        detailed: 'Provide comprehensive explanations with full context and background.',
        adaptive: 'Match response length to question complexity - brief for simple questions, detailed for complex ones.',
      };

      userPrompt = `Generate a professional RAG system prompt based on these detailed requirements:

=== BASIC INFORMATION ===
Focus Area: ${wizard_data.focusArea}
Prompt Name: ${wizard_data.name}

=== TARGET AUDIENCE ===
Who they are: ${wizard_data.targetAudience}
Expertise Level: Users ${expertiseMap[wizard_data.audienceExpertise]}
${wizard_data.audienceGoals.length > 0 ? `Goals: ${wizard_data.audienceGoals.join(', ')}` : ''}
${wizard_data.customGoals ? `Additional Goals: ${wizard_data.customGoals}` : ''}

=== CONVERSATION STYLE ===
Tone: ${wizard_data.tone.join(', ')}
Response Length: ${responseLengthMap[wizard_data.responseLength]}
${wizard_data.personality ? `Personality/Character: ${wizard_data.personality}` : ''}

=== CONTENT REQUIREMENTS ===
Topic Focus: ${wizard_data.topicFocus}
${wizard_data.sourcePreferences.length > 0 ? `Preferred Sources: ${wizard_data.sourcePreferences.join(', ')}` : ''}
${wizard_data.customMustInclude ? `Must Include: ${wizard_data.customMustInclude}` : ''}
${wizard_data.customMustAvoid ? `Must Avoid: ${wizard_data.customMustAvoid}` : ''}

=== ACCURACY & CITATIONS (CRITICAL FOR RAG) ===
Citation Style: ${citationMap[wizard_data.citationStyle]}
Accuracy Level: ${accuracyMap[wizard_data.accuracyLevel]}

=== SPECIAL INSTRUCTIONS ===
${wizard_data.specialInstructions || 'None provided'}

=== EXAMPLE USER QUESTIONS (for context) ===
${wizard_data.exampleQuestions || 'None provided'}

=== DESIRED OUTCOMES ===
${wizard_data.desiredOutcomes || 'Help users get accurate, actionable information'}

Generate a comprehensive, production-ready system prompt that incorporates ALL of these requirements. The prompt should be powerful enough to make the AI assistant highly effective at using RAG-retrieved documents to help users achieve their goals.`;

    } else if (action === 'generate') {
      systemPrompt = `You are an expert at writing AI system prompts for RAG (Retrieval-Augmented Generation) systems.

Your prompts must:
1. Clearly define the AI's role and expertise
2. Include strict citation requirements ([Source X] format)
3. Set appropriate tone and conversation style
4. Emphasize accuracy and fact-checking
5. Include structure guidelines for responses
6. Be optimized for the specific focus area

Focus areas:
- careers: Career guidance, job advice, training programs
- policies: Policy analysis, strategic direction, regulations
- funding: Budget analysis, financial intelligence, allocations
- general: General purpose, multi-domain assistance

Return ONLY the system prompt text, no explanations or markdown formatting.`;

      userPrompt = `Generate a professional system prompt for a RAG-based AI assistant focused on: ${focus_area}

${description ? `User's description: ${description}\n` : ''}
${requirements && requirements.length > 0 ? `Additional requirements:\n${requirements.map(r => `- ${r}`).join('\n')}\n` : ''}

Create a comprehensive, professional prompt that will guide the AI to provide accurate, helpful responses with proper source citations.`;

    } else {
      // improve action
      if (!current_prompt) {
        return new Response(
          JSON.stringify({ error: "current_prompt is required for 'improve' action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      systemPrompt = `You are an expert at improving AI system prompts for RAG systems.

Analyze the provided prompt and suggest improvements while maintaining its core purpose.
Focus on:
- Clarity and specificity
- Citation requirements
- Tone and style
- Accuracy guidelines
- Response structure
- Best practices for RAG systems

Return a JSON object with:
{
  "prompt": "The improved prompt text",
  "explanation": "Brief explanation of key improvements",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`;

      userPrompt = `Improve this system prompt for focus area: ${focus_area}

Current prompt:
${current_prompt}

${description ? `User's feedback/requirements: ${description}\n` : ''}
${requirements && requirements.length > 0 ? `Additional requirements:\n${requirements.map(r => `- ${r}`).join('\n')}\n` : ''}

Provide an improved version that's clearer, more effective, and follows RAG best practices.`;
    }

    // Call Gemini AI
    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: action === 'improve' ? { type: "json_object" } : undefined,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse response
    let result: PromptResponse;

    if (action === 'improve') {
      try {
        result = JSON.parse(content);
      } catch {
        // If JSON parsing fails, wrap as prompt
        result = {
          prompt: content,
          explanation: "AI provided improved prompt",
        };
      }
    } else {
      // For generate, content is the prompt itself
      result = {
        prompt: content.trim(),
      };
    }

    return new Response(
      JSON.stringify({
        ...result,
        processingTime: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in generate-prompt:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});


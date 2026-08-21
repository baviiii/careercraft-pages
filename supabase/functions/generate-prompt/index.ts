// generate-prompt — AI-assisted system-prompt authoring for RAG assistants.
//
// Actions:
//   generate         → produce a new system prompt from focus area + description
//   improve          → take a current prompt and return an improved version with notes
//   generate_guided  → produce a prompt from full wizard data (audience, tone, citations, …)

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "npm:zod@3";

import { horusGenerateObject, horusGenerateText } from "../_shared/ai/horus.ts";
import { ProviderError, ValidationError } from "../_shared/ai/errors.ts";
import { meterFromQuota } from "../_shared/ai/meter.ts";
import { enforcePlanQuota } from "../_shared/db/plan-quota.ts";
import { requireAdmin } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

const WizardDataSchema = z.object({
  name: z.string(),
  focusArea: z.string(),
  customFocusArea: z.string().default(""),
  targetAudience: z.string(),
  audienceExpertise: z.enum(["beginner", "intermediate", "expert", "mixed"]),
  audienceGoals: z.array(z.string()).default([]),
  customGoals: z.string().default(""),
  tone: z.array(z.string()).default([]),
  responseLength: z.enum(["concise", "detailed", "adaptive"]),
  personality: z.string().default(""),
  topicFocus: z.string().default(""),
  mustInclude: z.array(z.string()).default([]),
  mustAvoid: z.array(z.string()).default([]),
  customMustInclude: z.string().default(""),
  customMustAvoid: z.string().default(""),
  citationStyle: z.enum(["strict", "moderate", "flexible"]),
  accuracyLevel: z.enum(["high", "very_high", "absolute"]),
  sourcePreferences: z.array(z.string()).default([]),
  specialInstructions: z.string().default(""),
  exampleQuestions: z.string().default(""),
  desiredOutcomes: z.string().default(""),
});

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    focus_area: z.string().min(1),
    description: z.string().optional(),
    requirements: z.array(z.string()).optional(),
  }),
  z.object({
    action: z.literal("improve"),
    focus_area: z.string().min(1),
    current_prompt: z.string().min(1),
    description: z.string().optional(),
    requirements: z.array(z.string()).optional(),
  }),
  z.object({
    action: z.literal("generate_guided"),
    wizard_data: WizardDataSchema,
  }),
]);

type GenRequest = z.infer<typeof RequestSchema>;

const ImprovedPromptSchema = z.object({
  prompt: z.string().describe("The improved system prompt text"),
  explanation: z.string().describe("Brief explanation of key improvements"),
  suggestions: z.array(z.string()).describe("Specific follow-up suggestions").max(10),
});

serve(handler(async (req) => {
  const { userId } = await requireAdmin(req);
  const quota = await enforcePlanQuota({
    userId,
    resource: "generate-prompt",
    resourceLabel: "AI prompt generation",
  });
  const meter = meterFromQuota(quota, userId);

  const startTime = Date.now();

  const raw = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("Invalid request body", parsed.error.flatten());
  }
  const body = parsed.data;

  try {
    if (body.action === "improve") {
      const { system, user } = improvePrompts(body);
      const { object } = await horusGenerateObject(ImprovedPromptSchema, {
        task: "careercraft.prompt_improve",
        system,
        prompt: user,
        temperature: 0.7,
        maxTokens: 2000,
        meter,
      });

      return json({
        prompt: object.prompt,
        explanation: object.explanation,
        suggestions: object.suggestions,
        processingTime: Date.now() - startTime,
      });
    }

    const { system, user } = body.action === "generate_guided"
      ? guidedPrompts(body.wizard_data)
      : generatePrompts(body);

    const { text } = await horusGenerateText({
      task: `careercraft.prompt_${body.action}`,
      system,
      prompt: user,
      temperature: 0.7,
      maxTokens: 2000,
      meter,
    });

    return json({
      prompt: text.trim(),
      processingTime: Date.now() - startTime,
    });
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new ProviderError(`Prompt generation failed: ${msg}`, "horus");
  }
}, { name: "generate-prompt" }));

// ----- Prompt builders -----

function generatePrompts(body: Extract<GenRequest, { action: "generate" }>) {
  const system = `You are an expert at writing AI system prompts for RAG (Retrieval-Augmented Generation) systems.

Your prompts must:
1. Clearly define the AI's role and expertise
2. Include strict citation requirements ([Source X] format)
3. Set appropriate tone and conversation style
4. Emphasise accuracy and fact-checking
5. Include structure guidelines for responses
6. Be optimised for the specific focus area

Focus areas:
- careers: Career guidance, job advice, training programs
- policies: Policy analysis, strategic direction, regulations
- funding: Budget analysis, financial intelligence, allocations
- general: General purpose, multi-domain assistance

Return ONLY the system prompt text, no explanations or markdown formatting.`;

  const user = [
    `Generate a professional system prompt for a RAG-based AI assistant focused on: ${body.focus_area}`,
    body.description ? `\nUser's description: ${body.description}` : "",
    body.requirements?.length
      ? `\nAdditional requirements:\n${body.requirements.map((r) => `- ${r}`).join("\n")}`
      : "",
    "\nCreate a comprehensive, professional prompt that will guide the AI to provide accurate, helpful responses with proper source citations.",
  ].join("");

  return { system, user };
}

function improvePrompts(body: Extract<GenRequest, { action: "improve" }>) {
  const system = `You are an expert at improving AI system prompts for RAG systems.

Analyse the provided prompt and suggest improvements while maintaining its core purpose. Focus on:
- Clarity and specificity
- Citation requirements
- Tone and style
- Accuracy guidelines
- Response structure
- Best practices for RAG systems`;

  const user = [
    `Improve this system prompt for focus area: ${body.focus_area}`,
    `\nCurrent prompt:\n${body.current_prompt}`,
    body.description ? `\nUser's feedback/requirements: ${body.description}` : "",
    body.requirements?.length
      ? `\nAdditional requirements:\n${body.requirements.map((r) => `- ${r}`).join("\n")}`
      : "",
    "\nProvide an improved version that's clearer, more effective, and follows RAG best practices.",
  ].join("");

  return { system, user };
}

const expertiseMap: Record<z.infer<typeof WizardDataSchema>["audienceExpertise"], string> = {
  beginner: "new to the topic and need explanations of basic concepts",
  intermediate: "have some knowledge and understand basics",
  expert: "deeply knowledgeable and want advanced insights",
  mixed: "vary in expertise level, so adapt explanations accordingly",
};

const citationMap: Record<z.infer<typeof WizardDataSchema>["citationStyle"], string> = {
  strict: "EVERY factual claim must have a [Source X] citation. No exceptions.",
  moderate: "Key facts and statistics need citations, but general context can flow naturally.",
  flexible: "Major claims should be cited, but maintain conversational flow.",
};

const accuracyMap: Record<z.infer<typeof WizardDataSchema>["accuracyLevel"], string> = {
  absolute: 'Only state facts that can be directly cited from sources. Say "I don\'t have information on that" if uncertain. Never infer or assume.',
  very_high: "Strong preference for cited facts. Can make reasonable inferences but must indicate when doing so.",
  high: "Prioritise accuracy but allow helpful context and general knowledge to supplement sources.",
};

const responseLengthMap: Record<z.infer<typeof WizardDataSchema>["responseLength"], string> = {
  concise: "Keep responses brief and to-the-point. Focus on key information.",
  detailed: "Provide comprehensive explanations with full context and background.",
  adaptive: "Match response length to question complexity - brief for simple questions, detailed for complex ones.",
};

function guidedPrompts(w: z.infer<typeof WizardDataSchema>) {
  const system = `You are a world-class expert at writing AI system prompts for RAG (Retrieval-Augmented Generation) systems.

Your task is to transform the user's structured requirements into a powerful, professional system prompt that will guide an AI assistant to provide excellent responses using retrieved documents.

CRITICAL REQUIREMENTS FOR THE GENERATED PROMPT:
1. It MUST include strict citation requirements using [Source X] format
2. It MUST define clear accuracy and fact-checking guidelines
3. It MUST be optimised for RAG — meaning it should instruct the AI to base ALL responses on the provided context/documents
4. It MUST include response structure guidelines
5. It should be comprehensive yet concise — no fluff, every sentence should serve a purpose
6. It should be written in second person ("You are...", "You should...")

OUTPUT: Return ONLY the system prompt text. No explanations, no markdown formatting, no prefixes like "Here is your prompt:". Just the raw prompt text ready to be used.`;

  const user = `Generate a professional RAG system prompt based on these detailed requirements:

=== BASIC INFORMATION ===
Focus Area: ${w.focusArea}
Prompt Name: ${w.name}

=== TARGET AUDIENCE ===
Who they are: ${w.targetAudience}
Expertise Level: Users ${expertiseMap[w.audienceExpertise]}
${w.audienceGoals.length > 0 ? `Goals: ${w.audienceGoals.join(", ")}` : ""}
${w.customGoals ? `Additional Goals: ${w.customGoals}` : ""}

=== CONVERSATION STYLE ===
Tone: ${w.tone.join(", ")}
Response Length: ${responseLengthMap[w.responseLength]}
${w.personality ? `Personality/Character: ${w.personality}` : ""}

=== CONTENT REQUIREMENTS ===
Topic Focus: ${w.topicFocus}
${w.sourcePreferences.length > 0 ? `Preferred Sources: ${w.sourcePreferences.join(", ")}` : ""}
${w.customMustInclude ? `Must Include: ${w.customMustInclude}` : ""}
${w.customMustAvoid ? `Must Avoid: ${w.customMustAvoid}` : ""}

=== ACCURACY & CITATIONS (CRITICAL FOR RAG) ===
Citation Style: ${citationMap[w.citationStyle]}
Accuracy Level: ${accuracyMap[w.accuracyLevel]}

=== SPECIAL INSTRUCTIONS ===
${w.specialInstructions || "None provided"}

=== EXAMPLE USER QUESTIONS (for context) ===
${w.exampleQuestions || "None provided"}

=== DESIRED OUTCOMES ===
${w.desiredOutcomes || "Help users get accurate, actionable information"}

Generate a comprehensive, production-ready system prompt that incorporates ALL of these requirements.`;

  return { system, user };
}

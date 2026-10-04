// generate-prompt — AI-assisted system-prompt authoring for RAG assistants.
//
// Actions:
//   generate         → produce a new system prompt from focus area + description
//   improve          → take a current prompt and return an improved version with notes
//   generate_guided  → produce a persona from full wizard data (audience, tone, focus, …)

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

/*
 * What a persona is for, now that the Career Coach runs on the Horus agent.
 *
 * The agent owns the rules that make an answer trustworthy — search before
 * answering, cite every claim as [n], say so when the documents don't cover
 * something — and it prepends "You are <persona name>." itself. A persona that
 * restates those rules in its own words ("[Source X]", "only use the provided
 * documents") hands the model a second rulebook that disagrees with the first.
 * So generated personas set voice, audience, focus and answer shape, and
 * nothing else.
 */
const PERSONA_CONTRACT = `The persona you write is added to an assistant that already has fixed rules for searching documents, citing sources and handling gaps. Those rules are not yours to restate.

The persona MUST cover:
- Who the assistant is helping, and what they are usually trying to decide
- Voice: tone, plainness, how to treat jargon
- The shape of a good answer: what comes first, what is a list, how it ends
- Topics to focus on

The persona MUST NOT contain:
- Any citation format or instruction (bracketed source markers, "cite your sources", page or table references)
- Any rule about using only the documents, accuracy, or what to do when information is missing
- Output formats such as JSON
- An opening "You are …" line — the assistant's name is added for you

Write in second person ("You help…"). Plain sentences and short lists; no capitalised headings, no filler.`;

function generatePrompts(body: Extract<GenRequest, { action: "generate" }>) {
  const system = `You write personas for a document-grounded career and government-information assistant.

${PERSONA_CONTRACT}

Focus areas:
- careers: career guidance, training pathways, applications
- policies: what government policy does and who it affects
- entrepreneurship: starting and growing a small business
- funding: where budget money goes

Return ONLY the persona text, no explanations or markdown formatting.`;

  const user = [
    `Generate a professional system prompt for a RAG-based AI assistant focused on: ${body.focus_area}`,
    body.description ? `\nUser's description: ${body.description}` : "",
    body.requirements?.length
      ? `\nAdditional requirements:\n${body.requirements.map((r) => `- ${r}`).join("\n")}`
      : "",
    "\nWrite the persona: audience, voice, focus and answer shape only.",
  ].join("");

  return { system, user };
}

function improvePrompts(body: Extract<GenRequest, { action: "improve" }>) {
  const system = `You improve personas for a document-grounded career and government-information assistant.

${PERSONA_CONTRACT}

If the current persona contains citation formats, grounding or accuracy rules, or an output format, remove them — that is part of improving it. Then make the audience, voice and answer shape clearer and more specific.

Return ONLY the improved persona text.`;

  const user = [
    `Improve this system prompt for focus area: ${body.focus_area}`,
    `\nCurrent prompt:\n${body.current_prompt}`,
    body.description ? `\nUser's feedback/requirements: ${body.description}` : "",
    body.requirements?.length
      ? `\nAdditional requirements:\n${body.requirements.map((r) => `- ${r}`).join("\n")}`
      : "",
    "\nReturn the improved persona.",
  ].join("");

  return { system, user };
}

const expertiseMap: Record<z.infer<typeof WizardDataSchema>["audienceExpertise"], string> = {
  beginner: "new to the topic and need explanations of basic concepts",
  intermediate: "have some knowledge and understand basics",
  expert: "deeply knowledgeable and want advanced insights",
  mixed: "vary in expertise level, so adapt explanations accordingly",
};

const responseLengthMap: Record<z.infer<typeof WizardDataSchema>["responseLength"], string> = {
  concise: "Keep responses brief and to-the-point. Focus on key information.",
  detailed: "Provide comprehensive explanations with full context and background.",
  adaptive: "Match response length to question complexity - brief for simple questions, detailed for complex ones.",
};

function guidedPrompts(w: z.infer<typeof WizardDataSchema>) {
  const system = `You turn structured requirements into a persona for a document-grounded career and government-information assistant.

${PERSONA_CONTRACT}

OUTPUT: Return ONLY the persona text. No explanations, no markdown, no prefix like "Here is your prompt:".`;

  const user = `Write the persona from these requirements:

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

=== SPECIAL INSTRUCTIONS ===
${w.specialInstructions || "None provided"}

=== EXAMPLE USER QUESTIONS (for context) ===
${w.exampleQuestions || "None provided"}

=== DESIRED OUTCOMES ===
${w.desiredOutcomes || "Help users get accurate, actionable information"}

Cover the audience, voice, focus and answer shape these describe. Leave out anything about citations, sources or accuracy — the assistant already handles those.`;

  return { system, user };
}

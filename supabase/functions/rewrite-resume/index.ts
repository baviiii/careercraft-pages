// rewrite-resume — AI bullet rewriting + cover letters.
//
// Routed by `type`:
//   bullet       → rewrite one bullet point (builder inline + /rewrite page)
//   cover-letter → tailored cover letter (tone = professional | confident | casual)
//
// Full-resume rewriting is NOT served here — that is ats-analyze's job
// (single full-rewrite path, per the 2026-07 resume system cleanup).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "npm:zod@3";

import { horusGenerateText } from "../_shared/ai/horus.ts";
import { ProviderError, ValidationError } from "../_shared/ai/errors.ts";
import { meterFromQuota } from "../_shared/ai/meter.ts";
import { enforcePlanQuota } from "../_shared/db/plan-quota.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

const RequestSchema = z.object({
  text: z.string().min(1, "text is required").max(40_000),
  jobDescription: z.string().min(1, "jobDescription is required").max(10_000),
  type: z.enum(["bullet", "cover-letter"]),
  tone: z
    .enum(["professional", "confident", "casual"])
    .default("professional"),
});

type RewriteRequest = z.infer<typeof RequestSchema>;

interface PromptPair { system: string; user: string; }

function buildPrompts(req: RewriteRequest): PromptPair {
  switch (req.type) {
    case "bullet":
      return {
        system: BULLET_SYSTEM,
        user: `Job Description Keywords: ${req.jobDescription.split(/\s+/).slice(0, 50).join(" ")}\n\nOriginal Bullet Point:\n${req.text}\n\nRewrite this bullet point to be ATS-optimised and achievement-focused. Return ONLY the rewritten bullet point, nothing else.`,
      };
    case "cover-letter":
      return COVER_LETTER_PROMPTS[req.tone](req);
  }
}

const BULLET_SYSTEM = `You are a human job applicant rewriting a single bullet point on your own resume.
You write plainly and specifically, like a real person describing work they actually did.

Rules:
- 8-22 words max. Max one comma.
- Start with what was done, then the tool/tech used, then result (optional).
- Prefer natural verbs: "set up", "worked on", "built", "helped with", "maintained", "wrote", "configured"
- Avoid: architected, spearheaded, orchestrated, leveraged, revolutionized, cutting-edge
- Include at least one concrete noun from the person's actual field — a tool, system, method, piece of equipment, or platform (e.g. a framework for a developer, a clinical procedure for a nurse, a machine for a tradesperson).
- Results can be approximate: "~20 users", "around 30%"
- Use past tense for previous roles.
- Do NOT make it sound like marketing copy. Plain and specific.
- FORBIDDEN: results-driven, passionate about, proven track record, innovative solutions, synergy`;

type PromptBuilder = (r: RewriteRequest) => PromptPair;

const COVER_LETTER_PROMPTS: Record<RewriteRequest["tone"], PromptBuilder> = {
  professional: (r) => coverLetter(r,
    "You are a professional cover letter writer specialising in corporate and traditional industries.",
    "Write in a formal, respectful tone. Use traditional business language. Be polite and professional throughout.",
  ),
  confident: (r) => coverLetter(r,
    "You are a bold cover letter writer who helps candidates stand out with assertive, achievement-focused language.",
    "Write with confidence and conviction. Use strong, active language. Emphasise leadership and impact. Be direct about your value.",
  ),
  casual: (r) => coverLetter(r,
    "You are a modern cover letter writer who uses friendly, conversational language while remaining professional.",
    "Write in a warm, approachable tone. Use contractions and conversational language. Be personable while staying professional.",
  ),
};

function coverLetter(r: RewriteRequest, baseSystem: string, toneInstructions: string): PromptPair {
  return {
    system: `${baseSystem}

Key requirements:
- Extract and incorporate specific metrics and achievements from the resume
- Mirror keywords from the job description naturally
- Include 3-4 paragraphs: opening, 2-3 achievement paragraphs, closing
- Quantify impact wherever possible using resume data
- Make it compelling and tailored to the specific role
- ${toneInstructions}`,
    user: `Resume:\n${r.text}\n\nJob Description:\n${r.jobDescription}\n\nWrite a tailored cover letter for this job application. Use specific achievements and metrics from the resume. Make it compelling and unique. Maximum 400 words.`,
  };
}

serve(handler(async (req) => {
  const { userId } = await requireUser(req);
  // observeOnly: limits are recorded and reported but nothing is refused yet.
  // Flip this off once the ledger shows what real usage looks like.
  const quota = await enforcePlanQuota({
    userId,
    resource: "rewrite-resume",
    resourceLabel: "AI rewriting",
    observeOnly: true,
  });
  const meter = meterFromQuota(quota, userId);

  const raw = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("Invalid request body", parsed.error.flatten());
  }

  const prompts = buildPrompts(parsed.data);

  try {
    const { text } = await horusGenerateText({
      task: `careercraft.rewrite_${parsed.data.type}`,
      system: prompts.system,
      prompt: prompts.user,
      temperature: 0.7,
      meter,
    });

    return json({ rewrittenText: text.trim() });
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new ProviderError(`AI rewrite failed: ${msg}`, "horus");
  }
}, { name: "rewrite-resume" }));

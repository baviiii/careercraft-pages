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

import { AU_SPELLING_NOTE } from "../_shared/ai/au-context.ts";
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
  /* Cover letters only: what the app already knows about the job, so the
     model names it instead of writing "[Position Title]". */
  role: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
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
${AU_SPELLING_NOTE}

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
  const known = r.role
    ? `The role is "${r.role}"${r.company ? ` at ${r.company}` : ""}. Use these names exactly.`
    : "Take the role and company names from the job description.";
  return {
    system: `${baseSystem}

This letter is for a job in AUSTRALIA:
- ${AU_SPELLING_NOTE}
- If the resume states right-to-work status (citizenship, PR, visa with work rights), carry the exact phrasing through — never reword into US visa terminology, and never invent a status that isn't there.
- If the job description lists selection criteria, briefly speak to the strongest one or two in the achievement paragraphs — and note that many Australian public-sector roles also require a separate selection-criteria statement.

Key requirements:
- Extract and incorporate specific metrics and achievements from the resume
- Mirror keywords from the job description naturally
- Include 3-4 paragraphs: opening, 2-3 achievement paragraphs, closing
- Quantify impact wherever possible using resume data
- Make it compelling and tailored to the specific role
- ${toneInstructions}

The letter is pasted straight into an application, so it must be complete:
- Never write placeholders or anything in square brackets: no [Hiring Manager's Name], [Position Title], [Company Name], [Your Name], [Date] or [Address].
- ${known} If the job description doesn't name the company, say "your team" rather than inventing one.
- Open with "Dear Hiring Manager," unless the job description names the person to write to.
- Start at the greeting: no address block, no date.
- End with "Kind regards," and the candidate's name exactly as it appears at the top of the resume. If the resume has no name, end with "Kind regards," alone.`,
    user: `Resume:\n${r.text}\n\nJob Description:\n${r.jobDescription}\n\nWrite a tailored cover letter for this job application. Use specific achievements and metrics from the resume. Make it compelling and unique. Maximum 400 words.`,
  };
}

/**
 * Belt and braces for the prompt's no-placeholder rule. Fills the common
 * blanks the app can answer, drops lines that are nothing but a blank
 * ("[Your Address]", "[Date]"), and leaves anything else for the page to
 * point out, rather than guessing.
 */
function fillPlaceholders(letter: string, r: RewriteRequest): string {
  let out = letter
    .replace(/\[(?:the )?(?:hiring manager'?s?|recipient'?s?|employer'?s?)(?: full)? name\]/gi, "Hiring Manager")
    .replace(/\[name of (?:the )?hiring manager\]/gi, "Hiring Manager");
  if (r.role) out = out.replace(/\[(?:the )?(?:position|job|role)(?: title| name)?\]/gi, r.role);
  if (r.company) out = out.replace(/\[(?:the )?(?:company|organi[sz]ation|employer|business)(?: name)?\]/gi, r.company);
  return out
    .split("\n")
    .filter((line) => !/^\s*\[[^\]]{1,60}\]\s*$/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

serve(handler(async (req) => {
  const { userId } = await requireUser(req);
  const quota = await enforcePlanQuota({
    userId,
    resource: "rewrite-resume",
    resourceLabel: "AI rewriting",
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

    const out = parsed.data.type === "cover-letter"
      ? fillPlaceholders(text.trim(), parsed.data)
      : text.trim();
    return json({ rewrittenText: out });
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new ProviderError(`AI rewrite failed: ${msg}`, "horus");
  }
}, { name: "rewrite-resume" }));

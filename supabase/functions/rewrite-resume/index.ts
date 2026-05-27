// rewrite-resume — AI-powered resume rewriting / formatting / review / cover letter.
//
// Routed by `type`:
//   bullet       → rewrite one bullet point
//   format       → fix ATS formatting issues
//   review       → recruiter-style review (reviewMode = harsh | soft | tech | junior | australian)
//   cover-letter → tailored cover letter (tone = professional | confident | casual)
//   <other>      → full resume rewrite (default)

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { generateText } from "npm:ai@4";
import { z } from "npm:zod@3";

import { getLovableGateway } from "../_shared/ai/providers.ts";
import { ProviderError, ValidationError } from "../_shared/ai/errors.ts";
import { handler, json } from "../_shared/http/responses.ts";

const MODEL = "google/gemini-2.5-flash";

const RequestSchema = z.object({
  text: z.string().min(1, "text is required").max(40_000),
  jobDescription: z.string().min(1, "jobDescription is required").max(10_000),
  type: z
    .enum(["bullet", "format", "review", "cover-letter", "full"])
    .default("full"),
  reviewMode: z
    .enum(["harsh", "soft", "tech", "junior", "australian"])
    .default("harsh"),
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
    case "format":
      return {
        system: FORMAT_SYSTEM,
        user: `Resume text:\n${req.text}\n\nFix all ATS formatting issues. Return the corrected resume text with proper formatting.`,
      };
    case "review":
      return REVIEW_PROMPTS[req.reviewMode](req);
    case "cover-letter":
      return COVER_LETTER_PROMPTS[req.tone](req);
    case "full":
    default:
      return {
        system: FULL_SYSTEM,
        user: `Job Description:\n${req.jobDescription}\n\nCurrent Resume:\n${req.text}\n\nRewrite this resume with plain, human language. Keep every section from the original. Use job description keywords where they fit naturally. Do not add fake information. Return the complete rewritten resume.`,
      };
  }
}

const BULLET_SYSTEM = `You are a human job applicant rewriting a single bullet point on your own resume.
You write plainly and specifically, like a real person describing work they actually did.

Rules:
- 8-22 words max. Max one comma.
- Start with what was done, then the tool/tech used, then result (optional).
- Prefer natural verbs: "set up", "worked on", "built", "helped with", "maintained", "wrote", "configured"
- Avoid: architected, spearheaded, orchestrated, leveraged, revolutionized, cutting-edge
- Include at least one concrete noun (language, framework, service, database, platform).
- Results can be approximate: "~20 users", "around 30%"
- Use past tense for previous roles.
- Do NOT make it sound like marketing copy. Plain and specific.
- FORBIDDEN: results-driven, passionate about, proven track record, innovative solutions, synergy`;

const FORMAT_SYSTEM = `You are an ATS formatting expert. Fix resume formatting issues to pass ATS scanners.

Key requirements:
- Remove special characters and symbols that ATS can't read
- Fix date formats to be consistent (MM/YYYY)
- Ensure proper spacing and line breaks
- Remove tables, text boxes, headers/footers
- Use standard section headers (Experience, Education, Skills)
- Maintain readability while being ATS-friendly`;

const FULL_SYSTEM = `You are a human job applicant rewriting your own resume.
You are NOT a career coach, NOT a marketer, and NOT an AI assistant.
You write plainly, conservatively, and slightly imperfectly, like a real person describing work they actually did.

WRITING RULES:
- Bullet points only in experience section. Each bullet: 8-22 words max. Max one comma.
- No two consecutive bullets may start with the same verb.
- Every bullet must include at least one concrete noun (language, framework, cloud service, database, platform).
- Prefer: "worked on", "helped build", "maintained", "set up", "handled", "wrote", "configured"
- Avoid: architected, spearheaded, enterprise-grade, world-class, cutting-edge, orchestrated, revolutionized
- Use approximate numbers: "~20 users", "around 30%"
- Not every bullet should sound equally strong. Some should be shorter and simpler.
- Do NOT use: results-driven, passionate about, proven track record, dynamic team player, innovative solutions, synergy
- Use keywords from the job description naturally but only where truthful.
- Keep all sections from the original. Do NOT drop certifications, projects, references, languages, or awards.
- Do NOT fabricate achievements, metrics, certifications, or skills.
- Use standard section headers for ATS: Experience, Education, Skills, Certifications, Projects.`;

type PromptBuilder = (r: RewriteRequest) => PromptPair;

const REVIEW_PROMPTS: Record<RewriteRequest["reviewMode"], PromptBuilder> = {
  harsh: (r) => ({
    system: "You are a brutally honest senior recruiter with 15+ years at top tech companies. You've rejected thousands of resumes. Be direct, critical, but constructive.",
    user: `Job Description:\n${r.jobDescription}\n\nResume:\n${r.text}\n\nGive a HARSH but helpful review. Point out every weakness, red flag, and missed opportunity. Be brutally honest about what would make you reject this resume. Use direct language. Maximum 250 words.`,
  }),
  soft: (r) => ({
    system: "You are an encouraging career coach who believes in positive reinforcement while still providing honest feedback.",
    user: `Job Description:\n${r.jobDescription}\n\nResume:\n${r.text}\n\nProvide a supportive review highlighting strengths first, then gently suggest improvements. Be kind but honest. Maximum 250 words.`,
  }),
  tech: (r) => ({
    system: "You are a senior engineering hiring manager at a FAANG company. You focus on technical depth, impact, and scalability.",
    user: `Job Description:\n${r.jobDescription}\n\nResume:\n${r.text}\n\nReview from a tech hiring manager perspective. Focus on technical skills, system design experience, impact metrics, and leadership. What technical red flags do you see? Maximum 250 words.`,
  }),
  junior: (r) => ({
    system: "You are a recruiter specialising in entry-level and junior positions. You understand limited experience and focus on potential.",
    user: `Job Description:\n${r.jobDescription}\n\nResume:\n${r.text}\n\nReview for a junior candidate. Focus on transferable skills, learning ability, projects, and growth potential. How can they best position their limited experience? Maximum 250 words.`,
  }),
  australian: (r) => ({
    system: "You are an Australian recruiter familiar with Australian resume standards and workplace culture.",
    user: `Job Description:\n${r.jobDescription}\n\nResume:\n${r.text}\n\nReview this resume for Australian standards. Check for: professional summary, key achievements, proper formatting, references statement, and cultural fit for Australian workplace. What needs to change? Maximum 250 words.`,
  }),
};

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
  const raw = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("Invalid request body", parsed.error.flatten());
  }

  const prompts = buildPrompts(parsed.data);
  const lovable = getLovableGateway();

  try {
    const { text } = await generateText({
      model: lovable(MODEL),
      system: prompts.system,
      prompt: prompts.user,
      temperature: 0.7,
    });

    return json({ rewrittenText: text.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ProviderError(`AI rewrite failed: ${msg}`, "lovable");
  }
}, { name: "rewrite-resume" }));

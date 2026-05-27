// onboard-analyze — AI-powered onboarding categorisation.
//
// Accepts free-text self-description, parsed resume text, or both.
// Returns a typed persona + inferred profile + targets + skills + CV standards.
// Every call is recorded in `onboarding_runs`. Users are capped at 4 runs / 24h
// (enforced via SECURITY DEFINER RPC `onboarding_runs_in_last_24h`).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { generateObject, NoObjectGeneratedError } from "npm:ai@4";
import { z } from "npm:zod@3";

import { getAnthropic } from "../_shared/ai/providers.ts";
import { ProviderError, ValidationError } from "../_shared/ai/errors.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";
import { adminClient } from "../_shared/db/supabase.ts";
import { enforceDailyLimit } from "../_shared/db/rate-limit.ts";

const DAILY_LIMIT = 4;
const MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 4096;

// ----- Request schema -----
const RequestSchema = z
  .object({
    mode: z.enum(["resume", "describe", "hybrid"]),
    text: z.string().max(8000).optional(),
    resumeText: z.string().max(24000).optional(),
    resumePath: z.string().max(500).optional(),
  })
  .refine((d) => Boolean((d.text ?? "").trim() || (d.resumeText ?? "").trim()), {
    message: "Provide text and/or resumeText",
  });

// ----- Output schema (matches the columns + UI shape) -----
const PersonaSchema = z.object({
  archetype: z.string().describe("e.g. 'Senior Backend Engineer', 'Marketing Manager in transition'"),
  seniority: z.enum(["student", "entry", "mid", "senior", "lead", "principal", "exec"]),
  function: z.string().describe("Engineering | Product | Design | Data | Marketing | Sales | Operations | Finance | HR | Legal | Customer Success | Consulting | Education | Healthcare | Research | Other"),
  subFunction: z.string().nullable().describe("e.g. 'Backend', 'Growth', 'Brand'"),
  vertical: z.string().nullable().describe("Fintech | Healthtech | Edtech | Enterprise SaaS | Consumer | Gaming | Crypto | Climate | Government | E-commerce | Media | Manufacturing | Retail | Other"),
  narrative: z.string().describe("1-2 sentences in their voice — what they do + what they want"),
});

const InferredProfileSchema = z.object({
  headline: z.string().nullable().describe("≤80 char LinkedIn-style headline"),
  bio: z.string().nullable().describe("2-3 sentence personal summary"),
  current_job_title: z.string().nullable(),
  current_company: z.string().nullable(),
  years_of_experience: z.string().nullable().describe("Range string, e.g. '5-7'"),
  industry: z.string().nullable(),
  career_level: z
    .enum(["entry", "mid", "senior", "lead", "principal", "executive"])
    .nullable(),
  location_city: z.string().nullable(),
  location_country: z.string().nullable(),
  employment_status: z
    .enum(["employed", "unemployed", "student", "freelance"])
    .nullable(),
});

const TargetsSchema = z.object({
  target_job_titles: z.array(z.string()).default([]),
  target_companies: z.array(z.string()).default([]),
  preferred_locations: z.array(z.string()).default([]),
  work_arrangement: z.array(z.enum(["remote", "hybrid", "onsite"])).default([]),
  desired_salary_min: z.number().nullable(),
  desired_salary_max: z.number().nullable(),
  desired_salary_currency: z.string().nullable().describe("ISO 4217. Default 'AUD'."),
  job_change_timeline: z
    .enum(["now", "1-3_months", "3-6_months", "6-12_months", "exploring"])
    .nullable(),
});

const JobPreferencesSchema = z.object({
  industries: z.array(z.string()).default([]),
  job_types: z
    .array(z.enum(["full-time", "part-time", "contract", "internship"]))
    .default([]),
  company_sizes: z.array(z.enum(["startup", "midsize", "enterprise"])).default([]),
  remote_preference: z.enum(["remote", "hybrid", "onsite", "any"]),
  min_salary: z.number().nullable(),
});

const SkillSchema = z.object({
  name: z.string(),
  category: z.enum(["technical", "behavioral", "leadership", "domain", "language"]),
  proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  years_experience: z.number().nullable(),
});

const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable(),
  issue_date: z.string().nullable().describe("YYYY-MM-DD or null"),
  expiry_date: z.string().nullable().describe("YYYY-MM-DD or null"),
});

const CVStandardsSchema = z.object({
  recommended_length: z.enum(["1 page", "2 pages", "3+ pages"]),
  format: z.enum(["reverse-chronological", "functional", "hybrid"]),
  ats_notes: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
});

const ConfidenceSchema = z.object({
  overall: z.number().min(0).max(1),
  persona: z.number().min(0).max(1),
  skills: z.number().min(0).max(1),
});

const AnalysisSchema = z.object({
  persona: PersonaSchema,
  inferredProfile: InferredProfileSchema,
  targets: TargetsSchema,
  jobPreferences: JobPreferencesSchema,
  skills: z.array(SkillSchema).max(20).default([]),
  certifications: z.array(CertificationSchema).default([]),
  cvStandards: CVStandardsSchema,
  confidence: ConfidenceSchema,
});

const SYSTEM_PROMPT = `You are CareerCraft's onboarding analyst. Read either a free-text self-description, a parsed resume, or both, and produce a structured categorisation of the person's career persona, current state, what they're targeting, and the standards their CV should follow.

CV STANDARDS RUBRIC
- recommended_length: "1 page" if <5y experience, "2 pages" if 5-15y, "3+ pages" only for exec/principal or 15+y
- format: "reverse-chronological" by default; "functional" for career changers; "hybrid" for those with gaps or non-linear careers
- ats_notes: actionable rules (e.g. "Use standard section headers", "Avoid tables/columns", "Include exact keywords from target_job_titles")
- improvements: specific, prioritised actions (e.g. "Quantify the impact of your Q3 launch — include a metric", "Add a one-line summary at the top")

CONFIDENCE
- One sentence of self-description → persona confidence ~0.3-0.5
- Full resume with detailed bullets → confidence ~0.85-0.95
- Be honest. Lower is fine if the input is sparse.

RULES
- Do NOT invent companies, salaries, dates, or specifics not implied by the input. Use null.
- Default desired_salary_currency to "AUD" (CareerCraft is Australia-focused) unless the input clearly suggests otherwise.
- For sparse input, return shorter skills/certifications arrays — do not pad.
- skills array: max 20 entries, ordered by relevance to their target role.`;

function buildUserMessage(input: z.infer<typeof RequestSchema>): string {
  return [
    "<input>",
    `<mode>${input.mode}</mode>`,
    "<self_description>",
    input.text || "(none)",
    "</self_description>",
    "<resume_text>",
    input.resumeText || "(none)",
    "</resume_text>",
    "</input>",
  ].join("\n");
}

serve(handler(async (req) => {
  const { userId } = await requireUser(req);

  const raw = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("Invalid request body", parsed.error.flatten());
  }
  const input = parsed.data;

  const { remaining } = await enforceDailyLimit({
    rpcName: "onboarding_runs_in_last_24h",
    userId,
    limit: DAILY_LIMIT,
    resourceLabel: "Onboarding analysis",
  });

  const admin = adminClient();

  const { data: runRow, error: runErr } = await admin
    .from("onboarding_runs")
    .insert({
      user_id: userId,
      mode: input.mode,
      raw_text: input.text ?? null,
      resume_path: input.resumePath ?? null,
      status: "pending",
    })
    .select()
    .single();
  if (runErr || !runRow) {
    throw new Error(`Failed to initialise run: ${runErr?.message ?? "unknown"}`);
  }

  await admin.from("onboarding_runs")
    .update({ status: "streaming" })
    .eq("id", runRow.id);

  try {
    const anthropic = getAnthropic();
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
      schema: AnalysisSchema,
      schemaName: "OnboardingAnalysis",
      schemaDescription: "Structured career persona + targets + CV standards.",
      maxTokens: MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
          // Long system prompt is reused across re-runs — ephemeral cache cuts cost.
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        { role: "user", content: buildUserMessage(input) },
      ],
    });

    await admin.from("onboarding_runs")
      .update({
        status: "completed",
        ai_analysis: object,
        model: MODEL,
        input_tokens: usage?.promptTokens ?? null,
        output_tokens: usage?.completionTokens ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    return json({
      ok: true,
      runId: runRow.id,
      analysis: object,
      runsRemaining: remaining,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("onboarding_runs")
      .update({
        status: "failed",
        error_message: msg.slice(0, 1000),
        ai_analysis: NoObjectGeneratedError.isInstance(err)
          ? { raw: String((err as unknown as { text?: string }).text ?? "").slice(0, 4000) }
          : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    if (NoObjectGeneratedError.isInstance(err)) {
      throw new ProviderError("Model returned unparseable output", "anthropic");
    }
    throw new ProviderError(`AI analysis failed: ${msg}`, "anthropic");
  }
}, { name: "onboard-analyze" }));

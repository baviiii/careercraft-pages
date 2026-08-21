// onboard-analyze — AI-powered onboarding categorisation.
//
// Accepts free-text self-description, parsed resume text, or both.
// Returns a typed persona + inferred profile + targets + skills + CV standards.
// Every call is recorded in `onboarding_runs`. Users are capped at 4 runs / 24h
// (enforced via SECURITY DEFINER RPC `onboarding_runs_in_last_24h`).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "npm:zod@3";

import { horusGenerateObject, type HorusTier } from "../_shared/ai/horus.ts";
import { ProviderError, RateLimitError, ValidationError } from "../_shared/ai/errors.ts";
import { meterFromQuota, type MeterContext } from "../_shared/ai/meter.ts";
import { enforcePlanQuota, refundPlanQuota } from "../_shared/db/plan-quota.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";
import { adminClient } from "../_shared/db/supabase.ts";
import { optEnv } from "../_shared/env.ts";

const DAILY_LIMIT = 10;
const ONBOARD_TIER = () => optEnv("ONBOARD_MODEL_TIER", "deep")! as HorusTier;
const MAX_OUTPUT_TOKENS = 6144;

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
// Lenient by design: LLMs vary enum casing/format ("junior", "3-6 months"),
// return numbers as strings, or omit fields. We accept loose input here and
// normalise downstream, rather than 502-ing on a single mismatch.
// `function` is reserved in JSON Schema — use job_function, map on response.

const looseStr = z.string().nullish().transform((v) => v ?? null);
// Models sometimes emit a bare string where an array belongs — wrap it.
const strArray = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() ? [v] : []) : v),
  z
    .array(z.union([z.string(), z.number()]).transform(String))
    .nullish()
    .transform((v) => v ?? []),
);
const nullableNumber = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}, z.number().nullable());
const confNumber = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return 0.5;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}, z.number().min(0).max(1));

const PersonaSchema = z.object({
  archetype: looseStr,
  seniority: looseStr,
  job_function: looseStr,
  subFunction: looseStr,
  vertical: looseStr,
  narrative: looseStr,
});

const InferredProfileSchema = z.object({
  full_name: looseStr,
  phone: looseStr,
  headline: looseStr,
  bio: looseStr,
  current_job_title: looseStr,
  current_company: looseStr,
  years_of_experience: looseStr,
  industry: looseStr,
  career_level: looseStr,
  location_city: looseStr,
  location_country: looseStr,
  employment_status: looseStr,
});

const TargetsSchema = z.object({
  target_job_titles: strArray,
  target_companies: strArray,
  preferred_locations: strArray,
  work_arrangement: strArray,
  desired_salary_min: nullableNumber,
  desired_salary_max: nullableNumber,
  desired_salary_currency: looseStr,
  job_change_timeline: looseStr,
});

const JobPreferencesSchema = z.object({
  industries: strArray,
  job_types: strArray,
  company_sizes: strArray,
  remote_preference: z.string().nullish().transform((v) => v ?? "any"),
  min_salary: nullableNumber,
});

const SkillSchema = z.object({
  name: z.string(),
  category: z.string().nullish().transform((v) => v ?? "domain"),
  proficiency: z.string().nullish().transform((v) => v ?? "intermediate"),
  years_experience: nullableNumber,
});

const CertificationSchema = z.object({
  name: z.string(),
  issuer: looseStr,
  issue_date: looseStr,
  expiry_date: looseStr,
});

const CVStandardsSchema = z.object({
  recommended_length: z.string().nullish().transform((v) => v ?? "1 page"),
  format: z.string().nullish().transform((v) => v ?? "reverse-chronological"),
  ats_notes: strArray,
  improvements: strArray,
});

const ConfidenceSchema = z.object({
  overall: confNumber,
  persona: confNumber,
  skills: confNumber,
}).nullish().transform((v) => v ?? { overall: 0.5, persona: 0.5, skills: 0.5 });

const AnalysisSchema = z.object({
  persona: PersonaSchema,
  inferredProfile: InferredProfileSchema,
  targets: TargetsSchema,
  jobPreferences: JobPreferencesSchema,
  skills: z.array(SkillSchema).max(20).nullish().transform((v) => v ?? []),
  certifications: z.array(CertificationSchema).nullish().transform((v) => v ?? []),
  cvStandards: CVStandardsSchema,
  confidence: ConfidenceSchema,
});

type RawAnalysis = z.infer<typeof AnalysisSchema>;

/** Map model output (job_function) to the client/DB shape (function). */
function toClientAnalysis(raw: RawAnalysis) {
  const { job_function, ...personaRest } = raw.persona;
  return {
    ...raw,
    persona: { ...personaRest, function: job_function },
  };
}

/** Only successful analyses count toward the daily cap — failed debug runs don't burn quota. */
async function enforceOnboardingLimit(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await adminClient()
    .from("onboarding_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("created_at", since);

  if (error) throw new Error(`Rate-limit check failed: ${error.message}`);

  const used = count ?? 0;
  if (used >= DAILY_LIMIT) {
    throw new RateLimitError(
      `Daily limit reached for Onboarding analysis (${DAILY_LIMIT} per 24h). Try again later.`,
      undefined,
      DAILY_LIMIT,
    );
  }
  return Math.max(0, DAILY_LIMIT - used - 1);
}

const JSON_SYSTEM =
  "You must respond with a single JSON object matching the OnboardingAnalysis shape. " +
  "Use job_function (not function) for career function. " +
  "Use null for unknown fields. No markdown fences, no commentary.";

async function runAnalysis(userMessage: string, meter: MeterContext) {
  const tier = ONBOARD_TIER();
  console.log(`[onboard-analyze] via horus (${tier})`);
  // horusGenerateObject zod-validates and retries once with the schema issues
  // fed back — replaces the old json-text + generateObject two-path dance.
  const { object, usage, modelId } = await horusGenerateObject(AnalysisSchema, {
    task: "careercraft.onboard_analyze",
    system: `${SYSTEM_PROMPT}\n\n${JSON_SYSTEM}`,
    prompt: userMessage,
    model: tier,
    temperature: 0.2,
    maxTokens: MAX_OUTPUT_TOKENS,
    meter,
  });
  return { analysis: toClientAnalysis(object), usage, modelId };
}

const SYSTEM_PROMPT = `You are CareerCraft's onboarding analyst. Read either a free-text self-description, a parsed resume, or both, and produce a COMPLETE, properly categorised profile: who this person is, where they are in their career, what they're targeting, and the standards their CV should follow. Your output is written directly into their profile settings, so every field you can justify from the input MUST be filled — a missed field is a broken profile page.

CANONICAL VOCABULARY — these fields are dropdowns in the product. You MUST use these EXACT strings (case-sensitive). Pick the closest match; never output variants like "Tech", "Junior", "7 years" or "Employed".
- inferredProfile.industry — one of: "Technology" | "Healthcare" | "Finance & Banking" | "Education" | "Manufacturing" | "Retail" | "Consulting" | "Media & Entertainment" | "Real Estate" | "Government" | "Non-Profit" | "Energy" | "Transportation" | "Hospitality" | "Legal" | "Agriculture" | "Construction" | "Telecommunications" | "Pharmaceuticals" | "Other"
- inferredProfile.career_level — one of: "entry" | "mid" | "senior" | "lead" | "manager" | "director" | "vp" | "c-level"
- inferredProfile.years_of_experience — one of: "0-1" | "1-3" | "3-5" | "5-10" | "10-15" | "15+" (bucket their total professional experience; count from earliest job/graduation)
- inferredProfile.employment_status — one of: "employed" | "actively_looking" | "open" | "not_looking" ("actively_looking" if unemployed, a student seeking work, or clearly hunting; "open" if employed but receptive)
- targets.work_arrangement — array drawn ONLY from: "remote" | "hybrid" | "onsite"
- targets.job_change_timeline — one of: "immediately" | "1-3_months" | "3-6_months" | "exploring"
- jobPreferences.remote_preference — one of: "remote" | "hybrid" | "onsite" | "any"
- jobPreferences.job_types — array from: "full-time" | "part-time" | "contract" | "freelance" | "internship"
- jobPreferences.company_sizes — array from: "startup" | "small" | "medium" | "large" | "enterprise"
- jobPreferences.industries — array using the SAME canonical industry list as above
- skills[].category — one of: "technical" | "behavioral" | "leadership" | "domain" | "language"
- skills[].proficiency — one of: "beginner" | "intermediate" | "advanced" | "expert"
- persona.seniority — one of: "student" | "entry" | "mid" | "senior" | "lead" | "principal" | "exec"

PERSONA
- archetype: a vivid 2-4 word title that captures their professional identity (e.g. "Systems-Minded Builder", "Emerging Care Professional") — not their literal job title.
- job_function: broad function ("Software Engineering", "Nursing", "Marketing", "Accounting", "Operations", "Design", "Data & Analytics", "Sales", "Education", "Trades", "Legal", "Human Resources", ...).
- subFunction: the specialisation within it ("Backend", "Aged Care", "Performance Marketing") or null.
- vertical: the industry vertical they operate in ("FinTech", "Public Health", "Construction") or null.
- narrative: 2-3 sentences, second person ("You are..."), warm but concrete: where they are, what stands out, where they're heading. This is the first thing they read about themselves — make it feel accurate, not generic.

INFERRED PROFILE — mine the input hard before giving up on a field:
- full_name / phone: extract from resume contact block if present (never invent).
- headline: a crisp professional headline ≤ 80 chars, "Title with focus" style (e.g. "Senior Backend Engineer — Distributed Systems"). Write one even from sparse input.
- bio: 2-3 first-person sentences summarising experience and strengths, usable as their profile bio.
- current_job_title / current_company: most recent role. If unemployed/student, title can still be their profession ("Registered Nurse"), company null.
- location_city / location_country: from contact block or context. An Australian city implies country "Australia". Capitalise properly ("Adelaide", "Australia").

TARGETS — what they want next. Infer sensibly when not stated:
- target_job_titles: 2-4 concrete, searchable role titles. If they only gave a resume, propose the natural next step(s) for their trajectory (e.g. mid engineer → "Senior Software Engineer"). Use real job-board titles, not fantasy titles.
- target_companies: only companies they name or obvious sector leaders they reference. Empty array if none.
- preferred_locations: stated locations, else their current city. Format "City" or "City, Country".
- desired_salary_min/max: ONLY if stated or strongly implied. Otherwise null. Currency default "AUD".
- work_arrangement: what they'd accept; if unstated, infer from their field's norms (e.g. trades → ["onsite"], software → ["remote","hybrid"]).

JOB PREFERENCES
- industries: 1-3 canonical industries they fit or aspire to (always include their primary industry).
- job_types: default ["full-time"] unless input suggests otherwise (student → add "internship"/"part-time").
- company_sizes: only when signalled (startup background, enterprise history), else [].

SKILLS — be exhaustive, this drives job matching:
- Extract EVERY distinct skill the input evidences: hard tools/technologies (technical), domain expertise (domain), soft skills with evidence (behavioral), people/leadership signals (leadership), spoken languages (language).
- Skills exist in every profession — clinical procedures, trade tickets, teaching methods, kitchen sections, bookkeeping software all count. Do NOT bias toward IT skills, and do NOT translate non-IT work into tech-sounding skills.
- Each skill name is a short noun phrase (1-4 words) — never a sentence, a duty, or a fragment copied from a bullet.
- Extract ONLY what the input evidences. Never invent skills from a job title alone, and never pad with generic filler ("Hard Working", "Team Player") the input doesn't claim.
- From a full resume expect 12-20 skills; from one sentence maybe 2-5. Max 20, ordered by relevance to the target roles.
- proficiency: judge from years, seniority, and how central the skill is — don't default everything to "intermediate".
- years_experience: set when derivable from dates; else null.
- Use canonical skill names ("PowerPoint" not "MS PPT", "Stakeholder Management" not "dealing with stakeholders").

CERTIFICATIONS
- Every certification, licence, registration, or credential (e.g. "AHPRA Registration", "White Card", "AWS Solutions Architect") with issuer and dates when present (dates as YYYY-MM-DD or YYYY-MM or YYYY).

CV STANDARDS RUBRIC
- recommended_length: "1 page" if <5y experience, "2 pages" if 5-15y, "3+ pages" only for exec/principal or 15+y
- format: "reverse-chronological" by default; "functional" for career changers; "hybrid" for those with gaps or non-linear careers
- ats_notes: actionable rules (e.g. "Use standard section headers", "Avoid tables/columns", "Include exact keywords from target_job_titles")
- improvements: specific, prioritised actions grounded in THEIR input (e.g. "Quantify the impact of your Q3 launch — include a metric"), not generic advice. Each improvement must reference something concrete from their resume or description — a role, project, certification, or gap — and fit their actual profession (a nurse gets clinical-career advice, not software advice).

CONFIDENCE
- One sentence of self-description → persona confidence ~0.3-0.5
- Full resume with detailed bullets → confidence ~0.85-0.95
- Be honest. Lower is fine if the input is sparse.

RULES
- Do NOT invent companies, salaries, dates, phone numbers, or specifics not implied by the input. Use null.
- Default desired_salary_currency to "AUD" (CareerCraft is Australia-focused) unless the input clearly suggests otherwise.
- For sparse input, return shorter skills/certifications arrays — do not pad.
- Every enum field above MUST use the exact canonical string. This is a hard contract, not a suggestion.`;

function buildUserMessage(input: z.infer<typeof RequestSchema>): string {
  const resumeText = (input.resumeText ?? "").slice(0, 16_000);
  const text = (input.text ?? "").slice(0, 4_000);
  return [
    "<input>",
    `<mode>${input.mode}</mode>`,
    "<self_description>",
    text || "(none)",
    "</self_description>",
    "<resume_text>",
    resumeText || "(none)",
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

  const remaining = await enforceOnboardingLimit(userId);

  // Runs alongside the legacy counter above while limits are being tuned.
  // enforceOnboardingLimit counts only completed runs, so a provider outage
  // costs the user nothing; the refund in the catch block below preserves that
  // policy once this becomes the enforcing path.
  const quota = await enforcePlanQuota({
    userId,
    resource: "onboard-analyze",
    resourceLabel: "onboarding analysis",
  });
  const meter = meterFromQuota(quota, userId);

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
    const { analysis, usage, modelId } = await runAnalysis(buildUserMessage(input), meter);

    await admin.from("onboarding_runs")
      .update({
        status: "completed",
        ai_analysis: analysis,
        model: modelId,
        input_tokens: usage?.promptTokens ?? null,
        output_tokens: usage?.completionTokens ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    return json({
      ok: true,
      runId: runRow.id,
      analysis,
      runsRemaining: remaining,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("onboarding_runs")
      .update({
        status: "failed",
        error_message: msg.slice(0, 1000),
        ai_analysis: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    // Hand the unit back. The old counter only ever counted completed runs, so
    // a Horus outage cost the user nothing; consuming up front would otherwise
    // quietly regress that and eat a free user's monthly onboarding allowance.
    // A RateLimitError is not refunded — nothing was consumed in that case.
    if (!(err instanceof RateLimitError)) {
      await refundPlanQuota(userId, "onboard-analyze");
    }

    if (err instanceof ProviderError) throw err;
    throw new ProviderError(`AI analysis failed: ${msg}`, "horus");
  }
}, { name: "onboard-analyze" }));

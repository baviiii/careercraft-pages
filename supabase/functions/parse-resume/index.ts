// parse-resume — Structured resume extraction.
//
// Vision-first:
//   JSON body   → plain text (DOCX/TXT pre-extracted on client) → Azure OpenAI structure
//   FormData    → page images → Azure OpenAI multimodal (gpt-4o-mini) reads visually
//
// The Azure Document Intelligence OCR fallback was removed with the rest of the
// decommissioned CareerCraft Azure estate; gpt-4o vision reads scanned pages.
//
// This is the one edge function that talks to Azure OpenAI directly instead of
// the Horus gateway: the vision path needs image inputs, which Horus /api/infer
// doesn't accept (yet).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { generateObject } from "npm:ai@4";
import { z } from "npm:zod@3";

import { AU_PARSING_RULES } from "../_shared/ai/au-context.ts";
import { getAzure } from "../_shared/ai/providers.ts";
import { ConfigError, ProviderError, ValidationError } from "../_shared/ai/errors.ts";
import { meterFromQuota, type MeterContext } from "../_shared/ai/meter.ts";
import { handler, json } from "../_shared/http/responses.ts";
import { optEnv } from "../_shared/env.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { enforcePlanQuota } from "../_shared/db/plan-quota.ts";
import { recordTokenSpend } from "../_shared/db/token-usage.ts";


const ParsedResumeSchema = z.object({
  personalInfo: z.object({
    fullName: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable().describe("city, state/country"),
    linkedin: z.string().nullable(),
    website: z.string().nullable(),
    summary: z.string().nullable().describe("Professional summary / objective text"),
  }),
  workExperience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    location: z.string().nullable(),
    startDate: z.string().nullable().describe("YYYY-MM or YYYY"),
    endDate: z.string().nullable().describe("YYYY-MM or YYYY; null when current"),
    current: z.boolean(),
    bullets: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: z.string().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    gpa: z.string().nullable(),
    achievements: z.array(z.string()).default([]),
  })).default([]),
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string()),
  })).default([]),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().nullable(),
    date: z.string().nullable(),
    expiryDate: z.string().nullable(),
  })).default([]),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.string().nullable(),
  })).default([]),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    technologies: z.array(z.string()).default([]),
    url: z.string().nullable(),
  })).default([]),
  references: z.array(z.object({
    name: z.string(),
    title: z.string().nullable(),
    company: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    relationship: z.string().nullable(),
  })).default([]),
  awards: z.array(z.object({
    title: z.string(),
    issuer: z.string().nullable(),
    date: z.string().nullable(),
    description: z.string().nullable(),
  })).default([]),
  volunteer: z.array(z.object({
    role: z.string(),
    organization: z.string(),
    location: z.string().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    current: z.boolean(),
    description: z.string().nullable(),
  })).default([]),
  publications: z.array(z.object({
    title: z.string(),
    publisher: z.string().nullable(),
    date: z.string().nullable(),
    url: z.string().nullable(),
    description: z.string().nullable(),
  })).default([]),
  confidence: z.number().min(0).max(1),
});

const JsonBodySchema = z.object({
  rawText: z.string().min(1).max(60_000),
  fileName: z.string().default("document.txt"),
  fileType: z.string().default("text/plain"),
  pageCount: z.number().int().positive().default(1),
});

const SKILLS_RULES = `SKILLS — resumes come from EVERY profession (nurses, tradespeople, teachers, chefs, accountants, engineers, retail…), not just IT:
- Extract ONLY skills the resume actually states or clearly evidences. Never invent skills, never infer them from a job title alone, never pad with generic filler ("Hard Working", "Team Player") unless the resume itself claims them.
- Each skill item is a short noun phrase (1-4 words) in its canonical form ("Wound Care", "Forklift Operation", "MYOB", "Stakeholder Management") — never a sentence, duty description, or fragment of a bullet.
- Group into categories NAMED FOR THE PROFESSION on the page: "Clinical Skills", "Trade Skills", "Teaching & Curriculum", "Software", "Customer Service", "Languages"… Only use "Programming Languages"/"Technical Skills" when the resume is actually technical.
- Deduplicate (case-insensitive). Do not repeat a skill across categories.`;

const TEXT_SYSTEM_PROMPT = `You are a precise resume parser. Extract ALL information present. Use null where data is missing — never guess.

Date format: YYYY-MM where available, else YYYY. For currently-held roles set current=true and endDate=null.

${AU_PARSING_RULES}

${SKILLS_RULES}

Confidence (0-1): completeness × clarity × volume extracted.`;

const VISION_SYSTEM_PROMPT = `You are a precise resume parser reading resume page images.

Read the visual layout (multi-column, Canva templates, sidebars, skill bars) in correct human reading order — not raw PDF text order.
Extract ALL information present. Use null where data is missing — never guess.

Date format: YYYY-MM where available, else YYYY. For currently-held roles set current=true and endDate=null.

${AU_PARSING_RULES}

${SKILLS_RULES}

Confidence (0-1): rate honestly —
  0.85+ clear digital resume with readable sections
  0.5–0.7 complex layout but mostly readable
  below 0.5 blurry scan, heavy graphics hiding text, or illegible sections`;

type ParsedResume = z.infer<typeof ParsedResumeSchema>;
type ExtractionRoute = "text" | "vision";

function getStructureModel() {
  const deployment = optEnv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini")!;
  return getAzure()(deployment);
}


async function structureFromText(rawText: string, meter: MeterContext): Promise<ParsedResume> {
  const startedAt = Date.now();
  const { object, usage } = await generateObject({
    model: getStructureModel(),
    schema: ParsedResumeSchema,
    schemaName: "ParsedResume",
    system: TEXT_SYSTEM_PROMPT,
    prompt: `Resume text:\n${rawText.substring(0, 15_000)}`,
    temperature: 0.1,
    maxTokens: 4000,
  });

  // provider: "azure" — this path spends CareerCraft's own AZURE_OPENAI_KEY,
  // not Horus's budget, so it lands on a different invoice and is worth being
  // able to separate in the ledger.
  await recordTokenSpend(meter, {
    task: "careercraft.parse_resume_text",
    provider: "azure",
    model: optEnv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini"),
    promptTokens: usage?.promptTokens,
    completionTokens: usage?.completionTokens,
    durationMs: Date.now() - startedAt,
    metadata: { route: "text" },
  });

  return object;
}

type ImagePart = { mimeType: string; base64: string };

function parseDataUrl(dataUrl: string): ImagePart {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new ValidationError("Invalid page image data URL");
  return { mimeType: match[1], base64: match[2] };
}

async function fileToImagePart(file: File): Promise<ImagePart> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const base64 = btoa(String.fromCharCode(...buf));
  const mimeType = file.type || "image/jpeg";
  return { mimeType, base64 };
}

async function structureFromVision(images: ImagePart[], meter: MeterContext): Promise<ParsedResume> {
  if (!images.length) {
    throw new ValidationError("At least one page image is required for vision parsing");
  }

  const content: Array<{ type: "text"; text: string } | { type: "image"; image: string; mimeType?: string }> = [
    {
      type: "text",
      text: "Extract the full resume from these page image(s). Respect visual columns and section layout.",
    },
  ];

  for (const img of images) {
    content.push({ type: "image", image: img.base64, mimeType: img.mimeType });
  }

  const startedAt = Date.now();
  const { object, usage } = await generateObject({
    model: getStructureModel(),
    schema: ParsedResumeSchema,
    schemaName: "ParsedResume",
    messages: [
      { role: "system", content: VISION_SYSTEM_PROMPT },
      { role: "user", content },
    ],
    temperature: 0.1,
    maxTokens: 4000,
  });

  // The most expensive single call in the product: up to three full-page
  // images at 4000 output tokens.
  await recordTokenSpend(meter, {
    task: "careercraft.parse_resume_vision",
    provider: "azure",
    model: optEnv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini"),
    promptTokens: usage?.promptTokens,
    completionTokens: usage?.completionTokens,
    durationMs: Date.now() - startedAt,
    metadata: { route: "vision", pages: images.length },
  });

  return object;
}

function successResponse(
  object: ParsedResume,
  opts: {
    rawText: string;
    fileName: string;
    fileType: string;
    pageCount: number;
    extractionRoute: ExtractionRoute;
  },
) {
  return json({
    success: true,
    parsed: {
      ...object,
      rawText: opts.rawText,
      sourceFile: { name: opts.fileName, type: opts.fileType, pages: opts.pageCount },
    },
    extractionRoute: opts.extractionRoute,
    message: `Parsed ${opts.pageCount} page(s) via ${opts.extractionRoute} with ${Math.round(object.confidence * 100)}% confidence`,
  });
}

serve(handler(async (req) => {
  const ctx = await requireUser(req);
  const quota = await enforcePlanQuota({
    userId: ctx.userId,
    resource: 'parse-resume',
    resourceLabel: 'resume parsing',
  });
  const meter = meterFromQuota(quota, ctx.userId);

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const raw = await req.json().catch(() => null);
    const parsed = JsonBodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid JSON body", parsed.error.flatten());
    }
    const { rawText, fileName, fileType, pageCount } = parsed.data;
    console.log(`[parse-resume] text path (${rawText.length} chars)`);

    const object = await structureFromText(rawText, meter);
    return successResponse(object, {
      rawText,
      fileName,
      fileType,
      pageCount,
      extractionRoute: "text",
    });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    throw new ValidationError("No file provided in FormData (field name must be 'file')");
  }

  const fileName = (formData?.get("fileName") as string | null) ?? file.name ?? "document";
  const fileType = file.type || "application/pdf";
  console.log(`[parse-resume] vision path: ${fileName} (${fileType}, ${file.size} bytes)`);

  const pageImagesRaw = formData?.get("pageImages");
  let imageParts: ImagePart[] = [];

  if (typeof pageImagesRaw === "string" && pageImagesRaw.trim()) {
    try {
      const urls = JSON.parse(pageImagesRaw) as string[];
      if (Array.isArray(urls)) {
        imageParts = urls.slice(0, 3).map(parseDataUrl);
      }
    } catch {
      throw new ValidationError("pageImages must be a JSON array of data URLs");
    }
  }

  if (imageParts.length === 0 && fileType.startsWith("image/")) {
    imageParts = [await fileToImagePart(file)];
  }

  // Azure Document Intelligence was the OCR fallback here. It lived in the
  // CareerCraft Azure estate that has been decommissioned along with the
  // search service and Function App, so those calls could no longer succeed.
  // gpt-4o vision is the primary route and handles scanned pages directly.
  if (imageParts.length === 0) {
    throw new ValidationError(
      "Could not read this file. Convert it to PDF or an image and try again — " +
        "page rendering produced no images to analyse.",
    );
  }

  const visionResult = await structureFromVision(imageParts, meter);
  console.log(`[parse-resume] vision confidence ${visionResult.confidence}`);

  return successResponse(visionResult, {
    rawText: "",
    fileName,
    fileType,
    pageCount: imageParts.length,
    extractionRoute: "vision",
  });
}, { name: "parse-resume" }));


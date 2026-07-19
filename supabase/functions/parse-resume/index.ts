// parse-resume — Structured resume extraction.
//
// Vision-first with Document Intelligence fallback:
//   JSON body   → plain text (DOCX/TXT pre-extracted on client) → Azure OpenAI structure
//   FormData    → page images (+ original file for DI fallback)
//                 1. Azure OpenAI multimodal (gpt-4o-mini) reads the resume visually
//                 2. If confidence is low → Azure Document Intelligence → re-structure text
//
// This is the one edge function that talks to Azure OpenAI directly instead of
// the Horus gateway: the vision path needs image inputs, which Horus /api/infer
// doesn't accept (yet).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { generateObject } from "npm:ai@4";
import { z } from "npm:zod@3";

import { getAzure } from "../_shared/ai/providers.ts";
import { ConfigError, ProviderError, ValidationError } from "../_shared/ai/errors.ts";
import { handler, json } from "../_shared/http/responses.ts";
import { optEnv } from "../_shared/env.ts";

const VISION_CONFIDENCE_FALLBACK = 0.55;

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

${SKILLS_RULES}

Confidence (0-1): completeness × clarity × volume extracted.`;

const VISION_SYSTEM_PROMPT = `You are a precise resume parser reading resume page images.

Read the visual layout (multi-column, Canva templates, sidebars, skill bars) in correct human reading order — not raw PDF text order.
Extract ALL information present. Use null where data is missing — never guess.

Date format: YYYY-MM where available, else YYYY. For currently-held roles set current=true and endDate=null.

${SKILLS_RULES}

Confidence (0-1): rate honestly —
  0.85+ clear digital resume with readable sections
  0.5–0.7 complex layout but mostly readable
  below 0.5 blurry scan, heavy graphics hiding text, or illegible sections`;

type ParsedResume = z.infer<typeof ParsedResumeSchema>;
type ExtractionRoute = "text" | "vision" | "document-intelligence";

function getStructureModel() {
  const deployment = optEnv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini")!;
  return getAzure()(deployment);
}

function shouldFallbackToDi(result: ParsedResume): boolean {
  if (result.confidence < VISION_CONFIDENCE_FALLBACK) return true;
  if (result.workExperience.length === 0 && result.confidence < 0.75) return true;
  const hasContact = Boolean(
    result.personalInfo.fullName || result.personalInfo.email || result.personalInfo.phone,
  );
  if (!hasContact && result.workExperience.length === 0) return true;
  return false;
}

async function structureFromText(rawText: string): Promise<ParsedResume> {
  const { object } = await generateObject({
    model: getStructureModel(),
    schema: ParsedResumeSchema,
    schemaName: "ParsedResume",
    system: TEXT_SYSTEM_PROMPT,
    prompt: `Resume text:\n${rawText.substring(0, 15_000)}`,
    temperature: 0.1,
    maxTokens: 4000,
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

async function structureFromVision(images: ImagePart[]): Promise<ParsedResume> {
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

  const { object } = await generateObject({
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
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const raw = await req.json().catch(() => null);
    const parsed = JsonBodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid JSON body", parsed.error.flatten());
    }
    const { rawText, fileName, fileType, pageCount } = parsed.data;
    console.log(`[parse-resume] text path (${rawText.length} chars)`);

    const object = await structureFromText(rawText);
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

  if (imageParts.length === 0) {
    console.log("[parse-resume] no page images — using Document Intelligence directly");
    const extracted = await extractWithDocumentIntelligence(file);
    const object = await structureFromText(extracted.text);
    return successResponse(object, {
      rawText: extracted.text,
      fileName,
      fileType,
      pageCount: extracted.pageCount,
      extractionRoute: "document-intelligence",
    });
  }

  let visionResult: ParsedResume;
  try {
    visionResult = await structureFromVision(imageParts);
    console.log(`[parse-resume] vision confidence ${visionResult.confidence}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[parse-resume] vision failed (${msg}) — falling back to DI`);
    const extracted = await extractWithDocumentIntelligence(file);
    const object = await structureFromText(extracted.text);
    return successResponse(object, {
      rawText: extracted.text,
      fileName,
      fileType,
      pageCount: extracted.pageCount,
      extractionRoute: "document-intelligence",
    });
  }

  if (!shouldFallbackToDi(visionResult)) {
    return successResponse(visionResult, {
      rawText: "",
      fileName,
      fileType,
      pageCount: imageParts.length,
      extractionRoute: "vision",
    });
  }

  console.log("[parse-resume] low vision confidence — escalating to Document Intelligence");
  try {
    const extracted = await extractWithDocumentIntelligence(file);
    const object = await structureFromText(extracted.text);
    return successResponse(object, {
      rawText: extracted.text,
      fileName,
      fileType,
      pageCount: extracted.pageCount,
      extractionRoute: "document-intelligence",
    });
  } catch (diErr) {
    console.warn(
      `[parse-resume] DI fallback failed (${diErr instanceof Error ? diErr.message : diErr}) — using vision result`,
    );
    return successResponse(visionResult, {
      rawText: "",
      fileName,
      fileType,
      pageCount: imageParts.length,
      extractionRoute: "vision",
    });
  }
}, { name: "parse-resume" }));

// ----- Azure Document Intelligence (OCR / layout fallback) -----

async function extractWithDocumentIntelligence(file: File): Promise<{ text: string; pageCount: number }> {
  const endpoint = optEnv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT");
  const key = optEnv("AZURE_DOCUMENT_INTELLIGENCE_KEY");
  if (!endpoint || !key) {
    throw new ConfigError(
      "Document Intelligence fallback requires AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY",
    );
  }

  const clean = endpoint.replace(/\/$/, "");
  const buf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));

  const apiCandidates = [
    { path: "/documentintelligence/documentModels/prebuilt-layout:analyze", version: "2024-11-30" },
    { path: "/documentintelligence/documentModels/prebuilt-layout:analyze", version: "2024-07-31-preview" },
    { path: "/formrecognizer/documentModels/prebuilt-layout:analyze", version: "2023-07-31" },
  ];

  let operationLocation: string | null = null;
  let lastError = "no attempts made";

  for (const c of apiCandidates) {
    const url = `${clean}${c.path}?api-version=${c.version}`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ base64Source: base64 }),
      });
      if (resp.ok) {
        operationLocation = resp.headers.get("Operation-Location");
        if (operationLocation) {
          console.log(`[parse-resume] DI started via ${c.version}`);
          break;
        }
      } else {
        lastError = `${resp.status}: ${(await resp.text()).slice(0, 200)}`;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!operationLocation) {
    throw new ProviderError(
      `Document Intelligence: all API versions failed (${lastError})`,
      "azure-document-intelligence",
    );
  }

  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    const statusResp = await fetch(operationLocation, {
      headers: { "Ocp-Apim-Subscription-Key": key },
    });
    if (!statusResp.ok) {
      throw new ProviderError(
        `Document Intelligence status check failed: ${statusResp.status}`,
        "azure-document-intelligence",
        statusResp.status,
      );
    }
    const status = await statusResp.json();
    if (status.status === "succeeded") {
      const result = status.analyzeResult ?? {};
      return {
        text: result.content || "",
        pageCount: result.pages?.length || 1,
      };
    }
    if (status.status === "failed") {
      throw new ProviderError("Document Intelligence analysis failed", "azure-document-intelligence");
    }
  }

  throw new ProviderError("Document Intelligence timed out after 30s", "azure-document-intelligence");
}

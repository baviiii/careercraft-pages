// parse-resume — Structured resume extraction.
//
// Both routes go through the Horus gateway (Claude on Amazon Bedrock):
//   JSON body   → plain text (DOCX/TXT pre-extracted on client) → structured
//   FormData    → page images (PDF pages rendered on client, or a photo) →
//                 the model reads the pages visually, columns and all
//
// This used to call Azure OpenAI (gpt-4o) directly, because Horus didn't take
// images. That Azure resource is gone; Horus now takes images in user turns.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { z } from "npm:zod@3";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3";

import { AU_PARSING_RULES } from "../_shared/ai/au-context.ts";
import { horusGenerateObject, type HorusContentPart } from "../_shared/ai/horus.ts";
import { UnauthorizedError, ValidationError } from "../_shared/ai/errors.ts";
import { meterFromQuota, systemMeter, type MeterContext } from "../_shared/ai/meter.ts";
import { handler, json } from "../_shared/http/responses.ts";
import { clientIp as trustedClientIp } from "../_shared/http/access.ts";
import { optionalUser } from "../_shared/http/auth.ts";
import { enforcePlanQuota } from "../_shared/db/plan-quota.ts";
import { enforceAnonymousWindowLimit } from "../_shared/db/rate-limit.ts";


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

/* Sent with every parse, so the model fills exactly this shape instead of
   "some JSON object" — with no shape, a long answer can stop after its first
   section. The zod schema still checks what comes back. */
const { $schema: _draft, ...PARSED_RESUME_JSON_SCHEMA } = zodToJsonSchema(ParsedResumeSchema, {
  $refStrategy: "none",
}) as Record<string, unknown>;

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

/* The text path usually receives a COPY-PASTE of a PDF, not a clean document.
   Copying a two-column résumé interleaves the columns, welds headings onto
   neighbouring sentences and drags the PDF viewer's own UI in at the top. A
   parser that trusts the order it receives produces one giant summary and
   nothing else, which is exactly the failure these rules exist to prevent. */
const DEGRADED_TEXT_RULES = `THE TEXT IS USUALLY PASTED OUT OF A PDF AND ARRIVES DAMAGED. Repair it; do not mirror it:
- MULTI-COLUMN LAYOUTS INTERLEAVE. Sections arrive out of order and a sidebar can land mid-sentence. Reassemble by MEANING, never by the order lines appear in. A qualification listed in a sidebar still belongs in education or certifications.
- HEADINGS WELD TO NEIGHBOURING TEXT ("...modern electric mobility.EDUCATION"). An ALL-CAPS or Title-Case heading embedded mid-line is still a section break — split there.
- HEADING NAMES VARY. Work experience: "CAREER HISTORY", "EMPLOYMENT HISTORY", "WORK HISTORY", "PROFESSIONAL EXPERIENCE". Skills: "KEY SKILLS", "KEY SKILLS & EXPERIENCE", "CORE COMPETENCIES", "AREAS OF EXPERTISE". Education: "QUALIFICATIONS", "EDUCATION & TRAINING", "ACADEMIC HISTORY". References: "REFEREES". Match on meaning, not exact wording.
- PDF VIEWER CHROME IS NOT RÉSUMÉ CONTENT. Discard stray page numbers and toolbar labels ("Automatic Zoom", "Edit", "Sign", "Download", "Page 1 of 2"). NEVER treat one as the candidate's name.
- CONTACT BLOCKS FUSE ("Chiran DevnithEmail: someone@example.com"). Split at the label boundary: the name ends where "Email"/"Mobile"/"Phone" begins.
- A ROLE'S HEADER AND ITS DESCRIPTION MAY BE SEPARATED by unrelated text. Match each employer and title to the paragraph that describes that job, even at a distance.
- NEVER DUMP UNPLACED TEXT INTO personalInfo.summary. The summary is ONLY the candidate's own professional-summary or objective paragraph. If something cannot be placed in a proper field, leave it out — a bloated summary is a parsing failure, not a safe default.`;

const TEXT_SYSTEM_PROMPT = `You are a precise resume parser. Extract ALL information present. Use null where data is missing — never guess.

Date format: YYYY-MM where available, else YYYY. For currently-held roles set current=true and endDate=null.

${DEGRADED_TEXT_RULES}

${AU_PARSING_RULES}

${SKILLS_RULES}

Confidence (0-1): completeness × clarity × volume extracted. Rate LOW when the text was badly scrambled and you had to guess at structure.`;

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

/* What bounds the spend of one request. horusInfer enforces both the token
   cap and the model tier from the meter; these are what this function asks
   for. A two-page résumé comes back in roughly 2,000–4,000 tokens; the cap
   only bounds a runaway answer, and unused room costs nothing. */
const MAX_INPUT_CHARS = 15_000;
const MAX_OUTPUT_TOKENS = 8000;
/** The résumé is the first thing a new user sees the product do, so it gets the deep model. */
const MODEL_TIER = "deep" as const;

/* Images. Claude reads JPEG, PNG, GIF and WebP. Horus runs on Vercel, whose
   request limit is 4.5 MB, and base64 adds a third — so 3 MB of image in total. */
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
const MAX_IMAGE_BASE64_CHARS = 4_000_000;
const TOO_BIG =
  "That file is too large for the AI to read. Upload a PDF or Word file, or an image under 3 MB.";

const RESOURCE = "parse-resume";
/** Separate key so guest spend is its own line in the ledger and the quota tables. */
const GUEST_RESOURCE = "parse-resume-guest";
const GUEST_HOURLY_PER_IP = 10;
const GUEST_HOURLY_TOTAL = 500;

async function structureFromText(rawText: string, meter: MeterContext): Promise<ParsedResume> {
  const { object } = await horusGenerateObject(ParsedResumeSchema, {
    task: "careercraft.parse_resume_text",
    system: TEXT_SYSTEM_PROMPT,
    prompt: `Resume text:\n${rawText.substring(0, MAX_INPUT_CHARS)}`,
    model: MODEL_TIER,
    temperature: 0.1,
    maxTokens: MAX_OUTPUT_TOKENS,
    schema: PARSED_RESUME_JSON_SCHEMA,
    schemaName: "ParsedResume",
    meter,
  });
  return object;
}

type ImagePart = { mediaType: ImageType; base64: string };

function asImageType(type: string): ImageType {
  const normalised = type.toLowerCase() === "image/jpg" ? "image/jpeg" : type.toLowerCase();
  if (!(IMAGE_TYPES as readonly string[]).includes(normalised)) {
    throw new ValidationError(
      "The AI can read PDF, Word, JPG, PNG, GIF and WebP files. Convert this file and try again.",
    );
  }
  return normalised as ImageType;
}

function parseDataUrl(dataUrl: string): ImagePart {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new ValidationError("Invalid page image data URL");
  return { mediaType: asImageType(match[1]), base64: match[2] };
}

async function fileToImagePart(file: File): Promise<ImagePart> {
  const mediaType = asImageType(file.type || "image/jpeg");
  // Checked before reading, so an oversized photo never gets base64-encoded.
  if (file.size > (MAX_IMAGE_BASE64_CHARS / 4) * 3) throw new ValidationError(TOO_BIG);
  const base64 = encodeBase64(new Uint8Array(await file.arrayBuffer()));
  return { mediaType, base64 };
}

async function structureFromVision(images: ImagePart[], meter: MeterContext): Promise<ParsedResume> {
  if (!images.length) {
    throw new ValidationError("At least one page image is required for vision parsing");
  }
  if (images.reduce((n, img) => n + img.base64.length, 0) > MAX_IMAGE_BASE64_CHARS) {
    throw new ValidationError(TOO_BIG);
  }

  const content: HorusContentPart[] = [
    {
      type: "text",
      text: "Extract the full resume from these page image(s). Respect visual columns and section layout.",
    },
    ...images.map((img): HorusContentPart => ({ type: "image", image: img.base64, mediaType: img.mediaType })),
  ];

  // The most expensive single call in the product: up to three full-page
  // images. Reachable only with a verified session — the handler rejects
  // anonymous callers before this path.
  const { object } = await horusGenerateObject(ParsedResumeSchema, {
    task: "careercraft.parse_resume_vision",
    system: VISION_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    model: MODEL_TIER,
    temperature: 0.1,
    maxTokens: MAX_OUTPUT_TOKENS,
    schema: PARSED_RESUME_JSON_SCHEMA,
    schemaName: "ParsedResume",
    meter,
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
  const ctx = await optionalUser(req);
  const contentType = req.headers.get("content-type") || "";
  const isTextPath = contentType.includes("application/json");

  // Guests get the text path, not vision. A page-image call costs roughly an
  // order of magnitude more than a text parse, so it stays behind a session —
  // the client gates file uploads to signup before it ever reaches here, and
  // this is the server-side half of that same rule.
  if (!ctx && !isTextPath) {
    throw new UnauthorizedError(
      "Sign in to have AI read a file. Pasted résumé text works without an account.",
    );
  }

  let meter: MeterContext;
  if (ctx) {
    const quota = await enforcePlanQuota({
      userId: ctx.userId,
      resource: RESOURCE,
      resourceLabel: "resume parsing",
    });
    meter = meterFromQuota(quota, ctx.userId);
  } else {
    // Two limits, because they defend against different things (the same
    // shape infer/ uses, for the same reasons).
    //
    // Per-IP keeps one visitor from looping the endpoint. It is deliberately
    // loose: Australian mobile carriers and office networks put many real
    // people behind one address, and a guest who pastes, dislikes the result
    // and re-pastes is normal behaviour, not abuse.
    // The platform-vouched address. The first X-Forwarded-For entry is whatever
    // the client sent, so keying guest limits on it let anyone rotate past them.
    const clientIp = trustedClientIp(req) ?? "unknown";
    await enforceAnonymousWindowLimit({
      resource: GUEST_RESOURCE,
      principal: `ip:${clientIp}`,
      limit: GUEST_HOURLY_PER_IP,
      windowMinutes: 60,
      resourceLabel: "résumé parsing",
    });

    // Global, and that is the point: rotating through addresses cannot escape
    // one shared bucket. This is what bounds the bill if the endpoint is ever
    // scripted as a free LLM proxy — the cap is a known hourly number instead
    // of whatever a botnet feels like spending. Sized well above real guest
    // traffic, so it only bites during abuse.
    await enforceAnonymousWindowLimit({
      resource: `${GUEST_RESOURCE}-total`,
      principal: "guest-total",
      limit: GUEST_HOURLY_TOTAL,
      windowMinutes: 60,
      resourceLabel: "guest résumé parsing (all visitors)",
    });

    // userId stays null: the ledger still gets a row, so guest spend is
    // visible and separable rather than untracked.
    //
    // horusInfer enforces these two: the per-call ceiling is MAX_OUTPUT_TOKENS,
    // and the VOLUME is the two rate limits above. Guests deliberately get the
    // same model and budget as anyone else: a worse parse for guests would
    // defeat the point of this path.
    meter = systemMeter(GUEST_RESOURCE);
    meter.maxModelTier = MODEL_TIER;
    meter.maxTokensPerCall = MAX_OUTPUT_TOKENS;
  }

  if (isTextPath) {
    const raw = await req.json().catch(() => null);
    const parsed = JsonBodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid JSON body", parsed.error.flatten());
    }
    const { rawText, fileName, fileType, pageCount } = parsed.data;
    console.log(
      `[parse-resume] text path (${rawText.length} chars, ${ctx ? "user" : "guest"})`,
    );

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

  // No OCR step: the model reads scanned pages directly.
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


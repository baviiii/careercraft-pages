// parse-resume — Structured resume extraction.
//
// Two modes:
//   JSON body  → caller pre-extracted text (e.g. via client-side pdfjs/mammoth)
//   FormData   → server-side OCR via Azure Document Intelligence (prebuilt-layout)
//
// In both cases, raw text is then fed to Azure OpenAI with a typed schema.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { generateObject } from "npm:ai@4";
import { z } from "npm:zod@3";

import { getAzure } from "../_shared/ai/providers.ts";
import { ConfigError, ProviderError, ValidationError } from "../_shared/ai/errors.ts";
import { handler, json } from "../_shared/http/responses.ts";
import { optEnv, reqEnv } from "../_shared/env.ts";

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

const SYSTEM_PROMPT = `You are a precise resume parser. Extract ALL information present. Use null where data is missing — never guess.

Date format: YYYY-MM where available, else YYYY. For currently-held roles set current=true and endDate=null.
Group skills by logical category (Technical Skills, Soft Skills, Programming Languages, Tools, …).
Confidence (0-1): completeness × clarity × volume extracted.`;

serve(handler(async (req) => {
  const contentType = req.headers.get("content-type") || "";

  let rawText = "";
  let fileName = "document";
  let fileType = "text/plain";
  let pageCount = 1;

  if (contentType.includes("application/json")) {
    const raw = await req.json().catch(() => null);
    const parsed = JsonBodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid JSON body", parsed.error.flatten());
    }
    rawText = parsed.data.rawText;
    fileName = parsed.data.fileName;
    fileType = parsed.data.fileType;
    pageCount = parsed.data.pageCount;
    console.log(`[parse-resume] received pre-extracted text (${rawText.length} chars)`);
  } else {
    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("No file provided in FormData (field name must be 'file')");
    }
    fileName = (formData?.get("fileName") as string | null) ?? file.name ?? "document";
    fileType = file.type || "application/pdf";
    console.log(`[parse-resume] received file: ${fileName} (${fileType}, ${file.size} bytes)`);

    const extracted = await extractWithDocumentIntelligence(file);
    rawText = extracted.text;
    pageCount = extracted.pageCount;
  }

  const deployment = optEnv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini")!;
  const azure = getAzure();

  try {
    const { object } = await generateObject({
      model: azure(deployment),
      schema: ParsedResumeSchema,
      schemaName: "ParsedResume",
      system: SYSTEM_PROMPT,
      prompt: `Resume text:\n${rawText.substring(0, 15000)}`,
      temperature: 0.1,
      maxTokens: 4000,
    });

    return json({
      success: true,
      parsed: {
        ...object,
        rawText,
        sourceFile: { name: fileName, type: fileType, pages: pageCount },
      },
      message: `Parsed ${pageCount} page(s) with ${Math.round(object.confidence * 100)}% confidence`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ProviderError(`Resume parsing failed: ${msg}`, "azure-openai");
  }
}, { name: "parse-resume" }));

// ----- Azure Document Intelligence (OCR / layout) -----

async function extractWithDocumentIntelligence(file: File): Promise<{ text: string; pageCount: number }> {
  const endpoint = optEnv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT");
  const key = optEnv("AZURE_DOCUMENT_INTELLIGENCE_KEY");
  if (!endpoint || !key) {
    throw new ConfigError(
      "Server-side OCR requires AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY. " +
      "Alternatively, extract text client-side (pdfjs / mammoth) and POST as JSON.",
    );
  }

  const clean = endpoint.replace(/\/$/, "");
  const buf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));

  // Try modern Document Intelligence API first, fall back to Form Recognizer for older resources.
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
          console.log(`[parse-resume] OCR started via ${c.version}`);
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

  // Poll for completion. Real-world layout parses settle in 3-8s.
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

// Quiet the unused-import warning for reqEnv (kept available for future use).
void reqEnv;

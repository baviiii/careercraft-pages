// rag-tag-documents — AI-powered document categorisation for RAG retrieval.
//
// Returns a structured tag set used to filter and rank documents during search.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { generateObject } from "npm:ai@4";
import { z } from "npm:zod@3";

import { getAzure } from "../_shared/ai/providers.ts";
import { ProviderError, ValidationError } from "../_shared/ai/errors.ts";
import { handler, json } from "../_shared/http/responses.ts";
import { optEnv } from "../_shared/env.ts";

const CATEGORY_VALUES = [
  "policy",
  "budget",
  "strategy",
  "guideline",
  "report",
  "job-listing",
  "career-guidance",
  "training-program",
  "skill-requirement",
  "occupation-profile",
  "migrant-support",
  "selection-criteria",
  "news-update",
  "program-info",
] as const;

const SECTOR_VALUES = [
  "health",
  "education",
  "public-sector",
  "it-technology",
  "finance",
  "engineering",
  "administration",
  "community-services",
  "transport",
  "defense",
  "environment",
] as const;

const PROGRAM_TYPE_VALUES = [
  "training-program",
  "subsidised-training",
  "job-support",
  "skills-assessment",
  "mentoring",
  "networking",
  "grant-funding",
] as const;

const RequestSchema = z.object({
  content: z.string().min(1, "content is required").max(50_000),
  documentType: z.enum(["pdf", "web"]),
  source: z.string().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
});

const TagsSchema = z.object({
  category: z.enum(CATEGORY_VALUES),
  sector: z.enum(SECTOR_VALUES).nullable(),
  tags: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  occupation: z.string().nullable(),
  programType: z.enum(PROGRAM_TYPE_VALUES).nullable(),
});

serve(handler(async (req) => {
  const raw = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("Invalid request body", parsed.error.flatten());
  }
  const { content, documentType, source, url, title } = parsed.data;

  const deployment = optEnv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini")!;
  const azure = getAzure();

  const userPrompt = `Analyse this SA government career-related document and extract structured tags.

Document Type: ${documentType}
Source: ${source || "unknown"}
URL: ${url || "N/A"}
Title: ${title || "N/A"}

Content Preview (first 2000 chars):
${content.substring(0, 2000)}

Tag rules:
- category: pick the best match from the enum
- sector: pick the best match from the enum, or null if unclear
- tags: short kebab-case labels (e.g. "sa-government", "full-time", "urgent")
- topics: high-level themes (e.g. "job-search", "interview-prep")
- occupation: kebab-case role if explicitly named (e.g. "registered-nurse"), else null
- programType: pick the best match from the enum, or null if not a program`;

  try {
    const { object } = await generateObject({
      model: azure(deployment),
      schema: TagsSchema,
      schemaName: "DocumentTags",
      system: "You are a document tagging system. Pick the best enum values for each field. Use null when unsure rather than guessing.",
      prompt: userPrompt,
      temperature: 0.3,
      maxTokens: 500,
    });

    return json(object);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ProviderError(`Tagging failed: ${msg}`, "azure-openai");
  }
}, { name: "rag-tag-documents" }));

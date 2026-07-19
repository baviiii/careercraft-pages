// Provider factory for the Vercel AI SDK.
//
// All edge functions get their model handles from here so swapping providers
// (Anthropic → Azure-deployed Claude, Foundry serverless, etc.) is a one-line
// change at the call site. Text generation now routes through the Horus
// gateway (see ./horus.ts); this file covers the direct-vendor paths that
// remain (multimodal parsing, embeddings).

import { createAnthropic } from "npm:@ai-sdk/anthropic@1";
import { createAzure } from "npm:@ai-sdk/azure@1";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@0";

import { ConfigError } from "./errors.ts";
import { optEnv, reqEnv } from "../env.ts";

// ---------- Anthropic (direct API) ----------
// Used by: (reserved). Most functions use Horus inference or Azure OpenAI.
export function getAnthropic() {
  return createAnthropic({ apiKey: reqEnv("ANTHROPIC_API_KEY") });
}

// ---------- Azure OpenAI (Foundry-hosted OpenAI models) ----------
// Used by: parse-resume, rag-query, rag-tag-documents.
//
// Two env styles supported:
//   1. AZURE_OPENAI_RESOURCE_NAME + AZURE_OPENAI_KEY (preferred — SDK builds URL)
//   2. AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_KEY (full URL — legacy compat with existing code)
//
// Use model handle as: getAzure()("<deployment-name>"), e.g. getAzure()("gpt-4o-mini").
export function getAzure() {
  const apiKey = reqEnv("AZURE_OPENAI_KEY");
  const apiVersion = optEnv("AZURE_OPENAI_API_VERSION", "2024-10-21")!;

  const resourceName = optEnv("AZURE_OPENAI_RESOURCE_NAME");
  if (resourceName) {
    return createAzure({ resourceName, apiKey, apiVersion });
  }

  const endpoint = optEnv("AZURE_OPENAI_ENDPOINT");
  if (endpoint) {
    const baseURL = endpoint.replace(/\/$/, "") + "/openai";
    return createAzure({ baseURL, apiKey, apiVersion });
  }

  throw new ConfigError(
    "Azure OpenAI not configured: set AZURE_OPENAI_RESOURCE_NAME or AZURE_OPENAI_ENDPOINT",
  );
}

// ---------- Azure AI Foundry (serverless non-OpenAI models) ----------
// For Llama / Mistral / Phi / etc. deployed in Foundry via Models-as-a-Service.
// Endpoint format: https://<project>.services.ai.azure.com/models
export function getFoundry() {
  return createOpenAICompatible({
    name: "azure-foundry",
    baseURL: reqEnv("AZURE_FOUNDRY_BASE_URL"),
    apiKey: reqEnv("AZURE_FOUNDRY_KEY"),
  });
}

// ---------- Generic OpenAI-compatible (escape hatch) ----------
// For ad-hoc OpenAI-compat endpoints (self-hosted, vLLM, Ollama, etc.).
export function getOpenAICompatible(opts: {
  name: string;
  baseURL: string;
  apiKey: string;
}) {
  return createOpenAICompatible(opts);
}

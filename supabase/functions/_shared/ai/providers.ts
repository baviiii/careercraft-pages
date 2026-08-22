// Direct-vendor model access.
//
// Text generation goes through the Horus gateway (./horus.ts). What is left
// here is the one path Horus cannot serve yet: parse-resume's vision call,
// which needs image inputs that /api/infer does not accept.
//
// This file used to offer Anthropic, Foundry and a generic OpenAI-compatible
// factory as well. Nothing called them once generation moved to Horus, so
// they were removed rather than left as three untested ways to spend money.
// Git has them if a second direct-vendor path is ever needed.

import { createAzure } from "npm:@ai-sdk/azure@1";

import { ConfigError } from "./errors.ts";
import { optEnv, reqEnv } from "../env.ts";

// ---------- Azure OpenAI (Foundry-hosted OpenAI models) ----------
// Used by: parse-resume. (rag-query and rag-tag-documents are long gone.)
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

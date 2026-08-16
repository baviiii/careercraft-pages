// Azure Graph Proxy - Secure proxy for Azure Graph/Agentic functions
// Holds Azure keys server-side and enforces Supabase authentication.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

const AZURE_AGENTIC_PLANNER_URL = Deno.env.get("AZURE_AGENTIC_PLANNER_URL") ?? "";
const AZURE_INTERSECTION_REASONING_URL = Deno.env.get("AZURE_INTERSECTION_REASONING_URL") ?? "";
const AZURE_GRAPH_QUERY_URL = Deno.env.get("AZURE_GRAPH_QUERY_URL") ?? "";
const AZURE_FUNCTION_KEY = Deno.env.get("AZURE_FUNCTION_KEY") ?? "";

const FUNCTION_MAP: Record<string, string> = {
  "agentic-planner": AZURE_AGENTIC_PLANNER_URL,
  "intersection-reasoning": AZURE_INTERSECTION_REASONING_URL,
  "graph-query": AZURE_GRAPH_QUERY_URL,
};

serve(handler(async (req) => {
  const { userId } = await requireUser(req);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { functionName, ...payload } = body as { functionName?: string; [key: string]: unknown };

  if (!functionName || !FUNCTION_MAP[functionName]) {
    return json({ error: "Invalid or missing functionName. Must be one of: agentic-planner, intersection-reasoning, graph-query" }, 400);
  }

  const targetUrl = FUNCTION_MAP[functionName];
  if (!targetUrl) {
    return json({ error: `Azure function ${functionName} not configured` }, 500);
  }

  if (!AZURE_FUNCTION_KEY) {
    return json({ error: "Azure function key not configured" }, 500);
  }

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-functions-key": AZURE_FUNCTION_KEY,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let responseData: unknown;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = { error: responseText };
  }

  if (!response.ok) {
    return json(
      { error: (responseData as { error?: string })?.error ?? `Azure function error: ${response.status}` },
      response.status,
    );
  }

  return json(responseData);
}, { name: "azure-graph-proxy" }));

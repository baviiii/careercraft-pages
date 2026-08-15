// Azure PDF Proxy - Secure proxy for Azure PDF upload/processing functions
// Holds Azure keys server-side and enforces Supabase authentication.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

const AZURE_PDF_UPLOAD_URL = Deno.env.get("AZURE_PDF_UPLOAD_URL") ?? "";
const AZURE_PDF_UPLOAD_KEY = Deno.env.get("AZURE_PDF_UPLOAD_KEY") ?? "";

serve(handler(async (req) => {
  const { userId } = await requireUser(req);

  if (!AZURE_PDF_UPLOAD_URL || !AZURE_PDF_UPLOAD_KEY) {
    return json({ error: "Azure PDF proxy not configured" }, 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const response = await fetch(`${AZURE_PDF_UPLOAD_URL}/api/pdf-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-functions-key": AZURE_PDF_UPLOAD_KEY,
    },
    body: JSON.stringify(body),
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
}, { name: "azure-pdf-proxy" }));

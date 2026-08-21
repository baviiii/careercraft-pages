export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // x-functions-key and x-tenant are sent by the interview-coach MCP client.
  // They were only allowed by infer's own local copy of these headers; infer
  // now uses this shared set, so they have to be listed here or its preflight
  // starts failing.
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-functions-key, x-tenant",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
} as const;

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

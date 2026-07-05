// infer — generic structured-generation endpoint for interview-coach-mcp.
//
// This is the "generation seam" the MCP depends on (HttpHorusClient.infer →
// POST {base}/infer). It runs INSIDE Supabase so it can use the existing
// LOVABLE_API_KEY secret — no model key ever lives in the MCP process or any
// local file. When Horus exposes its own /infer, point HORUS_BASE_URL there
// and delete this; nothing else in the MCP changes.
//
// Auth: deployed with --no-verify-jwt and guarded by a shared secret
// (INFER_SHARED_SECRET) so only the MCP can spend tokens. The MCP sends it as
// `Authorization: Bearer <secret>` (and x-functions-key).
//
// Request  (from HttpHorusClient.infer):
//   { task, system, messages:[{role,content}], model:"fast"|"deep",
//     temperature, maxTokens, tenant, userRef }
// Response (what HttpHorusClient expects):
//   { content:"<json string>", model, cached:false, usage:{inputTokens,outputTokens} }

const GATEWAY_URL = Deno.env.get("INFER_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL_FAST = Deno.env.get("INFER_MODEL_FAST") ?? "google/gemini-2.5-flash";
const MODEL_DEEP = Deno.env.get("INFER_MODEL_DEEP") ?? "google/gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-functions-key, x-tenant, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function presentedSecret(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  return bearer || (req.headers.get("x-functions-key") ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sharedSecret = Deno.env.get("INFER_SHARED_SECRET") ?? "";
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

  // Health check — no token spend, no secret required. Lets the MCP/operator
  // confirm the function is live and configured.
  if (req.method === "GET") {
    return json({ ok: true, fn: "infer", hasGatewayKey: Boolean(lovableKey), guarded: Boolean(sharedSecret) });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (sharedSecret && presentedSecret(req) !== sharedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!lovableKey) return json({ error: "LOVABLE_API_KEY not configured on this function" }, 500);

  let body: {
    system?: string;
    messages?: Array<{ role: string; content: string }>;
    model?: "fast" | "deep";
    temperature?: number;
    maxTokens?: number;
    task?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const model = body.model === "deep" ? MODEL_DEEP : MODEL_FAST;
  const messages = [
    ...(body.system ? [{ role: "system", content: body.system }] : []),
    ...(body.messages ?? []).map((m) => ({ role: m.role, content: m.content })),
  ];

  let res: Response;
  try {
    res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: body.temperature ?? 0.7,
        max_tokens: body.maxTokens ?? 4000,
      }),
    });
  } catch (err) {
    return json({ error: `Gateway request failed: ${(err as Error).message}` }, 502);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) return json({ error: "Gateway rate limit exceeded" }, 429);
    if (res.status === 402) return json({ error: "Gateway credits exhausted" }, 402);
    return json({ error: `Gateway ${res.status}: ${text.slice(0, 300)}` }, 502);
  }

  const out = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = out.choices?.[0]?.message?.content ?? "";
  if (!content) return json({ error: "Gateway returned an empty response" }, 502);

  return json({
    content,
    model: out.model ?? model,
    cached: false,
    usage: { inputTokens: out.usage?.prompt_tokens, outputTokens: out.usage?.completion_tokens },
  });
});

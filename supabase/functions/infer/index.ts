// infer — generation shim for interview-coach-mcp, now forwarding to Horus.
//
// The MCP's HttpHorusClient posts here (POST {base}/infer). Horus exposes its
// own gateway (POST {HORUS_INFER_URL}, i.e. horus-platform /api/infer), so this
// function is a thin authenticated proxy: same request/response contract on
// both sides, we just swap the caller's shared secret for CareerCraft's Horus
// tenant API key. Once the MCP's HORUS_BASE_URL points directly at the Horus
// deployment, this function can be deleted.
//
// Auth: deployed with --no-verify-jwt and guarded by a shared secret
// (INFER_SHARED_SECRET) so only the MCP can spend tokens. The MCP sends it as
// `Authorization: Bearer <secret>` (and x-functions-key).

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
  const horusUrl = Deno.env.get("HORUS_INFER_URL") ?? "";
  const horusKey = Deno.env.get("HORUS_API_KEY") ?? "";

  // Health check — no token spend, no secret required. Lets the MCP/operator
  // confirm the function is live and configured.
  if (req.method === "GET") {
    return json({
      ok: true,
      fn: "infer",
      upstream: "horus",
      hasGatewayKey: Boolean(horusUrl && horusKey),
      guarded: Boolean(sharedSecret),
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (sharedSecret && presentedSecret(req) !== sharedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!horusUrl || !horusKey) {
    return json({ error: "HORUS_INFER_URL / HORUS_API_KEY not configured on this function" }, 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // The MCP already speaks Horus's /api/infer contract — forward as-is.
  let res: Response;
  try {
    res = await fetch(horusUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${horusKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return json({ error: `Horus request failed: ${(err as Error).message}` }, 502);
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    if (res.status === 429) return json({ error: "Horus rate limit exceeded" }, 429);
    if (res.status === 402) return json({ error: "Horus credits exhausted" }, 402);
    return json({ error: `Horus ${res.status}: ${text.slice(0, 300)}` }, 502);
  }

  return new Response(text, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

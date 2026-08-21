// infer — generation shim for interview-coach-mcp, forwarding to Horus.
//
// The MCP's HttpHorusClient posts here (POST {base}/infer) and expects Horus's
// own /api/infer response shape back.
//
// ── Auth, in two modes ────────────────────────────────────────────────────
//
// This function used to be guarded by a shared secret alone, deployed with
// --no-verify-jwt, and it forwarded the request body to Horus unread. That
// meant the caller chose the model and the token budget, and nothing tied any
// of the spend to a person. It is the widest-open surface in the product:
// roughly 25 browser-reachable MCP endpoints land here.
//
//   trusted  — a real user JWT. The user is verified, their plan is consumed,
//              and the plan's clamps apply.
//   legacy   — the shared secret only. Kept working so the MCP does not break
//              mid-deploy. Spend is attributed from the body's `userRef` for
//              the ledger, but NO plan quota is consumed: userRef is
//              caller-supplied and unverified, so honouring it would let
//              anyone holding the secret drain another user's allowance.
//              An IP rate limit applies instead.
//
// Set INFER_REQUIRE_JWT=true to retire the legacy mode once the MCP forwards
// the user's JWT (it already receives one from the browser).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "npm:zod@3";

import { horusInfer } from "../_shared/ai/horus.ts";
import { UnauthorizedError, ValidationError } from "../_shared/ai/errors.ts";
import { meterFromQuota, systemMeter } from "../_shared/ai/meter.ts";
import { enforcePlanQuota } from "../_shared/db/plan-quota.ts";
import { enforceAnonymousWindowLimit } from "../_shared/db/rate-limit.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";
import { optEnv } from "../_shared/env.ts";

const RESOURCE = "infer";

/**
 * The MCP's contract. `schema`/`schemaName` pass through untouched — Horus
 * uses them for structured output and this function has no opinion on them.
 */
const InferRequestSchema = z.object({
  task: z.string().min(1).max(200),
  system: z.string().max(100_000).optional(),
  messages: z
    .array(z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().max(200_000),
    }))
    .min(1)
    .max(100)
    .optional(),
  prompt: z.string().max(200_000).optional(),
  schema: z.unknown().optional(),
  schemaName: z.string().max(200).optional(),
  // Advisory only. The plan decides the real values; these are what the caller
  // would prefer, clamped downward in horusInfer.
  model: z.enum(["fast", "deep"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32_000).optional(),
  tenant: z.string().max(100).optional(),
  userRef: z.string().max(200).optional(),
}).refine(
  (v) => Boolean(v.messages?.length) || Boolean(v.prompt),
  { message: "messages or prompt is required" },
);

function bearer(req: Request): string {
  return (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
}

function presentedSecret(req: Request): string {
  return bearer(req) || (req.headers.get("x-functions-key") ?? "").trim();
}

serve(handler(async (req) => {
  const sharedSecret = optEnv("INFER_SHARED_SECRET") ?? "";
  const requireJwt = (optEnv("INFER_REQUIRE_JWT") ?? "").toLowerCase() === "true";

  // Health check — no spend, no auth. Lets an operator confirm the function is
  // live and configured without holding a credential.
  if (req.method === "GET") {
    return json({
      ok: true,
      fn: "infer",
      upstream: "horus",
      hasGatewayKey: Boolean(optEnv("HORUS_INFER_URL") && optEnv("HORUS_API_KEY")),
      guarded: Boolean(sharedSecret),
      requiresUserToken: requireJwt,
    });
  }

  // ── Identify the caller ────────────────────────────────────────────────
  // The MCP sends the shared secret AS the bearer token, so a bearer that
  // matches the secret is the legacy path, not a JWT.
  const token = bearer(req);
  const secretOk = Boolean(sharedSecret) && presentedSecret(req) === sharedSecret;
  const looksLikeJwt = Boolean(token) && token !== sharedSecret && token.split(".").length === 3;

  let userId: string | null = null;
  if (looksLikeJwt) {
    // Throws 401 on an invalid or expired token rather than falling back to
    // the legacy path — a bad JWT is an error, not an invitation to retry
    // unauthenticated.
    userId = (await requireUser(req)).userId;
  }

  if (!userId && !secretOk) {
    throw new UnauthorizedError("A user token or the shared secret is required");
  }
  if (!userId && requireJwt) {
    throw new UnauthorizedError("This endpoint now requires a user token");
  }

  // ── Validate the body ──────────────────────────────────────────────────
  const raw = await req.json().catch(() => null);
  const parsed = InferRequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("Invalid infer request", parsed.error.flatten());
  }
  const body = parsed.data;

  // ── Quota + meter ──────────────────────────────────────────────────────
  let meter;
  if (userId) {
    const quota = await enforcePlanQuota({
      userId,
      resource: RESOURCE,
      resourceLabel: "the interview coach",
    });
    meter = meterFromQuota(quota, userId);
  } else {
    // Legacy: rate limit the network principal, and attribute the spend to the
    // claimed user for the ledger only. Their plan is deliberately untouched.
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await enforceAnonymousWindowLimit({
      resource: RESOURCE,
      principal: clientIp,
      limit: 100,
      windowMinutes: 60,
      resourceLabel: "inference",
    });
    meter = systemMeter(RESOURCE);
    if (body.userRef) {
      meter.userId = body.userRef;
      meter.maxModelTier = "fast";
      meter.maxTokensPerCall = 4000;
    }
  }

  // Routed through the shared client rather than a hand-rolled fetch, so the
  // clamps, the daily ceiling and the ledger write all apply here too.
  const result = await horusInfer({
    task: body.task,
    system: body.system ?? "",
    messages: body.messages,
    prompt: body.prompt,
    model: body.model,
    temperature: body.temperature,
    maxTokens: body.maxTokens,
    meter,
  });

  // Answer in Horus's own shape — the MCP reads inputTokens/outputTokens.
  return json({
    content: result.content,
    model: result.model,
    usage: {
      inputTokens: result.usage.promptTokens,
      outputTokens: result.usage.completionTokens,
    },
  });
}, { name: "infer", allowedMethods: ["GET", "POST"] }));

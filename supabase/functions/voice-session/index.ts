// voice-session — a short-lived Horus voice key for one spoken interview answer.
//
// interview-coach-mcp's POST /api/voice/session lands here (its Horus base is
// this project's functions URL, the same as for infer). This function holds
// the Horus API key, asks Horus to mint a listen-only realtime session for one
// signed-in learner, and returns the ephemeral key and WebRTC URL. The browser
// then streams the microphone to the speech service directly; no audio passes
// through here.
//
// Auth: a verified user token is required, always — there is no shared-secret
// -only mode as infer has. Every session is paid audio, so every one has to
// belong to a real person, and the per-person limit below is kept in the
// database (the MCP's and Horus's own limits are in memory, per instance, so
// they reset on every deploy and don't add up across copies). The MCP's key
// travels in Authorization as it does for infer; like infer's trusted mode,
// the user token is what authorises, so the key is not checked here.
//
// Env (shared with infer):
//   HORUS_INFER_URL     — Horus's gateway, e.g. https://horus.example.com/api/infer;
//                         the voice route is on the same host
//   HORUS_API_KEY       — CareerCraft tenant key (intelligence:infer)
//   HORUS_VOICE_URL     — optional override for the voice route

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

import { ProviderError, RateLimitError, UnauthorizedError } from "../_shared/ai/errors.ts";
import { enforceAnonymousWindowLimit } from "../_shared/db/rate-limit.ts";
import { verifyUserToken } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";
import { optEnv } from "../_shared/env.ts";

const RESOURCE = "voice-session";
/** Spoken answers a person can start in an hour. A long practice session is ~10. */
const SESSIONS_PER_HOUR = 20;

function voiceUrl(): string | null {
  const override = optEnv("HORUS_VOICE_URL");
  if (override) return override;
  const infer = optEnv("HORUS_INFER_URL");
  if (!infer) return null;
  try {
    return new URL("/api/voice/session", infer).toString();
  } catch {
    return null;
  }
}

serve(handler(async (req) => {
  const apiKey = optEnv("HORUS_API_KEY") ?? "";
  const upstream = voiceUrl();

  // Health check: is it deployed and configured? No credential, no spend.
  if (req.method === "GET") {
    return json({ ok: true, fn: RESOURCE, configured: Boolean(upstream && apiKey) });
  }

  // ── For whom ───────────────────────────────────────────────────────────
  const userToken = (req.headers.get("x-user-token") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!userToken) throw new UnauthorizedError("A user token is required for voice");
  const { userId } = await verifyUserToken(userToken);

  await enforceAnonymousWindowLimit({
    resource: RESOURCE,
    principal: `user:${userId}`,
    limit: SESSIONS_PER_HOUR,
    windowMinutes: 60,
    resourceLabel: "spoken answers",
  });

  if (!upstream || !apiKey) {
    return json({ error: "Voice is not configured", code: "NOT_CONFIGURED" }, 503);
  }

  // ── Mint through Horus ─────────────────────────────────────────────────
  let res: Response;
  try {
    res = await fetch(upstream, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "interview_answer", userRef: userId }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ProviderError("Couldn't reach the speech service", "horus");
  }

  if (res.status === 503) {
    return json({ error: "Voice is not configured", code: "NOT_CONFIGURED" }, 503);
  }
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? "") || 3600;
    throw new RateLimitError("Too many spoken answers. Try again later.", retry);
  }
  if (!res.ok) {
    console.error(`voice-session: Horus answered ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
    throw new ProviderError("Couldn't start a spoken answer", "horus", res.status);
  }

  const minted = (await res.json().catch(() => null)) as
    | { ephemeralKey?: string; webrtcUrl?: string; expiresAt?: number }
    | null;
  if (!minted?.ephemeralKey || !minted.webrtcUrl) {
    throw new ProviderError("Couldn't start a spoken answer", "horus");
  }
  return json({ ephemeralKey: minted.ephemeralKey, webrtcUrl: minted.webrtcUrl, expiresAt: minted.expiresAt });
}, { name: RESOURCE, allowedMethods: ["GET", "POST"] }));

// horus-keepalive — one tiny inference a day.
//
// Horus's database is on Supabase's free tier, which pauses after about a
// week without traffic; while it's paused every AI feature in Faircopy fails
// with "tenant not found". .github/workflows/horus-keepalive.yml calls this
// daily.
//
// It used to call Horus directly, which meant keeping a copy of the Horus API
// key in GitHub as well as here. Now the key lives only in this project's
// function secrets, and GitHub calls this function with the same service role
// key the news refresh already uses.
//
// Only the service role may call it, so a signed-in user can't spend
// inference through here.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { ForbiddenError, ProviderError } from "../_shared/ai/errors.ts";
import { horusInfer } from "../_shared/ai/horus.ts";
import { systemMeter } from "../_shared/ai/meter.ts";
import { handler, json } from "../_shared/http/responses.ts";

serve(handler(async (req) => {
  // verify_jwt has already checked the signature; this checks whose it is.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey || token !== serviceKey) {
    throw new ForbiddenError("Service role only");
  }

  // One real inference proves the whole chain: the gateway is up, the tenant
  // key is valid, Horus's database is awake, the model deployment answers.
  const started = Date.now();
  try {
    const result = await horusInfer({
      task: "careercraft.keepalive",
      system: "Reply with the single word: ok",
      prompt: "ping",
      model: "fast",
      temperature: 0,
      // Room for models that spend tokens before they answer.
      maxTokens: 64,
      meter: systemMeter("horus-keepalive"),
    });
    return json({ ok: true, model: result.model, ms: Date.now() - started });
  } catch (err) {
    // An empty answer still means the gateway, the tenant key and Horus's
    // database all responded, which is what this check is for.
    if (err instanceof ProviderError && /empty response/i.test(err.message)) {
      return json({ ok: true, note: "empty reply", ms: Date.now() - started });
    }
    throw err;
  }
}, { name: "horus-keepalive" }));

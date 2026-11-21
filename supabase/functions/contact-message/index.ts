// contact-message — a signed-in person wrote from Contact.
//
// Saves the row (so Admin → Messages has it) and emails a copy to
// hello@faircopy.au through Resend, which already relays faircopy.au mail.
// The copy is the extra: if Resend isn't configured or refuses, the row
// still stands and the caller is told the email didn't go.
//
// RESEND_API_KEY is a Supabase secret, never a VITE_ variable.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

import { RateLimitError, ValidationError } from "../_shared/ai/errors.ts";
import { adminClient } from "../_shared/db/supabase.ts";
import { optEnv } from "../_shared/env.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

const KINDS = ["question", "bug", "idea"] as const;
type Kind = (typeof KINDS)[number];

const TO = "hello@faircopy.au";
const FROM = "Faircopy <hello@faircopy.au>";
const HOUR_CAP = 5;

const LABEL: Record<Kind, string> = {
  question: "Question",
  bug: "Bug",
  idea: "Idea",
};

function isKind(value: unknown): value is Kind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

serve(handler(async (req) => {
  const { userId, email, userClient } = await requireUser(req);
  if (!email) throw new ValidationError("Your account has no email to reply to.");

  const body = await req.json().catch(() => ({}));
  const kind = body.kind;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!isKind(kind)) throw new ValidationError("Say whether this is a question, a bug, or an idea.");
  if (message.length < 10 || message.length > 4000) {
    throw new ValidationError("The message needs between 10 and 4000 characters.");
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await adminClient()
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (countError) throw countError;
  if ((count ?? 0) >= HOUR_CAP) {
    throw new RateLimitError("That's enough for this hour. Try again later.", 3600, HOUR_CAP);
  }

  const { error: insertError } = await userClient.from("contact_messages").insert({
    user_id: userId,
    email,
    kind,
    message,
  });
  if (insertError) throw new Error(insertError.message);

  const apiKey = optEnv("RESEND_API_KEY");
  if (!apiKey) {
    console.error("[contact-message] RESEND_API_KEY is not set; the row was saved, no email went out.");
    return json({ ok: true, emailed: false });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: `${LABEL[kind]} from ${email}`,
      text: `${LABEL[kind]}\nFrom: ${email}\n\n${message}\n`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[contact-message] Resend returned ${res.status}: ${detail.slice(0, 300)}`);
    return json({ ok: true, emailed: false });
  }

  return json({ ok: true, emailed: true });
}, { name: "contact-message" }));

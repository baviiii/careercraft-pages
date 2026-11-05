// access-gate — the site asks "may I come in?" on load and every few minutes.
//
//   * handler() has already refused a blocked network with 403
//     ACCESS_BLOCKED (unless the caller is a signed-in admin).
//   * optionalUser() refuses a banned account the same way.
//
// Either answer makes the site sign the person out and show the blocked
// screen. Otherwise, for a signed-in user, this records the IP they came from
// (user_ip_log) — the one dependable record of where each account is used,
// whatever way they signed in.
//
// Returns the caller's own IP so the admin screens can warn before an admin
// blocks the network they are sitting on.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

import { adminClient } from "../_shared/db/supabase.ts";
import { clientIp } from "../_shared/http/access.ts";
import { optionalUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

serve(handler(async (req) => {
  const user = await optionalUser(req);
  const ip = clientIp(req);

  if (user && ip) {
    const { error } = await adminClient().rpc("record_user_ip", {
      p_user_id: user.userId,
      p_ip: ip,
      p_user_agent: req.headers.get("user-agent"),
      p_country: req.headers.get("cf-ipcountry"),
    });
    // Recording is a nice-to-have; a failure mustn't lock anyone out.
    if (error) console.error(`[access-gate] recording IP failed: ${error.message}`);
  }

  return json({ allowed: true, signedIn: Boolean(user), ip });
}, { name: "access-gate" }));

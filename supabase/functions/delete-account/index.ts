// delete-account — Settings → "Delete account".
//
// Deletes everything Faircopy holds about the caller, then the auth user.
//
//   1. delete_user_data(user) — one transaction over every table holding the
//      user's rows, including the ones never linked to auth.users (résumés,
//      cover letters, applications…) and the logs that only SET NULL. See
//      migrations/20261012010000_delete_user_data.sql.
//   2. auth.admin.deleteUser — removes the login; profiles and the other
//      tables that reference auth.users cascade.
//
// The user id comes from the verified token, never the request body: the
// only account this can ever delete is the caller's own.
//
// Not covered: career-coach conversations stored by Horus, which has no
// delete endpoint yet (CONCERNS.md #9). The privacy policy says so.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { adminClient } from "../_shared/db/supabase.ts";
import { requireUser } from "../_shared/http/auth.ts";
import { handler, json } from "../_shared/http/responses.ts";

serve(handler(async (req) => {
  const { userId } = await requireUser(req);
  const admin = adminClient();

  const { data: removed, error: dataError } = await admin.rpc("delete_user_data", {
    p_user: userId,
  });
  if (dataError) {
    // The function is one transaction, so nothing was removed.
    console.error("[delete-account] delete_user_data failed:", dataError);
    return json({ error: "Couldn't delete your data. Nothing was removed.", stage: "data" }, 500);
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    // Data is gone but the login remains; trying again finishes the job.
    console.error("[delete-account] auth.admin.deleteUser failed:", authError);
    return json({ error: "Your data was deleted, but the account itself wasn't. Please try again.", stage: "auth" }, 500);
  }

  console.log("[delete-account] deleted", { removed });
  return json({ deleted: true });
}, { name: "delete-account" }));

// Singleton service-role Supabase client (admin). Functions use this for
// audit writes, RPC calls, and any work that needs to bypass RLS.
//
// For RLS-scoped reads/writes, use the userClient from requireUser() in
// _shared/http/auth.ts.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import { reqEnv } from "../env.ts";

let adminSingleton: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  if (adminSingleton) return adminSingleton;
  adminSingleton = createClient(
    reqEnv("SUPABASE_URL"),
    reqEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return adminSingleton;
}

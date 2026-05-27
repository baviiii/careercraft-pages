// Small helper so config errors are caught at use-site instead of crashing the worker.

import { ConfigError } from "./ai/errors.ts";

export function reqEnv(key: string): string {
  const v = Deno.env.get(key);
  if (!v || v.trim() === "") {
    throw new ConfigError(`Missing required env var: ${key}`);
  }
  return v;
}

export function optEnv(key: string, fallback?: string): string | undefined {
  const v = Deno.env.get(key);
  return v && v.trim() !== "" ? v : fallback;
}

// Response helpers + top-level error handler wrapper.
//
// Usage:
//   serve(handler(async (req) => {
//     const { userId } = await requireUser(req);
//     // ...
//     return json({ ok: true });
//   }, { name: "onboard-analyze" }));

import { AppError, RateLimitError } from "../ai/errors.ts";
import { corsHeaders, preflight } from "./cors.ts";

export function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  const headers = new Headers({
    ...corsHeaders,
    "Content-Type": "application/json",
  });
  if (extra) {
    for (const [k, v] of new Headers(extra)) headers.set(k, v);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export function sseStream(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export interface HandlerOpts {
  /** HTTP methods allowed in addition to OPTIONS. Defaults to ["POST"]. */
  allowedMethods?: string[];
  /** Used in error logs. */
  name?: string;
}

export type Handler = (req: Request) => Response | Promise<Response>;

/**
 * Wraps an edge-function handler with:
 *   - CORS preflight
 *   - Method-not-allowed responses
 *   - Top-level try/catch → typed JSON error responses
 *   - Structured 5xx logging
 */
export function handler(fn: Handler, opts: HandlerOpts = {}): Handler {
  const name = opts.name ?? "edge-fn";
  const methods = new Set(opts.allowedMethods ?? ["POST"]);

  return async (req) => {
    const pre = preflight(req);
    if (pre) return pre;
    if (!methods.has(req.method)) {
      return json({ error: "Method not allowed" }, 405);
    }
    try {
      return await fn(req);
    } catch (err) {
      return errorToResponse(err, name);
    }
  };
}

function errorToResponse(err: unknown, name: string): Response {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: err.message,
      code: err.code,
    };
    if (err instanceof RateLimitError) {
      if (err.retryAfterSec !== undefined) body.retryAfterSec = err.retryAfterSec;
      if (err.limit !== undefined) body.limit = err.limit;
    }
    if ("details" in err && err.details !== undefined) {
      body.details = err.details;
    }
    if (err.status >= 500) {
      console.error(`[${name}] ${err.code}: ${err.message}`);
    }
    return json(body, err.status);
  }

  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[${name}] unhandled:`, err);
  return json({ error: msg, code: "INTERNAL_ERROR" }, 500);
}

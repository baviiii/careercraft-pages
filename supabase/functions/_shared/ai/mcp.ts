// Pooled MCP HTTP/SSE clients.
//
// Edge functions are short-lived but the Deno isolate is reused across
// invocations on warm starts. We cache MCP client connections by name so we
// don't pay the handshake cost on every request.
//
// Note: stdio MCP transport is NOT available on Deno edge — only HTTP/SSE.

import { experimental_createMCPClient } from "npm:ai@4";

type MCPClient = Awaited<ReturnType<typeof experimental_createMCPClient>>;

export interface MCPSpec {
  /** Stable identifier used for pooling. Two specs with the same name reuse the same client. */
  name: string;
  /** SSE endpoint URL of the MCP server. */
  url: string;
  /** Optional headers (e.g. bearer token) attached to the SSE connection. */
  headers?: Record<string, string>;
}

const pool = new Map<string, Promise<MCPClient>>();

export async function getMCPClient(spec: MCPSpec): Promise<MCPClient> {
  const cached = pool.get(spec.name);
  if (cached) return cached;

  const created = experimental_createMCPClient({
    transport: { type: "sse", url: spec.url, headers: spec.headers },
  }).catch((err) => {
    // Don't poison the pool on connection failure.
    pool.delete(spec.name);
    throw err;
  });

  pool.set(spec.name, created);
  return created;
}

/**
 * Merged tool map across the given MCP servers. Tool names collide last-wins
 * — order specs from least-specific to most-specific.
 */
export async function getMCPTools(specs: MCPSpec[]): Promise<Record<string, unknown>> {
  if (specs.length === 0) return {};
  const clients = await Promise.all(specs.map(getMCPClient));
  const merged: Record<string, unknown> = {};
  for (const c of clients) {
    const tools = await c.tools();
    Object.assign(merged, tools);
  }
  return merged;
}

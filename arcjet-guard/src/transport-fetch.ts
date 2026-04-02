/**
 * Connect RPC transport factory for `@arcjet/guard` — fetch runtimes.
 *
 * Uses the Connect-Web transport which works in Deno, Bun,
 * Cloudflare Workers, Vercel Edge, and any runtime with a standard
 * `fetch` API (WinterTC minimum common API).
 *
 * @packageDocumentation
 */

import type { Transport } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

/**
 * Create a Connect transport using the web (fetch-based) protocol.
 *
 * Compatible with Deno, Cloudflare Workers, Vercel Edge,
 * and any runtime providing the WHATWG Fetch API.
 *
 * Note: Bun's `"."` export resolves to the `node` entrypoint for HTTP/2.
 * This transport is still usable on Bun via `@arcjet/guard/fetch` but
 * will only use HTTP/1.1.
 *
 * Overrides `redirect` to `"follow"` because some edge runtimes (workerd,
 * edge-light) reject the `"error"` default set by connect-web.
 *
 * @see https://github.com/connectrpc/connect-es/issues/749
 * @see https://github.com/connectrpc/connect-es/pull/1082
 */
export function createTransport(baseUrl: string): Transport {
  return createConnectTransport({
    baseUrl,
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, redirect: "follow" }),
  });
}

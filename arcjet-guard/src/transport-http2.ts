/**
 * Direct HTTP/2 transport factory shared by the `@arcjet/guard` Node and Bun
 * entry points.
 *
 * Both Node and Bun talk to the Arcjet API over HTTP/2 via
 * `@connectrpc/connect-node` (Bun implements `node:http2`, but its `fetch` does
 * not support HTTP/2 — {@link https://github.com/oven-sh/bun/issues/7194}). The
 * proxy strategy differs between the two runtimes, so each entry point handles
 * proxying itself and reuses this for the direct, no-proxy case.
 *
 * @packageDocumentation
 */

import type { Transport } from "@connectrpc/connect";
import { createConnectTransport, Http2SessionManager } from "@connectrpc/connect-node";

/**
 * Create a direct HTTP/2 Connect transport, optimistically pre-connecting.
 *
 * The session is pre-connected so the first `.guard()` call doesn't pay the
 * full TCP + TLS setup cost.
 *
 * @param baseUrl Base URL for the Arcjet API.
 * @returns A Connect transport that talks HTTP/2 directly to `baseUrl`.
 */
export function createHttp2Transport(baseUrl: string): Transport {
  const sessionManager = new Http2SessionManager(baseUrl, {
    // AWS Global Accelerator doesn't support PING so we use a very high idle
    // timeout. Ref:
    // https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html#about-idle-timeout
    idleConnectionTimeoutMs: 340 * 1000,
  });

  // Optimistic pre-connect — failures are silently ignored because the real RPC
  // call will retry the connection anyway.
  void sessionManager.connect().catch(() => {});

  return createConnectTransport({
    baseUrl,
    httpVersion: "2",
    sessionManager,
  });
}

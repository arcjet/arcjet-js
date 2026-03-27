/**
 * Connect RPC transport factory for `@arcjet/guard`.
 *
 * Creates an HTTP/2 transport with optimistic pre-connect and a long
 * idle timeout suitable for AWS Global Accelerator.
 *
 * @packageDocumentation
 */

import type { Transport } from "@connectrpc/connect";
import { createConnectTransport, Http2SessionManager } from "@connectrpc/connect-node";

/**
 * Create an HTTP/2 Connect transport for the given base URL.
 *
 * Optimistically pre-connects so the first `.guard()` call doesn't
 * pay the full TCP + TLS setup cost.
 */
export function createTransport(baseUrl: string): Transport {
  const sessionManager = new Http2SessionManager(baseUrl, {
    // AWS Global Accelerator doesn't support PING so we use a very high idle
    // timeout. Ref:
    // https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html#about-idle-timeout
    idleConnectionTimeoutMs: 340 * 1000,
  });

  // Optimistic pre-connect — failures are silently ignored because the
  // real RPC call will retry the connection anyway.
  void sessionManager.connect().catch(() => {});

  return createConnectTransport({
    baseUrl,
    httpVersion: "2",
    sessionManager,
  });
}

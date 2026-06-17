/**
 * Connect RPC transport factory for `@arcjet/guard`.
 *
 * Creates an HTTP/2 transport with optimistic pre-connect and a long
 * idle timeout suitable for AWS Global Accelerator. When a standard proxy
 * environment variable is detected, Node routes through the proxy over HTTP/1.1
 * using the built-in proxy support of the Node.js HTTP agent, while Bun falls
 * back to the fetch transport so its native `fetch` performs the proxying.
 *
 * @packageDocumentation
 */

import * as http from "node:http";
import * as https from "node:https";

import type { Transport } from "@connectrpc/connect";
import { createConnectTransport, Http2SessionManager } from "@connectrpc/connect-node";

import { detectProxy } from "./detect-proxy.ts";
import { createFetchTransport } from "./transport-fetch.ts";

/**
 * Whether the current runtime is Bun.
 *
 * Bun resolves the `"."` export to this Node entry point for HTTP/2 support,
 * but its Node HTTP agent does not implement the `proxyEnv` proxy option, so we
 * detect it to choose a proxy strategy that works.
 */
function isBun(): boolean {
  return "Bun" in globalThis;
}

/**
 * Create a Connect transport for the given base URL.
 *
 * When a proxy is detected (`HTTP_PROXY`/`HTTPS_PROXY`, respecting `NO_PROXY`),
 * Node routes through it over HTTP/1.1 using the built-in proxy support of the
 * Node.js HTTP agent. Bun's Node HTTP agent doesn't support that, so on Bun we
 * use the fetch transport instead and let Bun's `fetch` proxy natively (the
 * same approach as `@arcjet/transport`'s Bun entry point). Without a proxy it
 * connects directly over HTTP/2, optimistically pre-connecting so the first
 * `.guard()` call doesn't pay the full TCP + TLS setup cost.
 */
export function createTransport(baseUrl: string): Transport {
  const proxyUrl = detectProxy(baseUrl);

  if (typeof proxyUrl === "string") {
    // Bun resolves to this Node entry point for HTTP/2, but its Node HTTP agent
    // ignores the `proxyEnv` option, so the agent path below would silently
    // bypass the proxy. Bun's `fetch` honors the proxy environment variables
    // natively, so route through the fetch transport instead — matching how
    // `@arcjet/transport` handles Bun. The proxy was already detected and
    // logged above, so build the transport directly without detecting again.
    if (isBun()) {
      return createFetchTransport(baseUrl);
    }

    // Hand the agent only the single proxy we resolved (rather than the whole
    // environment) so it routes through exactly the proxy we detected, using
    // our `NO_PROXY` handling as the single source of truth. `keepAlive` lets
    // it reuse the connection to the proxy across requests, since the direct
    // HTTP/2 path keeps a long-lived session.
    const agent =
      new URL(baseUrl).protocol === "https:"
        ? new https.Agent({
            keepAlive: true,
            proxyEnv: { HTTPS_PROXY: proxyUrl },
          })
        : new http.Agent({
            keepAlive: true,
            proxyEnv: { HTTP_PROXY: proxyUrl },
          });

    // Node's built-in proxy support only works over HTTP/1.1.
    return createConnectTransport({
      baseUrl,
      httpVersion: "1.1",
      nodeOptions: { agent },
    });
  }

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

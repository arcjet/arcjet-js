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
 * Whether the current runtime is Deno.
 *
 * The `"deno"` export condition routes Deno to the fetch entry point, so it
 * shouldn't normally reach this Node entry point. But an explicit
 * `@arcjet/guard/node` import would, and Deno's Node HTTP agent — like Bun's —
 * does not implement the `proxyEnv` proxy option, so the agent path below would
 * silently bypass the proxy. Detect it to fall back to the fetch transport,
 * whose native `fetch` honors the proxy environment variables.
 */
function isDeno(): boolean {
  return "Deno" in globalThis;
}

/**
 * Create a Connect transport for the given base URL.
 *
 * When a proxy is detected (`HTTP_PROXY`/`HTTPS_PROXY`, respecting `NO_PROXY`),
 * Node routes through it over HTTP/1.1 using the built-in proxy support of the
 * Node.js HTTP agent. Bun's and Deno's Node HTTP agents don't support that, so
 * on those runtimes we use the fetch transport instead and let their native
 * `fetch` proxy (the same approach as `@arcjet/transport`'s Bun and Deno entry
 * points). Without a proxy it connects directly over HTTP/2, optimistically
 * pre-connecting so the first `.guard()` call doesn't pay the full TCP + TLS
 * setup cost.
 */
export function createTransport(baseUrl: string): Transport {
  const proxyUrl = detectProxy(baseUrl);

  if (typeof proxyUrl === "string") {
    // Bun resolves to this Node entry point for HTTP/2, and Deno can reach it
    // via an explicit `@arcjet/guard/node` import. Neither runtime's Node HTTP
    // agent implements the `proxyEnv` option, so the agent path below would
    // silently bypass the proxy. Both honor the proxy environment variables in
    // their native `fetch`, so route through the fetch transport instead —
    // matching how `@arcjet/transport` handles Bun and Deno. The proxy was
    // already detected and logged above, so build the transport directly
    // without detecting again.
    if (isBun() || isDeno()) {
      return createFetchTransport(baseUrl);
    }

    // Hand the agent only the single proxy we resolved (rather than the whole
    // environment) so it routes through exactly the proxy we detected, using
    // our `NO_PROXY` handling as the single source of truth. `keepAlive` lets
    // it reuse the connection to the proxy across requests, since the direct
    // HTTP/2 path keeps a long-lived session.
    //
    // Type the literal with the exact proxy variable names so a misspelled key
    // is a compile error; the `proxyEnv` option's `ProcessEnv` index signature
    // would otherwise accept any key and silently disable proxying.
    const proxyEnvironment: Partial<
      Record<"HTTP_PROXY" | "HTTPS_PROXY", string>
    > =
      new URL(baseUrl).protocol === "https:"
        ? { HTTPS_PROXY: proxyUrl }
        : { HTTP_PROXY: proxyUrl };
    const agent =
      new URL(baseUrl).protocol === "https:"
        ? new https.Agent({ keepAlive: true, proxyEnv: proxyEnvironment })
        : new http.Agent({ keepAlive: true, proxyEnv: proxyEnvironment });

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

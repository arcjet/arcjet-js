import type { Transport } from "@connectrpc/connect";
import {
  createConnectTransport,
  Http2SessionManager,
} from "@connectrpc/connect-node";
import * as http from "node:http";
import * as https from "node:https";
import { detectProxy } from "./detect-proxy.js";

export type {
  ProxyEnvironment,
  TransportLogger,
  TransportOptions,
} from "./detect-proxy.js";

import type { TransportOptions } from "./detect-proxy.js";

/**
 * Create a transport that talks to the Arcjet API using Connect RPC.
 *
 * A thin wrapper around {@linkcode createConnectTransport}.
 *
 * When a standard proxy environment variable (`HTTP_PROXY` or `HTTPS_PROXY`,
 * respecting `NO_PROXY`) is detected, the transport routes requests through the
 * proxy over HTTP/1.1 using the built-in proxy support of the Node.js HTTP
 * agent and logs a line at startup. Otherwise it connects directly over
 * HTTP/2.
 *
 * @param baseUrl
 *   Base URI for all HTTP requests (example: `https://example.com/my-api`).
 * @param options
 *   Configuration (optional).
 * @returns
 *   Connect transport used to make RPC calls.
 */
export function createTransport(
  baseUrl: string,
  options?: TransportOptions,
): Transport {
  const url = new URL(baseUrl);
  const proxyUrl = detectProxy(url, options);

  if (typeof proxyUrl === "string") {
    // We hand the agent only the single proxy we resolved (rather than the
    // whole environment) so it routes through exactly the proxy we detected,
    // honoring the `proxyEnv` option and our own `NO_PROXY` handling rather than
    // re-resolving the environment. That keeps detection as the single source of
    // truth: if we decided a proxy applies, the agent uses it.
    //
    // `keepAlive` lets the agent reuse the connection to the proxy across
    // requests; the direct HTTP/2 path keeps a long-lived session, so without
    // it the proxy path would open a fresh connection on every call.
    // We hand the agent only the single proxy variable we resolved. Type the
    // literal with the exact proxy variable names first so a misspelled key is
    // a compile error (the `proxyEnv` option is typed as `ProcessEnv`, whose
    // index signature would otherwise accept any key and silently disable
    // proxying). The final assertion to `ProcessEnv` is still needed because
    // some type augmentations (e.g. when this source is bundled into a Next.js
    // app) make `ProcessEnv` require `NODE_ENV`, so a bare object literal isn't
    // accepted. The object is correct at runtime — the agent only reads proxy
    // variables from it.
    const proxyEnvironment: Partial<
      Record<"HTTP_PROXY" | "HTTPS_PROXY", string>
    > =
      url.protocol === "https:"
        ? { HTTPS_PROXY: proxyUrl }
        : { HTTP_PROXY: proxyUrl };
    const proxyEnv = proxyEnvironment as unknown as NodeJS.ProcessEnv;

    const agent =
      url.protocol === "https:"
        ? new https.Agent({ keepAlive: true, proxyEnv })
        : new http.Agent({ keepAlive: true, proxyEnv });

    // Node's built-in proxy support only works over HTTP/1.1.
    return createConnectTransport({
      baseUrl,
      httpVersion: "1.1",
      nodeOptions: { agent },
    });
  }

  // We create our own session manager so we can attempt to pre-connect
  const sessionManager = new Http2SessionManager(baseUrl, {
    // AWS Global Accelerator doesn't support PING so we use a very high idle
    // timeout. Ref:
    // https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html#about-idle-timeout
    idleConnectionTimeoutMs: 340 * 1000,
  });

  // This is an optimistic pre-connect. In Deno, the Node HTTP/2 compatibility
  // layer can surface background session failures as uncaught test errors, so
  // we only warm the connection in Node.
  if (!("Deno" in globalThis)) {
    sessionManager.connect();
  }

  return createConnectTransport({
    baseUrl,
    httpVersion: "2",
    sessionManager,
  });
}

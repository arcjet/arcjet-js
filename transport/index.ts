import type { Transport } from "@connectrpc/connect";
import {
  createConnectTransport,
  Http2SessionManager,
} from "@connectrpc/connect-node";
import * as http from "node:http";
import * as https from "node:https";
import { detectProxy } from "./detect-proxy.js";
import { createTunnelingConnection } from "./proxy-tunnel.js";

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
 * proxy and logs a line at startup. By default it proxies over HTTP/1.1 using
 * the built-in proxy support of the Node.js HTTP agent; set
 * `options.proxyHttpVersion` to `"2"` to instead tunnel HTTP/2 to the origin
 * via `CONNECT` (see {@linkcode TransportOptions.proxyHttpVersion}). Without a
 * proxy it always connects directly over HTTP/2.
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
    if (options?.proxyHttpVersion === "2") {
      // HTTP/2 through the proxy: open a `CONNECT` tunnel and keep HTTP/2 to
      // the origin end-to-end. The proxy only blindly forwards the tunnel, so
      // ALPN is negotiated directly with the origin — see `./proxy-tunnel.ts`.
      return createHttp2Transport(baseUrl, createTunnelingConnection(proxyUrl));
    }

    // HTTP/1.1 through the proxy (default). Hand the agent only the single
    // proxy variable we resolved (not the whole environment) so it routes
    // through exactly the proxy our detection chose, honoring our `NO_PROXY`
    // handling. `keepAlive` lets the agent reuse the connection to the proxy
    // across requests, like the long-lived session of the direct HTTP/2 path.
    //
    // Type the literal with the exact proxy variable names so a misspelled key
    // is a compile error. The agent's `proxyEnv` option only exists in
    // @types/node 24.x, but this source is also type-checked on the 22.x line
    // (e.g. when bundled into @arcjet/next or @arcjet/sveltekit), so `proxyEnv`
    // is added through an intersection type rather than relying on it being a
    // known `AgentOptions` property. The `as unknown as ProcessEnv` is needed
    // because some augmentations (e.g. Next.js) make `ProcessEnv` require
    // `NODE_ENV`; the object is correct at runtime.
    const isHttps = url.protocol === "https:";
    const proxyEnvironment: Partial<
      Record<"HTTP_PROXY" | "HTTPS_PROXY", string>
    > = isHttps ? { HTTPS_PROXY: proxyUrl } : { HTTP_PROXY: proxyUrl };
    const agentOptions: http.AgentOptions & { proxyEnv: NodeJS.ProcessEnv } = {
      keepAlive: true,
      proxyEnv: proxyEnvironment as unknown as NodeJS.ProcessEnv,
    };

    const agent = isHttps
      ? new https.Agent(agentOptions)
      : new http.Agent(agentOptions);

    // Node's built-in proxy support only works over HTTP/1.1.
    return createConnectTransport({
      baseUrl,
      httpVersion: "1.1",
      nodeOptions: { agent },
    });
  }

  // No proxy: connect directly over HTTP/2.
  return createHttp2Transport(baseUrl);
}

/**
 * Build a direct HTTP/2 transport with an optimistically pre-connecting session
 * manager.
 *
 * When `createConnection` is supplied the session is tunneled through it (used
 * to route HTTP/2 through a proxy via `CONNECT`); otherwise it connects directly
 * to `baseUrl`. Either way pings and the idle timeout behave identically — only
 * the underlying connection differs.
 *
 * @param baseUrl
 *   Base URI for all HTTP requests.
 * @param createConnection
 *   Optional connection factory passed through to `http2.connect` (optional).
 * @returns
 *   Connect transport that talks HTTP/2 to `baseUrl`.
 */
function createHttp2Transport(
  baseUrl: string,
  createConnection?: ReturnType<typeof createTunnelingConnection>,
): Transport {
  const sessionManager = new Http2SessionManager(
    baseUrl,
    // AWS Global Accelerator doesn't support PING so we use a very high idle
    // timeout. Ref:
    // https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html#about-idle-timeout
    { idleConnectionTimeoutMs: 340 * 1000 },
    createConnection ? { createConnection } : undefined,
  );

  // This is an optimistic pre-connect. In Deno, the Node HTTP/2 compatibility
  // layer can surface background session failures as uncaught test errors, so
  // we only warm the connection in Node.
  if (!("Deno" in globalThis)) {
    sessionManager.connect();
  }

  return createConnectTransport({ baseUrl, httpVersion: "2", sessionManager });
}

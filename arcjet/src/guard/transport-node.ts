/**
 * Connect RPC transport factory for `@arcjet/guard` — Node.js.
 *
 * Without a proxy it connects directly over HTTP/2. When a standard proxy
 * environment variable is detected, it routes through the proxy over HTTP/1.1
 * using the built-in proxy support of the Node.js HTTP agent.
 *
 * This entry point is Node-only: Bun has its own entry point
 * (`transport-bun.ts`) because its `fetch` proxies but its `node:http` agent
 * does not, and Deno reaches the fetch entry point through the `"deno"` export
 * condition. An explicit `@arcjet/guard/node` import on Bun or Deno still lands
 * here and uses the Node agent — whose `proxyEnv` option those runtimes don't
 * implement, so a proxy would not be applied on them (use the default import
 * for proxy support there).
 *
 * @packageDocumentation
 */

import * as http from "node:http";
import * as https from "node:https";

import type { Transport } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";

import { detectProxy } from "./detect-proxy.ts";
import { createHttp2Transport } from "./transport-http2.ts";

/**
 * Create a Connect transport for the given base URL.
 *
 * When a proxy is detected (`HTTP_PROXY`/`HTTPS_PROXY`, respecting `NO_PROXY`),
 * the request is routed through it over HTTP/1.1 using the built-in proxy
 * support of the Node.js HTTP agent. Without a proxy it connects directly over
 * HTTP/2, optimistically pre-connecting so the first `.guard()` call doesn't
 * pay the full TCP + TLS setup cost.
 */
export function createTransport(baseUrl: string): Transport {
  const url = new URL(baseUrl);
  const proxyUrl = detectProxy(url);

  // No proxy: connect directly over HTTP/2.
  if (proxyUrl === undefined) {
    return createHttp2Transport(baseUrl).transport;
  }

  // Proxy: route through it over HTTP/1.1 using the agent's built-in proxy
  // support. Hand the agent only the single proxy variable we resolved, typed
  // with the exact key names so a misspelled key is a compile error.
  // `keepAlive` reuses the proxy connection across requests. The agent's
  // `proxyEnv` option only exists in @types/node 24.x, so it's added through an
  // intersection type to keep this type-checking on the 22.x line used across
  // the monorepo.
  const isHttps = url.protocol === "https:";
  const proxyEnvironment: Partial<Record<"HTTP_PROXY" | "HTTPS_PROXY", string>> = isHttps
    ? { HTTPS_PROXY: proxyUrl }
    : { HTTP_PROXY: proxyUrl };
  const options: http.AgentOptions & { proxyEnv: typeof proxyEnvironment } = {
    keepAlive: true,
    proxyEnv: proxyEnvironment,
  };
  const agent = isHttps ? new https.Agent(options) : new http.Agent(options);

  // Node's built-in proxy support only works over HTTP/1.1.
  return createConnectTransport({
    baseUrl,
    httpVersion: "1.1",
    nodeOptions: { agent },
  });
}

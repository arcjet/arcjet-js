// Shared setup for the Bun and Deno runtime proxy tests.
//
// These tests run on the real Bun and Deno runtimes (not under Node), where the
// `bun.js`/`deno.js` entry points delegate proxying to the runtime's native
// `fetch`. The Node test suite imports those entry points under Node, so it
// can't verify that the native `fetch` actually honors the proxy environment
// variables — that is what these tests cover.
//
// The fixture stands up an HTTPS Eliza origin reachable only through a
// `CONNECT` proxy, points `HTTPS_PROXY` at that proxy, and lets the runtime's
// `fetch` do the tunneling. The production Arcjet API is HTTPS, so this
// exercises the `CONNECT` path rather than plaintext-HTTP forwarding.
import https from "node:https";

import { connectNodeAdapter } from "@connectrpc/connect-node";

import { ElizaService } from "../eliza_pb.ts";
import { close, createConnectProxy, generateSelfSignedCert, listen } from "../proxy.ts";

/**
 * A running proxy + origin pair for a single runtime proxy test.
 */
export interface ProxyFixture {
  /** Base URL of the HTTPS origin requests should be made to. */
  originUrl: string;
  /** Number of `CONNECT` requests the proxy has received. */
  connectCount(): number;
  /** Tear down the proxy and origin and restore the environment. */
  close(): Promise<void>;
}

function elizaAdapter() {
  return connectNodeAdapter({
    routes(router) {
      router.service(ElizaService, {
        say(request) {
          return { sentence: "You said `" + request.sentence + "`" };
        },
      });
    },
  });
}

/**
 * Start an HTTPS Eliza origin reachable only through a `CONNECT` proxy listening
 * on the port from `HTTPS_PROXY`, so the runtime's native `fetch` tunnels
 * through it.
 *
 * `HTTPS_PROXY` must be set by the `test-runtime-*` npm script *before the
 * process starts* — that mirrors how a proxy is configured in production (a
 * plain environment variable), and it's required because Bun and older Deno
 * only read the proxy environment at startup, not when `fetch` is called.
 *
 * @returns
 *   The running fixture.
 */
export async function startProxyFixture(): Promise<ProxyFixture> {
  const configuredProxy = process.env.HTTPS_PROXY;
  if (!configuredProxy) {
    throw new Error("HTTPS_PROXY must be set by the test-runtime-* npm script for this test");
  }
  const proxyPort = Number(new URL(configuredProxy).port);

  const { key, cert } = generateSelfSignedCert();

  const origin = https.createServer({ key, cert }, elizaAdapter());
  const originUrl = await listen(origin, "https");
  const authority = new URL(originUrl).host;

  // We don't trust the origin's self-signed certificate (disabling TLS
  // verification is a security anti-pattern), so the handshake over the tunnel
  // is expected to fail; the test only checks that the request was routed
  // through the proxy via CONNECT.
  let connectRequests = 0;
  const proxy = createConnectProxy(authority, () => {
    connectRequests++;
  });
  await new Promise<void>((resolve) => {
    proxy.listen(proxyPort, "127.0.0.1", () => resolve());
  });

  return {
    originUrl,
    connectCount: () => connectRequests,
    close: async () => {
      await close(proxy);
      await close(origin);
    },
  };
}

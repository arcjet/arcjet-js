import assert from "node:assert/strict";
import http2 from "node:http2";
import http from "node:http";
import https from "node:https";
import test from "node:test";
import type { Transport } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { createClient } from "@connectrpc/connect";
import { createTransport as createTransportBun } from "../bun.js";
import { createTransport as createTransportDeno } from "../deno.js";
import { createTransport as createTransportEdge } from "../edge-light.js";
import { createTransport as createTransportWorkerd } from "../workerd.js";
import { createTransport } from "../index.js";
import { createTunnelingConnection } from "../proxy-tunnel.js";
import { ElizaService } from "./eliza_pb.js";
import {
  close,
  createConnectProxy,
  createProxy,
  generateSelfSignedCert,
  listen,
  trackHttp2Sessions,
  withHttpProxyEnvironment,
} from "./proxy.js";

function elizaRoutes() {
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

// Message logged once at startup when a proxy is detected. The proxy URL is
// deliberately not included, so it can never leak credentials.
const proxyMessage = "Connecting to the Arcjet API through a proxy";

// Construct a transport with the given proxy environment and return the message
// that was logged (or `undefined` when nothing was logged). Uses the Bun
// transport because constructing it has no side effects — no network
// connection is opened — which keeps these checks fast and deterministic.
function loggedProxy(
  baseUrl: string,
  proxyEnv: Record<string, string | undefined>,
): string | undefined {
  let logged: string | undefined;
  createTransportBun(baseUrl, {
    log: {
      info(message) {
        logged = message;
      },
    },
    proxyEnv,
  });
  return logged;
}

let uniquePort = 3400;

// Start an HTTP origin serving the Eliza service, run `fn` with its URL, then
// close it.
async function withHttpOrigin(
  fn: (url: string) => Promise<void>,
): Promise<void> {
  const port = uniquePort++;
  const server = http.createServer(elizaRoutes());

  await new Promise<void>(function (resolve) {
    server.listen({ port }, function () {
      resolve();
    });
  });

  try {
    await fn("http://localhost:" + port);
  } finally {
    await close(server);
  }
}

test("@arcjet/transport", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "createTransport",
    ]);
  });

  await t.test("should throw w/o `url`", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      createTransport();
      // TODO: better error message.
    }, /Invalid URL/);
  });

  await t.test("should work over HTTP/2 by default", async function () {
    const port = uniquePort++;
    const url = "http://localhost:" + port;

    const server = trackHttp2Sessions(http2.createServer(elizaRoutes()));

    await new Promise(function (resolve) {
      server.listen({ port }, function () {
        resolve(undefined);
      });
    });

    const client = createClient(ElizaService, createTransport(url));
    const result = await client.say({ sentence: "Hi!" });

    await close(server);

    assert.equal(result.sentence, "You said `Hi!`");
  });

  await t.test(
    "should work through `HTTP_PROXY` over HTTP/1.1",
    async function () {
      const origin = http.createServer(elizaRoutes());
      const originUrl = await listen(origin);

      let proxyRequests = 0;
      const proxy = createProxy(originUrl, () => {
        proxyRequests++;
      });
      const proxyUrl = await listen(proxy);

      try {
        await withHttpProxyEnvironment(proxyUrl, async () => {
          const client = createClient(
            ElizaService,
            createTransport(originUrl, { log: { info() {} } }),
          );
          const result = await client.say({ sentence: "Hi!" });
          assert.equal(result.sentence, "You said `Hi!`");
        });
      } finally {
        await close(proxy);
        await close(origin);
      }

      assert.equal(proxyRequests, 1);
    },
  );

  await t.test(
    "should route an HTTPS target through `HTTPS_PROXY` via CONNECT",
    async function () {
      // The production Arcjet API is HTTPS, which the Node agent reaches by
      // sending an HTTP/1.1 CONNECT to the proxy before the TLS handshake —
      // unlike the absolute-form forwarding used for HTTP. We verify that
      // routing by asserting the proxy receives the CONNECT. We deliberately
      // do NOT trust the test origin's self-signed certificate (disabling TLS
      // verification is a security anti-pattern), so the handshake over the
      // tunnel is expected to fail; the CONNECT is what proves the routing.
      const { key, cert } = generateSelfSignedCert();
      const origin = https.createServer({ key, cert }, elizaRoutes());
      const originUrl = await listen(origin, "https");
      const authority = new URL(originUrl).host;

      let connectRequests = 0;
      const proxy = createConnectProxy(authority, () => {
        connectRequests++;
      });
      const proxyUrl = await listen(proxy);

      try {
        const client = createClient(
          ElizaService,
          createTransport(originUrl, {
            log: { info() {} },
            proxyEnv: { HTTPS_PROXY: proxyUrl },
          }),
        );
        // Expected to reject at the TLS handshake (untrusted self-signed cert);
        // we only care that it was tunneled through the proxy via CONNECT.
        await client.say({ sentence: "Hi!" }).catch(() => {});
      } finally {
        await close(proxy);
        await close(origin);
      }

      assert.ok(
        connectRequests >= 1,
        "expected the HTTPS request to be tunneled through the proxy via CONNECT",
      );
    },
  );

  await t.test(
    "should preserve HTTP/2 through a proxy when `proxyHttpVersion` is `2`",
    async function () {
      // A cleartext HTTP/2 (h2c) origin lets us drive a real round trip through
      // the tunnel without certificates: the `CONNECT` proxy tunnels TCP and
      // the transport speaks HTTP/2 over it end-to-end.
      const origin = trackHttp2Sessions(http2.createServer(elizaRoutes()));
      const originUrl = await listen(origin);
      const authority = new URL(originUrl).host;

      let connectRequests = 0;
      const proxy = createConnectProxy(authority, () => {
        connectRequests++;
      });
      const proxyUrl = await listen(proxy);

      try {
        const client = createClient(
          ElizaService,
          createTransport(originUrl, {
            log: { info() {} },
            proxyEnv: { HTTP_PROXY: proxyUrl },
            proxyHttpVersion: "2",
          }),
        );
        const result = await client.say({ sentence: "Hi!" });
        assert.equal(result.sentence, "You said `Hi!`");
      } finally {
        await close(proxy);
        await close(origin);
      }

      assert.ok(
        connectRequests >= 1,
        "expected the request to be tunneled through the proxy via CONNECT",
      );
    },
  );

  await t.test(
    "should negotiate HTTP/2 (ALPN `h2`) end-to-end through a CONNECT proxy",
    async function () {
      // The production API is HTTPS, where HTTP/2 is selected by ALPN during the
      // TLS handshake. That handshake happens directly with the origin inside
      // the tunnel, so the proxy can't downgrade it. We trust the test origin's
      // certificate here (via `ca`) so the handshake completes and we can assert
      // the negotiated protocol — exercising the tunnel helper the way the
      // transport uses it.
      //
      // This origin is addressed by IP (`127.0.0.1`). RFC 6066 §3 forbids an IP
      // literal in the TLS SNI, so the tunnel must NOT send SNI here (the cert is
      // validated against the IP instead). This test originally failed because
      // the tunnel set the SNI to the origin host unconditionally: an IP origin
      // therefore produced a non-compliant IP-literal SNI, which Node <= 24
      // tolerated (with a deprecation warning) but Node >= 26 rejects outright.
      // The hostname companion test below covers the case where SNI *is* sent.
      const { key, cert } = generateSelfSignedCert();
      const origin = http2.createSecureServer({ key, cert });
      origin.on("stream", function (stream) {
        stream.respond({ ":status": 200 });
        stream.end("ok");
      });
      const originUrl = await listen(origin, "https");
      const authority = new URL(originUrl).host;

      let connectRequests = 0;
      const proxy = createConnectProxy(authority, () => {
        connectRequests++;
      });
      const proxyUrl = await listen(proxy);

      // `http2.connect` calls `createConnection` synchronously, so if the
      // tunnel helper throws while setting up the connection (for example, on
      // Node >= 26 with an IP-literal SNI) the throw surfaces from this call.
      // Keep it inside the `try` and track the session in an outer binding so
      // the `finally` always tears down the proxy and origin, even when the
      // session was never created.
      let session: http2.ClientHttp2Session | undefined;
      try {
        const connected = http2.connect(originUrl, {
          ca: cert,
          createConnection: createTunnelingConnection(proxyUrl),
        });
        session = connected;

        await new Promise<void>(function (resolve, reject) {
          connected.once("connect", () => resolve());
          connected.once("error", reject);
        });

        assert.equal(
          connected.alpnProtocol,
          "h2",
          "expected HTTP/2 to be negotiated with the origin through the tunnel",
        );

        // A round trip proves the tunnel carries real HTTP/2 frames, not just a
        // completed handshake.
        const body = await new Promise<string>(function (resolve, reject) {
          const request = connected.request({ ":path": "/" });
          let data = "";
          request.setEncoding("utf8");
          request.on("data", (chunk) => (data += chunk));
          request.on("end", () => resolve(data));
          request.on("error", reject);
          request.end();
        });
        assert.equal(body, "ok");
      } finally {
        session?.close();
        await close(proxy);
        await close(origin);
      }

      assert.ok(
        connectRequests >= 1,
        "expected the request to be tunneled through the proxy via CONNECT",
      );
    },
  );

  await t.test(
    "should negotiate HTTP/2 (ALPN `h2`) to a hostname origin through a CONNECT proxy",
    async function () {
      // Companion to the IP test above and the production-realistic case: a
      // hostname origin, where the tunnel *does* send SNI and the certificate is
      // validated against it. The origin still listens on the loopback IP and the
      // proxy dials that IP, so the tunnel stays on IPv4 regardless of how
      // `localhost` resolves; only the SNI, `:authority`, and certificate use the
      // hostname.
      const hostname = "localhost";
      const { key, cert } = generateSelfSignedCert(hostname);
      const origin = trackHttp2Sessions(http2.createSecureServer({ key, cert }));
      origin.on("stream", function (stream) {
        stream.respond({ ":status": 200 });
        stream.end("ok");
      });
      const loopbackUrl = await listen(origin, "https");
      const port = new URL(loopbackUrl).port;
      const originUrl = `https://${hostname}:${port}`;
      const authority = new URL(originUrl).host;

      let connectRequests = 0;
      const proxy = createConnectProxy(
        authority,
        () => {
          connectRequests++;
        },
        // Dial the loopback origin even though the authority is a hostname.
        "127.0.0.1",
      );
      const proxyUrl = await listen(proxy);

      let session: http2.ClientHttp2Session | undefined;
      try {
        const connected = http2.connect(originUrl, {
          ca: cert,
          createConnection: createTunnelingConnection(proxyUrl),
        });
        session = connected;

        await new Promise<void>(function (resolve, reject) {
          connected.once("connect", () => resolve());
          connected.once("error", reject);
        });

        assert.equal(
          connected.alpnProtocol,
          "h2",
          "expected HTTP/2 to be negotiated with the origin through the tunnel",
        );

        const body = await new Promise<string>(function (resolve, reject) {
          const request = connected.request({ ":path": "/" });
          let data = "";
          request.setEncoding("utf8");
          request.on("data", (chunk) => (data += chunk));
          request.on("end", () => resolve(data));
          request.on("error", reject);
          request.end();
        });
        assert.equal(body, "ok");
      } finally {
        session?.close();
        await close(proxy);
        await close(origin);
      }

      assert.ok(
        connectRequests >= 1,
        "expected the request to be tunneled through the proxy via CONNECT",
      );
    },
  );

  await t.test(
    "should connect directly over HTTP/2 when `NO_PROXY` matches",
    async function () {
      const port = uniquePort++;
      const url = "http://localhost:" + port;

      const server = trackHttp2Sessions(http2.createServer(elizaRoutes()));

      await new Promise(function (resolve) {
        server.listen({ port }, function () {
          resolve(undefined);
        });
      });

      let logged = false;
      try {
        const client = createClient(
          ElizaService,
          createTransport(url, {
            log: {
              info() {
                logged = true;
              },
            },
            proxyEnv: {
              HTTP_PROXY: "http://127.0.0.1:1",
              NO_PROXY: "localhost",
            },
          }),
        );
        const result = await client.say({ sentence: "Hi!" });
        assert.equal(result.sentence, "You said `Hi!`");
      } finally {
        await close(server);
      }

      // The proxy was bypassed, so nothing should have been logged.
      assert.equal(logged, false);
    },
  );

  await t.test("should allow explicit proxy environment", async function () {
    const origin = http.createServer(elizaRoutes());
    const originUrl = await listen(origin);

    let proxyRequests = 0;
    const proxy = createProxy(originUrl, () => {
      proxyRequests++;
    });
    const proxyUrl = await listen(proxy);

    try {
      const client = createClient(
        ElizaService,
        createTransport(originUrl, {
          log: { info() {} },
          proxyEnv: { HTTP_PROXY: proxyUrl },
        }),
      );
      const result = await client.say({ sentence: "Hi!" });
      assert.equal(result.sentence, "You said `Hi!`");
    } finally {
      await close(proxy);
      await close(origin);
    }

    assert.equal(proxyRequests, 1);
  });

  await t.test("should allow disabling proxy environment", async function () {
    const port = uniquePort++;
    const url = "http://localhost:" + port;

    const server = trackHttp2Sessions(http2.createServer(elizaRoutes()));

    await new Promise(function (resolve) {
      server.listen({ port }, function () {
        resolve(undefined);
      });
    });

    try {
      const client = createClient(
        ElizaService,
        // `proxyEnv: false` ignores the proxy set in the environment.
        await withHttpProxyEnvironment("http://127.0.0.1:1", async () =>
          createTransport(url, { proxyEnv: false }),
        ),
      );
      const result = await client.say({ sentence: "Hi!" });
      assert.equal(result.sentence, "You said `Hi!`");
    } finally {
      await close(server);
    }
  });

  await t.test("should build an HTTPS proxy transport", async function () {
    const transport = createTransport("https://decide.arcjet.com", {
      log: { info() {} },
      proxyEnv: { HTTPS_PROXY: "http://127.0.0.1:1" },
    });

    assert.equal(typeof transport, "object");
    assert.notEqual(transport, null);
  });

  await t.test("should not log when no proxy is configured", async function () {
    assert.equal(loggedProxy("https://decide.arcjet.com", {}), undefined);
  });

  await t.test("should use the default logger", async function () {
    // No `log` option, so the default logger (configured from
    // `ARCJET_LOG_LEVEL`) is created. We can't easily capture its output, but
    // exercising it covers the default branch.
    const transport = createTransportBun("https://decide.arcjet.com", {
      proxyEnv: { HTTPS_PROXY: "http://127.0.0.1:1" },
    });
    assert.equal(typeof transport, "object");
  });

  await t.test("should honor `NO_PROXY`", async function () {
    const proxy = "http://proxy.example.com:3128";

    // [NO_PROXY, base URL, expected to be bypassed]
    const cases: Array<[string, string, boolean]> = [
      ["*", "http://api.example.com:8080/", true],
      ["api.example.com", "http://api.example.com:8080/", true],
      ["example.com", "http://api.example.com:8080/", true],
      ["other.com", "http://api.example.com:8080/", false],
      ["api.example.com:8080", "http://api.example.com:8080/", true],
      ["api.example.com:9999", "http://api.example.com:8080/", false],
      [".example.com", "http://api.example.com:8080/", true],
      ["*.example.com", "http://api.example.com:8080/", true],
      [",other.com", "http://api.example.com:8080/", false],
      [".", "http://api.example.com:8080/", false],
      ["foo:bar", "http://api.example.com:8080/", false],
      ["api.example.com:80", "http://api.example.com/", true],
      ["api.example.com:443", "https://api.example.com/", true],
      // IPv6 hosts, written with or without brackets and with or without a port.
      ["::1", "http://[::1]:8080/", true],
      ["[::1]", "http://[::1]:8080/", true],
      ["[::1]:8080", "http://[::1]:8080/", true],
      ["[::1]:9999", "http://[::1]:8080/", false],
      ["::1", "http://[::2]:8080/", false],
    ];

    for (const [noProxy, baseUrl, bypassed] of cases) {
      const logged = loggedProxy(baseUrl, {
        HTTP_PROXY: proxy,
        HTTPS_PROXY: proxy,
        NO_PROXY: noProxy,
      });
      assert.equal(
        logged,
        bypassed ? undefined : proxyMessage,
        `NO_PROXY=${noProxy} for ${baseUrl}`,
      );
    }
  });

  await t.test(
    "should not throw when reading the environment fails",
    function () {
      // Simulate a runtime that gates environment access behind a permission
      // (e.g. Deno without `--allow-env`), where reading a variable throws.
      const throwing = new Proxy<Record<string, string | undefined>>(
        {},
        {
          get() {
            throw new Error("permission denied");
          },
        },
      );

      assert.equal(
        loggedProxy("https://decide.arcjet.com", throwing),
        undefined,
      );
    },
  );

  await t.test(
    "should ignore uppercase `HTTP_PROXY` under CGI (httpoxy)",
    function () {
      // With `REQUEST_METHOD` set (a CGI environment), uppercase `HTTP_PROXY` —
      // which an inbound `Proxy` header can populate — is ignored for HTTP.
      assert.equal(
        loggedProxy("http://api.example.com/", {
          HTTP_PROXY: "http://attacker.example.com:3128",
          REQUEST_METHOD: "GET",
        }),
        undefined,
      );

      // Lowercase `http_proxy` is still honored under CGI.
      assert.equal(
        loggedProxy("http://api.example.com/", {
          http_proxy: "http://proxy.example.com:3128",
          REQUEST_METHOD: "GET",
        }),
        proxyMessage,
      );

      // Without `REQUEST_METHOD`, uppercase `HTTP_PROXY` is honored as usual.
      assert.equal(
        loggedProxy("http://api.example.com/", {
          HTTP_PROXY: "http://proxy.example.com:3128",
        }),
        proxyMessage,
      );
    },
  );

  // Each web-runtime entry point uses `@connectrpc/connect-web` over HTTP/1.1;
  // they differ only in the runtime they target. Exercise each the same way.
  const webRuntimes: Array<[string, (url: string) => Transport]> = [
    ["Bun", createTransportBun],
    ["Deno", createTransportDeno],
    ["Vercel Edge", createTransportEdge],
    ["Cloudflare Workers", createTransportWorkerd],
  ];

  for (const [name, create] of webRuntimes) {
    await t.test("should work over HTTP on " + name, async function () {
      await withHttpOrigin(async function (url) {
        const client = createClient(ElizaService, create(url));
        const result = await client.say({ sentence: "Hi!" });
        assert.equal(result.sentence, "You said `Hi!`");
      });
    });
  }
});

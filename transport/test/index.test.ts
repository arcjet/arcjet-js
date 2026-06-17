import assert from "node:assert/strict";
import http2 from "node:http2";
import http from "node:http";
import https from "node:https";
import test from "node:test";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { createClient } from "@connectrpc/connect";
import { createTransport as createTransportBun } from "../bun.js";
import { createTransport as createTransportDeno } from "../deno.js";
import { createTransport as createTransportEdge } from "../edge-light.js";
import { createTransport as createTransportWorkerd } from "../workerd.js";
import { createTransport } from "../index.js";
import { ElizaService } from "./eliza_pb.js";
import {
  close,
  createConnectProxy,
  createProxy,
  generateSelfSignedCert,
  listen,
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

    const server = http2.createServer(elizaRoutes());

    await new Promise(function (resolve) {
      server.listen({ port }, function () {
        resolve(undefined);
      });
    });

    const client = createClient(ElizaService, createTransport(url));
    const result = await client.say({ sentence: "Hi!" });

    await server.close();

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
    "should work through `HTTPS_PROXY` over HTTP/1.1 via CONNECT",
    async function () {
      // The production Arcjet API is HTTPS, so the proxy is reached through an
      // HTTP/1.1 CONNECT tunnel rather than absolute-form forwarding. Stand up a
      // self-signed HTTPS origin and a tunneling proxy to exercise that path
      // end to end.
      const { key, cert } = generateSelfSignedCert();
      const origin = https.createServer({ key, cert }, elizaRoutes());
      const originUrl = await listen(origin, "https");
      const authority = new URL(originUrl).host;

      let connectRequests = 0;
      const proxy = createConnectProxy(authority, () => {
        connectRequests++;
      });
      const proxyUrl = await listen(proxy);

      // `createTransport`'s agent doesn't expose a `ca` option, so trust the
      // self-signed origin by disabling TLS verification for this test only.
      const previousReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      try {
        const client = createClient(
          ElizaService,
          createTransport(originUrl, {
            log: { info() {} },
            proxyEnv: { HTTPS_PROXY: proxyUrl },
          }),
        );
        const result = await client.say({ sentence: "Hi!" });
        assert.equal(result.sentence, "You said `Hi!`");
      } finally {
        if (previousReject === undefined) {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        } else {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousReject;
        }
        await close(proxy);
        await close(origin);
      }

      assert.equal(connectRequests, 1);
    },
  );

  await t.test(
    "should connect directly over HTTP/2 when `NO_PROXY` matches",
    async function () {
      const port = uniquePort++;
      const url = "http://localhost:" + port;

      const server = http2.createServer(elizaRoutes());

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
        await server.close();
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

    const server = http2.createServer(elizaRoutes());

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
      await server.close();
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

  await t.test("should work over HTTP on Bun", async function () {
    const port = uniquePort++;
    const url = "http://localhost:" + port;

    const server = http.createServer(elizaRoutes());

    await new Promise(function (resolve) {
      server.listen({ port }, function () {
        resolve(undefined);
      });
    });

    const client = createClient(ElizaService, createTransportBun(url));
    const result = await client.say({ sentence: "Hi!" });

    await server.close();

    assert.equal(result.sentence, "You said `Hi!`");
  });

  await t.test("should work over HTTP on Deno", async function () {
    const port = uniquePort++;
    const url = "http://localhost:" + port;

    const server = http.createServer(elizaRoutes());

    await new Promise(function (resolve) {
      server.listen({ port }, function () {
        resolve(undefined);
      });
    });

    const client = createClient(ElizaService, createTransportDeno(url));
    const result = await client.say({ sentence: "Hi!" });

    await server.close();

    assert.equal(result.sentence, "You said `Hi!`");
  });

  await t.test("should work over HTTP on Vercel Edge", async function () {
    const port = uniquePort++;
    const url = "http://localhost:" + port;

    const server = http.createServer(elizaRoutes());

    await new Promise(function (resolve) {
      server.listen({ port }, function () {
        resolve(undefined);
      });
    });

    const client = createClient(ElizaService, createTransportEdge(url));
    const result = await client.say({ sentence: "Hi!" });

    await server.close();

    assert.equal(result.sentence, "You said `Hi!`");
  });

  await t.test(
    "should work over HTTP on Cloudflare Workers",
    async function () {
      const port = uniquePort++;
      const url = "http://localhost:" + port;

      const server = http.createServer(elizaRoutes());

      await new Promise(function (resolve) {
        server.listen({ port }, function () {
          resolve(undefined);
        });
      });

      const client = createClient(ElizaService, createTransportWorkerd(url));
      const result = await client.say({ sentence: "Hi!" });

      await server.close();

      assert.equal(result.sentence, "You said `Hi!`");
    },
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import arcjet, { ArcjetAllowDecision, ArcjetReason, ArcjetRuleResult } from "../dist/index.js";

function createClient(onRequest: (request: any) => void) {
  return arcjet({
    client: {
      async decide() {
        return new ArcjetAllowDecision({ reason: new ArcjetReason(), results: [], ttl: 0 });
      },
      report() {},
    },
    key: "test-key",
    rules: [
      [
        {
          mode: "LIVE",
          priority: 0,
          async protect(_context: any, request: any) {
            onRequest(request);
            return new ArcjetRuleResult({
              conclusion: "ALLOW",
              fingerprint: "",
              reason: new ArcjetReason(),
              ruleId: "",
              state: "RUN",
              ttl: 0,
            });
          },
          validate() {},
          version: 0,
          type: "",
        },
      ],
    ],
  });
}

const info = {
  localAddr: { hostname: "127.0.0.1", port: 443, transport: "tcp" },
  remoteAddr: { hostname: "192.0.2.1", port: 1234, transport: "tcp" },
} as const;

// Like a request from `Deno.serve`, whose `url` joins the scheme, the `Host`
// header, and the request target as sent. A `Request` constructed in
// JavaScript would normalize the URL.
function served(url: string, host: string) {
  return { headers: new Headers({ host }), method: "GET", url } as unknown as Request;
}

test("forwards the original request target as `rawPath`", async function (t) {
  let details: any;
  const client = createClient(function (request) {
    details = request;
  });
  const handler = client.handler(async (received) => {
    await client.protect(received, { ipSrc: "8.8.8.8" });
    return new Response();
  });

  await t.test("byte-for-byte, with escapes and dot segments", async function () {
    await handler(served("http://example.com/a/%2E%2e/../b?x=%2f", "example.com"), info);
    assert.equal(details.path, "/b");
    assert.equal(details.rawPath, "/a/%2E%2e/../b");

    await handler(served("https://example.com:8443/signed/%2F", "example.com:8443"), info);
    assert.equal(details.rawPath, "/signed/%2F");
  });

  await t.test("not when `Host` could hide a path", async function () {
    // `GET /real` with `Host: example.com/x`.
    await handler(served("http://example.com/x/real", "example.com/x"), info);
    assert.equal(details.rawPath, undefined);
    await handler(served("http://user@example.com/real", "user@example.com"), info);
    assert.equal(details.rawPath, undefined);
  });

  await t.test("not when the authority is not `Host`", async function () {
    // `GET http://example.com:8080/real` with `Host: example.com`.
    await handler(served("http://example.com:8080/real", "example.com"), info);
    assert.equal(details.rawPath, undefined);
    await handler(served("http://other.example/real", "example.com"), info);
    assert.equal(details.rawPath, undefined);
  });

  await t.test("not for a request not passed to `handler()`", async function () {
    await client.protect(served("http://example.com/a/%2E%2e/../b", "example.com"), {
      ipSrc: "8.8.8.8",
    });
    assert.equal(details.rawPath, undefined);
  });
});

test(
  "forwards the request target from `Deno.serve` byte-for-byte",
  { skip: typeof (globalThis as any).Deno === "undefined" },
  async function () {
    const Deno = (globalThis as any).Deno;
    let details: any;
    const client = createClient(function (request) {
      details = request;
    });
    const server = Deno.serve(
      { hostname: "127.0.0.1", port: 0, onListen() {} },
      client.handler(async (request) => {
        await client.protect(request, { ipSrc: "8.8.8.8" });
        return new Response();
      }),
    );

    try {
      const connection = await Deno.connect({ hostname: "127.0.0.1", port: server.addr.port });
      await connection.write(
        new TextEncoder().encode(
          "GET /a/%2E%2e/../b/%2f?x=%2f HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n",
        ),
      );
      const buffer = new Uint8Array(1024);
      while ((await connection.read(buffer)) !== null) {}
      connection.close();
    } finally {
      await server.shutdown();
    }

    assert.equal(details.path, "/b/%2f");
    assert.equal(details.rawPath, "/a/%2E%2e/../b/%2f");
  },
);

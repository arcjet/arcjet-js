import assert from "node:assert/strict";
import test from "node:test";

import arcjet, { ArcjetAllowDecision, ArcjetReason, ArcjetRuleResult } from "../dist/internal.js";

function event(req: Record<string, unknown>) {
  return {
    node: {
      req: { headers: { host: "example.com" }, method: "GET", ...req },
    },
  };
}

test("forwards the original request target as `rawPath`", async function (t) {
  let details: any;
  // The Nuxt adapter reads `__ARCJET_KEY` from `process.env.RUNTIME_CONFIG`
  // (constructor options omit `key`). Node stores env values as strings.
  process.env.RUNTIME_CONFIG = JSON.stringify({ __ARCJET_KEY: "test-key" });
  t.after(function () {
    delete process.env.RUNTIME_CONFIG;
  });

  const client = arcjet({
    client: {
      async decide() {
        return new ArcjetAllowDecision({ reason: new ArcjetReason(), results: [], ttl: 0 });
      },
      report() {},
    },
    rules: [
      [
        {
          mode: "LIVE",
          priority: 0,
          async protect(_context: any, request: any) {
            details = request;
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

  await t.test("byte-for-byte, with escapes and dot segments", async function () {
    await client.protect(event({ url: "/a/%2E%2e/../b?x=%2f" }), { ipSrc: "203.0.113.10" });
    assert.equal(details.path, "/b");
    assert.equal(details.rawPath, "/a/%2E%2e/../b");
  });

  await t.test("from `originalUrl` when it resolves to `url`", async function () {
    await client.protect(event({ originalUrl: "/a/%2E%2e/../b?x=1", url: "/b?x=1" }), {
      ipSrc: "203.0.113.10",
    });
    assert.equal(details.path, "/b");
    assert.equal(details.rawPath, "/a/%2E%2e/../b");
  });

  await t.test("from `originalUrl` when h3 rewrote `url`", async function () {
    await client.protect(event({ originalUrl: "/api/signed/%2F?x=1", url: "/signed/%2F?x=1" }), {
      ipSrc: "203.0.113.10",
    });
    assert.equal(details.path, "/signed/%2F");
    assert.equal(details.rawPath, "/api/signed/%2F");
  });

  await t.test("from `originalUrl` for the root of a mounted app", async function () {
    for (const originalUrl of ["/api", "/api/"]) {
      await client.protect(event({ originalUrl, url: "/" }), { ipSrc: "203.0.113.10" });
      assert.equal(details.rawPath, originalUrl);
    }
    await client.protect(event({ originalUrl: "/api?x=1", url: "?x=1" }), {
      ipSrc: "203.0.113.10",
    });
    assert.equal(details.rawPath, "/api");
  });

  await t.test("from `originalUrl` with a prefix that ends at a segment", async function () {
    // `url` starts with `/`, so the prefix (`/apix`) always ends at a segment.
    await client.protect(event({ originalUrl: "/apix/signed", url: "/signed" }), {
      ipSrc: "203.0.113.10",
    });
    assert.equal(details.rawPath, "/apix/signed");
    await client.protect(event({ originalUrl: "/apixsigned", url: "/signed" }), {
      ipSrc: "203.0.113.10",
    });
    assert.equal(details.rawPath, undefined);
  });

  await t.test("not from `originalUrl` that is not `url` with a prefix", async function () {
    for (const [originalUrl, url] of [
      ["/api/other", "/signed"],
      ["/api/signed/%2f", "/signed/%2F"],
      ["//signed", "/signed"],
      ["/api/signed?a", "/signed?b"],
      ["/api/signed", "/signed?b"],
      ["/api#x", "/"],
      ["https://example.com/api/signed", "/signed"],
    ]) {
      await client.protect(event({ originalUrl, url }), { ipSrc: "203.0.113.10" });
      assert.equal(details.rawPath, undefined, `${originalUrl} for ${url}`);
    }
  });

  await t.test("not from `originalUrl` of an unenv mock request", async function () {
    await client.protect(event({ __unenv__: undefined, originalUrl: "/api/b", url: "/b" }), {
      ipSrc: "203.0.113.10",
    });
    assert.equal(details.rawPath, undefined);
  });

  await t.test("not when the query differs", async function () {
    await client.protect(event({ originalUrl: "/b?a", url: "/b?b" }), { ipSrc: "203.0.113.10" });
    assert.equal(details.rawPath, undefined);
  });

  await t.test("not without a `host` header", async function () {
    await client.protect(
      { node: { req: { headers: {}, method: "GET", url: "/b" } } },
      { ipSrc: "203.0.113.10" },
    );
    assert.equal(details.rawPath, undefined);
  });

  await t.test("not from an unenv mock request", async function () {
    await client.protect(event({ __unenv__: undefined, url: "/b" }), { ipSrc: "203.0.113.10" });
    assert.equal(details.path, "/b");
    assert.equal(details.rawPath, undefined);
  });

  await t.test("not from an absolute-form target", async function () {
    await client.protect(event({ url: "http://example.com/b" }), { ipSrc: "203.0.113.10" });
    assert.equal(details.rawPath, undefined);
  });
});

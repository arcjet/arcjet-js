import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

// Like `@sveltejs/adapter-node`: the `Request` is built from the origin plus
// the Node.js request target, and the Node.js request is `platform.req`.
function event(target: string, platform?: unknown) {
  const request = new Request("https://example.com" + target);
  return {
    cookies: {
      getAll() {
        return [];
      },
    },
    getClientAddress() {
      return "203.0.113.10";
    },
    platform,
    request,
    url: new URL(request.url),
  };
}

test("forwards the original request target from `platform.req` as `rawPath`", async function (t) {
  register(
    `data:text/javascript,export async function resolve(s,c,n){if(s==='$env/dynamic/private')return {shortCircuit:true,url:'data:text/javascript,export const env={}'};return n(s,c)}`,
    import.meta.url,
  );
  const {
    default: arcjet,
    ArcjetAllowDecision,
    ArcjetReason,
    ArcjetRuleResult,
  } = await import("../dist/index.js");
  let details: any;
  const client = arcjet({
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

  const opts = { ipSrc: "203.0.113.10" };

  await t.test("byte-for-byte, with escapes and dot segments", async function () {
    await client.protect(
      event("/a/%2E%2e/../b?x=%2f", { req: { url: "/a/%2E%2e/../b?x=%2f" } }),
      opts,
    );
    assert.equal(details.path, "/b");
    assert.equal(details.rawPath, "/a/%2E%2e/../b");
  });

  await t.test("with an encoded slash", async function () {
    await client.protect(event("/signed/%2F", { req: { url: "/signed/%2F" } }), opts);
    assert.equal(details.rawPath, "/signed/%2F");
  });

  await t.test("not without `platform.req`", async function () {
    await client.protect(event("/a/%2E%2e/../b"), opts);
    assert.equal(details.rawPath, undefined);
    await client.protect(event("/b", { env: {} }), opts);
    assert.equal(details.rawPath, undefined);
  });

  await t.test("not when `platform.req` is another request", async function () {
    // Internal `event.fetch` subrequests reuse the outer `platform`.
    await client.protect(event("/api/data", { req: { url: "/page/%2F" } }), opts);
    assert.equal(details.path, "/api/data");
    assert.equal(details.rawPath, undefined);
    await client.protect(event("/page/%2F?a", { req: { url: "/page/%2F?b" } }), opts);
    assert.equal(details.rawPath, undefined);
  });

  await t.test("not from an absolute-form target", async function () {
    await client.protect(event("/b", { req: { url: "https://example.com/b" } }), opts);
    assert.equal(details.rawPath, undefined);
  });

  await t.test("a target that starts with `//` as a path", async function () {
    await client.protect(event("//evil.example/b", { req: { url: "//evil.example/b" } }), opts);
    assert.equal(details.path, "//evil.example/b");
    assert.equal(details.rawPath, "//evil.example/b");
  });
});

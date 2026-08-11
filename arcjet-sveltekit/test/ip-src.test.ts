import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

test("explicit ipSrc bypasses getClientAddress and is stripped", async function () {
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
    key: "",
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
  const request = new Request("https://example.com/");

  await client.protect(
    {
      cookies: {
        getAll() {
          return [];
        },
      },
      getClientAddress() {
        throw new Error("must not be called");
      },
      request,
      url: new URL(request.url),
    },
    { ipSrc: "203.0.113.10" },
  );

  assert.equal(details.ip, "203.0.113.10");
  assert.deepEqual(details.extra, {});
});

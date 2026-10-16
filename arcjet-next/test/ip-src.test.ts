import assert from "node:assert/strict";
import test from "node:test";

import arcjet, { ArcjetAllowDecision, ArcjetReason, ArcjetRuleResult } from "../dist/index.js";

test("explicit ipSrc overrides Next request address sources and is stripped", async function () {
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

  await client.protect(
    {
      headers: new Headers({ host: "example.com", "x-forwarded-for": "192.0.2.1" }),
      ip: "192.0.2.2",
      method: "GET",
      url: "/",
    },
    { ipSrc: "203.0.113.10" },
  );

  assert.equal(details.ip, "203.0.113.10");
  assert.equal(details.rawPath, "/");
  assert.deepEqual(details.extra, {});

  await client.protect(
    {
      headers: new Headers({ host: "example.com" }),
      ip: "192.0.2.2",
      method: "GET",
      url: "/pages/%2F?x=1",
    },
    { ipSrc: "203.0.113.10" },
  );
  assert.equal(details.path, "/pages/%2F");
  assert.equal(details.rawPath, "/pages/%2F");

  await client.protect(
    {
      headers: new Headers({ host: "example.com" }),
      ip: "192.0.2.2",
      method: "GET",
      url: "https://example.com/pages/%2F?x=1",
    },
    { ipSrc: "203.0.113.10" },
  );
  assert.equal(details.rawPath, undefined);
});

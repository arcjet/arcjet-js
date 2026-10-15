import assert from "node:assert/strict";
import test from "node:test";

import arcjet, { ArcjetAllowDecision, ArcjetReason, ArcjetRuleResult } from "../dist/internal.js";

test("explicit ipSrc overrides the H3 request address and is stripped", async function () {
  let details: any;
  // The Nuxt adapter reads `__ARCJET_KEY` from `process.env.RUNTIME_CONFIG`
  // (constructor options omit `key`). Node stores env values as strings.
  process.env.RUNTIME_CONFIG = JSON.stringify({ __ARCJET_KEY: "test-key" });

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
  const event = {
    node: {
      req: {
        headers: { host: "example.com", "x-forwarded-for": "192.0.2.1" },
        method: "GET",
        socket: { remoteAddress: "192.0.2.2" },
        url: "/",
      },
    },
  };

  try {
    await client.protect(event, { ipSrc: "203.0.113.10" });

    assert.equal(details.ip, "203.0.113.10");
    assert.deepEqual(details.extra, {});
  } finally {
    delete process.env.RUNTIME_CONFIG;
  }
});

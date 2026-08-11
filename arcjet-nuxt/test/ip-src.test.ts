import assert from "node:assert/strict";
import test from "node:test";

import arcjet, { ArcjetAllowDecision, ArcjetReason, ArcjetRuleResult } from "../dist/internal.js";

test("explicit ipSrc overrides the H3 request address and is stripped", async function () {
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

  await client.protect(event as any, { ipSrc: "203.0.113.10" });

  assert.equal(details.ip, "203.0.113.10");
  assert.deepEqual(details.extra, {});
});

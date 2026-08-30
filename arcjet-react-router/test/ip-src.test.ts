import assert from "node:assert/strict";
import test from "node:test";

import arcjet, { ArcjetAllowDecision, ArcjetReason, ArcjetRuleResult } from "../dist/index.js";

test("explicit ipSrc overrides React Router context.ip and is stripped", async function () {
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
  await client.protect(
    {
      context: { ip: "192.0.2.1" },
      request: new Request("https://example.com/", { headers: { cookie: "session=test" } }),
    },
    { ipSrc: "203.0.113.10" },
  );
  assert.equal(details.ip, "203.0.113.10");
  assert.deepEqual(details.extra, {});

  await client.protect(
    { context: { ip: "8.8.4.4" }, request: new Request("https://example.com/") },
    { ipSrc: "" },
  );
  assert.equal(details.ip, "8.8.4.4");
});

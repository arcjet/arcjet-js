import assert from "node:assert/strict";
import test from "node:test";

import arcjet, { ArcjetAllowDecision, ArcjetReason, ArcjetRuleResult } from "../dist/index.js";

test("explicit ipSrc bypasses the Fastify socket address and is stripped", async function () {
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
      body: undefined,
      headers: { host: "example.com" },
      method: "GET",
      protocol: "https",
      server: {},
      socket: {
        get remoteAddress(): string {
          throw new Error("must not read the automatic socket address");
        },
      },
      url: "/",
    },
    { ipSrc: " application-owned:not-an-ip " },
  );
  assert.equal(details.ip, " application-owned:not-an-ip ");
  assert.deepEqual(details.extra, {});
});

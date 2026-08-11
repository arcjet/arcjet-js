import assert from "node:assert/strict";
import test from "node:test";

import arcjet, { ArcjetAllowDecision, ArcjetReason, ArcjetRuleResult } from "../dist/index.js";

test("explicit ipSrc takes precedence over the cached Deno address and is stripped", async function () {
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
  const handler = client.handler(async (received) => {
    await client.protect(received, { ipSrc: " application-owned:not-an-ip " });
    return new Response();
  });

  await handler(request, {
    localAddr: { hostname: "127.0.0.1", port: 443, transport: "tcp" },
    remoteAddr: { hostname: "192.0.2.1", port: 1234, transport: "tcp" },
  });

  assert.equal(details.ip, " application-owned:not-an-ip ");
  assert.deepEqual(details.extra, {});
});

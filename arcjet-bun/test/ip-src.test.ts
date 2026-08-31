import assert from "node:assert/strict";
import test from "node:test";

import arcjet, { ArcjetAllowDecision, ArcjetReason, ArcjetRuleResult } from "../dist/index.js";

test("explicit ipSrc takes precedence over the cached Bun address and is stripped", async function () {
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
  const server = {
    requestIP(received: Request) {
      assert.equal(received, request);
      return { address: "192.0.2.1" };
    },
  };
  const handler = client.handler(async (received) => {
    await client.protect(received, { ipSrc: "8.8.8.8" });
    return new Response();
  });

  await handler.call(server as any, request, server as any);

  assert.equal(details.ip, "8.8.8.8");
  assert.deepEqual(details.extra, {});
});

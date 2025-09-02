import assert from "node:assert/strict";
import test from "node:test";
import { ArcjetReason, ArcjetRuleResult } from "../index.js";

test("@arcjet/protocol", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "ArcjetAllowDecision",
      "ArcjetBotReason",
      "ArcjetChallengeDecision",
      "ArcjetDecision",
      "ArcjetDenyDecision",
      "ArcjetEdgeRuleReason",
      "ArcjetEmailReason",
      "ArcjetErrorDecision",
      "ArcjetErrorReason",
      "ArcjetFilterReason",
      "ArcjetIpDetails",
      "ArcjetRateLimitReason",
      "ArcjetReason",
      "ArcjetRuleResult",
      "ArcjetSensitiveInfoReason",
      "ArcjetShieldReason",
      "botCategories",
    ]);
  });
});

test("protocol", async (t) => {
  await t.test("ArcjetRuleResult", async (t) => {
    await t.test("ArcjetRuleResult#isDenied", () => {
      const result = new ArcjetRuleResult({
        conclusion: "ALLOW",
        fingerprint: "fingerprint",
        reason: new ArcjetReason(),
        ruleId: "rule-id",
        state: "RUN",
        ttl: 0,
      });

      assert.equal(result.isDenied(), false);
    });
  });
});

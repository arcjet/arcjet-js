import assert from "node:assert/strict";
import test from "node:test";

test("arcjet", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "ArcjetAllowDecision",
      "ArcjetBotReason",
      "ArcjetChallengeDecision",
      "ArcjetConclusion",
      "ArcjetDecision",
      "ArcjetDenyDecision",
      "ArcjetEdgeRuleReason",
      "ArcjetEmailReason",
      "ArcjetEmailType",
      "ArcjetErrorDecision",
      "ArcjetErrorReason",
      "ArcjetIpDetails",
      "ArcjetMode",
      "ArcjetRateLimitAlgorithm",
      "ArcjetRateLimitReason",
      "ArcjetReason",
      "ArcjetRuleResult",
      "ArcjetRuleState",
      "ArcjetSensitiveInfoReason",
      "ArcjetSensitiveInfoType",
      "ArcjetShieldReason",
      "ArcjetStack",
      "ArcjetUnknownReason",
      "botCategories",
      "default",
      "detectBot",
      "fixedWindow",
      "protectSignup",
      "sensitiveInfo",
      "shield",
      "slidingWindow",
      "tokenBucket",
      "validateEmail",
    ]);
  });
});

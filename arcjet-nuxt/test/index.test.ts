import assert from "node:assert/strict";
import test from "node:test";

test("@arcjet/nuxt (api)", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "default",
    ]);
  });

  await t.test("should expose the internal api", async function () {
    assert.deepEqual(Object.keys(await import("../internal.js")).sort(), [
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
      "createRemoteClient",
      "default",
      "detectBot",
      "filter",
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

import assert from "node:assert/strict";
import test from "node:test";

/** Transport-independent core, shared by every runtime entrypoint. */
const core = [
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
  "ArcjetPromptInjectionReason",
  "ArcjetRateLimitReason",
  "ArcjetReason",
  "ArcjetRuleResult",
  "ArcjetSensitiveInfoReason",
  "ArcjetShieldReason",
  "botCategories",
  "default",
  "detectBot",
  "detectPromptInjection",
  "experimental_detectPromptInjection",
  "filter",
  "fixedWindow",
  "protectSignup",
  "sensitiveInfo",
  "shield",
  "slidingWindow",
  "tokenBucket",
  "validateEmail",
];

/** Added by every runtime entrypoint on top of the core. */
const guardSurface = [
  "capture",
  "flush",
  "guard",
  "launchArcjet",
  "registerArcjet",
  "unregisterArcjet",
];

test("arcjet", async function (t) {
  await t.test("should expose the transport-independent core", async function () {
    assert.deepEqual(Object.keys(await import("../dist/index.js")).sort(), core);
  });

  // Each entrypoint binds the transport its runtime can use, so they must not
  // drift apart in anything else. The `"."` export picks between them by
  // condition; a name present in one and missing from another would be visible
  // only on the runtime that resolves to it.
  for (const entry of ["entry-node", "entry-bun", "entry-fetch"]) {
    await t.test(`should expose the same public api from ${entry}`, async function () {
      assert.deepEqual(
        Object.keys(await import(`../dist/${entry}.js`)).sort(),
        [...core, ...guardSurface].sort(),
      );
    });
  }
});

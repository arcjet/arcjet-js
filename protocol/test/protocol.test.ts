import assert from "node:assert/strict";
import test from "node:test";

import { ArcjetPromptInjectionReason, ArcjetReason, ArcjetRuleResult } from "../dist/index.js";

test("@arcjet/protocol", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../dist/index.js")).sort(), [
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
      "ArcjetThreatIntelligence",
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

  await t.test("ArcjetPromptInjectionReason", async (t) => {
    await t.test("should default injectionDetected to false and omit score", () => {
      const reason = new ArcjetPromptInjectionReason({});

      assert.equal(reason.type, "PROMPT_INJECTION_DETECTION");
      assert.equal(reason.injectionDetected, false);
      assert.equal("score" in reason, false);
    });

    await t.test("should record injectionDetected without a score", () => {
      const reason = new ArcjetPromptInjectionReason({ injectionDetected: true });

      assert.equal(reason.injectionDetected, true);
      assert.equal("score" in reason, false);
    });
  });
});

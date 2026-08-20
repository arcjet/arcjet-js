import assert from "node:assert/strict";
import test from "node:test";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  ArcjetAllowDecision,
  ArcjetDenyDecision,
  ArcjetReason,
  ArcjetRuleResult,
} from "../dist/index.js";

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

  await t.test("ArcjetDecision.ttl is in seconds", async (t) => {
    await t.test("should store a deny TTL of 60 as 60 seconds, not milliseconds", () => {
      const result = new ArcjetRuleResult({
        conclusion: "DENY",
        fingerprint: "fingerprint",
        reason: new ArcjetReason(),
        ruleId: "rule-id",
        state: "RUN",
        ttl: 60,
      });

      const decision = new ArcjetDenyDecision({
        reason: result.reason,
        results: [result],
        ttl: result.ttl,
      });

      assert.equal(result.ttl, 60);
      assert.equal(decision.ttl, 60);
      assert.equal(decision.ttl, result.ttl);
    });

    await t.test("should store an allow TTL of 0 seconds", () => {
      const decision = new ArcjetAllowDecision({
        reason: new ArcjetReason(),
        results: [],
        ttl: 0,
      });

      assert.equal(decision.ttl, 0);
    });

    await t.test("should document decision TTL as seconds in published types", () => {
      const dts = readFileSync(fileURLToPath(new URL("../dist/index.d.ts", import.meta.url)), "utf8");

      assert.match(dts, /Duration in seconds this decision should be considered valid/);
      assert.doesNotMatch(dts, /Duration in milliseconds this decision should be considered valid/);
    });
  });
});

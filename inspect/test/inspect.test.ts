import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  type ArcjetBotIdentity,
  type ArcjetRuleState,
  ArcjetBotReason,
  ArcjetErrorReason,
  ArcjetRuleResult,
} from "@arcjet/protocol";

import { isAiAgent, isSpoofedBot, isVerifiedBot, isMissingUserAgent } from "../dist/index.js";

test("@arcjet/inspect", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../dist/index.js")).sort(), [
      "isAiAgent",
      "isMissingUserAgent",
      "isSpoofedBot",
      "isVerifiedBot",
    ]);
  });
});

describe("isSpoofedBot", () => {
  test("returns true for active bots that are spoofed", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = ["RUN", "NOT_RUN", "CACHED"];

    for (const state of activeStates) {
      assert.equal(
        isSpoofedBot(
          new ArcjetRuleResult({
            ruleId: "test-rule-id",
            fingerprint: "test-fingerprint",
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetBotReason({
              allowed: [],
              denied: ["example"],
              spoofed: true,
              verified: false,
            }),
          }),
        ),
        true,
      );
    }
  });

  test("returns false for active bots that are not spoofed", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = ["RUN", "NOT_RUN", "CACHED"];

    for (const state of activeStates) {
      assert.equal(
        isSpoofedBot(
          new ArcjetRuleResult({
            ruleId: "test-rule-id",
            fingerprint: "test-fingerprint",
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetBotReason({
              allowed: [],
              denied: ["example"],
              spoofed: false,
              verified: false,
            }),
          }),
        ),
        false,
      );
    }
  });

  test("returns undefined for dry run bots that are spoofed", () => {
    assert.equal(
      isSpoofedBot(
        new ArcjetRuleResult({
          ruleId: "test-rule-id",
          fingerprint: "test-fingerprint",
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetBotReason({
            allowed: [],
            denied: ["example"],
            spoofed: true,
            verified: false,
          }),
        }),
      ),
      undefined,
    );
  });

  test("works with array methods", () => {
    const results = [
      new ArcjetRuleResult({
        ruleId: "test-rule-id",
        fingerprint: "test-fingerprint",
        ttl: 0,
        state: "RUN",
        conclusion: "DENY",
        reason: new ArcjetBotReason({
          allowed: [],
          denied: ["example"],
          spoofed: true,
          verified: false,
        }),
      }),
    ];

    assert.equal(results.some(isSpoofedBot), true);
    assert.equal(results.find(isSpoofedBot), results[0]);
  });

  test("returns undefined for non-bot values", () => {
    assert.equal(
      isSpoofedBot(
        // @ts-expect-error
        1,
      ),
      undefined,
    );
    assert.equal(
      isSpoofedBot(
        // @ts-expect-error
        "",
      ),
      undefined,
    );
    assert.equal(
      isSpoofedBot(
        // @ts-expect-error
        [],
      ),
      undefined,
    );
    assert.equal(
      isSpoofedBot(
        // @ts-expect-error
        {},
      ),
      undefined,
    );
  });
});

describe("isVerifiedBot", () => {
  test("returns true for active bots that are verified", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = ["RUN", "NOT_RUN", "CACHED"];

    for (const state of activeStates) {
      assert.equal(
        isVerifiedBot(
          new ArcjetRuleResult({
            ruleId: "test-rule-id",
            fingerprint: "test-fingerprint",
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetBotReason({
              allowed: [],
              denied: ["example"],
              spoofed: false,
              verified: true,
            }),
          }),
        ),
        true,
      );
    }
  });

  test("returns false for active bots that are not verified", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = ["RUN", "NOT_RUN", "CACHED"];

    for (const state of activeStates) {
      assert.equal(
        isVerifiedBot(
          new ArcjetRuleResult({
            ruleId: "test-rule-id",
            fingerprint: "test-fingerprint",
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetBotReason({
              allowed: [],
              denied: ["example"],
              spoofed: false,
              verified: false,
            }),
          }),
        ),
        false,
      );
    }
  });

  test("works with array methods", () => {
    const results = [
      new ArcjetRuleResult({
        ruleId: "test-rule-id",
        fingerprint: "test-fingerprint",
        ttl: 0,
        state: "RUN",
        conclusion: "DENY",
        reason: new ArcjetBotReason({
          allowed: [],
          denied: ["example"],
          spoofed: false,
          verified: true,
        }),
      }),
    ];

    assert.equal(results.some(isVerifiedBot), true);
    assert.equal(results.find(isVerifiedBot), results[0]);
  });

  test("returns undefined for dry run bots that are verified", () => {
    assert.equal(
      isVerifiedBot(
        new ArcjetRuleResult({
          ruleId: "test-rule-id",
          fingerprint: "test-fingerprint",
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetBotReason({
            allowed: [],
            denied: ["example"],
            spoofed: false,
            verified: true,
          }),
        }),
      ),
      undefined,
    );
  });

  test("returns undefined for non-bot values", () => {
    assert.equal(
      isVerifiedBot(
        // @ts-expect-error
        1,
      ),
      undefined,
    );
    assert.equal(
      isVerifiedBot(
        // @ts-expect-error
        "",
      ),
      undefined,
    );
    assert.equal(
      isVerifiedBot(
        // @ts-expect-error
        [],
      ),
      undefined,
    );
    assert.equal(
      isVerifiedBot(
        // @ts-expect-error
        {},
      ),
      undefined,
    );
  });
});

function botResult(state: ArcjetRuleState, identity?: ArcjetBotIdentity) {
  return new ArcjetRuleResult({
    ruleId: "test-rule-id",
    fingerprint: "test-fingerprint",
    ttl: 0,
    state,
    conclusion: "ALLOW",
    reason: new ArcjetBotReason({
      allowed: ["OPENAI_CRAWLER_USER"],
      denied: [],
      spoofed: false,
      verified: false,
      identity,
    }),
  });
}

describe("isAiAgent", () => {
  const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = ["RUN", "NOT_RUN", "CACHED"];

  test("returns true for active bots identified as AI agents", () => {
    for (const state of activeStates) {
      for (const evidence of ["UNVERIFIED", "FINGERPRINT", "IP", "SIGNATURE"] as const) {
        assert.equal(
          isAiAgent(
            botResult(state, {
              kind: "AI_AGENT",
              botId: "OPENAI_CRAWLER_USER",
              operator: "",
              evidence,
              spoofed: false,
            }),
          ),
          true,
        );
      }
    }
  });

  test("returns false for active bots identified as another kind", () => {
    for (const state of activeStates) {
      for (const kind of ["AI_CRAWLER", "AUTOMATION", "OTHER"] as const) {
        assert.equal(
          isAiAgent(
            botResult(state, {
              kind,
              botId: kind === "AUTOMATION" ? "" : "EXAMPLE_BOT",
              operator: "",
              evidence: kind === "AUTOMATION" ? "FINGERPRINT" : "UNVERIFIED",
              spoofed: false,
            }),
          ),
          false,
        );
      }
    }
  });

  test("returns false for active bots with a spoofed AI agent identity", () => {
    for (const state of activeStates) {
      assert.equal(
        isAiAgent(
          botResult(state, {
            kind: "AI_AGENT",
            botId: "OPENAI_CRAWLER_USER",
            operator: "",
            evidence: "UNVERIFIED",
            spoofed: true,
          }),
        ),
        false,
      );
    }
  });

  test("returns false for active bots without an identity", () => {
    for (const state of activeStates) {
      assert.equal(isAiAgent(botResult(state)), false);
    }
  });

  test("works with array methods", () => {
    const results = [
      botResult("RUN"),
      botResult("RUN", {
        kind: "AI_AGENT",
        botId: "CHATGPT_AGENT",
        operator: "chatgpt.com",
        evidence: "SIGNATURE",
        spoofed: false,
      }),
    ];

    assert.equal(results.some(isAiAgent), true);
    assert.equal(results.find(isAiAgent), results[1]);
  });

  test("returns undefined for dry run bots identified as AI agents", () => {
    assert.equal(
      isAiAgent(
        botResult("DRY_RUN", {
          kind: "AI_AGENT",
          botId: "OPENAI_CRAWLER_USER",
          operator: "",
          evidence: "IP",
          spoofed: false,
        }),
      ),
      undefined,
    );
  });

  test("returns undefined for non-bot values", () => {
    assert.equal(
      isAiAgent(
        // @ts-expect-error
        1,
      ),
      undefined,
    );
    assert.equal(
      isAiAgent(
        // @ts-expect-error
        "",
      ),
      undefined,
    );
    assert.equal(
      isAiAgent(
        // @ts-expect-error
        [],
      ),
      undefined,
    );
    assert.equal(
      isAiAgent(
        // @ts-expect-error
        {},
      ),
      undefined,
    );
  });
});

describe("isMissingUserAgent", () => {
  test("returns true for active errors about missing user-agent header", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = ["RUN", "NOT_RUN", "CACHED"];

    for (const state of activeStates) {
      // Server error message
      assert.equal(
        isMissingUserAgent(
          new ArcjetRuleResult({
            ruleId: "test-rule-id",
            fingerprint: "test-fingerprint",
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetErrorReason("missing User-Agent header"),
          }),
        ),
        true,
      );
      // Local error message
      assert.equal(
        isMissingUserAgent(
          new ArcjetRuleResult({
            ruleId: "test-rule-id",
            fingerprint: "test-fingerprint",
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetErrorReason("requires user-agent header"),
          }),
        ),
        true,
      );
    }
  });

  test("returns undefined for dry run errors about missing user-agent header", () => {
    assert.equal(
      isMissingUserAgent(
        new ArcjetRuleResult({
          ruleId: "test-rule-id",
          fingerprint: "test-fingerprint",
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetErrorReason("missing User-Agent header"),
        }),
      ),
      undefined,
    );
    assert.equal(
      isMissingUserAgent(
        new ArcjetRuleResult({
          ruleId: "test-rule-id",
          fingerprint: "test-fingerprint",
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetErrorReason("requires user-agent header"),
        }),
      ),
      undefined,
    );
  });

  test("works with array methods", () => {
    const results = [
      new ArcjetRuleResult({
        ruleId: "test-rule-id",
        fingerprint: "test-fingerprint",
        ttl: 0,
        state: "RUN",
        conclusion: "DENY",
        reason: new ArcjetErrorReason("requires user-agent header"),
      }),
    ];

    assert.equal(results.some(isMissingUserAgent), true);
    assert.equal(results.find(isMissingUserAgent), results[0]);
  });

  test("returns undefined for non-error values", () => {
    assert.equal(
      isMissingUserAgent(
        // @ts-expect-error
        1,
      ),
      undefined,
    );
    assert.equal(
      isMissingUserAgent(
        // @ts-expect-error
        "",
      ),
      undefined,
    );
    assert.equal(
      isMissingUserAgent(
        // @ts-expect-error
        [],
      ),
      undefined,
    );
    assert.equal(
      isMissingUserAgent(
        // @ts-expect-error
        {},
      ),
      undefined,
    );
  });
});

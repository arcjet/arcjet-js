import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isSpoofedBot, isVerifiedBot, isMissingUserAgent } from "../index.js";
import {
  ArcjetBotReason,
  ArcjetErrorReason,
  ArcjetRuleResult,
  ArcjetRuleState,
} from "@arcjet/protocol";

describe("isSpoofedBot", () => {
  test("returns true for active bots that are spoofed", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = [
      "RUN",
      "NOT_RUN",
      "CACHED",
    ];

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
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = [
      "RUN",
      "NOT_RUN",
      "CACHED",
    ];

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
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = [
      "RUN",
      "NOT_RUN",
      "CACHED",
    ];

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
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = [
      "RUN",
      "NOT_RUN",
      "CACHED",
    ];

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

describe("isMissingUserAgent", () => {
  test("returns true for active errors about missing user-agent header", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = [
      "RUN",
      "NOT_RUN",
      "CACHED",
    ];

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

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ArcjetAllowDecision,
  ArcjetBotReason,
  ArcjetChallengeDecision,
  ArcjetDenyDecision,
  ArcjetErrorDecision,
  ArcjetErrorReason,
  ArcjetRateLimitReason,
  ArcjetReason,
} from "../index.js";

describe("ArcjetDecision", () => {
  test("will default the `id` property if not specified", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetReason(),
      results: [],
    });
    assert.match(decision.id, /^lreq_/);
  });

  test("the `id` property if to be specified to the constructor", () => {
    const decision = new ArcjetAllowDecision({
      id: "abc_123",
      ttl: 0,
      reason: new ArcjetReason(),
      results: [],
    });
    assert.equal(decision.id, "abc_123");
  });

  // TODO: This test doesn't make sense anymore
  test("an ERROR decision can be constructed with an Error object", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason(new Error("Foo bar baz")),
      results: [],
    });
    assert.ok(decision.reason instanceof ArcjetErrorReason);
    assert.equal(decision.reason.message, "Foo bar baz");
  });

  // TODO: This test doesn't make sense anymore
  test("an ERROR decision can be constructed with a string message", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Boom!"),
      results: [],
    });
    assert.ok(decision.reason instanceof ArcjetErrorReason);
    assert.equal(decision.reason.message, "Boom!");
  });

  // TODO: This test doesn't make sense anymore
  test("use an unknown error for an ERROR decision constructed with other types", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason(["not", "valid", "error"]),
      results: [],
    });
    assert.ok(decision.reason instanceof ArcjetErrorReason);
    assert.equal(decision.reason.message, "Unknown error occurred");
  });

  test("`isAllowed()` returns true when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetReason(),
      results: [],
    });
    assert.equal(decision.isAllowed(), true);
  });

  test("`isAllowed()` returns true when type is ERROR (fail open)", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    assert.equal(decision.isAllowed(), true);
  });

  test("`isAllowed()` returns false when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetReason(),
      results: [],
    });
    assert.equal(decision.isAllowed(), false);
  });

  test("`isDenied()` returns false when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetReason(),
      results: [],
    });
    assert.equal(decision.isDenied(), false);
  });

  test("`isDenied()` returns false when type is ERROR (fail open)", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    assert.equal(decision.isDenied(), false);
  });

  test("`isDenied()` returns true when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetReason(),
      results: [],
    });
    assert.equal(decision.isDenied(), true);
  });

  test("`isChallenged()` returns true when type is CHALLENGE", () => {
    const decision = new ArcjetChallengeDecision({
      ttl: 0,
      reason: new ArcjetReason(),
      results: [],
    });
    assert.equal(decision.isChallenged(), true);
  });

  test("`isErrored()` returns false when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetReason(),
      results: [],
    });
    assert.equal(decision.isErrored(), false);
  });

  test("`isErrored()` returns false when type is ERROR", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    assert.equal(decision.isErrored(), true);
  });

  test("`isErrored()` returns false when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetReason(),
      results: [],
    });
    assert.equal(decision.isErrored(), false);
  });

  test("`isRateLimit()` returns true when reason is RATE_LIMIT", () => {
    const reason = new ArcjetRateLimitReason({
      max: 0,
      remaining: 0,
      reset: 100,
      window: 100,
    });
    assert.equal(reason.isRateLimit(), true);
  });

  test("`isRateLimit()` returns true when reason is not RATE_LIMIT", () => {
    const reason = new ArcjetReason();
    assert.equal(reason.isRateLimit(), false);
  });

  test("`isBot()` returns true when reason is BOT", () => {
    const reason = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: false,
    });
    assert.equal(reason.isBot(), true);
  });

  test("isVerified() returns the correct value", () => {
    const reasonTrue = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: true,
      spoofed: false,
    });
    assert.equal(reasonTrue.isVerified(), true);
    const reasonFalse = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: false,
    });
    assert.equal(reasonFalse.isVerified(), false);
  });

  test("isSpoofed() returns the correct value", () => {
    const reasonTrue = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: true,
    });
    assert.equal(reasonTrue.isSpoofed(), true);
    const reasonFalse = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: false,
    });
    assert.equal(reasonFalse.isSpoofed(), false);
  });

  test("`isBot()` returns false when reason is not BOT", () => {
    const reason = new ArcjetReason();
    assert.equal(reason.isBot(), false);
  });
});

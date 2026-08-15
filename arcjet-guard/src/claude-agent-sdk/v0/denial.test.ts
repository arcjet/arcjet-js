import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  decisionDenyError,
  decisionDenyPromptInjection,
  decisionDenyPromptInjectionWithReset,
  decisionDenyRateLimit,
  decisionDenyRateLimitNoReset,
} from "../../../test/_shared/stub-client.ts";
import {
  asCallToolResult,
  denialCallToolResult,
  denialResult,
  deniedReason,
  unavailableCallToolResult,
  unavailableReason,
  unavailableResult,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
} from "./denial.ts";

describe("claude-agent-sdk/v0/denial", () => {
  test("rate-limit denial is retryable and may carry retry-after", () => {
    const resetAt = Math.floor(Date.now() / 1000) + 30;
    const decision = decisionDenyRateLimit(resetAt);
    const result = denialResult(decision);

    assert.equal(result.arcjetDenied, true);
    assert.equal(result.reason, "RATE_LIMIT");
    assert.equal(result.retryable, true);
    assert.ok(typeof result.retryAfterSeconds === "number");
    assert.match(deniedReason(decision), /RATE_LIMIT/);
  });

  test("prompt-injection denial is not retryable", () => {
    const decision = decisionDenyPromptInjection();
    const result = denialResult(decision);

    assert.equal(result.retryable, false);
    assert.equal(result.retryAfterSeconds, undefined);
    assert.match(result.message, /Do not retry/);
  });

  test("unavailable result is retryable with a fixed backoff", () => {
    const result = unavailableResult();
    assert.equal(result.reason, "ERROR");
    assert.equal(result.retryable, true);
    assert.equal(result.retryAfterSeconds, UNAVAILABLE_RETRY_AFTER_SECONDS);
    assert.equal(result.message, unavailableReason());
  });

  test("RATE_LIMIT without reset is retryable without retryAfterSeconds", () => {
    const decision = decisionDenyRateLimitNoReset();
    const result = denialResult(decision);
    assert.equal(result.retryable, true);
    assert.equal(result.retryAfterSeconds, undefined);
    assert.match(deniedReason(decision), /retried later/);
  });

  test("non-rate-limit denial ignores a co-occurring reset time", () => {
    const decision = decisionDenyPromptInjectionWithReset(Math.floor(Date.now() / 1000) + 30);
    const result = denialResult(decision);
    assert.equal(result.retryable, false);
    assert.equal(result.retryAfterSeconds, undefined);
    assert.match(deniedReason(decision), /Do not retry/);
  });

  test("ERROR denial is not treated as unavailable", () => {
    const decision = decisionDenyError();
    const result = denialResult(decision);
    assert.equal(result.reason, "ERROR");
    assert.equal(result.retryable, false);
    assert.match(deniedReason(decision), /Do not retry/);
  });

  test("denial CallToolResult is isError: true with structured content", () => {
    const decision = decisionDenyPromptInjection();
    const result = denialCallToolResult(decision);

    assert.equal(result.isError, true);
    assert.equal(result.content[0]?.type, "text");
    assert.match(String(result.content[0]?.text), /PROMPT_INJECTION/);
    assert.equal(result.structuredContent?.["arcjetDenied"], true);
    assert.equal(result.structuredContent?.["reason"], "PROMPT_INJECTION");
  });

  test("unavailable CallToolResult is isError: true", () => {
    const result = unavailableCallToolResult();
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent?.["reason"], "ERROR");
  });

  test("asCallToolResult keeps a CallToolResult-shaped value", () => {
    const custom = { content: [{ type: "text" as const, text: "blocked" }], isError: true };
    const result = asCallToolResult(custom, unavailableCallToolResult());
    assert.strictEqual(result, custom);
  });

  test("asCallToolResult wraps a plain object as structuredContent", () => {
    const fallback = unavailableCallToolResult();
    const result = asCallToolResult({ blocked: true }, fallback);
    assert.equal(result.isError, true);
    assert.deepEqual(result.structuredContent, { blocked: true });
    assert.deepEqual(result.content, fallback.content);
  });

  test("asCallToolResult uses the fallback for non-objects", () => {
    const fallback = unavailableCallToolResult();
    assert.strictEqual(asCallToolResult("nope", fallback), fallback);
    assert.strictEqual(asCallToolResult(undefined, fallback), fallback);
  });
});

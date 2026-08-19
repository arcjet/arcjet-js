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
  denialResult,
  deniedReason,
  unavailableReason,
  unavailableResult,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
} from "./denial.ts";

describe("openai-agents/v0/denial", () => {
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

  // `type` is the load-bearing one here. Without an `outputSchema` the runner
  // passes the tool output through `normalizeStructuredToolOutputs`, which
  // reinterprets any object carrying `type: "text"` (or another content type)
  // as a structured content item. A denial that grew a `type` field would be
  // rewritten into content instead of being stringified, losing the payload
  // the model is meant to read.
  test("a denial does not pretend to be an SDK tool message or content item", () => {
    const results: Array<Record<string, unknown>> = [
      { ...denialResult(decisionDenyPromptInjection()) },
      { ...unavailableResult() },
    ];

    for (const result of results) {
      for (const messageField of ["_getType", "getType", "status", "type", "callId"]) {
        assert.equal(
          messageField in result,
          false,
          `a denial must not carry the message field "${messageField}"`,
        );
      }
    }
  });

  test("a denial is JSON-serializable, which is how the runner surfaces it", () => {
    const decoded: unknown = JSON.parse(
      JSON.stringify(denialResult(decisionDenyPromptInjection())),
    );
    assert.deepEqual(decoded, {
      arcjetDenied: true,
      reason: "PROMPT_INJECTION",
      message: deniedReason(decisionDenyPromptInjection()),
      retryable: false,
    });
  });
});

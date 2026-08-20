import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  decisionDenyError,
  decisionDenyPromptInjection,
  decisionDenyPromptInjectionWithReset,
  decisionDenyRateLimit,
  decisionDenyRateLimitNoReset,
} from "../../test/_shared/stub-client.ts";
import * as claudeDenial from "../claude-agent-sdk/v0/denial.ts";
import * as langgraphDenial from "../langgraph/v1/denial.ts";
import * as mastraDenial from "../mastra/v1/denial.ts";
import * as openaiDenial from "../openai-agents/v0/denial.ts";
import * as vercelAiDenial from "../vercel-ai/v7/denial.ts";
import * as eveDenial from "../vercel-eve/v0/denial.ts";
import {
  denialResult,
  deniedReason,
  retryAfterSeconds,
  unavailableReason,
  unavailableResult,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
} from "./denial.ts";

describe("shared denial payload", () => {
  test("rate-limit denial is retryable and may carry retry-after", () => {
    const resetAt = Math.floor(Date.now() / 1000) + 30;
    const decision = decisionDenyRateLimit(resetAt);
    const result = denialResult(decision);

    assert.equal(result.arcjetDenied, true);
    assert.equal(result.reason, "RATE_LIMIT");
    assert.equal(result.retryable, true);
    assert.ok(typeof result.retryAfterSeconds === "number");
    assert.match(deniedReason(decision), /Arcjet denied this call \(RATE_LIMIT\)/);
    assert.match(deniedReason(decision), /It may be retried after \d+ seconds\./);
    assert.equal(retryAfterSeconds(decision), result.retryAfterSeconds);
  });

  test("RATE_LIMIT without reset is retryable without retryAfterSeconds", () => {
    const decision = decisionDenyRateLimitNoReset();
    const result = denialResult(decision);
    assert.equal(result.retryable, true);
    assert.equal(result.retryAfterSeconds, undefined);
    assert.match(deniedReason(decision), /It may be retried later\./);
    assert.ok(!deniedReason(decision).includes("seconds"), "Should not mention seconds");
  });

  test("prompt-injection denial is not retryable", () => {
    const decision = decisionDenyPromptInjection();
    const result = denialResult(decision);

    assert.equal(result.retryable, false);
    assert.equal(result.retryAfterSeconds, undefined);
    assert.match(result.message, /Do not retry/);
    assert.match(deniedReason(decision), /Arcjet denied this call \(PROMPT_INJECTION\)/);
  });

  test("non-rate-limit denial ignores a co-occurring reset time", () => {
    const decision = decisionDenyPromptInjectionWithReset(Math.floor(Date.now() / 1000) + 30);
    const result = denialResult(decision);
    assert.equal(result.retryable, false);
    assert.equal(result.retryAfterSeconds, undefined);
    assert.match(deniedReason(decision), /Do not retry/);
    assert.ok(!deniedReason(decision).includes("seconds"), "Should not mention seconds");
    assert.ok(!deniedReason(decision).includes("retried after"), "Should not have 'retried after'");
  });

  test("ERROR denial is not treated as unavailable", () => {
    const decision = decisionDenyError();
    const result = denialResult(decision);
    assert.equal(result.reason, "ERROR");
    assert.equal(result.retryable, false);
    assert.match(deniedReason(decision), /Do not retry/);
  });

  test("unavailable result is retryable with a fixed backoff", () => {
    const result = unavailableResult();
    assert.equal(result.arcjetDenied, true);
    assert.equal(result.reason, "ERROR");
    assert.equal(result.retryable, true);
    assert.equal(result.retryAfterSeconds, UNAVAILABLE_RETRY_AFTER_SECONDS);
    assert.equal(result.message, unavailableReason());
    assert.equal(
      result.message,
      "Arcjet security check could not be completed; please retry later.",
    );
  });

  test("the payload is a plain JSON object with no framework envelope fields", () => {
    const results: Array<Record<string, unknown>> = [
      { ...denialResult(decisionDenyPromptInjection()) },
      { ...unavailableResult() },
    ];

    for (const result of results) {
      for (const envelopeField of [
        "_getType",
        "getType",
        "lc_kwargs",
        "lc_serializable",
        "status",
        "type",
        "callId",
        "isError",
      ]) {
        assert.equal(
          envelopeField in result,
          false,
          `the shared payload must not carry the envelope field "${envelopeField}"`,
        );
      }
    }
  });

  test("a denial is JSON-serializable", () => {
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

describe("one contract across adapters", () => {
  test("every adapter re-exports the same payload builders", () => {
    const adapters = [
      ["vercel-ai/v7", vercelAiDenial],
      ["vercel-eve/v0", eveDenial],
      ["mastra/v1", mastraDenial],
      ["claude-agent-sdk/v0", claudeDenial],
      ["langgraph/v1", langgraphDenial],
      ["openai-agents/v0", openaiDenial],
    ] as const;

    for (const [name, denial] of adapters) {
      assert.strictEqual(
        denial.denialResult,
        denialResult,
        `${name} must re-export the shared denialResult`,
      );
      assert.strictEqual(
        denial.unavailableResult,
        unavailableResult,
        `${name} must re-export the shared unavailableResult`,
      );
      assert.strictEqual(
        denial.deniedReason,
        deniedReason,
        `${name} must re-export the shared deniedReason`,
      );
    }
  });

  test("every adapter produces the same payload for the same decision", () => {
    const decision = decisionDenyPromptInjection();
    const expected = denialResult(decision);
    assert.deepEqual(vercelAiDenial.denialResult(decision), expected);
    assert.deepEqual(eveDenial.denialResult(decision), expected);
    assert.deepEqual(mastraDenial.denialResult(decision), expected);
    assert.deepEqual(claudeDenial.denialResult(decision), expected);
    assert.deepEqual(langgraphDenial.denialResult(decision), expected);
    assert.deepEqual(openaiDenial.denialResult(decision), expected);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";

import { collectTsFiles } from "../../test/_shared/source-scan.ts";
import {
  decisionDenyError,
  decisionDenyPromptInjection,
  decisionDenyPromptInjectionWithReset,
  decisionDenyRateLimit,
  decisionDenyRateLimitMulti,
  decisionDenyRateLimitNoReset,
} from "../../test/_shared/stub-client.ts";
import {
  denialResult,
  deniedReason,
  retryAfterSeconds,
  unavailableReason,
  unavailableResult,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
} from "./denial.ts";

/** Wall clock moves between building a stub and reading the result. */
function assertAboutSeconds(actual: number | undefined, expected: number): void {
  assert.ok(typeof actual === "number", `expected a number, got ${actual}`);
  assert.ok(Math.abs(actual - expected) <= 1, `expected about ${expected} seconds, got ${actual}`);
}

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

  /**
   * Which reset a multi-rule denial reports.
   *
   * The hint says when the call would actually be permitted, so only rules
   * that denied are considered and the latest of their resets wins. Reporting
   * the earliest, or the first in submission order, invites a retry that is
   * denied again by the longer rule.
   */
  describe("several rate-limit rules on one denial", () => {
    test("a rule that allowed does not supply the hint, even when submitted first", () => {
      const now = Math.floor(Date.now() / 1000);
      const decision = decisionDenyRateLimitMulti([
        { conclusion: "ALLOW", resetAtUnixSeconds: now + 5 },
        { conclusion: "DENY", resetAtUnixSeconds: now + 300 },
      ]);

      assertAboutSeconds(retryAfterSeconds(decision), 300);
    });

    /**
     * The case that actually proves the conclusion filter.
     *
     * With the allowing rule's reset *earlier*, taking the latest reset gives
     * the right answer whether or not the filter is there. Only an allowing
     * rule with a later reset tells the two apart.
     */
    test("a rule that allowed is ignored even when its reset is later", () => {
      const now = Math.floor(Date.now() / 1000);
      const decision = decisionDenyRateLimitMulti([
        { conclusion: "ALLOW", resetAtUnixSeconds: now + 900 },
        { conclusion: "DENY", resetAtUnixSeconds: now + 60 },
      ]);

      assertAboutSeconds(retryAfterSeconds(decision), 60);
    });

    test("the latest reset among denying rules is reported", () => {
      const now = Math.floor(Date.now() / 1000);
      const decision = decisionDenyRateLimitMulti([
        { conclusion: "DENY", resetAtUnixSeconds: now + 60 },
        { conclusion: "DENY", resetAtUnixSeconds: now + 600 },
      ]);

      assertAboutSeconds(retryAfterSeconds(decision), 600);
    });

    test("a zero reset is an omitted field, not a reset in 1970", () => {
      const decision = decisionDenyRateLimitMulti([{ conclusion: "DENY", resetAtUnixSeconds: 0 }]);

      assert.equal(retryAfterSeconds(decision), undefined);
    });

    test("the hint is clamped to 24 hours", () => {
      const now = Math.floor(Date.now() / 1000);
      const decision = decisionDenyRateLimitMulti([
        { conclusion: "DENY", resetAtUnixSeconds: now + 48 * 60 * 60 },
      ]);

      assert.equal(retryAfterSeconds(decision), 24 * 60 * 60);
    });

    test("no denying rule means no hint", () => {
      const now = Math.floor(Date.now() / 1000);
      const decision = decisionDenyRateLimitMulti([
        { conclusion: "ALLOW", resetAtUnixSeconds: now + 5 },
      ]);

      assert.equal(retryAfterSeconds(decision), undefined);
    });
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

  /**
   * The payload carries no envelope field, because each adapter's envelope is
   * added around it rather than onto it. Two of those fields are load-bearing:
   *
   * - `_getType` / `lc_kwargs` would satisfy LangGraph's `isBaseMessage`, so
   *   `ToolNode` would hand the denial straight to `messagesStateReducer`,
   *   which assigns `m.lc_kwargs.id` and throws on a duck-typed message —
   *   taking the graph down.
   * - `type` would make OpenAI Agents' `normalizeStructuredToolOutputs` read
   *   the denial as a structured content item and rewrite it, instead of
   *   stringifying the payload the model is meant to read.
   */
  test("the payload carries no framework envelope fields", () => {
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

  test("a denial is JSON-serializable, which is how adapters pass it on", () => {
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

/**
 * One payload, built in one place. Every vendor namespace used to declare its
 * own structurally-identical copy, which is how the wording and the
 * retry-after rules drifted apart in the first place. Nothing but a scan stops
 * the next namespace from starting a fresh copy, so scan for it: the needles
 * are built from parts so this file does not match itself.
 */
test("no vendor namespace declares its own denial payload", () => {
  const vendorDirs = [
    "vercel-ai",
    "vercel-eve",
    "mastra",
    "claude-agent-sdk",
    "claude-managed-agents",
    "cloudflare-think",
    "langchain",
    "langgraph",
    "openai-agents",
    "genkit",
    "google-adk",
    "strands-agents",
    "tanstack-ai",
  ];
  const forbidden = [
    ["interface ", "Arcjet", "DenialResult"].join(""),
    ["function ", "denial", "Result("].join(""),
    ["function ", "denied", "Reason("].join(""),
    ["function ", "unavailable", "Result("].join(""),
    ["UNAVAILABLE_", "RETRY_AFTER_", "SECONDS ="].join(""),
  ];

  const errors: string[] = [];
  for (const vendorDir of vendorDirs) {
    for (const filePath of collectTsFiles(resolve(import.meta.dirname, "..", vendorDir))) {
      let content: string;
      try {
        content = readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }
      for (const needle of forbidden) {
        if (content.includes(needle)) {
          errors.push(`${filePath}: declares "${needle}"; import it from agents/denial.ts instead`);
        }
      }
    }
  }

  assert.deepEqual(errors, [], `denial payload re-declared:\n${errors.join("\n")}`);
});

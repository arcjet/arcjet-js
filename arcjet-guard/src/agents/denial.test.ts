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

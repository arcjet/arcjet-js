import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { decisionDenyPromptInjection } from "../../../test/_shared/stub-client.ts";
import { denialResult, deniedReason, unavailableResult } from "../../agents/denial.ts";
import * as openaiDenial from "./denial.ts";

describe("openai-agents/v0/denial", () => {
  test("re-exports the shared payload builders", () => {
    assert.strictEqual(openaiDenial.denialResult, denialResult);
    assert.strictEqual(openaiDenial.deniedReason, deniedReason);
    assert.strictEqual(openaiDenial.unavailableResult, unavailableResult);
  });

  // `type` is the load-bearing one here. Without an `outputSchema` the runner
  // passes the tool output through `normalizeStructuredToolOutputs`, which
  // reinterprets any object carrying `type: "text"` (or another content type)
  // as a structured content item. A denial that grew a `type` field would be
  // rewritten into content instead of being stringified, losing the payload
  // the model is meant to read.
  test("a denial does not pretend to be an SDK tool message or content item", () => {
    const results: Array<Record<string, unknown>> = [
      { ...openaiDenial.denialResult(decisionDenyPromptInjection()) },
      { ...openaiDenial.unavailableResult() },
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
});

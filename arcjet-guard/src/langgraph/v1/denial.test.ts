import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { decisionDenyPromptInjection } from "../../../test/_shared/stub-client.ts";
import { denialResult, deniedReason, unavailableResult } from "../../agents/denial.ts";
import * as langgraphDenial from "./denial.ts";

describe("langgraph/v1/denial", () => {
  test("re-exports the shared payload builders", () => {
    assert.strictEqual(langgraphDenial.denialResult, denialResult);
    assert.strictEqual(langgraphDenial.deniedReason, deniedReason);
    assert.strictEqual(langgraphDenial.unavailableResult, unavailableResult);
  });

  // A denial must stay a plain object. Faking `_getType` would satisfy
  // `isBaseMessage`, which makes `ToolNode` hand it straight to
  // `messagesStateReducer` — and that assigns `m.lc_kwargs.id`, throwing on a
  // duck-typed message and taking the graph down.
  test("a denial does not pretend to be a BaseMessage", () => {
    const results: Array<Record<string, unknown>> = [
      { ...langgraphDenial.denialResult(decisionDenyPromptInjection()) },
      { ...langgraphDenial.unavailableResult() },
    ];

    for (const result of results) {
      for (const messageField of ["_getType", "getType", "lc_kwargs", "lc_serializable"]) {
        assert.equal(
          messageField in result,
          false,
          `a denial must not carry the message field "${messageField}"`,
        );
      }
    }
  });
});

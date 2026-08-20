import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { decisionDenyPromptInjection } from "../../../test/_shared/stub-client.ts";
import { denialResult } from "../../agents/denial.ts";
import { asCallToolResult, denialCallToolResult, unavailableCallToolResult } from "./denial.ts";

describe("claude-agent-sdk/v0/denial", () => {
  test("denial CallToolResult is isError: true and carries the shared payload", () => {
    const decision = decisionDenyPromptInjection();
    const result = denialCallToolResult(decision);

    assert.equal(result.isError, true);
    assert.equal(result.content[0]?.type, "text");
    assert.match(String(result.content[0]?.text), /PROMPT_INJECTION/);
    assert.deepEqual(result.structuredContent, { ...denialResult(decision) });
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

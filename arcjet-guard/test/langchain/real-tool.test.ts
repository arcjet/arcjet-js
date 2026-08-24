// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unnecessary-type-assertion, typescript/unbound-method, typescript/require-await, eslint/require-await -- test fixtures built from the real SDK types
/**
 * Behaviour against the real LangChain `tool()` / `DynamicStructuredTool`,
 * rather than hand-written fakes.
 *
 * Every assertion here corresponds to a bypass the fakes in
 * `src/langchain/v1/*.test.ts` could not see:
 *
 * - `tool()` returns a `DynamicStructuredTool` whose `invoke` is generic
 *   over `StructuredToolCallInput`. A structural fake can satisfy
 *   `LangChainTool` while a real instance is rejected at the call site
 *   if `invoke` is written as a property type.
 * - `invoke` with a `tool_call` envelope must scan `args`, not the
 *   opaque `id`.
 *
 * This file value-imports the optional peers, so it lives outside
 * `src/langchain/` — that directory is globbed by the langchain-absent
 * CI job and scanned for type-only imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardTool } from "../../src/langchain/v1/guard-tool.ts";
import { asDenial, recorded } from "../_shared/source-scan.ts";
import { decisionAllow, decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

function weatherTool(handler?: (input: { city: string }) => Promise<string> | string) {
  return tool(
    async (input: { city: string }) => {
      if (handler !== undefined) {
        return handler(input);
      }
      return `ok:${input.city}`;
    },
    {
      name: "weather",
      description: "Weather lookup.",
      schema: z.object({ city: z.string() }),
    },
  );
}

test("guardTool result is a real DynamicStructuredTool the agent can register", () => {
  const { client } = stubClient(decisionAllow());
  const wrapped = guardTool(client, weatherTool(), { action: "weather.looked-up" });
  assert.equal(typeof wrapped.invoke, "function");
  assert.equal(wrapped.name, "weather");
  assert.equal(typeof wrapped.func, "function");
});

test("invoke DENY returns a plain ArcjetDenialResult, not a ToolMessage", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const wrapped = guardTool(
    client,
    weatherTool(async () => {
      calls += 1;
      return "should-not-run";
    }),
    { action: "weather.looked-up" },
  );

  const result = asDenial<ArcjetDenialResult>(await wrapped.invoke({ city: "Paris" }));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
  assert.equal("tool_call_id" in result, false);
  assert.equal("lc_id" in result, false);
});

test("invoke with a tool_call envelope scans args, not the opaque id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let captured: unknown;
  const wrapped = guardTool(
    client,
    weatherTool(async (input) => {
      captured = input;
      return `ok:${input.city}`;
    }),
    {
      action: "weather.looked-up",
      rules: (input) => {
        assert.equal(input.city, "Paris");
        return [];
      },
    },
  );

  const result = await wrapped.invoke({
    name: "weather",
    args: { city: "Paris" },
    id: "call-opaque",
    type: "tool_call",
  });

  assert.deepEqual(captured, { city: "Paris" });
  // Real DynamicStructuredTool.invoke wraps a string result in a ToolMessage
  // when the input is a tool_call envelope. The guarded handler still ran.
  const content =
    typeof result === "object" && result !== null && "content" in result
      ? (result as { content: unknown }).content
      : result;
  assert.equal(content, "ok:Paris");
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

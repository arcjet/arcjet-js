// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { asDenial, recorded } from "../../../test/_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import { MASTRA_THREAD_ID_KEY } from "./context.ts";
import type { ArcjetDenialResult } from "./denial.ts";
import { guardHooks } from "./hooks.ts";

function hookContext(input?: unknown) {
  const resolvedInput = input === undefined ? { q: "1" } : input;
  return {
    toolName: "mcp_search",
    input: resolvedInput,
    context: {
      requestContext: {
        get(key: string): unknown {
          return key === MASTRA_THREAD_ID_KEY ? "thread-hooks" : undefined;
        },
      },
    },
  };
}

test("beforeToolCall ALLOW returns undefined so the tool proceeds", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "mcp.invoked" });
  const result = await hooks.beforeToolCall!(hookContext());

  assert.equal(result, undefined);
  assert.equal(recorded(guardCalls[0])["correlationId"], "thread-hooks");
  assert.equal(
    (recorded(captureCalls[0])["metadata"] as Record<string, unknown>)["outcome"],
    "allowed",
  );
});

test("beforeToolCall DENY returns proceed: false with a structured output", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "mcp.invoked" });
  const result = await hooks.beforeToolCall!(hookContext());

  assert.ok(result);
  assert.equal(result.proceed, false);
  const output = asDenial<ArcjetDenialResult>(result.output);
  assert.equal(output.arcjetDenied, true);
  assert.equal(output.reason, "PROMPT_INJECTION");
});

test("beforeToolCall fail-closed unavailable returns proceed: false", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client);
  const result = await hooks.beforeToolCall!(hookContext());

  assert.ok(result);
  assert.equal(result.proceed, false);
  const output = asDenial<ArcjetDenialResult>(result.output);
  assert.equal(output.reason, "ERROR");
});

test("rules callback receives the tool name and input", async () => {
  const { client } = stubClient(decisionAllow());
  let seenName = "";
  const hooks = guardHooks(client, {
    rules: ({ toolName, input }) => {
      seenName = toolName;
      assert.deepEqual(input, { q: "abc" });
      return [fakeRule];
    },
  });
  await hooks.beforeToolCall!(hookContext({ q: "abc" }));
  assert.equal(seenName, "mcp_search");
});

test("afterToolCall captures success and never throws", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "mcp.invoked" });
  await hooks.afterToolCall!({
    ...hookContext(),
    output: { hits: 1 },
  });

  assert.equal(captureCalls.length, 1);
  const metadata = recorded(captureCalls[0])["metadata"] as Record<string, unknown>;
  assert.equal(metadata["outcome"], "success");
  assert.equal(metadata["mastra.phase"], "after");
  assert.equal(metadata["mastra.tool"], "mcp_search");
});

test("afterToolCall captures error outcome", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await hooks.afterToolCall!({
    ...hookContext(),
    error: new Error("boom"),
  });

  const metadata = recorded(captureCalls[0])["metadata"] as Record<string, unknown>;
  assert.equal(metadata["outcome"], "error");
});

test("default action is tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await hooks.beforeToolCall!(hookContext());
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

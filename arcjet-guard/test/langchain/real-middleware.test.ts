// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unnecessary-type-assertion, typescript/unbound-method, typescript/require-await, eslint/require-await -- test fixtures built from the real SDK types
/**
 * wrapToolCall DENY against the real `@langchain/core` `ToolMessage`.
 *
 * wrapToolCall's return is NOT passed through `baseHandler`. A bare
 * object is the reducer-crash case (`ToolMessage.isInstance` fails).
 * These assertions live outside `src/langchain/` because constructing
 * the denial dynamically imports `@langchain/core/messages`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { ToolMessage } from "@langchain/core/messages";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardMiddleware } from "../../src/langchain/v1/guard-middleware.ts";
import { asDenial } from "../_shared/source-scan.ts";
import {
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  stubClient,
} from "../_shared/stub-client.ts";

function toolRequest(name: string, args: unknown = {}, id = "call-1", tool?: object) {
  return {
    toolCall: { name, args, id, type: "tool_call" as const },
    tool,
    runtime: { configurable: { thread_id: "thread-1" } },
  };
}

function denialFrom(message: ToolMessage): ArcjetDenialResult {
  return asDenial<ArcjetDenialResult>(JSON.parse(String(message.content)));
}

test("wrapToolCall DENY returns a real ToolMessage, not a bare object or status error", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let handlerCalls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await mw.wrapToolCall(toolRequest("weather", { city: "Paris" }), async () => {
    handlerCalls += 1;
    return { ok: true };
  });

  assert.equal(handlerCalls, 0);
  assert.equal(ToolMessage.isInstance(result), true);
  const message = result as ToolMessage;
  assert.equal(message.tool_call_id, "call-1");
  assert.equal(message.name, "weather");
  assert.notEqual(message.status, "error");
  const payload = denialFrom(message);
  assert.equal(payload.arcjetDenied, true);
  assert.equal(payload.reason, "PROMPT_INJECTION");
});

test("wrapToolCall still gates when request.tool is undefined (MCP / unwrapped)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let handlerCalls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await mw.wrapToolCall(
    toolRequest("mcp_search", { q: "hello" }, "call-mcp"),
    async () => {
      handlerCalls += 1;
      return { ok: true };
    },
  );

  assert.equal(handlerCalls, 0);
  assert.equal(ToolMessage.isInstance(result), true);
  const message = result as ToolMessage;
  assert.equal(message.tool_call_id, "call-mcp");
  assert.equal(message.name, "mcp_search");
  assert.notEqual(message.status, "error");
  assert.equal(denialFrom(message).reason, "PROMPT_INJECTION");
});

test("wrapToolCall fail-closed unavailable is a completed ToolMessage, not a throw", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let handlerCalls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await mw.wrapToolCall(toolRequest("weather"), async () => {
    handlerCalls += 1;
    return { ok: true };
  });

  assert.equal(handlerCalls, 0);
  assert.equal(ToolMessage.isInstance(result), true);
  const message = result as ToolMessage;
  assert.notEqual(message.status, "error");
  assert.equal(denialFrom(message).reason, "ERROR");
});

test("wrapToolCall DENY does not throw (throws would drop arcjetDenied)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await mw.wrapToolCall(toolRequest("weather"), async () => {
    throw new Error("handler should not run");
  });
  assert.equal(ToolMessage.isInstance(result), true);
  assert.equal(denialFrom(result as ToolMessage).arcjetDenied, true);
});

// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unnecessary-type-assertion, typescript/unbound-method, typescript/require-await, eslint/require-await -- test fixtures built from the real SDK types
/**
 * End-to-end behaviour through the real `createAgent` loop, driven by
 * `FakeToolCallingModel` so no network is involved.
 *
 * Direct `wrapToolCall` / `tool.invoke` tests cannot see:
 *
 * - Whether `createAgent` actually reaches the guarded tool. `guardTool`
 *   returns a copy; anything that re-registered the original would run
 *   the unguarded handler while a direct-call test still passed.
 * - What the model is finally shown. wrapToolCall's return is **not**
 *   passed through `baseHandler`. A bare object is the messages-reducer
 *   crash. A denial must be a real `ToolMessage` whose `status` is not
 *   `"error"`, not an `interrupt()`.
 * - Whether `guardMiddleware` skips a `guardTool`-branded tool so Guard
 *   is not double-called.
 *
 * This file value-imports the optional peers, so it lives outside
 * `src/langchain/` — that directory is globbed by the langchain-absent
 * CI job and scanned for type-only imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createAgent, FakeToolCallingModel } from "langchain";
import { z } from "zod";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardMiddleware, guardTool } from "../../src/langchain/v1/index.ts";
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

function toolCallingModel() {
  return new FakeToolCallingModel({
    toolCalls: [
      [
        {
          name: "weather",
          args: { city: "Paris" },
          id: "call_weather_1",
          type: "tool_call",
        },
      ],
      [],
    ],
  });
}

function messageText(content: unknown): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

function denialFrom(message: ToolMessage): ArcjetDenialResult {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- ToolMessage.content is the JSON denial payload
  return JSON.parse(messageText(message.content)) as ArcjetDenialResult;
}

test("guardMiddleware wrapToolCall DENY returns a completed ToolMessage, not interrupt or status error", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const handlerRan: string[] = [];
  const weather = weatherTool(async (input) => {
    handlerRan.push(input.city);
    return `ok:${input.city}`;
  });

  const agent = createAgent({
    model: toolCallingModel(),
    tools: [weather],
    middleware: [guardMiddleware(client, { action: "weather.looked-up" })],
  });

  const result = await agent.invoke(
    { messages: [{ role: "user", content: "weather in Paris" }] },
    { configurable: { thread_id: "thread-e2e" } },
  );

  assert.deepEqual(handlerRan, []);
  assert.equal(guardCalls.length, 1);
  const toolMessages = result.messages.filter((message) => ToolMessage.isInstance(message));
  assert.equal(toolMessages.length, 1);
  const denied = toolMessages[0]!;
  assert.equal(denied.tool_call_id, "call_weather_1");
  assert.equal(denied.name, "weather");
  assert.notEqual(denied.status, "error");
  const payload = denialFrom(denied);
  assert.equal(payload.arcjetDenied, true);
  assert.equal(payload.reason, "PROMPT_INJECTION");
});

test("wrapToolCall still gates an unwrapped tool when the handler is omitted", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const agent = createAgent({
    model: toolCallingModel(),
    tools: [weatherTool()],
    middleware: [guardMiddleware(client, { action: "tool.invoked" })],
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "weather in Paris" }],
  });
  const denied = result.messages.find((message) => ToolMessage.isInstance(message));
  assert.ok(denied);
  assert.notEqual(denied!.status, "error");
  assert.equal(denialFrom(denied!).reason, "PROMPT_INJECTION");
});

test("guardMiddleware skips a guardTool-branded tool so policy is not double-called", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const weather = guardTool(
    client,
    weatherTool(async () => "should-not-run"),
    {
      action: "weather.looked-up",
    },
  );

  const agent = createAgent({
    model: toolCallingModel(),
    tools: [weather],
    middleware: [guardMiddleware(client, { action: "tool.invoked" })],
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "weather in Paris" }],
  });

  assert.equal(guardCalls.length, 1);
  const denied = result.messages.find((message) => ToolMessage.isInstance(message));
  assert.ok(denied);
  assert.notEqual(denied!.status, "error");
  assert.equal(denialFrom(denied!).reason, "PROMPT_INJECTION");
});

test("ALLOW through createAgent still reaches an unwrapped handler", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let calls = 0;
  const agent = createAgent({
    model: toolCallingModel(),
    tools: [
      weatherTool(async (input) => {
        calls += 1;
        return `ok:${input.city}`;
      }),
    ],
    middleware: [guardMiddleware(client, { action: "tool.invoked" })],
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "weather in Paris" }],
  });

  assert.equal(calls, 1);
  assert.equal(guardCalls.length, 1);
  const toolMessage = result.messages.find((message) => ToolMessage.isInstance(message));
  assert.ok(toolMessage);
  assert.equal(messageText(toolMessage!.content), "ok:Paris");
});

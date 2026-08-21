// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unsafe-member-access, typescript/no-unsafe-type-assertion, typescript/require-await, eslint/require-await -- test fixtures built from the real SDK types
/**
 * End-to-end behaviour through the real `ai.generate()` loop, driven by
 * a local `defineModel` so no network is involved.
 *
 * `real-tool.test.ts` calls the ToolAction directly, which cannot see:
 *
 * - Whether `generate()` actually reaches the guarded tool. `guardTool`
 *   returns a copy, so anything that re-registered the original would
 *   run the unguarded handler while a direct-call test still passed.
 * - What the model is finally shown. A denial must ride in
 *   `toolResponse.output` of a completed tool message, not become
 *   `finishReason: "interrupted"` / `ToolInterruptError`.
 * - Whether `guardMiddleware`'s `tool` hook can deny without calling
 *   `next()` — that is a property of `resolveToolRequest`.
 *
 * This file value-imports the optional peer, so it lives outside
 * `src/genkit/` — that directory is globbed by the genkit-absent CI
 * job and scanned for type-only imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { genkit, z } from "genkit";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardMiddleware } from "../../src/genkit/v1/guard-middleware.ts";
import { guardTool } from "../../src/genkit/v1/guard-tool.ts";
import { decisionAllow, decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

function createAi() {
  return genkit({});
}

function scriptedToolModel(
  ai: ReturnType<typeof genkit>,
  toolName: string,
  input: unknown,
) {
  let turns = 0;
  return ai.defineModel({ name: `scripted-${toolName}-${Math.random()}` }, async () => {
    turns += 1;
    if (turns === 1) {
      return {
        message: {
          role: "model",
          content: [
            {
              toolRequest: {
                name: toolName,
                ref: "call-e2e-1",
                input,
              },
            },
          ],
        },
      };
    }
    return {
      message: {
        role: "model",
        content: [{ text: "done" }],
      },
    };
  });
}

function denialFromMessages(messages: ReadonlyArray<{ role?: string; content?: ReadonlyArray<unknown> }>) {
  const toolMessage = messages.find((m) => m.role === "tool");
  assert.ok(toolMessage, "generate() must append a tool message after a tool call");
  const content = toolMessage.content ?? [];
  const part = content.find((p) => typeof p === "object" && p !== null && "toolResponse" in p);
  assert.ok(part, "the tool message must carry a toolResponse");
  const response = (part as { toolResponse?: { output?: unknown } }).toolResponse;
  return response?.output as ArcjetDenialResult;
}

test("DENY through real generate(): handler never runs and finishReason is not interrupted", async () => {
  const ai = createAi();
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const guarded = guardTool(
    client,
    ai.defineTool(
      {
        name: "lookup_order",
        description: "real generate() test tool",
        inputSchema: z.object({ note: z.string() }),
      },
      async () => {
        calls += 1;
        return "must not run";
      },
    ),
    { action: "order.looked-up" },
  );

  const model = scriptedToolModel(ai, "lookup_order", { note: "hello" });
  const result = await ai.generate({
    model,
    prompt: "look up my order",
    tools: [guarded],
    context: { sessionId: "sess-e2e" },
  });

  assert.equal(calls, 0);
  assert.notEqual(result.finishReason, "interrupted");
  assert.equal(result.interrupts?.length ?? 0, 0);

  const denial = denialFromMessages(result.messages);
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
  assert.equal(denial.retryable, false);
  assert.match(denial.message, /Do not retry/);
});

test("ALLOW through real generate(): handler runs and its output reaches the model", async () => {
  const ai = createAi();
  const { client, guardCalls } = stubClient(decisionAllow());
  let calls = 0;
  const guarded = guardTool(
    client,
    ai.defineTool(
      {
        name: "lookup_order_allow",
        description: "real generate() test tool",
        inputSchema: z.object({ note: z.string() }),
      },
      async (input) => {
        calls += 1;
        return `ran:${input.note}`;
      },
    ),
    { action: "order.looked-up" },
  );

  const model = scriptedToolModel(ai, "lookup_order_allow", { note: "hello" });
  const result = await ai.generate({
    model,
    prompt: "look up my order",
    tools: [guarded],
    context: { sessionId: "sess-e2e" },
  });

  assert.equal(calls, 1);
  assert.equal(result.text, "done");
  assert.equal(guardCalls.length, 1);
  assert.notEqual(result.finishReason, "interrupted");
});

test("guardMiddleware DENY: next/handler never runs and finishReason is not interrupted", async () => {
  const ai = createAi();
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const unwrapped = ai.defineTool(
    {
      name: "mcp_search",
      description: "unwrapped filesystem/MCP stand-in",
      inputSchema: z.object({ q: z.string() }),
    },
    async (input) => {
      calls += 1;
      return `ran:${input.q}`;
    },
  );

  const model = scriptedToolModel(ai, "mcp_search", { q: "hello" });
  const result = await ai.generate({
    model,
    prompt: "search",
    tools: [unwrapped],
    use: [guardMiddleware(client, { action: "tool.invoked", sessionId: "sess-mw" })],
    context: { sessionId: "sess-mw" },
  });

  assert.equal(calls, 0);
  assert.notEqual(result.finishReason, "interrupted");
  assert.equal(result.interrupts?.length ?? 0, 0);

  const denial = denialFromMessages(result.messages);
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
});

test("guardMiddleware ALLOW: the unwrapped handler still runs", async () => {
  const ai = createAi();
  const { client, guardCalls } = stubClient(decisionAllow());
  let calls = 0;
  const unwrapped = ai.defineTool(
    {
      name: "mcp_search_allow",
      description: "unwrapped filesystem/MCP stand-in",
      inputSchema: z.object({ q: z.string() }),
    },
    async (input) => {
      calls += 1;
      return `ran:${input.q}`;
    },
  );

  const model = scriptedToolModel(ai, "mcp_search_allow", { q: "hello" });
  const result = await ai.generate({
    model,
    prompt: "search",
    tools: [unwrapped],
    use: [guardMiddleware(client, { action: ({ toolName }) => `${toolName}.invoked` })],
  });

  assert.equal(calls, 1);
  assert.equal(result.text, "done");
  assert.equal(guardCalls.length, 1);
  assert.notEqual(result.finishReason, "interrupted");
});

test("multipart tool DENY still reaches the model on toolResponse.output", async () => {
  const ai = createAi();
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const guarded = guardTool(
    client,
    ai.defineTool(
      {
        name: "lookup_order_multipart",
        description: "a multipart tool resolves to { output, content }",
        inputSchema: z.object({ note: z.string() }),
        multipart: true,
      },
      async (input) => {
        calls += 1;
        return { output: `ran:${input.note}`, content: [{ text: "must not run" }] };
      },
    ),
    { action: "order.looked-up" },
  );

  const model = scriptedToolModel(ai, "lookup_order_multipart", { note: "hello" });
  const result = await ai.generate({
    model,
    prompt: "look up my order",
    tools: [guarded],
  });

  assert.equal(calls, 0);
  assert.notEqual(result.finishReason, "interrupted");

  // `executeTool` reads `.output` off a tool.v2 result. A bare denial
  // would leave `toolResponse.output` undefined — a silent block the
  // model cannot explain.
  const denial = denialFromMessages(result.messages);
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
});

test("outputSchema on a guarded tool does not turn DENY into an interrupt", async () => {
  const ai = createAi();
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const guarded = guardTool(
    client,
    ai.defineTool(
      {
        name: "lookup_order_schema_gen",
        description: "outputSchema is a string",
        inputSchema: z.object({ note: z.string() }),
        outputSchema: z.string(),
      },
      async (input) => {
        calls += 1;
        return `ran:${input.note}`;
      },
    ),
    { action: "order.looked-up" },
  );

  const model = scriptedToolModel(ai, "lookup_order_schema_gen", { note: "hello" });
  const result = await ai.generate({
    model,
    prompt: "look up",
    tools: [guarded],
  });

  assert.equal(calls, 0);
  assert.notEqual(result.finishReason, "interrupted");
  const denial = denialFromMessages(result.messages);
  assert.equal(denial.arcjetDenied, true);
});

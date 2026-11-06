/**
 * Behaviour of `@arcjet/guard/tanstack-ai/v0` against the real
 * `@tanstack/ai` 0.x `chat()` engine (the `@tanstack/ai-v0` development
 * alias), driven by its own scripted `fakeText()` adapter.
 *
 * These assertions live outside `src/tanstack-ai/` — that directory is
 * globbed by the tanstack-ai-absent CI job and scanned for type-only
 * imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { chat, toolDefinition } from "@tanstack/ai-v0";
import type {
  AnyTextAdapter,
  BeforeToolCallDecision,
  ChatMiddleware,
  ModelMessage,
} from "@tanstack/ai-v0";
import { fakeText } from "@tanstack/ai-v0/testing";

import type { ArcjetDenialResult } from "../../../src/agents/denial.ts";
import { guardMiddleware } from "../../../src/tanstack-ai/v0/guard-middleware.ts";
import type { GuardMiddlewarePolicy } from "../../../src/tanstack-ai/v0/guard-middleware.ts";
import { asDenial, recorded } from "../../_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  stubClient,
} from "../../_shared/stub-client.ts";

interface RunResult {
  guardCalls: unknown[];
  toolRuns: unknown[];
  toolMessage: ModelMessage | undefined;
  modelCalls: number;
}

async function runChat(
  decision: Parameters<typeof stubClient>[0],
  options: { policy?: GuardMiddlewarePolicy; after?: ChatMiddleware[] } = {},
): Promise<RunResult> {
  const { client, guardCalls } = stubClient(decision);
  const toolRuns: unknown[] = [];
  const tool = toolDefinition({ name: "lookup", description: "Look up an order" }).server(
    (args: unknown) => {
      toolRuns.push(args);
      return { ok: true };
    },
  );

  let toolMessage: ModelMessage | undefined;
  const fake = fakeText();
  fake.setResponses([
    { toolCalls: [{ name: "lookup", input: { q: "original" } }] },
    ({ request }): { text: string } => {
      toolMessage = request.messages.find((message) => message.role === "tool");
      return { text: "done" };
    },
  ]);

  for await (const chunk of chat({
    // 0.69's FakeTextAdapter types `midConversationChannels` as `T | undefined`,
    // which AnyTextAdapter rejects under exactOptionalPropertyTypes (fixed in 1.0).
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unnecessary-type-assertion -- upstream 0.x typing gap; only tsconfig.tanstack-ai-v0.json sees it
    adapter: fake as unknown as AnyTextAdapter,
    messages: [{ role: "user", content: "where is my order?" }],
    tools: [tool],
    context: { sessionId: "sess-1" },
    middleware: [guardMiddleware(client, options.policy), ...(options.after ?? [])],
  })) {
    void chunk;
  }
  return { guardCalls, toolRuns, toolMessage, modelCalls: fake.state.callCount };
}

function toolResultPayload(message: ModelMessage | undefined): unknown {
  assert.ok(message, "the model must get a tool message back");
  const { content } = message;
  assert.ok(typeof content === "string", "the tool message content must be a string");
  return JSON.parse(content);
}

test("ALLOW: the real 0.x chat() runs the tool once after one guard call", async () => {
  const run = await runChat(decisionAllow());
  assert.equal(run.guardCalls.length, 1);
  assert.deepEqual(run.toolRuns, [{ q: "original" }]);
  assert.deepEqual(toolResultPayload(run.toolMessage), { ok: true });
  assert.equal(recorded(run.guardCalls[0])["correlationId"], "sess-1");
});

test("DENY: the tool never runs and the model gets ArcjetDenialResult", async () => {
  const run = await runChat(decisionDenyPromptInjection());
  assert.equal(run.toolRuns.length, 0);
  const denial = asDenial<ArcjetDenialResult>(toolResultPayload(run.toolMessage));
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
  assert.equal(run.modelCalls, 2);
});

test("onDeny abort: the tool never runs and the run stops before the next model call", async () => {
  const run = await runChat(decisionDenyPromptInjection(), { policy: { onDeny: "abort" } });
  assert.equal(run.toolRuns.length, 0);
  assert.equal(run.toolMessage, undefined);
  assert.equal(run.modelCalls, 1);
});

test("onBeforeToolCall is first-win: a later transformArgs changes args Guard allowed", async () => {
  const seen: unknown[] = [];
  const run = await runChat(decisionAllow(), {
    policy: {
      rules: (call) => {
        seen.push(call.input);
        return [];
      },
    },
    after: [
      {
        name: "swap-args",
        onBeforeToolCall: (): BeforeToolCallDecision => ({
          type: "transformArgs",
          args: { q: "swapped" },
        }),
      },
    ],
  });
  assert.deepEqual(seen, [{ q: "original" }]);
  assert.deepEqual(run.toolRuns, [{ q: "swapped" }]);
});

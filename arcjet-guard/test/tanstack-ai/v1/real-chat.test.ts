/**
 * Behaviour against the real `@tanstack/ai` 1.x `chat()` engine, driven by
 * its own scripted `fakeText()` adapter, rather than the structural fakes in
 * `src/tanstack-ai/v1/*.test.ts`.
 *
 * These assertions live outside `src/tanstack-ai/` — that directory is
 * globbed by the tanstack-ai-absent CI job and scanned for type-only
 * imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { chat, toolDefinition } from "@tanstack/ai";
import type { ChatMiddleware, ModelMessage, UIMessage } from "@tanstack/ai";
import { toolCacheMiddleware } from "@tanstack/ai/middlewares";
import { fakeText } from "@tanstack/ai/testing";

import type { ArcjetDenialResult } from "../../../src/agents/denial.ts";
import { guardMiddleware } from "../../../src/tanstack-ai/v1/guard-middleware.ts";
import type { GuardMiddlewarePolicy } from "../../../src/tanstack-ai/v1/guard-middleware.ts";
import { asDenial, recorded } from "../../_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  stubClient,
} from "../../_shared/stub-client.ts";

interface RunResult {
  guardCalls: unknown[];
  toolRuns: unknown[];
  /** The tool message the model got back on its second call. */
  toolMessage: ModelMessage | undefined;
  chunkTypes: string[];
  modelCalls: number;
  error: unknown;
}

interface RunOptions {
  policy?: GuardMiddlewarePolicy;
  before?: ChatMiddleware[];
  after?: ChatMiddleware[];
  client?: boolean;
  context?: unknown;
}

async function runChat(
  decision: Parameters<typeof stubClient>[0],
  options: RunOptions = {},
): Promise<RunResult> {
  const { client, guardCalls } = stubClient(decision);
  const toolRuns: unknown[] = [];
  const definition = toolDefinition({
    name: "lookup",
    description: "Look up an order",
  });
  const tool =
    options.client === true
      ? definition.client()
      : definition.server((args: unknown) => {
          toolRuns.push(args);
          return { ok: true };
        });

  let toolMessage: ModelMessage | undefined;
  const fake = fakeText();
  fake.setResponses([
    { toolCalls: [{ name: "lookup", input: { q: "original" } }] },
    ({ request }): { text: string } => {
      toolMessage = request.messages.find((message) => message.role === "tool");
      return { text: "done" };
    },
  ]);

  const result: RunResult = {
    guardCalls,
    toolRuns,
    toolMessage,
    chunkTypes: [],
    modelCalls: 0,
    error: undefined,
  };
  try {
    for await (const chunk of chat({
      adapter: fake,
      messages: [{ role: "user", content: "where is my order?" }],
      threadId: "thread-caller",
      tools: [tool],
      context: options.context ?? { sessionId: "sess-1" },
      middleware: [
        ...(options.before ?? []),
        guardMiddleware(client, options.policy),
        ...(options.after ?? []),
      ],
    })) {
      result.chunkTypes.push(chunk.type);
    }
  } catch (error) {
    result.error = error;
  }
  result.toolMessage = toolMessage;
  result.modelCalls = fake.state.callCount;
  return result;
}

function toolResultPayload(message: ModelMessage | undefined): unknown {
  assert.ok(message, "the model must get a tool message back");
  const { content } = message;
  assert.ok(typeof content === "string", "the tool message content must be a string");
  return JSON.parse(content);
}

const swapArgs: ChatMiddleware = {
  name: "swap-args",
  onBeforeToolCall: () => ({ type: "transformArgs", args: { q: "swapped" } }),
};

test("chat({ middleware }) accepts guardMiddleware without a cast", () => {
  const { client } = stubClient(decisionAllow());
  const middleware: ChatMiddleware[] = [guardMiddleware(client)];
  assert.equal(typeof middleware[0]?.onGuardToolCall, "function");
});

test("ALLOW: the real chat() runs the tool once after one guard call", async () => {
  const run = await runChat(decisionAllow());
  assert.equal(run.error, undefined);
  assert.equal(run.guardCalls.length, 1);
  assert.deepEqual(run.toolRuns, [{ q: "original" }]);
  assert.deepEqual(toolResultPayload(run.toolMessage), { ok: true });
});

test("DENY: the tool never runs and the model gets ArcjetDenialResult", async () => {
  const run = await runChat(decisionDenyPromptInjection());
  assert.equal(run.error, undefined);
  assert.equal(run.toolRuns.length, 0);
  const denial = asDenial<ArcjetDenialResult>(toolResultPayload(run.toolMessage));
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
  assert.equal(run.modelCalls, 2);
  assert.ok(run.chunkTypes.includes("RUN_FINISHED"));
});

test("onDeny abort: the tool never runs and the run stops before the next model call", async () => {
  const run = await runChat(decisionDenyPromptInjection(), { policy: { onDeny: "abort" } });
  assert.equal(run.guardCalls.length, 1);
  assert.equal(run.toolRuns.length, 0);
  assert.equal(run.toolMessage, undefined);
  assert.equal(run.modelCalls, 1);
  assert.ok(!run.chunkTypes.includes("RUN_FINISHED"));
});

test("guard sees the args after another middleware's transformArgs, placed before Arcjet", async () => {
  const run = await runChat(decisionAllow(), {
    before: [swapArgs],
    policy: {
      inputs: (call) => {
        assert.deepEqual(call.input, { q: "swapped" });
        return {};
      },
    },
  });
  assert.equal(run.error, undefined);
  assert.equal(run.guardCalls.length, 1);
  assert.deepEqual(run.toolRuns, [{ q: "swapped" }]);
});

test("guard sees the args after another middleware's transformArgs, placed after Arcjet", async () => {
  const seen: unknown[] = [];
  const run = await runChat(decisionAllow(), {
    after: [swapArgs],
    policy: {
      rules: (call) => {
        seen.push(call.input);
        return [];
      },
    },
  });
  assert.equal(run.error, undefined);
  assert.deepEqual(seen, [{ q: "swapped" }]);
  assert.deepEqual(run.toolRuns, [{ q: "swapped" }]);
});

test("a DENY still holds when another middleware's onBeforeToolCall decides first", async () => {
  const run = await runChat(decisionDenyPromptInjection(), { before: [swapArgs] });
  assert.equal(run.guardCalls.length, 1);
  assert.equal(run.toolRuns.length, 0);
  assert.equal(asDenial<ArcjetDenialResult>(toolResultPayload(run.toolMessage)).arcjetDenied, true);
});

test("a toolCacheMiddleware hit answers without the tool and without Guard", async () => {
  const cache = toolCacheMiddleware({
    storage: {
      getItem: () => ({ result: { cached: true }, timestamp: Date.now() }),
      setItem: () => {
        /* cache hit probe: writes unused */
      },
      deleteItem: () => {
        /* cache hit probe: deletes unused */
      },
    },
  });
  const run = await runChat(decisionDenyPromptInjection(), { before: [cache] });
  assert.equal(run.guardCalls.length, 0);
  assert.equal(run.toolRuns.length, 0);
  assert.deepEqual(toolResultPayload(run.toolMessage), { cached: true });
});

test("correlates on chat({ context }) first and records chat({ threadId })", async () => {
  const run = await runChat(decisionAllow());
  const call = recorded(run.guardCalls[0]);
  assert.equal(call["correlationId"], "sess-1");
  assert.deepEqual(call["metadata"], {
    "tanstack-ai.session": "sess-1",
    "tanstack-ai.thread": "thread-caller",
    "tanstack-ai.tool": "lookup",
  });
});

test("correlates on chat({ threadId }) when chat({ context }) has no id", async () => {
  const run = await runChat(decisionAllow(), { context: {} });
  assert.equal(recorded(run.guardCalls[0])["correlationId"], "thread-caller");
});

test("gates a client tool before TanStack AI sends it to the client", async () => {
  const run = await runChat(decisionDenyPromptInjection(), { client: true });
  assert.equal(run.guardCalls.length, 1);
  assert.equal(asDenial<ArcjetDenialResult>(toolResultPayload(run.toolMessage)).arcjetDenied, true);
});

async function runApproval(decision: Parameters<typeof stubClient>[0]): Promise<{
  guardCallsWhileWaiting: number;
  guardCalls: unknown[];
  toolRuns: unknown[];
  toolMessage: ModelMessage | undefined;
}> {
  const { client, guardCalls } = stubClient(decision);
  const toolRuns: unknown[] = [];
  const tool = toolDefinition({
    name: "lookup",
    description: "Look up an order",
    needsApproval: true,
  }).server((args: unknown) => {
    toolRuns.push(args);
    return { ok: true };
  });
  const middleware = [guardMiddleware(client)];
  const fake = fakeText();

  fake.setResponses([{ toolCalls: [{ name: "lookup", input: { q: "original" }, id: "call-1" }] }]);
  let interrupted = false;
  for await (const chunk of chat({
    adapter: fake,
    messages: [{ role: "user", content: "where is my order?" }],
    threadId: "thread-caller",
    tools: [tool],
    middleware,
  })) {
    const event: Record<string, unknown> = { ...chunk };
    const outcome = event["outcome"];
    interrupted ||=
      event["type"] === "RUN_FINISHED" &&
      typeof outcome === "object" &&
      outcome !== null &&
      "type" in outcome &&
      outcome.type === "interrupt";
  }
  assert.ok(interrupted, "the first run must stop for approval");
  const guardCallsWhileWaiting = guardCalls.length;

  let toolMessage: ModelMessage | undefined;
  fake.setResponses([
    ({ request }): { text: string } => {
      toolMessage = request.messages.find((message) => message.role === "tool");
      return { text: "done" };
    },
  ]);
  const approved: UIMessage[] = [
    { id: "u1", role: "user", parts: [{ type: "text", content: "where is my order?" }] },
    {
      id: "a1",
      role: "assistant",
      parts: [
        {
          type: "tool-call",
          id: "call-1",
          name: "lookup",
          arguments: '{"q":"original"}',
          state: "approval-responded",
          approval: { id: "approval_call-1", needsApproval: true, approved: true },
        },
      ],
    },
  ];
  for await (const chunk of chat({
    adapter: fake,
    messages: approved,
    threadId: "thread-caller",
    tools: [tool],
    middleware,
  })) {
    void chunk;
  }
  return { guardCallsWhileWaiting, guardCalls, toolRuns, toolMessage };
}

test("needsApproval: no guard call while waiting; after a human yes, Guard runs once", async () => {
  const run = await runApproval(decisionAllow());
  assert.equal(run.guardCallsWhileWaiting, 0);
  assert.equal(run.guardCalls.length, 1);
  assert.deepEqual(run.toolRuns, [{ q: "original" }]);
  assert.deepEqual(toolResultPayload(run.toolMessage), { ok: true });
});

test("needsApproval: a DENY after a human yes still skips the tool", async () => {
  const run = await runApproval(decisionDenyPromptInjection());
  assert.equal(run.guardCallsWhileWaiting, 0);
  assert.equal(run.guardCalls.length, 1);
  assert.equal(run.toolRuns.length, 0);
  assert.equal(asDenial<ArcjetDenialResult>(toolResultPayload(run.toolMessage)).arcjetDenied, true);
});

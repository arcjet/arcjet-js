// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-type-assertion -- test fixtures built from the real SDK types
/**
 * Behaviour against the real `@tanstack/ai` `ChatMiddleware` /
 * `toolCacheMiddleware`, rather than the structural fakes in
 * `src/tanstack-ai/v0/*.test.ts`.
 *
 * These assertions live outside `src/tanstack-ai/` — that directory is
 * globbed by the tanstack-ai-absent CI job and scanned for type-only
 * imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { BeforeToolCallDecision, ChatMiddleware, ToolCallHookContext } from "@tanstack/ai";
import { toolCacheMiddleware } from "@tanstack/ai/middlewares";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardMiddleware } from "../../src/tanstack-ai/v0/guard-middleware.ts";
import { asDenial } from "../_shared/source-scan.ts";
import { decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

function middlewareCtx(context?: unknown): {
  requestId: string;
  streamId: string;
  threadId: string;
  conversationId: string;
  context: unknown;
} {
  return {
    requestId: "req-auto",
    streamId: "stream-auto",
    threadId: "thread-auto",
    conversationId: "thread-auto",
    context: context ?? { sessionId: "sess-1" },
  };
}

function toolHook(name: string, args: unknown = {}): ToolCallHookContext {
  return {
    toolCall: { id: "call-1", type: "function", function: { name, arguments: "{}" } },
    tool: undefined,
    args,
    toolName: name,
    toolCallId: "call-1",
  };
}

/**
 * TanStack 0.52 `MiddlewareRunner.runOnBeforeToolCall`: first non-void /
 * non-null decision wins.
 */
async function firstWin(
  middlewares: ChatMiddleware[],
  ctx: unknown,
  hookCtx: ToolCallHookContext,
): Promise<BeforeToolCallDecision> {
  for (const mw of middlewares) {
    if (mw.onBeforeToolCall === undefined) {
      continue;
    }
    const decision = await mw.onBeforeToolCall(ctx as never, hookCtx);
    if (decision !== undefined && decision !== null) {
      return decision;
    }
  }
  return undefined;
}

test("guardMiddleware is a ChatMiddleware chat({ middleware }) accepts without a cast", () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const middleware: ChatMiddleware[] = [guardMiddleware(client)];
  assert.equal(typeof middleware[0]?.onBeforeToolCall, "function");
});

test("toolCacheMiddleware first-win skip means Guard never runs", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const cache = toolCacheMiddleware({
    storage: {
      getItem: () => ({ result: { cached: true }, timestamp: Date.now() }),
      setItem: () => {
        /* first-win probe: cache writes unused */
      },
      deleteItem: () => {
        /* first-win probe: cache deletes unused */
      },
    },
  });
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await firstWin([cache, mw], middlewareCtx(), toolHook("lookup", { q: "1" }));
  assert.deepEqual(result, { type: "skip", result: { cached: true } });
  assert.equal(guardCalls.length, 0);
});

test("Arcjet first deny wins over a later toolCacheMiddleware", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const cache = toolCacheMiddleware({
    storage: {
      getItem: () => ({ result: { cached: true }, timestamp: Date.now() }),
      setItem: () => {
        /* first-win probe: cache writes unused */
      },
      deleteItem: () => {
        /* first-win probe: cache deletes unused */
      },
    },
  });
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await firstWin([mw, cache], middlewareCtx(), toolHook("lookup", { q: "1" }));
  assert.ok(result && typeof result === "object" && "type" in result);
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).arcjetDenied, true);
  assert.equal(guardCalls.length, 1);
});

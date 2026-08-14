// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/no-unsafe-argument, eslint/explicit-function-return-type, eslint/require-await, eslint/no-unnecessary-type-assertion, eslint/strict-boolean-expressions -- test infrastructure and mocks
import assert from "node:assert/strict";
import { test } from "node:test";

import { asDenial, recorded } from "../../../test/_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionDenyRateLimit,
  decisionFailOpenAllow,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import type { ToolAction } from "@mastra/core/tools";

import { MASTRA_THREAD_ID_KEY } from "./context.ts";
import type { ArcjetDenialResult } from "./denial.ts";
import { guardTool } from "./guard-tool.ts";

const TOOL_MARKER = Symbol.for("mastra.core.tools.Tool");

function createMastraTool<TInput = unknown, TOutput = { ok: boolean }>(overrides?: {
  id?: string;
  execute?: (input: TInput, context: unknown) => Promise<TOutput>;
}): ToolAction<TInput, TOutput> {
  const tool = {
    id: overrides?.id ?? "test-tool",
    description: "test tool",
    execute:
      overrides?.execute ??
      (async () => ({ ok: true }) as TOutput),
    [TOOL_MARKER]: true,
  };
  Object.defineProperty(tool, Symbol.for("mastra.hidden"), {
    value: "keep-me",
    enumerable: false,
    configurable: true,
  });
  return tool as ToolAction<TInput, TOutput>;
}

function threadContext(threadId: string) {
  return {
    requestContext: {
      get(key: string): unknown {
        return key === MASTRA_THREAD_ID_KEY ? threadId : undefined;
      },
    },
  } as never;
}

test("throws when the tool has no execute function", () => {
  const { client } = stubClient(decisionAllow());
  const tool = { id: "no-exec", description: "x" };
  assert.throws(
    () => guardTool(client, tool as ToolAction<unknown, unknown>, { action: "test.executed" }),
    /execute function/,
  );
});

test("returned object is not the input tool and preserves non-enumerable markers", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createMastraTool();
  const wrapped = guardTool(client, tool, { action: "test.executed" });

  assert.notStrictEqual(wrapped, tool);
  assert.equal((wrapped as any)[TOOL_MARKER], true);
  assert.equal((wrapped as any)[Symbol.for("mastra.hidden")], "keep-me");
});

test("input tool.execute is unchanged after wrapping", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createMastraTool();
  const originalExecute = tool.execute;
  guardTool(client, tool, { action: "test.executed" });
  assert.strictEqual(tool.execute, originalExecute);
});

test("ALLOW → execute called once with input and context by reference", async () => {
  const { client } = stubClient(decisionAllow());
  const input = { orderNumber: "A-1" };
  const ctx = threadContext("thread-1");
  let calls = 0;
  let capturedInput: unknown;
  let capturedCtx: unknown;

  const tool = createMastraTool({
    execute: async (inp, context) => {
      calls += 1;
      capturedInput = inp;
      capturedCtx = context;
      return { status: "shipped" };
    },
  });

  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = await wrapped.execute!(input, ctx);

  assert.equal(calls, 1);
  assert.strictEqual(capturedInput, input);
  assert.strictEqual(capturedCtx, ctx);
  assert.deepEqual(result, { status: "shipped" });
});

test("ALLOW → capture outcome is success and correlation comes from the thread id", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const tool = createMastraTool({
    execute: async () => ({ ok: true }),
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.execute!({}, threadContext("thread-99"));

  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["correlationId"], "thread-99");
  assert.equal(captureCalls.length, 1);
  assert.equal(recorded(captureCalls[0])["metadata"] && (recorded(captureCalls[0])["metadata"] as Record<string, unknown>)["outcome"], "success");
});

test("DENY → execute is not called and a structured result is returned (no throw)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createMastraTool({
    execute: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asDenial<ArcjetDenialResult>(await wrapped.execute!({}, threadContext("t")));

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
  assert.equal(result.retryable, false);
});

test("RATE_LIMIT DENY → structured result is retryable", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 12;
  const { client } = stubClient(decisionDenyRateLimit(resetAt));
  const tool = createMastraTool({ execute: async () => ({ ok: true }) });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asDenial<ArcjetDenialResult>(await wrapped.execute!({}, threadContext("t")));

  assert.equal(result.retryable, true);
  assert.ok(typeof result.retryAfterSeconds === "number");
});

test("rules callback receives the tool input", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createMastraTool<{ id: string }, { ok: boolean }>({
    execute: async () => ({ ok: true }),
  });
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    rules: (input) => {
      assert.equal(input.id, "xyz");
      return [fakeRule];
    },
  });
  await wrapped.execute!({ id: "xyz" }, threadContext("t"));
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("fail-closed unavailable → structured ERROR result, execute not called", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createMastraTool({
    execute: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asDenial<ArcjetDenialResult>(await wrapped.execute!({}, threadContext("t")));

  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
  assert.equal(result.retryable, true);
});

test("onGuardError allow → execute still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createMastraTool({
    execute: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onGuardError: "allow",
  });
  const result = await wrapped.execute!({}, threadContext("t"));
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});

test("does not mint a correlation id when Mastra provided none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createMastraTool({ execute: async () => ({ ok: true }) });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.execute!({}, {} as never);
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/no-unsafe-argument, eslint/explicit-function-return-type, eslint/require-await, eslint/no-unnecessary-type-assertion, eslint/strict-boolean-expressions, typescript/unbound-method -- test infrastructure and mocks
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
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { DecisionDeny } from "../../types.ts";
import type { ArcjetDenialResult } from "../../agents/denial.ts";
import type { LangChainTool } from "./guard-tool.ts";
import { guardTool } from "./guard-tool.ts";

const HIDDEN = Symbol.for("langchain.hidden");

function createLangChainTool<TInput = Record<string, unknown>>(overrides?: {
  name?: string;
  func?: (input: TInput, runtime?: unknown) => Promise<unknown>;
  invoke?: (input: unknown, config?: unknown) => Promise<unknown>;
}): LangChainTool<TInput> {
  const func = overrides?.func ?? overrides?.invoke ?? (async () => ({ ok: true }));
  const tool: LangChainTool<TInput> = {
    name: overrides?.name ?? "test-tool",
    description: "test tool",
    func,
    invoke:
      overrides?.invoke ??
      (async (input: unknown, config?: unknown) => {
        const args =
          input !== null &&
          typeof input === "object" &&
          "type" in input &&
          (input as { type?: unknown }).type === "tool_call"
            ? (input as unknown as { args: TInput }).args
            : (input as TInput);
        return func(args, config);
      }),
  };
  Object.defineProperty(tool, HIDDEN, {
    value: "keep-me",
    enumerable: false,
    configurable: true,
  });
  return tool;
}

function threadConfig(threadId: string) {
  return { configurable: { thread_id: threadId } };
}

function asToolResult(value: unknown): ArcjetDenialResult {
  return asDenial<ArcjetDenialResult>(value);
}

test("throws when the tool has no func or invoke", () => {
  const { client } = stubClient(decisionAllow());
  const tool = { name: "no-exec", description: "x" };
  assert.throws(
    () => guardTool(client, tool as LangChainTool, { action: "test.executed" }),
    /func or invoke/,
  );
});

test("returned object is not the input tool and preserves non-enumerable markers", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createLangChainTool();
  const wrapped = guardTool(client, tool, { action: "test.executed" });

  assert.notStrictEqual(wrapped, tool);
  assert.equal((wrapped as any)[HIDDEN], "keep-me");
});

test("input tool.func and invoke are unchanged after wrapping", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createLangChainTool();
  const originalFunc = tool.func;
  const originalInvoke = tool.invoke;
  guardTool(client, tool, { action: "test.executed" });
  assert.strictEqual(tool.func, originalFunc);
  assert.strictEqual(tool.invoke, originalInvoke);
});

test("ALLOW → func called once with input and config by reference", async () => {
  const { client } = stubClient(decisionAllow());
  const input = { orderNumber: "A-1" };
  const ctx = threadConfig("thread-1");
  let calls = 0;
  let capturedInput: unknown;
  let capturedCtx: unknown;

  const tool = createLangChainTool({
    func: async (inp, context) => {
      calls += 1;
      capturedInput = inp;
      capturedCtx = context;
      return { status: "shipped" };
    },
  });

  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = await wrapped.func!(input, ctx);

  assert.equal(calls, 1);
  assert.strictEqual(capturedInput, input);
  assert.strictEqual(capturedCtx, ctx);
  assert.deepEqual(result, { status: "shipped" });
});

test("ALLOW → invoke with a tool_call uses args, not the opaque id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let captured: unknown;
  const tool = createLangChainTool<{ note: string }>({
    func: async (input) => {
      captured = input;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "note.read",
    rules: (input) => {
      assert.equal(input.note, "hello");
      return [fakeRule];
    },
  });
  await wrapped.invoke!(
    { name: "test-tool", args: { note: "hello" }, id: "call-opaque", type: "tool_call" },
    threadConfig("t"),
  );
  assert.deepEqual(captured, { note: "hello" });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("ALLOW → capture outcome is success and correlation comes from thread_id", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const tool = createLangChainTool({
    func: async () => ({ ok: true }),
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.func!({}, threadConfig("thread-99"));

  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["correlationId"], "thread-99");
  assert.equal(captureCalls.length, 1);
  assert.equal(
    recorded(captureCalls[0])["metadata"] &&
      (recorded(captureCalls[0])["metadata"] as Record<string, unknown>)["outcome"],
    "success",
  );
});

test("DENY → func is not called and a plain ArcjetDenialResult is returned (no throw, no ToolMessage)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createLangChainTool({
    func: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.func!({}, threadConfig("t")));

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
  assert.equal(result.retryable, false);
  assert.equal("type" in result, false);
  assert.equal("tool_call_id" in result, false);
});

test("RATE_LIMIT DENY → structured result is retryable", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 12;
  const { client } = stubClient(decisionDenyRateLimit(resetAt));
  const tool = createLangChainTool({ func: async () => ({ ok: true }) });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.func!({}, threadConfig("t")));

  assert.equal(result.retryable, true);
  assert.ok(typeof result.retryAfterSeconds === "number");
});

test("rules callback receives the tool input", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createLangChainTool<{ id: string }>({
    func: async () => ({ ok: true }),
  });
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    rules: (input) => {
      assert.equal(input.id, "xyz");
      return [fakeRule];
    },
  });
  await wrapped.func!({ id: "xyz" }, threadConfig("t"));
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("fail-closed unavailable → ERROR denial, func not called", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createLangChainTool({
    func: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.func!({}, threadConfig("t")));

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "ERROR");
});

test("onGuardError allow → func still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createLangChainTool({
    func: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onGuardError: "allow",
  });
  const result = await wrapped.func!({}, threadConfig("t"));
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});

test("does not mint a correlation id when LangChain provided none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createLangChainTool({ func: async () => ({ ok: true }) });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.func!({}, {});
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("policy.sessionId is used when the invoke config has no thread_id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createLangChainTool({ func: async () => ({ ok: true }) });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    sessionId: "policy-sess",
  });
  await wrapped.func!({}, {});
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("DENY + throwing onDeny still denies and does not throw", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createLangChainTool({
    func: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: () => {
      throw new Error("onDeny exploded");
    },
  });

  const result = asToolResult(await wrapped.func!({}, threadConfig("t")));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
});

test("onDeny reshape is returned and func is not called", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let received: DecisionDeny | undefined;
  const tool = createLangChainTool({ func: async () => ({ ok: true }) });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: (decision) => {
      received = decision;
      return { blocked: decision.reason };
    },
  });

  const result = await wrapped.func!({}, threadConfig("t"));
  assert.equal(received?.reason, "PROMPT_INJECTION");
  assert.deepEqual(result, { blocked: "PROMPT_INJECTION" });
});

test("onDeny is not called on unavailable", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let onDenyCalls = 0;
  const tool = createLangChainTool({ func: async () => ({ ok: true }) });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: () => {
      onDenyCalls += 1;
      return { blocked: true };
    },
  });

  const result = asToolResult(await wrapped.func!({}, threadConfig("t")));
  assert.equal(onDenyCalls, 0);
  assert.equal(result.reason, "ERROR");
});

test("guard throw with default fail-closed does not execute", async () => {
  const { client } = stubClient(new Error("transport down"));
  let calls = 0;
  const tool = createLangChainTool({
    func: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.func!({}, threadConfig("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("omitted rules still submit an empty guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createLangChainTool({ func: async () => ({ ok: true }) });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.func!({}, threadConfig("t"));
  assert.deepEqual(recorded(guardCalls[0])["rules"], []);
});

test("metadata callback is merged over derived context", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createLangChainTool<{ id: string }>({
    func: async () => ({ ok: true }),
  });
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    metadata: (input) => ({ "app.item": input.id }),
  });
  await wrapped.func!({ id: "item-9" }, threadConfig("thread-meta"));
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.item"], "item-9");
  assert.equal(metadata["langchain.tool"], "test-tool");
});

test("static metadata is merged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createLangChainTool({ name: "", func: async () => ({ ok: true }) });
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    metadata: { "app.static": "yes" },
  });
  await wrapped.func!({}, threadConfig("t"));
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.static"], "yes");
  assert.equal("langchain.tool" in metadata, false);
});

test("rejects a second wrap (langchain, langgraph, or vercel-ai brand)", async () => {
  const { client } = stubClient(decisionAllow());
  const tool = createLangChainTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  assert.equal(arcjetProtectedTool in wrapped, true);
  assert.throws(() => guardTool(client, wrapped, { action: "order.looked-up" }), /already guarded/);

  const branded = createLangChainTool();
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  assert.throws(() => guardTool(client, branded, { action: "order.looked-up" }), /already guarded/);
});

test("func throw is rethrown after capture", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const tool = createLangChainTool({
    func: async (): Promise<{ ok: boolean }> => {
      throw new Error("tool failed");
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await assert.rejects(async () => wrapped.func!({}, threadConfig("t")), /tool failed/);
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "error");
});

test("non-object config does not mint an id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createLangChainTool({ func: async () => ({ ok: true }) });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.func!({}, "not-context");
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("rules factory throw fail-closes and does not execute", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createLangChainTool({
    func: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = asToolResult(await wrapped.func!({}, threadConfig("t")));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "ERROR");
});

test("metadata factory throw fail-closes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createLangChainTool({
    func: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    metadata: () => {
      throw new Error("metadata exploded");
    },
  });
  const result = asToolResult(await wrapped.func!({}, threadConfig("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("action factory throw fail-closes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createLangChainTool({
    func: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: () => {
      throw new Error("action exploded");
    },
  });
  const result = asToolResult(await wrapped.func!({}, threadConfig("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("rules factory throw with onGuardError allow still executes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createLangChainTool({
    func: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onGuardError: "allow",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await wrapped.func!({}, threadConfig("t"));
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});

test("invoke and func share one guard call (no double-call)", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let funcCalls = 0;
  const tool = createLangChainTool({
    func: async () => {
      funcCalls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.invoke!({ orderNumber: "A-1" }, threadConfig("t"));
  assert.equal(funcCalls, 1);
  assert.equal(guardCalls.length, 1);
});

test("invoke-only tool (no func) is still gated", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool: LangChainTool = {
    name: "invoke-only",
    invoke: async () => {
      calls += 1;
      return { ok: true };
    },
  };
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.invoke!({}, threadConfig("t")));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
});

test("DENY through a tool_call envelope returns the denial and scans only args", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const tool = createLangChainTool({ func: async () => ({ ok: true }) });
  let scanned: unknown;
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    rules: (input) => {
      scanned = input;
      return [];
    },
  });
  const result = asToolResult(
    await wrapped.invoke!(
      { name: "test-tool", args: { note: "x" }, id: "call-9", type: "tool_call" },
      threadConfig("t"),
    ),
  );
  assert.deepEqual(scanned, { note: "x" });
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
});

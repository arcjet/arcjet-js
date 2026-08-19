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
import type { ArcjetDenialResult } from "./denial.ts";
import type { OpenAIAgentsTool } from "./guard-tool.ts";
import { guardTool } from "./guard-tool.ts";

const HIDDEN = Symbol.for("openai-agents.hidden");

function createFunctionTool(overrides?: {
  name?: string;
  invoke?: (runContext: unknown, input: string, details?: unknown) => Promise<unknown>;
  execute?: (args: unknown, runContext?: unknown, details?: unknown) => Promise<unknown>;
}): OpenAIAgentsTool & {
  execute?: (args: unknown, runContext?: unknown, details?: unknown) => Promise<unknown>;
} {
  const execute = overrides?.execute ?? (async () => ({ ok: true }));
  const invoke =
    overrides?.invoke ??
    (async (_runContext: unknown, input: string, details?: unknown) => {
      let args: unknown = {};
      try {
        args = JSON.parse(input) as unknown;
      } catch {
        args = {};
      }
      return execute(args, _runContext, details);
    });
  const tool: OpenAIAgentsTool & { execute?: typeof execute } = {
    name: overrides?.name ?? "test-tool",
    description: "test tool",
    type: "function",
    invoke,
    execute,
  };
  Object.defineProperty(tool, HIDDEN, {
    value: "keep-me",
    enumerable: false,
    configurable: true,
  });
  return tool;
}

function runContext(sessionId: string) {
  return { context: { sessionId } };
}

function asToolResult(value: unknown): ArcjetDenialResult {
  return asDenial<ArcjetDenialResult>(value);
}

test("throws when the tool has no invoke", () => {
  const { client } = stubClient(decisionAllow());
  const tool = { name: "no-invoke", description: "x" };
  assert.throws(
    () => guardTool(client, tool as OpenAIAgentsTool, { action: "test.executed" }),
    /invoke/,
  );
});

test("returned object is not the input tool and preserves non-enumerable markers", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, { action: "test.executed" });

  assert.notStrictEqual(wrapped, tool);
  assert.equal((wrapped as any)[HIDDEN], "keep-me");
});

test("input tool.invoke is unchanged after wrapping", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createFunctionTool();
  const originalInvoke = tool.invoke;
  guardTool(client, tool, { action: "test.executed" });
  assert.strictEqual(tool.invoke, originalInvoke);
});

test("ALLOW → invoke called once with runContext, input, and details by reference", async () => {
  const { client } = stubClient(decisionAllow());
  const ctx = runContext("sess-1");
  const details = { toolCall: { callId: "call-opaque" } };
  const input = JSON.stringify({ orderNumber: "A-1" });
  let calls = 0;
  let capturedCtx: unknown;
  let capturedInput: unknown;
  let capturedDetails: unknown;

  const tool = createFunctionTool({
    invoke: async (runCtx, inp, det) => {
      calls += 1;
      capturedCtx = runCtx;
      capturedInput = inp;
      capturedDetails = det;
      return { status: "shipped" };
    },
  });

  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = await wrapped.invoke(ctx, input, details);

  assert.equal(calls, 1);
  assert.strictEqual(capturedCtx, ctx);
  assert.strictEqual(capturedInput, input);
  assert.strictEqual(capturedDetails, details);
  assert.deepEqual(result, { status: "shipped" });
});

test("ALLOW → rules see parsed args, not the opaque call id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let captured: unknown;
  const tool = createFunctionTool({
    execute: async (args) => {
      captured = args;
      return { ok: true };
    },
  });
  const wrapped = guardTool<{ note: string }>(client, tool, {
    action: "note.read",
    rules: (input) => {
      assert.equal(input.note, "hello");
      return [fakeRule];
    },
  });
  await wrapped.invoke(runContext("t"), JSON.stringify({ note: "hello" }), {
    toolCall: { callId: "call-opaque" },
  });
  assert.deepEqual(captured, { note: "hello" });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("ALLOW → capture outcome is success and correlation comes from context.sessionId", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.invoke(runContext("sess-99"), "{}");

  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-99");
  assert.equal(captureCalls.length, 1);
  assert.equal(
    recorded(captureCalls[0])["metadata"] &&
      (recorded(captureCalls[0])["metadata"] as Record<string, unknown>)["outcome"],
    "success",
  );
});

test("DENY → execute is not called and a structured denial is returned (no throw)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createFunctionTool({
    execute: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.invoke(runContext("t"), "{}"));

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
  assert.equal(result.retryable, false);
});

test("RATE_LIMIT DENY → structured result is retryable", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 12;
  const { client } = stubClient(decisionDenyRateLimit(resetAt));
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.invoke(runContext("t"), "{}"));

  assert.equal(result.retryable, true);
  assert.ok(typeof result.retryAfterSeconds === "number");
});

test("fail-closed unavailable → ERROR denial, execute not called", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createFunctionTool({
    execute: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.invoke(runContext("t"), "{}"));

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "ERROR");
});

test("onGuardError allow → execute still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createFunctionTool({
    execute: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onGuardError: "allow",
  });
  const result = await wrapped.invoke(runContext("t"), "{}");
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});

test("does not mint a correlation id when the run provided none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.invoke({ context: {} }, "{}");
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("DENY + throwing onDeny still denies and does not throw", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createFunctionTool({
    execute: async () => {
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

  const result = asToolResult(await wrapped.invoke(runContext("t"), "{}"));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
});

test("onDeny reshape is returned and execute is not called", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let received: DecisionDeny | undefined;
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: (decision) => {
      received = decision;
      return { blocked: decision.reason };
    },
  });

  const result = await wrapped.invoke(runContext("t"), "{}");
  assert.equal(received?.reason, "PROMPT_INJECTION");
  assert.deepEqual(result, { blocked: "PROMPT_INJECTION" });
});

test("onDeny is not called on unavailable", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let onDenyCalls = 0;
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: () => {
      onDenyCalls += 1;
      return { blocked: true };
    },
  });

  const result = asToolResult(await wrapped.invoke(runContext("t"), "{}"));
  assert.equal(onDenyCalls, 0);
  assert.equal(result.reason, "ERROR");
});

test("guard throw with default fail-closed does not execute", async () => {
  const { client } = stubClient(new Error("transport down"));
  let calls = 0;
  const tool = createFunctionTool({
    execute: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.invoke(runContext("t"), "{}"));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("omitted rules still submit an empty guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.invoke(runContext("t"), "{}");
  assert.deepEqual(recorded(guardCalls[0])["rules"], []);
});

test("metadata callback is merged over derived context", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createFunctionTool();
  const wrapped = guardTool<{ id: string }>(client, tool, {
    action: "thing.read",
    metadata: (input) => ({ "app.item": input.id }),
  });
  await wrapped.invoke(runContext("sess-meta"), JSON.stringify({ id: "item-9" }));
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.item"], "item-9");
  assert.equal(metadata["openai-agents.tool"], "test-tool");
  assert.equal(metadata["openai-agents.session"], "sess-meta");
});

test("static metadata is merged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createFunctionTool({ name: "" });
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    metadata: { "app.static": "yes" },
  });
  await wrapped.invoke(runContext("t"), "{}");
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.static"], "yes");
  assert.equal("openai-agents.tool" in metadata, false);
});

test("rejects a second wrap", async () => {
  const { client } = stubClient(decisionAllow());
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  assert.equal(arcjetProtectedTool in wrapped, true);
  assert.throws(() => guardTool(client, wrapped, { action: "order.looked-up" }), /already guarded/);

  const branded = createFunctionTool();
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  assert.throws(() => guardTool(client, branded, { action: "order.looked-up" }), /already guarded/);
});

test("execute throw is rethrown after capture", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const tool = createFunctionTool({
    execute: async (): Promise<{ ok: boolean }> => {
      throw new Error("tool failed");
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await assert.rejects(async () => wrapped.invoke(runContext("t"), "{}"), /tool failed/);
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "error");
});

test("non-object runContext does not mint an id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.invoke("not-context", "{}");
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("rules factory throw fail-closes and does not execute", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createFunctionTool({
    execute: async () => {
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
  const result = asToolResult(await wrapped.invoke(runContext("t"), "{}"));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "ERROR");
});

test("metadata factory throw fail-closes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createFunctionTool({
    execute: async () => {
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
  const result = asToolResult(await wrapped.invoke(runContext("t"), "{}"));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("sessionId factory throw fail-closes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createFunctionTool({
    execute: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    sessionId: () => {
      throw new Error("sessionId exploded");
    },
  });
  const result = asToolResult(await wrapped.invoke(runContext("t"), "{}"));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("rules factory throw with onGuardError allow still executes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createFunctionTool({
    execute: async () => {
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
  const result = await wrapped.invoke(runContext("t"), "{}");
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});

test("malformed JSON args are not treated as free text and do not scan a call id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let scanned: unknown;
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    rules: (input) => {
      scanned = input;
      return [];
    },
  });
  await wrapped.invoke(runContext("t"), "not-json", {
    toolCall: { callId: "call-9" },
  });
  assert.deepEqual(scanned, {});
  assert.deepEqual(recorded(guardCalls[0])["rules"], []);
});

test("policy.sessionId is used when runContext.context has none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createFunctionTool();
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    sessionId: "policy-sess",
  });
  await wrapped.invoke({ context: {} }, "{}");
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("wraps invoke when the descriptor is non-writable", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createFunctionTool({
    execute: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  Object.defineProperty(tool, "invoke", {
    value: tool.invoke,
    writable: false,
    enumerable: true,
    configurable: true,
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.invoke(runContext("t"), "{}"));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
});

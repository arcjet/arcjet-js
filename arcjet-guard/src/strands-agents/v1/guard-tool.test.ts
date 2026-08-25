// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/no-unsafe-argument, eslint/explicit-function-return-type, eslint/require-await, eslint/no-unnecessary-type-assertion, typescript/unbound-method -- test infrastructure and mocks
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
import type { StrandsTool } from "./guard-tool.ts";
import { guardTool } from "./guard-tool.ts";

const HIDDEN = Symbol.for("strands.hidden");

type FakeTool = {
  name: string;
  description: string;
  toolSpec: { name: string };
  _callback: (input: unknown, context?: unknown) => unknown;
  _functionTool?: { _callback: (input: unknown, context?: unknown) => unknown };
  stream?: (context: unknown) => Promise<unknown>;
  invoke?: (input: unknown, context?: unknown) => Promise<unknown>;
};

function createTool(overrides?: {
  name?: string;
  callback?: (input: unknown, context?: unknown) => unknown;
  zod?: boolean;
}): FakeTool {
  const callback = overrides?.callback ?? (async () => ({ ok: true }));
  const name = overrides?.name ?? "test-tool";
  const tool: FakeTool = {
    name,
    description: "test",
    toolSpec: { name },
    _callback: callback,
    invoke: async (input, context) => callback(input, context),
    stream: async (context) => {
      const ctx = context as { toolUse?: { input?: unknown } };
      return callback(ctx.toolUse?.input, context);
    },
  };
  if (overrides?.zod === true) {
    const innerCallback = (input: unknown, context?: unknown) => callback(input, context);
    tool._functionTool = { _callback: innerCallback };
    tool.stream = async (context) => {
      const ctx = context as { toolUse?: { input?: unknown } };
      return tool._functionTool!._callback(ctx.toolUse?.input, context);
    };
  }
  Object.defineProperty(tool, HIDDEN, {
    value: "keep-me",
    enumerable: false,
    configurable: true,
  });
  return tool;
}

function toolContext(sessionId?: string) {
  return {
    invocationState: sessionId === undefined ? {} : { sessionId },
    toolUse: { name: "test-tool", toolUseId: "tu-1", input: {} },
  };
}

function asToolResult(value: unknown): ArcjetDenialResult {
  return asDenial<ArcjetDenialResult>(value);
}

test("throws when the tool has no callback", () => {
  const { client } = stubClient(decisionAllow());
  const tool = { name: "no-callback" };
  assert.throws(
    () => guardTool(client, tool as StrandsTool, { action: "test.executed" }),
    /callback|tool\(\)/,
  );
});

test("returned object is not the input tool and preserves non-enumerable markers", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createTool();
  const wrapped = guardTool(client, tool, { action: "test.executed" });

  assert.notStrictEqual(wrapped, tool);
  assert.equal((wrapped as FakeTool & { [HIDDEN]: unknown })[HIDDEN], "keep-me");
  assert.equal(wrapped.name, "test-tool");
});

test("input tool callback is unchanged after wrapping", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createTool({
    callback: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const original = tool._callback;
  guardTool(client, tool, { action: "test.executed" });
  assert.strictEqual(tool._callback, original);
  await tool._callback({}, toolContext("t"));
  assert.equal(calls, 1);
});

test("ALLOW → callback called once with input and context by reference", async () => {
  const { client } = stubClient(decisionAllow());
  const ctx = toolContext("sess-1");
  const input = { orderNumber: "A-1" };
  let calls = 0;
  let capturedInput: unknown;
  let capturedContext: unknown;

  const tool = createTool({
    callback: async (inp, context) => {
      calls += 1;
      capturedInput = inp;
      capturedContext = context;
      return { status: "shipped" };
    },
  });

  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  const result = await wrapped._callback(input, ctx);

  assert.equal(calls, 1);
  assert.strictEqual(capturedInput, input);
  assert.strictEqual(capturedContext, ctx);
  assert.deepEqual(result, { status: "shipped" });
});

test("ALLOW → rules see parsed args, not an opaque toolUseId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let captured: unknown;
  const tool = createTool({
    callback: async (args) => {
      captured = args;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "note.read",
    rules: (input: { note: string }) => {
      assert.equal(input.note, "hello");
      return [fakeRule];
    },
  }) as FakeTool;
  await wrapped._callback({ note: "hello" }, toolContext("t"));
  assert.deepEqual(captured, { note: "hello" });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("ALLOW → capture outcome is success and correlation comes from invocationState.sessionId", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const tool = createTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  await wrapped._callback({}, toolContext("sess-99"));

  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-99");
  assert.equal(captureCalls.length, 1);
  const metadata = recorded(captureCalls[0])["metadata"] as Record<string, unknown>;
  assert.equal(metadata["outcome"], "success");
});

test("DENY → callback is not called and a structured denial is returned (no throw)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createTool({
    callback: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  const result = asToolResult(await wrapped._callback({}, toolContext("t")));

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
  assert.equal(result.retryable, false);
});

test("RATE_LIMIT DENY → structured result is retryable", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 12;
  const { client } = stubClient(decisionDenyRateLimit(resetAt));
  const tool = createTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  const result = asToolResult(await wrapped._callback({}, toolContext("t")));

  assert.equal(result.retryable, true);
  assert.ok(typeof result.retryAfterSeconds === "number");
});

test("fail-closed unavailable → ERROR denial, callback not called", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createTool({
    callback: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  const result = asToolResult(await wrapped._callback({}, toolContext("t")));

  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("onGuardError allow → callback still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createTool({
    callback: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onGuardError: "allow",
  }) as FakeTool;
  const result = await wrapped._callback({}, toolContext("t"));
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});

test("does not mint a correlation id when the run provided none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  await wrapped._callback({}, { invocationState: {} });
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("DENY + throwing onDeny still denies and does not throw", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createTool({
    callback: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: () => {
      throw new Error("onDeny exploded");
    },
  }) as FakeTool;

  const result = asToolResult(await wrapped._callback({}, toolContext("t")));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
});

test("onDeny reshape is returned and callback is not called", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let received: DecisionDeny | undefined;
  const tool = createTool();
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: (decision) => {
      received = decision;
      return { blocked: decision.reason };
    },
  }) as FakeTool;

  const result = await wrapped._callback({}, toolContext("t"));
  assert.equal(received?.reason, "PROMPT_INJECTION");
  assert.deepEqual(result, { blocked: "PROMPT_INJECTION" });
});

test("onDeny is not called on unavailable", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let onDenyCalls = 0;
  const tool = createTool();
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: () => {
      onDenyCalls += 1;
      return { blocked: true };
    },
  }) as FakeTool;

  const result = asToolResult(await wrapped._callback({}, toolContext("t")));
  assert.equal(onDenyCalls, 0);
  assert.equal(result.reason, "ERROR");
});

test("guard throw with default fail-closed does not execute", async () => {
  const { client } = stubClient(new Error("transport down"));
  let calls = 0;
  const tool = createTool({
    callback: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  const result = asToolResult(await wrapped._callback({}, toolContext("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("omitted rules still submit an empty guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  await wrapped._callback({}, toolContext("t"));
  assert.deepEqual(recorded(guardCalls[0])["rules"], []);
});

test("metadata callback is merged over derived context", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createTool();
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    metadata: (input: { id: string }) => ({ "app.item": input.id }),
  }) as FakeTool;
  await wrapped._callback({ id: "item-9" }, toolContext("sess-meta"));
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.item"], "item-9");
  assert.equal(metadata["strands.tool"], "test-tool");
  assert.equal(metadata["strands.session"], "sess-meta");
});

test("static metadata is merged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createTool({ name: "" });
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    metadata: { "app.static": "yes" },
  }) as FakeTool;
  await wrapped._callback({}, toolContext("t"));
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.static"], "yes");
  assert.equal("strands.tool" in metadata, false);
});

test("rejects a second wrap", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  assert.equal(arcjetProtectedTool in wrapped, true);
  assert.throws(() => guardTool(client, wrapped, { action: "order.looked-up" }), /already guarded/);

  const branded = createTool();
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  assert.throws(() => guardTool(client, branded, { action: "order.looked-up" }), /already guarded/);
});

test("callback throw is rethrown after capture", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const tool = createTool({
    callback: async (): Promise<{ ok: boolean }> => {
      throw new Error("tool failed");
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  await assert.rejects(async () => wrapped._callback({}, toolContext("t")), /tool failed/);
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "error");
});

test("non-object context does not mint an id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  await wrapped._callback({}, "not-context");
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("rules factory throw fail-closes and does not execute", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createTool({
    callback: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    rules: () => {
      throw new Error("rules exploded");
    },
  }) as FakeTool;
  const result = asToolResult(await wrapped._callback({}, toolContext("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("metadata factory throw fail-closes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createTool({
    callback: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    metadata: () => {
      throw new Error("metadata exploded");
    },
  }) as FakeTool;
  const result = asToolResult(await wrapped._callback({}, toolContext("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("sessionId factory throw fail-closes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createTool({
    callback: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    sessionId: () => {
      throw new Error("session exploded");
    },
  }) as FakeTool;
  const result = asToolResult(await wrapped._callback({}, toolContext("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("policy factory throw with onGuardError allow still runs", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createTool({
    callback: async () => {
      calls += 1;
      return { ran: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onGuardError: "allow",
    rules: () => {
      throw new Error("rules exploded");
    },
  }) as FakeTool;
  const result = await wrapped._callback({}, toolContext("t"));
  assert.equal(calls, 1);
  assert.deepEqual(result, { ran: true });
});

test("policy.sessionId is used when invocationState has none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createTool();
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    sessionId: "policy-sess",
  }) as FakeTool;
  await wrapped._callback({}, { invocationState: {} });
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("ZodTool inner _functionTool callback is gated so stream() cannot bypass", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createTool({
    zod: true,
    callback: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  assert.ok(wrapped._functionTool);
  assert.notStrictEqual(wrapped._functionTool, tool._functionTool);

  const result = asToolResult(
    await wrapped._functionTool!._callback({}, toolContext("t")),
  );
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);

  // The original inner callback is untouched.
  await tool._functionTool!._callback({}, toolContext("t"));
  assert.equal(calls, 1);
});

test("never reads traceId from invocationState", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" }) as FakeTool;
  await wrapped._callback({}, { invocationState: { traceId: "trace-minted" } });
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

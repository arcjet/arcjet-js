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
import type { GenkitTool } from "./guard-tool.ts";
import { guardTool } from "./guard-tool.ts";

const HIDDEN = Symbol.for("genkit.hidden");

type FakeTool = ((input?: unknown, options?: unknown) => Promise<unknown>) & {
  __action?: { name?: string; metadata?: Record<string, unknown>; actionType?: string };
  run?: (input?: unknown, options?: unknown) => Promise<unknown>;
  respond?: (interrupt: unknown, outputData: unknown, options?: unknown) => unknown;
  restart?: (interrupt: unknown, resumedMetadata?: unknown, options?: unknown) => unknown;
};

function createToolAction(overrides?: {
  name?: string;
  actionType?: string;
  call?: (input?: unknown, options?: unknown) => Promise<unknown>;
  handler?: (args: unknown, options?: unknown) => Promise<unknown>;
}): FakeTool {
  const handler = overrides?.handler ?? (async () => ({ ok: true }));
  const run = async (input?: unknown, options?: unknown) => {
    const result = await handler(input, options);
    return { result, telemetry: { traceId: "t", spanId: "s" } };
  };
  const call =
    overrides?.call ??
    (async (input?: unknown, options?: unknown) => {
      const out = await run(input, options);
      return out.result;
    });
  const actionType = overrides?.actionType ?? "tool";
  const tool = Object.assign(call, {
    __action: {
      name: overrides?.name ?? "test-tool",
      metadata: { type: actionType },
      actionType,
    },
    run,
    respond: () => ({ toolResponse: { name: "test-tool", output: {} } }),
    restart: () => ({ toolRequest: { name: "test-tool" } }),
  });
  Object.defineProperty(tool, HIDDEN, {
    value: "keep-me",
    enumerable: false,
    configurable: true,
  });
  return tool;
}

function toolOptions(sessionId: string) {
  return { context: { sessionId } };
}

function asToolResult(value: unknown): ArcjetDenialResult {
  return asDenial<ArcjetDenialResult>(value);
}

test("throws when the tool is not a function", () => {
  const { client } = stubClient(decisionAllow());
  const tool = { __action: { name: "no-call" } };
  assert.throws(
    () => guardTool(client, tool as GenkitTool, { action: "test.executed" }),
    /ToolAction|defineTool|callable/,
  );
});

test("returned object is not the input tool and preserves non-enumerable markers", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, { action: "test.executed" });

  assert.notStrictEqual(wrapped, tool);
  assert.equal((wrapped as any)[HIDDEN], "keep-me");
  assert.equal(wrapped.__action?.name, "test-tool");
  assert.equal(typeof wrapped.respond, "function");
  assert.equal(typeof wrapped.restart, "function");
});

test("input tool callable is unchanged after wrapping", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createToolAction();
  const original = tool;
  guardTool(client, tool, { action: "test.executed" });
  assert.strictEqual(tool, original);
});

test("ALLOW → handler called once with input and options by reference", async () => {
  const { client } = stubClient(decisionAllow());
  const opts = toolOptions("sess-1");
  const input = { orderNumber: "A-1" };
  let calls = 0;
  let capturedInput: unknown;
  let capturedOptions: unknown;

  const tool = createToolAction({
    handler: async (inp, opt) => {
      calls += 1;
      capturedInput = inp;
      capturedOptions = opt;
      return { status: "shipped" };
    },
  });

  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = await wrapped(input, opts);

  assert.equal(calls, 1);
  assert.strictEqual(capturedInput, input);
  assert.strictEqual(capturedOptions, opts);
  assert.deepEqual(result, { status: "shipped" });
});

test("ALLOW → rules see parsed args, not an opaque ref", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let captured: unknown;
  const tool = createToolAction({
    handler: async (args) => {
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
  });
  await wrapped({ note: "hello" }, toolOptions("t"));
  assert.deepEqual(captured, { note: "hello" });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("ALLOW → capture outcome is success and correlation comes from context.sessionId", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped({}, toolOptions("sess-99"));

  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-99");
  assert.equal(captureCalls.length, 1);
  assert.equal(
    recorded(captureCalls[0])["metadata"] &&
      (recorded(captureCalls[0])["metadata"] as Record<string, unknown>)["outcome"],
    "success",
  );
});

test("DENY → handler is not called and a structured denial is returned (no throw)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped({}, toolOptions("t")));

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
  assert.equal(result.retryable, false);
});

test("RATE_LIMIT DENY → structured result is retryable", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 12;
  const { client } = stubClient(decisionDenyRateLimit(resetAt));
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped({}, toolOptions("t")));

  assert.equal(result.retryable, true);
  assert.ok(typeof result.retryAfterSeconds === "number");
});

test("fail-closed unavailable → ERROR denial, handler not called", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped({}, toolOptions("t")));

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "ERROR");
});

test("onGuardError allow → handler still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onGuardError: "allow",
  });
  const result = await wrapped({}, toolOptions("t"));
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});

test("does not mint a correlation id when the run provided none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped({}, { context: {} });
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("DENY + throwing onDeny still denies and does not throw", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
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

  const result = asToolResult(await wrapped({}, toolOptions("t")));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
});

test("onDeny reshape is returned and handler is not called", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let received: DecisionDeny | undefined;
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: (decision) => {
      received = decision;
      return { blocked: decision.reason };
    },
  });

  const result = await wrapped({}, toolOptions("t"));
  assert.equal(received?.reason, "PROMPT_INJECTION");
  assert.deepEqual(result, { blocked: "PROMPT_INJECTION" });
});

test("onDeny is not called on unavailable", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let onDenyCalls = 0;
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: () => {
      onDenyCalls += 1;
      return { blocked: true };
    },
  });

  const result = asToolResult(await wrapped({}, toolOptions("t")));
  assert.equal(onDenyCalls, 0);
  assert.equal(result.reason, "ERROR");
});

test("guard throw with default fail-closed does not execute", async () => {
  const { client } = stubClient(new Error("transport down"));
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped({}, toolOptions("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("omitted rules still submit an empty guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped({}, toolOptions("t"));
  assert.deepEqual(recorded(guardCalls[0])["rules"], []);
});

test("metadata callback is merged over derived context", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    metadata: (input: { id: string }) => ({ "app.item": input.id }),
  });
  await wrapped({ id: "item-9" }, toolOptions("sess-meta"));
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.item"], "item-9");
  assert.equal(metadata["genkit.tool"], "test-tool");
  assert.equal(metadata["genkit.session"], "sess-meta");
});

test("static metadata is merged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createToolAction({ name: "" });
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    metadata: { "app.static": "yes" },
  });
  await wrapped({}, toolOptions("t"));
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.static"], "yes");
  assert.equal("genkit.tool" in metadata, false);
});

test("overwrites the original registry entry so generate() cannot bypass the wrap", async () => {
  const { client } = stubClient(decisionAllow());
  const tool = createToolAction({ name: "lookup_order" });
  const key = "/tool/lookup_order";
  const store: Record<string, unknown> = { [key]: tool };
  Object.defineProperty(tool, "__registry", {
    value: { actionsById: store },
    configurable: true,
  });
  const actionMeta = tool.__action as { key?: string; actionType?: string };
  actionMeta.key = key;
  actionMeta.actionType = "tool";

  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  assert.strictEqual(store[key], wrapped);
  assert.notStrictEqual(store[key], tool);
});

test("guards the tool.v2 twin defineTool registers alongside a basic tool", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let twinCalls = 0;
  const tool = createToolAction({ name: "lookup_order" });
  // `defineTool` registers a second action over the same handler.
  const twin = createToolAction({
    name: "lookup_order",
    actionType: "tool.v2",
    handler: async () => {
      twinCalls += 1;
      return { output: "must not run" };
    },
  });
  const store: Record<string, unknown> = {
    "/tool/lookup_order": tool,
    "/tool.v2/lookup_order": twin,
  };
  Object.defineProperty(tool, "__registry", {
    value: { actionsById: store },
    configurable: true,
  });
  (tool.__action as { key?: string }).key = "/tool/lookup_order";

  guardTool(client, tool, { action: "order.looked-up" });

  const registered = store["/tool.v2/lookup_order"] as FakeTool;
  assert.notStrictEqual(registered, twin);
  assert.equal(arcjetProtectedTool in registered, true);

  const result = await registered({ note: "hello" }, toolOptions("t"));
  assert.equal(twinCalls, 0);
  // A tool.v2 action resolves to `{ output }`; `executeTool` reads that
  // field for `toolResponse.output`.
  assert.equal(asToolResult(recorded(result)["output"]).arcjetDenied, true);
});

test("DENY from a tool.v2 action is returned in the multipart response shape", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const tool = createToolAction({ actionType: "tool.v2" });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });

  const called = recorded(await wrapped({}, toolOptions("t")));
  assert.equal(asToolResult(called["output"]).reason, "PROMPT_INJECTION");

  const ran = recorded(await wrapped.run?.({}, toolOptions("t")));
  assert.equal(asToolResult(recorded(ran["result"])["output"]).reason, "PROMPT_INJECTION");
});

test("rejects a second wrap", async () => {
  const { client } = stubClient(decisionAllow());
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  assert.equal(arcjetProtectedTool in wrapped, true);
  assert.throws(() => guardTool(client, wrapped, { action: "order.looked-up" }), /already guarded/);

  const branded = createToolAction();
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  assert.throws(() => guardTool(client, branded, { action: "order.looked-up" }), /already guarded/);
});

test("handler throw is rethrown after capture", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const tool = createToolAction({
    handler: async (): Promise<{ ok: boolean }> => {
      throw new Error("tool failed");
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await assert.rejects(async () => wrapped({}, toolOptions("t")), /tool failed/);
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "error");
});

test("non-object options does not mint an id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped({}, "not-context");
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("rules factory throw fail-closes and does not execute", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
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
  const result = asToolResult(await wrapped({}, toolOptions("t")));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "ERROR");
});

test("metadata factory throw fail-closes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
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
  const result = asToolResult(await wrapped({}, toolOptions("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("sessionId factory throw fail-closes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
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
  const result = asToolResult(await wrapped({}, toolOptions("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("rules factory throw with onGuardError allow still executes", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
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
  const result = await wrapped({}, toolOptions("t"));
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});

test("undefined input is scanned as empty rather than coerced", async () => {
  const { client } = stubClient(decisionAllow());
  let scanned: unknown;
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, {
    action: "note.read",
    rules: (input) => {
      scanned = input;
      return [];
    },
  });
  await wrapped(undefined, toolOptions("t"));
  assert.deepEqual(scanned, {});
});

test("a JSON string input is parsed before it is scanned", async () => {
  const { client } = stubClient(decisionAllow());
  const scanned: unknown[] = [];
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, {
    action: "note.read",
    rules: (input) => {
      scanned.push(input);
      return [];
    },
  });

  await wrapped('{"note":"hello"}', toolOptions("t"));
  assert.deepEqual(scanned[0], { note: "hello" });

  // Unparseable text is not a set of args; scanning the raw string would
  // submit the wrong value under the wrong field names.
  await wrapped("not json", toolOptions("t"));
  assert.deepEqual(scanned[1], {});
});

test("a registry without a usable action store is left alone", () => {
  const { client } = stubClient(decisionAllow());
  const noStore = createToolAction({ name: "no_store" });
  Object.defineProperty(noStore, "__registry", { value: {}, configurable: true });
  assert.equal(typeof guardTool(client, noStore, { action: "note.read" }), "function");

  const badStore = createToolAction({ name: "bad_store" });
  Object.defineProperty(badStore, "__registry", {
    value: { actionsById: "not-an-object" },
    configurable: true,
  });
  assert.equal(typeof guardTool(client, badStore, { action: "note.read" }), "function");
});

test("a non-object, non-string input warns instead of silently scanning nothing", async () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "warn";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const { client } = stubClient(decisionAllow());
    const tool = createToolAction();
    const wrapped = guardTool(client, tool, { action: "note.read" });

    await wrapped({ note: "ok" }, toolOptions("t"));
    assert.equal(warnings.length, 0);

    await wrapped(12, toolOptions("t"));
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0]?.[0]), /no arguments were scanned/);
    assert.equal(warnings[0]?.[2], "number");

    await wrapped(null, toolOptions("t"));
    assert.equal(warnings.length, 2);
    assert.equal(warnings[1]?.[2], "null");
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) {
      delete process.env["ARCJET_LOG_LEVEL"];
    } else {
      process.env["ARCJET_LOG_LEVEL"] = previous;
    }
  }
});

test("policy.sessionId is used when options.context has none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    sessionId: "policy-sess",
  });
  await wrapped({}, { context: {} });
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("interrupt and resumed on the options envelope are not used as correlation", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createToolAction();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped(
    {},
    {
      context: {},
      interrupt: () => "nope",
      resumed: { status: "APPROVED" },
    },
  );
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test(".run is gated the same way as the callable", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const out = await wrapped.run?.({}, toolOptions("t"));
  assert.equal(calls, 0);
  assert.ok(out && typeof out === "object" && "result" in out);
  const denial = asToolResult((out as { result: unknown }).result);
  assert.equal(denial.arcjetDenied, true);
});

test(".run ALLOW returns the action's own { result, telemetry } envelope", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const tool = createToolAction({
    handler: async () => {
      calls += 1;
      return { ok: true };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const out = await wrapped.run?.({}, toolOptions("t"));

  assert.equal(calls, 1);
  // The envelope is the original action's, not a re-wrap of it: a second
  // `{ result }` layer would break every caller of `.run`.
  assert.deepEqual(out, { result: { ok: true }, telemetry: { traceId: "t", spanId: "s" } });
});

test("onDeny throw warns when ARCJET_LOG_LEVEL asks for warnings", async () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "warn";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const { client } = stubClient(decisionDenyPromptInjection());
    const tool = createToolAction();
    const wrapped = guardTool(client, tool, {
      action: "order.looked-up",
      onDeny: () => {
        throw new Error("onDeny exploded");
      },
    });
    const result = asToolResult(await wrapped({}, toolOptions("t")));
    assert.equal(result.arcjetDenied, true);
    assert.ok(warnings.length > 0);
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) {
      delete process.env["ARCJET_LOG_LEVEL"];
    } else {
      process.env["ARCJET_LOG_LEVEL"] = previous;
    }
  }
});

test("policy factory throw warns when ARCJET_LOG_LEVEL asks for warnings", async () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "warn";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const { client } = stubClient(decisionAllow());
    const tool = createToolAction();
    const wrapped = guardTool(client, tool, {
      action: "order.looked-up",
      rules: () => {
        throw new Error("rules exploded");
      },
    });
    const result = asToolResult(await wrapped({}, toolOptions("t")));
    assert.equal(result.reason, "ERROR");
    assert.ok(warnings.length > 0);
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) {
      delete process.env["ARCJET_LOG_LEVEL"];
    } else {
      process.env["ARCJET_LOG_LEVEL"] = previous;
    }
  }
});

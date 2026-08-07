// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/no-unsafe-argument, eslint/no-unsafe-call, eslint/strict-boolean-expressions, eslint/explicit-function-return-type, eslint/no-unnecessary-type-assertion, eslint/require-await -- test infrastructure and mocks don't need await
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ToolDefinition } from "eve/tools";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import { recorded } from "../../../test/_shared/source-scan.ts";
import { guardTool } from "./guard-tool.ts";
import { ArcjetDeniedError, ArcjetGuardUnavailableError } from "../../agents/guard-action.ts";

/**
 * Build a tool definition as a plain object with both Eve symbols stamped by hand.
 * This documents what defineTool does and allows testing without importing eve.
 */
function createToolWithSymbols<TInput, TOutput>(
  overrides?: Partial<ToolDefinition<TInput, TOutput>>,
): ToolDefinition<TInput, TOutput> {
  const tool: ToolDefinition<TInput, TOutput> = {
    description: "test-tool",
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    // oxlint-disable-next-line eslint/require-await -- test helper, no actual async needed
    execute: async () => ({ success: true } as TOutput),
    [Symbol.for("eve:tool-brand")]: true,
    ...overrides,
  } as any;

  // Stamp the non-enumerable definition key
  Object.defineProperty(tool, Symbol.for("eve.definition-source-key"), {
    value: `tool:${tool.description}`,
    writable: false,
    enumerable: false,
    configurable: true,
  });

  return tool;
}

test("AC5.1: returned object has eve:tool-brand symbol with value true", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createToolWithSymbols();
  const wrapped = guardTool(client, tool, { action: "test.executed" });

  const brandSymbol = Symbol.for("eve:tool-brand");
  // oxlint-disable-next-line typescript/no-unsafe-member-access -- symbol access on ToolDefinition
  assert.strictEqual((wrapped as any)[brandSymbol], true);
});

test("AC5.1: returned object preserves eve.definition-source-key (non-enumerable) with same value", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createToolWithSymbols();
  const wrapped = guardTool(client, tool, { action: "test.executed" });

  const sourceKeySymbol = Symbol.for("eve.definition-source-key");
  const originalValue = (tool as any)[sourceKeySymbol];
  const wrappedValue = (wrapped as any)[sourceKeySymbol];

  assert.strictEqual(wrappedValue, originalValue);
  assert.strictEqual(wrappedValue, `tool:test-tool`);

  // Verify non-enumerable descriptor
  const descriptor = Object.getOwnPropertyDescriptor(wrapped, sourceKeySymbol);
  assert.ok(descriptor);
  assert.equal(descriptor.enumerable, false);
});

test("AC5.1: negative control - spread does not copy definition-source-key", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createToolWithSymbols();
  const wrapped = guardTool(client, tool, { action: "test.executed" });

  const sourceKeySymbol = Symbol.for("eve.definition-source-key");
  const spread = { ...wrapped };

  assert.ok(!(sourceKeySymbol in spread), "spread should not have definition-source-key");
});

test("AC5.2: returned object is not the input tool", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createToolWithSymbols();
  const wrapped = guardTool(client, tool, { action: "test.executed" });

  assert.notStrictEqual(wrapped, tool);
});

test("AC5.2: input tool.execute is unchanged by reference after wrapping", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createToolWithSymbols();
  // oxlint-disable-next-line typescript/unbound-method -- storing execute function reference for comparison
  const originalExecute = tool.execute;

  guardTool(client, tool, { action: "test.executed" });

  // oxlint-disable-next-line typescript/unbound-method -- comparing stored reference
  assert.strictEqual(tool.execute, originalExecute);
});

test("AC5.2: input tool's own keys are unchanged", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createToolWithSymbols<{ id: string }, { result: string }>({
    description: "my-tool",
    inputSchema: { type: "object", properties: { id: { type: "string" } } },
    outputSchema: { type: "object", properties: { result: { type: "string" } } },
  });

  const originalKeys = Object.keys(tool);

  guardTool(client, tool, { action: "test.executed" });

  const afterKeys = Object.keys(tool);
  assert.deepEqual(afterKeys, originalKeys);
});

test("AC5.3: ALLOW → execute called exactly once with input and ctx by reference", async () => {
  const { client } = stubClient(decisionAllow());
  const input = { id: "123" };
  let executeCallCount = 0;
  let capturedInput: any;
  let capturedCtx: any;

  const tool = createToolWithSymbols<{ id: string }, { result: string }>({
    execute: async function (inp, ctx) {
      executeCallCount++;
      capturedInput = inp;
      capturedCtx = ctx;
      // oxlint-disable-next-line typescript/no-unsafe-return -- test mock returns any
      return { result: "success" } as any;
    },
  });

  const wrapped = guardTool(client, tool, { action: "test.executed" });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  const result = await wrapped.execute!(input, ctx);

  assert.equal(executeCallCount, 1);
  assert.strictEqual(capturedInput, input);
  assert.strictEqual(capturedCtx, ctx);
  assert.deepEqual(result, { result: "success" });
});

test("AC5.3: ALLOW → result returned unchanged with non-primitive identity preserved", async () => {
  const { client } = stubClient(decisionAllow());
  const expectedResult = { data: "test", id: 42 };
  const input = { id: "test-id" };

  const tool = createToolWithSymbols<{ id: string }, any>({
    execute: async () => expectedResult,
  });

  const wrapped = guardTool(client, tool, { action: "test.executed" });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  const result = await wrapped.execute!(input, ctx);

  assert.strictEqual(result, expectedResult);
});

test("AC5.3: ALLOW → capture outcome is 'success'", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());

  const tool = createToolWithSymbols<any, any>({
    execute: async () => ({ result: "ok" }),
  });

  const wrapped = guardTool(client, tool, { action: "test.executed" });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  await wrapped.execute!({}, ctx);

  assert.equal(captureCalls.length, 1);
  const capture = recorded(captureCalls[0]);
  const metadata = recorded(capture.metadata);
  assert.equal(metadata.outcome, "success");
});

test("AC5.3: throwing execute → capture outcome is 'error' and original error rethrown by reference", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const thrownError = new Error("execute failed");

  const tool = createToolWithSymbols<any, any>({
    execute: async () => {
      throw thrownError;
    },
  });

  const wrapped = guardTool(client, tool, { action: "test.executed" });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  let caughtError: any;
  try {
    await wrapped.execute!({}, ctx);
  } catch (e) {
    caughtError = e;
  }

  assert.strictEqual(caughtError, thrownError);
  assert.equal(captureCalls.length, 1);
  const capture = recorded(captureCalls[0]);
  const metadata = recorded(capture.metadata);
  assert.equal(metadata.outcome, "error");
});

test("AC5.4: DENY → execute never called and promise rejects with ArcjetDeniedError", async () => {
  const decision = decisionDenyPromptInjection();
  const { client } = stubClient(decision);
  let executeCallCount = 0;

  const tool = createToolWithSymbols<any, any>({
    execute: async () => {
      executeCallCount++;
      return { result: "should not reach" };
    },
  });

  const wrapped = guardTool(client, tool, { action: "test.executed" });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  let caughtError: any;
  try {
    await wrapped.execute!({}, ctx);
  } catch (e) {
    caughtError = e;
  }

  assert.ok(caughtError instanceof ArcjetDeniedError);
  assert.strictEqual(caughtError.decision, decision);
  assert.equal(executeCallCount, 0);
});

test("AC5.4: DENY → capture outcome is 'denied'", async () => {
  const { client, captureCalls } = stubClient(decisionDenyPromptInjection());

  const tool = createToolWithSymbols<any, any>({
    execute: async () => ({ result: "ok" }),
  });

  const wrapped = guardTool(client, tool, { action: "test.executed" });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  try {
    await wrapped.execute!({}, ctx);
  } catch {
    // expected
  }

  assert.equal(captureCalls.length, 1);
  const capture = recorded(captureCalls[0]);
  const metadata = recorded(capture.metadata);
  assert.equal(metadata.outcome, "denied");
});

test("AC5.4: policy.onDeny supplied → return value resolves instead of throwing", async () => {
  const decision = decisionDenyPromptInjection();
  const { client } = stubClient(decision);
  const denyReturnValue = { denied: true, reason: "PROMPT_INJECTION" };

  const tool = createToolWithSymbols<any, any>({
    execute: async () => ({ result: "should not reach" }),
  });

  const wrapped = guardTool(client, tool, {
    action: "test.executed",
    onDeny: () => denyReturnValue,
  });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  const result = await wrapped.execute!({}, ctx);

  assert.strictEqual(result, denyReturnValue);
});

test("AC5.4: policy.onDeny NOT called on guard throw", async () => {
  const { client } = stubClient(new Error("guard threw"));
  let onDenyCallCount = 0;

  const tool = createToolWithSymbols<any, any>({
    execute: async () => ({ result: "ok" }),
  });

  const wrapped = guardTool(client, tool, {
    action: "test.executed",
    onDeny: () => {
      onDenyCallCount++;
      return { denied: true };
    },
  });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  try {
    await wrapped.execute!({}, ctx);
  } catch {
    // expected
  }

  assert.equal(onDenyCallCount, 0);
});

test("AC5.4: policy.onDeny NOT called on failed-open under default onGuardError (throws unavailable instead)", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let onDenyCallCount = 0;

  const tool = createToolWithSymbols<any, any>({
    execute: async () => ({ result: "ok" }),
  });

  const wrapped = guardTool(client, tool, {
    action: "test.executed",
    onDeny: () => {
      onDenyCallCount++;
      return { denied: true };
    },
  });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  let caughtError: any;
  try {
    await wrapped.execute!({}, ctx);
  } catch (e) {
    caughtError = e;
  }

  // onDeny should never be called on failed-open (unavailable signal)
  assert.equal(onDenyCallCount, 0);
  // Under default onGuardError: "deny", failed-open throws unavailable error
  assert.ok(caughtError instanceof ArcjetGuardUnavailableError);
});

test("AC5.4: unavailable (guard threw) under default → execute not called, rejects with ArcjetGuardUnavailableError with cause", async () => {
  const guardError = new Error("guard API error");
  const { client } = stubClient(guardError);
  let executeCallCount = 0;

  const tool = createToolWithSymbols<any, any>({
    execute: async () => {
      executeCallCount++;
      return { result: "should not reach" };
    },
  });

  const wrapped = guardTool(client, tool, { action: "test.executed" });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  let caughtError: any;
  try {
    await wrapped.execute!({}, ctx);
  } catch (e) {
    caughtError = e;
  }

  assert.ok(caughtError instanceof ArcjetGuardUnavailableError);
  assert.strictEqual(caughtError.cause, guardError);
  assert.strictEqual(caughtError.decision, undefined);
  assert.equal(executeCallCount, 0);
});

test("AC5.4: unavailable (guard threw) under default → capture outcome is 'unavailable'", async () => {
  const { client, captureCalls } = stubClient(new Error("guard error"));

  const tool = createToolWithSymbols<any, any>({
    execute: async () => ({ result: "ok" }),
  });

  const wrapped = guardTool(client, tool, { action: "test.executed" });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  try {
    await wrapped.execute!({}, ctx);
  } catch {
    // expected
  }

  assert.equal(captureCalls.length, 1);
  const capture = recorded(captureCalls[0]);
  const metadata = recorded(capture.metadata);
  assert.equal(metadata.outcome, "unavailable");
});

test("AC5.4: unavailable (failed-open) under default → execute not called, rejects with ArcjetGuardUnavailableError with decision", async () => {
  const decision = decisionFailOpenAllow();
  const { client } = stubClient(decision);
  let executeCallCount = 0;

  const tool = createToolWithSymbols<any, any>({
    execute: async () => {
      executeCallCount++;
      return { result: "should not reach" };
    },
  });

  const wrapped = guardTool(client, tool, { action: "test.executed" });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  let caughtError: any;
  try {
    await wrapped.execute!({}, ctx);
  } catch (e) {
    caughtError = e;
  }

  assert.ok(caughtError instanceof ArcjetGuardUnavailableError);
  assert.strictEqual(caughtError.decision, decision);
  assert.equal(caughtError.cause, undefined);
  assert.equal(executeCallCount, 0);
});

test("AC5.5: tool with execute: undefined throws at wrap time", () => {
  const { client } = stubClient(decisionAllow());
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentionally pass undefined to test runtime check
  const tool = createToolWithSymbols<any, any>({ execute: undefined as any });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test passes intentionally-incorrect tool
  assert.throws(
    () => guardTool(client, tool as any, { action: "test.executed" }),
    (err: any) => {
      assert.ok(err.message.includes("execute"));
      return true;
    },
  );
});

test("AC5.5: tool with execute: non-function throws at wrap time", () => {
  const { client } = stubClient(decisionAllow());
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentionally pass string to test runtime check
  const tool = createToolWithSymbols<any, any>({ execute: "not a function" as any });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test passes intentionally-incorrect tool
  assert.throws(
    () => guardTool(client, tool as any, { action: "test.executed" }),
    (err: any) => {
      assert.ok(err.message.includes("execute"));
      return true;
    },
  );
});

test("AC5.5: error is Error not TypeError", () => {
  const { client } = stubClient(decisionAllow());
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentionally pass undefined to test runtime check
  const tool = createToolWithSymbols<any, any>({ execute: undefined as any });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test passes intentionally-incorrect tool
  assert.throws(
    () => guardTool(client, tool as any, { action: "test.executed" }),
    Error,
  );
});

test("metadata includes eve.tool and eve.call from context", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());

  const tool = createToolWithSymbols<any, any>({
    execute: async () => ({ result: "ok" }),
  });

  const wrapped = guardTool(client, tool, { action: "test.executed" });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-xyz",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  await wrapped.execute!({}, ctx);

  assert.equal(guardCalls.length, 1);
  const call = recorded(guardCalls[0]);
  const metadata = recorded(call.metadata);
  assert.equal(metadata["eve.tool"], "my-tool");
  assert.equal(metadata["eve.call"], "call-xyz");
});

test("rules function receives input as parameter", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const input = { userId: "user-123" };
  let rulesFunctionInput: any;

  const tool = createToolWithSymbols<any, any>({
    execute: async () => ({ result: "ok" }),
  });

  const wrapped = guardTool(client, tool, {
    action: "test.executed",
    rules: (inp) => {
      rulesFunctionInput = inp;
      return [fakeRule];
    },
  });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  await wrapped.execute!(input, ctx);

  assert.strictEqual(rulesFunctionInput, input);
  const call = recorded(guardCalls[0]);
  assert.deepEqual(call.rules, [fakeRule]);
});

test("metadata function receives input as parameter", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const input = { userId: "user-123" };
  let metadataFunctionInput: any;

  const tool = createToolWithSymbols<any, any>({
    execute: async () => ({ result: "ok" }),
  });

  const wrapped = guardTool(client, tool, {
    action: "test.executed",
    metadata: (inp) => {
      metadataFunctionInput = inp;
      return { custom: "value" };
    },
  });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = {
    abortSignal: new AbortController().signal,
    callId: "call-123",
    toolName: "my-tool",
    session: { id: "ses-456" },
  } as any;

  await wrapped.execute!(input, ctx);

  assert.strictEqual(metadataFunctionInput, input);
  const call = recorded(guardCalls[0]);
  const metadata = recorded(call.metadata);
  assert.equal(metadata.custom, "value");
});

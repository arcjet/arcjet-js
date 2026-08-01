import assert from "node:assert/strict";
import { test } from "node:test";

import type { DecisionDeny } from "../../types.ts";
import type { Tool } from "ai";
import { tool, jsonSchema } from "ai";

import { guardTool } from "./guard-tool.ts";
import type { ArcjetDenialResult } from "./guard-tool.ts";
import { createAgentContext } from "../../agents/context.ts";
import { setLogLevel } from "../../../test/_shared/log-level.ts";
import { recorded, asDenial } from "../../../test/_shared/source-scan.ts";
import {
  stubClient,
  decisionAllow,
  decisionDenyRateLimit,
  decisionDenyError,
  decisionFailOpenAllow,
  decisionDenyPromptInjection,
  decisionDenyPromptInjectionWithReset,
  fakeRule,
} from "../../../test/_shared/stub-client.ts";

/**
 * Stub DENY decision (RATE_LIMIT without resetAtUnixSeconds).
 */
function decisionDenyRateLimitNoReset(): DecisionDeny {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test fixture that doesn't match DecisionDeny exactly
  return {
    conclusion: "DENY",
    reason: "RATE_LIMIT",
    id: "gdec_deny_rl_no_reset",
    results: [
      {
        conclusion: "DENY",
        reason: "RATE_LIMIT",
        type: "TOKEN_BUCKET",
        // No resetAtUnixSeconds
      },
    ],
    warnings: [],
    hasFailedOpen: () => false,
  } as unknown as DecisionDeny;
}

/**
 * Create a simple test tool for wrapping.
 */
function createTestTool(): {
  tool: Tool<{ id: string }, { result: string }>;
  executeCalls: unknown[];
  sentinel: { result: string };
} {
  const executeCalls: unknown[] = [];
  const sentinel = { result: "success" };

  return {
    tool: tool({
      description: "Test tool",
      inputSchema: jsonSchema<{ id: string }>({
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      }),
      execute: (input: { id: string }) => {
        executeCalls.push(input);
        return Promise.resolve(sentinel);
      },
    }),
    executeCalls,
    sentinel,
  };
}

test("AC2.1: ALLOW decision → original execute called, result returned unchanged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const input = { id: "input1" };
  const result = await wrapped.execute(input, {
    toolCallId: "t1",
    messages: [],
    context: undefined,
  });

  assert.deepEqual(executeCalls, [input], "original execute should be called with same input");
  assert.strictEqual(result, sentinel, "result should be unchanged");
  assert.equal(guardCalls.length, 1, "guard should be called once");
});

test("AC2.2: DENY decision → execute never called, ArcjetDenialResult returned", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 30;
  const { client, guardCalls } = stubClient(decisionDenyRateLimit(resetAt));
  const { tool: testTool, executeCalls } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const input = { id: "input1" };
  const result = asDenial<ArcjetDenialResult>(
    await wrapped.execute(input, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    }),
  );

  assert.equal(executeCalls.length, 0, "original execute should not be called");
  assert.strictEqual(result.arcjetDenied, true);
  assert.equal(result.reason, "RATE_LIMIT");
  assert.ok(
    result.message.length > 0,
    "message should be non-empty",
  );
  assert.strictEqual(result.retryable, true);
  assert.ok(
    typeof result.retryAfterSeconds === "number" &&
      result.retryAfterSeconds >= 0 &&
      result.retryAfterSeconds <= 30,
    "retryAfterSeconds should be within [0, 30]",
  );
  assert.equal(guardCalls.length, 1);
});

test("AC2.3: metadata merge — context ← policy (later wins)", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
    metadata: (input: { id: string }) => ({
      workflow: "override",
      resource: input.id,
    }),
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const ctx = createAgentContext({
    correlationId: "ctx-1",
    metadata: { user: "u1", workflow: "w" },
  });

  const input = { id: "res-123" };
  await wrapped.execute(input, {
    toolCallId: "t1",
    messages: [],
    context: ctx,
  });

  assert.equal(guardCalls.length, 1);
  const guardCall = recorded(guardCalls[0]);
  assert.deepEqual(guardCall.metadata, {
    user: "u1",
    workflow: "override",
    resource: "res-123",
  });
});

test("AC2.4: ALLOW + successful execute → capture called with success outcome", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const ctx = createAgentContext({
    correlationId: "corr-1",
    metadata: { key: "value" },
  });

  await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: ctx,
  });

  assert.equal(captureCalls.length, 1, "capture should be called once");
  const captureCall = recorded(captureCalls[0]);
  assert.equal(captureCall.action, "test.action");
  assert.equal(captureCall.correlationId, "corr-1");
  assert.equal(captureCall.decisionId, "gdec_allow1");
  const metadata = recorded(captureCall.metadata);
  assert.equal(metadata.outcome, "success");
  assert.equal(metadata.key, "value");
});

test("AC2.5: DENY → capture called with denied outcome and decisionId", async () => {
  const { client, captureCalls } = stubClient(
    decisionDenyRateLimit(Math.floor(Date.now() / 1000) + 30),
  );
  const { tool: testTool } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: undefined,
  });

  assert.equal(captureCalls.length, 1, "capture should be called once on denial");
  const captureCall = recorded(captureCalls[0]);
  assert.equal(captureCall.decisionId, "gdec_deny1");
  const metadata = recorded(captureCall.metadata);
  assert.equal(metadata.outcome, "denied");
});

test("AC2.6: guard throws → execute runs, warning emitted", async () => {
  const guardError = new Error("guard API error");
  const { client } = stubClient(guardError);
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnCalls.push(args);
  };

  const restoreLogLevel = setLogLevel("warn");
  try {
    const wrapped = guardTool(client, testTool, {
      action: "test.action",
      rules: [fakeRule],
      onGuardError: "allow",
    });

    assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

    const result = await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    });

    assert.equal(executeCalls.length, 1, "execute should run on guard error");
    assert.strictEqual(result, sentinel);
    assert.ok(
      warnCalls.some(
        (call) =>
          JSON.stringify(call).includes("guard check") && JSON.stringify(call).includes("errored"),
      ),
      "warning should mention guard error",
    );
  } finally {
    console.warn = originalWarn;
    restoreLogLevel();
  }
});

test("AC2.6: guard resolves fail-open ALLOW → execute runs, fail-open warning", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnCalls.push(args);
  };

  const restoreLogLevel = setLogLevel("warn");
  try {
    const wrapped = guardTool(client, testTool, {
      action: "test.action",
      rules: [fakeRule],
      onGuardError: "allow",
    });

    assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

    const result = await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    });

    assert.equal(executeCalls.length, 1, "execute should run on fail-open");
    assert.strictEqual(result, sentinel);
    assert.ok(
      warnCalls.some((call) => JSON.stringify(call).includes("failed open")),
      "warning should mention fail-open",
    );
  } finally {
    console.warn = originalWarn;
    restoreLogLevel();
  }
});

test("AC2.7: DENY + onDeny hook → denial reshaped", async () => {
  const { client } = stubClient(decisionDenyRateLimit(Math.floor(Date.now() / 1000) + 30));
  const { tool: testTool } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
    onDeny: (decision: DecisionDeny) => ({
      blocked: decision.reason,
    }),
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const result = await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: undefined,
  });

  assert.deepEqual(result, { blocked: "RATE_LIMIT" }, "onDeny should reshape the denial");
});

test("AC2.8: execute throws → error propagates, capture with error outcome", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const testError = new Error("execute failed");

  const throwingTool = tool({
    description: "Test tool that throws",
    inputSchema: jsonSchema<{ id: string }>({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
    execute: (): Promise<{ result: string }> => {
      return Promise.reject(testError);
    },
  });

  const wrappedThrowingTool = guardTool(client, throwingTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  assert.ok(wrappedThrowingTool.execute, "wrapped tool must have an execute function");

  try {
    await wrappedThrowingTool.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    });
    assert.fail("should have thrown");
  } catch (e) {
    assert.strictEqual(e, testError, "same error should propagate");
  }

  assert.equal(captureCalls.length, 1, "capture should fire once with error");
  const captureCall = recorded(captureCalls[0]);
  const metadata = recorded(captureCall.metadata);
  assert.equal(metadata.outcome, "error");
});

test("non-RATE_LIMIT DENY (PROMPT_INJECTION) → retryable=false, no retryAfterSeconds, do-not-retry message", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const { tool: testTool, executeCalls } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const result = asDenial<ArcjetDenialResult>(
    await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    }),
  );

  assert.equal(executeCalls.length, 0, "execute should not be called on DENY");
  assert.strictEqual(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
  assert.strictEqual(result.retryable, false, "non-rate-limit denials are not retryable");
  assert.strictEqual(
    result.retryAfterSeconds,
    undefined,
    "no retryAfterSeconds for non-rate-limit",
  );
  assert.ok(
    result.message.includes("Do not retry"),
    "non-retryable message should advise not retrying",
  );
});

test("non-RATE_LIMIT DENY with a co-occurring rate-limit result → no retryAfterSeconds", async () => {
  // PROMPT_INJECTION denies, but an allowed token bucket in the same decision
  // still carries resetAtUnixSeconds; it must not leak into a non-retryable denial.
  const { client } = stubClient(
    decisionDenyPromptInjectionWithReset(Math.floor(Date.now() / 1000) + 30),
  );
  const { tool: testTool } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const result = asDenial<ArcjetDenialResult>(
    await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    }),
  );

  assert.strictEqual(result.retryable, false, "non-rate-limit denials are not retryable");
  assert.strictEqual(
    result.retryAfterSeconds,
    undefined,
    "co-occurring rate-limit reset must not attach to a non-retryable denial",
  );
});

test("RATE_LIMIT DENY without resetAtUnixSeconds → retryable=true, no retryAfterSeconds, ' later.' message", async () => {
  const { client } = stubClient(decisionDenyRateLimitNoReset());
  const { tool: testTool, executeCalls } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const result = asDenial<ArcjetDenialResult>(
    await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    }),
  );

  assert.equal(executeCalls.length, 0, "execute should not be called on DENY");
  assert.strictEqual(result.arcjetDenied, true);
  assert.equal(result.reason, "RATE_LIMIT");
  assert.strictEqual(result.retryable, true, "rate-limit denials are retryable");
  assert.strictEqual(result.retryAfterSeconds, undefined, "no reset time available");
  assert.ok(
    result.message.includes(" later."),
    "message should say 'may be retried later' when no reset time",
  );
});

test("AC1.7: explicit correlationId override", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
    correlationId: "explicit-1",
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const ctx = createAgentContext({ correlationId: "ctx-1" });

  await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: ctx,
  });

  assert.equal(recorded(guardCalls[0]).correlationId, "explicit-1");
  assert.equal(recorded(captureCalls[0]).correlationId, "explicit-1");
});

test("Capture-only mode: no rules → guard skipped, execute runs, capture fires", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    // No rules
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const result = await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: undefined,
  });

  assert.equal(guardCalls.length, 0, "guard should not be called in capture-only mode");
  assert.equal(executeCalls.length, 1, "execute should run");
  assert.strictEqual(result, sentinel);
  assert.equal(captureCalls.length, 1, "capture should fire");
  const captureCall = recorded(captureCalls[0]);
  assert.strictEqual(captureCall.decisionId, undefined, "no decisionId in capture-only");
  const metadata = recorded(captureCall.metadata);
  assert.equal(metadata.outcome, "success");
});

test("Capture-only mode: empty rules array → guard skipped", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [],
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const result = await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: undefined,
  });

  assert.equal(guardCalls.length, 0, "guard should not be called with empty rules");
  assert.equal(executeCalls.length, 1);
  assert.strictEqual(result, sentinel);
});

test("A throwing capture() does not fail the tool call", async () => {
  const { client } = stubClient(decisionAllow());
  client.capture = (): void => {
    throw new Error("capture failed");
  };

  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const result = await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: undefined,
  });

  assert.equal(executeCalls.length, 1, "the tool must still run");
  assert.strictEqual(result, sentinel);
});

test("AC1.6: no context → warning, guard check runs uncorrelated", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnCalls.push(args);
  };

  const restoreLogLevel = setLogLevel("warn");
  try {
    const wrapped = guardTool(client, testTool, {
      action: "test.action",
      rules: [fakeRule],
    });

    assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

    await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    });

    assert.strictEqual(recorded(guardCalls[0]).correlationId, undefined);
    assert.ok(
      warnCalls.some((call) => JSON.stringify(call).includes("no ArcjetAgentContext")),
      "warning should mention missing context",
    );
  } finally {
    console.warn = originalWarn;
    restoreLogLevel();
  }
});

test("Wrap-time error: tool without execute function throws", () => {
  const { client } = stubClient(decisionAllow());

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentionally create invalid tool fixture
  const toolWithoutExecute = {
    name: "bad_tool",
    description: "Tool without execute",
    parameters: {},
  } as unknown as Tool<unknown, unknown>;

  assert.throws(() => {
    guardTool(client, toolWithoutExecute, {
      action: "test.action",
      rules: [fakeRule],
    });
  }, /requires a tool with an execute function/);
});

test("Wrap-time error: tool with contextSchema throws", () => {
  const { client } = stubClient(decisionAllow());

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentionally pass tool with contextSchema to test error
  const toolWithContextSchema = tool({
    description: "Test tool",
    inputSchema: jsonSchema<{ id: string }>({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
    execute: (): Promise<Record<string, unknown>> => Promise.resolve({}),
    contextSchema: jsonSchema({ type: "object" }),
  } as unknown as Tool<{ id: string }, Record<string, unknown>>);

  assert.throws(() => {
    guardTool(client, toolWithContextSchema, {
      action: "test.action",
      rules: [fakeRule],
    });
  }, /cannot wrap a tool that declares its own contextSchema/);
});

test("Injected contextSchema: validates correlationId and metadata shapes", () => {
  const { client } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- contextSchema is typed as opaque; test needs the validate method
  const schema = wrapped.contextSchema as unknown as {
    validate(value: unknown): { success: boolean };
  };

  // oxlint-disable-next-line unicorn/no-useless-undefined -- testing that undefined is valid
  assert.equal(schema.validate(undefined).success, true, "no context is valid");
  assert.equal(schema.validate({ correlationId: "abc" }).success, true);
  assert.equal(schema.validate({ correlationId: "abc", metadata: { k: "v" } }).success, true);
  assert.equal(
    schema.validate({ correlationId: 123 }).success,
    false,
    "non-string correlationId is rejected",
  );
  assert.equal(
    schema.validate({ correlationId: "abc", metadata: { k: 123 } }).success,
    true,
    "non-string metadata values are accepted",
  );
  assert.equal(
    schema.validate({ correlationId: "abc", metadata: { k: [1, 2, 3] } }).success,
    true,
    "array metadata values are accepted",
  );
  assert.equal(
    schema.validate({ correlationId: "abc", metadata: { k: true } }).success,
    true,
    "boolean metadata values are accepted",
  );
  assert.equal(
    schema.validate({ correlationId: "abc", metadata: { k: null } }).success,
    true,
    "null metadata values are accepted",
  );
  assert.equal(
    schema.validate({ correlationId: "abc", metadata: "nope" }).success,
    false,
    "non-object metadata is rejected",
  );
  assert.equal(
    schema.validate({ correlationId: "abc", metadata: null }).success,
    false,
    "null metadata is rejected (typeof null === 'object')",
  );
  assert.equal(
    schema.validate({ correlationId: "abc", metadata: [1, 2, 3] }).success,
    false,
    "array metadata is rejected",
  );
  assert.equal(
    schema.validate("nope").success,
    false,
    "non-object value is rejected",
  );
  assert.equal(
    schema.validate(null).success,
    false,
    "null value is rejected",
  );
});

test("Policy rules as a function: applied per input", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const ruleCalls: unknown[] = [];
  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: (input: { id: string }) => {
      ruleCalls.push(input);
      return input.id === "skip" ? [] : [fakeRule];
    },
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  // First call with rules
  await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: undefined,
  });
  assert.equal(guardCalls.length, 1, "first call should invoke guard");

  // Second call without rules (empty array)
  await wrapped.execute({ id: "skip" }, {
    toolCallId: "t2",
    messages: [],
    context: undefined,
  });
  assert.equal(guardCalls.length, 1, "second call should not invoke guard (empty rules)");
});

test("Policy metadata as a function: applied per input, merged after context", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const metadataCalls: unknown[] = [];
  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
    metadata: (input: { id: string }) => {
      metadataCalls.push(input);
      return { input_id: input.id };
    },
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const ctx = createAgentContext({
    correlationId: "corr",
    metadata: { context_key: "context_val" },
  });

  await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: ctx,
  });

  assert.equal(metadataCalls.length, 1);
  const guardCall = recorded(guardCalls[0]);
  assert.deepEqual(guardCall.metadata, {
    context_key: "context_val",
    input_id: "input1",
  });
});

test("AC4.11: guard throws with default onGuardError: 'deny' → execute not called, ERROR result, no onDeny call", async () => {
  const guardError = new Error("guard API error");
  const { client, captureCalls } = stubClient(guardError);
  const { tool: testTool, executeCalls } = createTestTool();

  const onDenyCalls: unknown[] = [];
  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
    // onGuardError defaults to "deny"
    onDeny: (decision: DecisionDeny) => {
      onDenyCalls.push(decision);
      return { blocked: decision.reason };
    },
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const result = asDenial<ArcjetDenialResult>(
    await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    }),
  );

  assert.equal(executeCalls.length, 0, "execute should not be called when guard throws with deny mode");
  assert.equal(onDenyCalls.length, 0, "onDeny should not be called for unavailable signal");
  assert.strictEqual(result.arcjetDenied, true);
  assert.strictEqual(result.reason, "ERROR");
  assert.strictEqual(result.retryable, true);
  assert.strictEqual(result.retryAfterSeconds, 5, "must have fixed 5-second backoff");
  assert.equal(captureCalls.length, 1, "capture should fire once");
  assert.equal(
    recorded(recorded(captureCalls[0]).metadata).outcome,
    "unavailable",
    "capture outcome must be unavailable, not denied",
  );
});

test("AC4.3: a real DENY carrying reason ERROR is not retryable and has no backoff hint", async () => {
  const { client } = stubClient(decisionDenyError());
  const { tool: testTool, executeCalls } = createTestTool();

  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const result = asDenial<ArcjetDenialResult>(
    await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    }),
  );

  // A server-issued DENY can carry reason "ERROR". It is a real denial, so it
  // must not pick up the guard-unavailable path's retry affordances.
  assert.equal(executeCalls.length, 0, "execute should not be called on DENY");
  assert.strictEqual(result.arcjetDenied, true);
  assert.strictEqual(result.reason, "ERROR");
  assert.strictEqual(result.retryable, false, "a real denial is not retryable");
  assert.strictEqual(
    result.retryAfterSeconds,
    undefined,
    "a real denial carries no backoff hint, even when its reason is ERROR",
  );
});

test("AC4.11: guard fails open with default onGuardError: 'deny' → execute not called, ERROR result", async () => {
  const { client, captureCalls } = stubClient(decisionFailOpenAllow());
  const { tool: testTool, executeCalls } = createTestTool();

  const onDenyCalls: unknown[] = [];
  const wrapped = guardTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
    onDeny: (decision: DecisionDeny) => {
      onDenyCalls.push(decision);
      return { blocked: decision.reason };
    },
  });

  assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

  const result = asDenial<ArcjetDenialResult>(
    await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    }),
  );

  assert.equal(executeCalls.length, 0, "execute should not be called when decision fails open with deny mode");
  assert.equal(onDenyCalls.length, 0, "onDeny should not be called for unavailable signal");
  assert.equal(captureCalls.length, 1, "capture should fire once with unavailable");
  const captureCall = recorded(captureCalls[0]);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test narrows metadata to object for property access
  const metadata = captureCall.metadata as Record<string, unknown>;
  assert.strictEqual(
    metadata?.outcome,
    "unavailable",
    "capture outcome must be unavailable, not denied",
  );
  assert.strictEqual(result.arcjetDenied, true);
  assert.strictEqual(result.reason, "ERROR");
  assert.strictEqual(result.retryable, true);
  assert.strictEqual(result.retryAfterSeconds, 5, "must have fixed 5-second backoff");
});

test("AC4.11: guard throws with onGuardError: 'allow' → execute runs, warning emitted", async () => {
  const guardError = new Error("guard API error");
  const { client } = stubClient(guardError);
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnCalls.push(args);
  };

  const restoreLogLevel = setLogLevel("warn");
  try {
    const wrapped = guardTool(client, testTool, {
      action: "test.action",
      rules: [fakeRule],
      onGuardError: "allow",
    });

    assert.ok(wrapped.execute !== undefined, "wrapped tool must have an execute function");

    const result = await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
      context: undefined,
    });

    assert.equal(executeCalls.length, 1, "execute should run with allow mode");
    assert.strictEqual(result, sentinel);
    assert.ok(
      warnCalls.some((call) => JSON.stringify(call).includes("failing open")),
      "warning should mention failing open",
    );
  } finally {
    console.warn = originalWarn;
    restoreLogLevel();
  }
});

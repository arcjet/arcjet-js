import assert from "node:assert/strict";
import { test } from "node:test";

import type { DecisionDeny } from "@arcjet/guard";
import { tool, jsonSchema } from "ai";

import { protectTool, createAiContext, type ArcjetDenialResult } from "../dist/index.js";
import {
  stubClient,
  decisionAllow,
  decisionDenyRateLimit,
  decisionFailOpenAllow,
  decisionDenyPromptInjection,
  fakeRule,
} from "./_shared/stub-client.ts";

/**
 * Stub DENY decision (RATE_LIMIT without resetAtUnixSeconds).
 */
function decisionDenyRateLimitNoReset(): DecisionDeny {
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
function createTestTool() {
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
      execute: async (input: { id: string }) => {
        executeCalls.push(input);
        return sentinel;
      },
    }),
    executeCalls,
    sentinel,
  };
}

test("AC2.1: ALLOW decision → original execute called, result returned unchanged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  const input = { id: "input1" };
  const result = await wrapped.execute(input, {
    toolCallId: "t1",
    messages: [],
  } as never);

  assert.deepEqual(executeCalls, [input], "original execute should be called with same input");
  assert.strictEqual(result, sentinel, "result should be unchanged");
  assert.equal(guardCalls.length, 1, "guard should be called once");
});

test("AC2.2: DENY decision → execute never called, ArcjetDenialResult returned", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 30;
  const { client, guardCalls } = stubClient(decisionDenyRateLimit(resetAt));
  const { tool: testTool, executeCalls } = createTestTool();

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  const input = { id: "input1" };
  const result = (await wrapped.execute(input, {
    toolCallId: "t1",
    messages: [],
  } as never)) as ArcjetDenialResult;

  assert.equal(executeCalls.length, 0, "original execute should not be called");
  assert.strictEqual(result.arcjetDenied, true);
  assert.equal(result.reason, "RATE_LIMIT");
  assert.ok(result.message.length > 0, "message should be non-empty");
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

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
    metadata: (input: { id: string }) => ({
      workflow: "override",
      resource: input.id,
    }),
  });

  const ctx = createAiContext({
    correlationId: "ctx-1",
    metadata: { user: "u1", workflow: "w" },
  });

  const input = { id: "res-123" };
  await wrapped.execute(input, {
    toolCallId: "t1",
    messages: [],
    context: ctx,
  } as never);

  assert.equal(guardCalls.length, 1);
  const guardCall = guardCalls[0] as Record<string, unknown>;
  assert.deepEqual(guardCall.metadata, {
    user: "u1",
    workflow: "override",
    resource: "res-123",
  });
});

test("AC2.4: ALLOW + successful execute → capture called with success outcome", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  const ctx = createAiContext({
    correlationId: "corr-1",
    metadata: { key: "value" },
  });

  await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: ctx,
  } as never);

  assert.equal(captureCalls.length, 1, "capture should be called once");
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.equal(captureCall.action, "test.action");
  assert.equal(captureCall.correlationId, "corr-1");
  assert.equal(captureCall.decisionId, "gdec_allow1");
  const metadata = captureCall.metadata as Record<string, string>;
  assert.equal(metadata.outcome, "success");
  assert.equal(metadata.key, "value");
});

test("AC2.5: DENY → capture called with denied outcome and decisionId", async () => {
  const { client, captureCalls } = stubClient(
    decisionDenyRateLimit(Math.floor(Date.now() / 1000) + 30),
  );
  const { tool: testTool } = createTestTool();

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
  } as never);

  assert.equal(captureCalls.length, 1, "capture should be called once on denial");
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.equal(captureCall.decisionId, "gdec_deny1");
  const metadata = captureCall.metadata as Record<string, string>;
  assert.equal(metadata.outcome, "denied");
});

test("AC2.6: guard throws → execute runs, warning emitted", async () => {
  const guardError = new Error("guard API error");
  const { client } = stubClient(guardError);
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };

  process.env.ARCJET_LOG_LEVEL = "warn";
  try {
    const wrapped = protectTool(client, testTool, {
      action: "test.action",
      rules: [fakeRule],
    });

    const result = await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
    } as never);

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
    delete process.env.ARCJET_LOG_LEVEL;
  }
});

test("AC2.6: guard resolves fail-open ALLOW → execute runs, fail-open warning", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };

  process.env.ARCJET_LOG_LEVEL = "warn";
  try {
    const wrapped = protectTool(client, testTool, {
      action: "test.action",
      rules: [fakeRule],
    });

    const result = await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
    } as never);

    assert.equal(executeCalls.length, 1, "execute should run on fail-open");
    assert.strictEqual(result, sentinel);
    assert.ok(
      warnCalls.some((call) => JSON.stringify(call).includes("failed open")),
      "warning should mention fail-open",
    );
  } finally {
    console.warn = originalWarn;
    delete process.env.ARCJET_LOG_LEVEL;
  }
});

test("AC2.7: DENY + onDeny hook → denial reshaped", async () => {
  const { client } = stubClient(decisionDenyRateLimit(Math.floor(Date.now() / 1000) + 30));
  const { tool: testTool } = createTestTool();

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
    onDeny: (decision: DecisionDeny) => ({
      blocked: decision.reason,
    }),
  });

  const result = await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
  } as never);

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
    execute: async () => {
      throw testError;
    },
  });

  const wrappedThrowingTool = protectTool(client, throwingTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  try {
    await wrappedThrowingTool.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
    } as never);
    assert.fail("should have thrown");
  } catch (e) {
    assert.strictEqual(e, testError, "same error should propagate");
  }

  assert.equal(captureCalls.length, 1, "capture should fire once with error");
  const captureCall = captureCalls[0] as Record<string, unknown>;
  const metadata = captureCall.metadata as Record<string, string>;
  assert.equal(metadata.outcome, "error");
});

test("non-RATE_LIMIT DENY (PROMPT_INJECTION) → retryable=false, no retryAfterSeconds, do-not-retry message", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const { tool: testTool, executeCalls } = createTestTool();

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  const result = (await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
  } as never)) as ArcjetDenialResult;

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

test("RATE_LIMIT DENY without resetAtUnixSeconds → retryable=true, no retryAfterSeconds, ' later.' message", async () => {
  const { client } = stubClient(decisionDenyRateLimitNoReset());
  const { tool: testTool, executeCalls } = createTestTool();

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
  });

  const result = (await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
  } as never)) as ArcjetDenialResult;

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

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
    correlationId: "explicit-1",
  });

  const ctx = createAiContext({ correlationId: "ctx-1" });

  await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: ctx,
  } as never);

  assert.equal((guardCalls[0] as Record<string, unknown>).correlationId, "explicit-1");
  assert.equal((captureCalls[0] as Record<string, unknown>).correlationId, "explicit-1");
});

test("Capture-only mode: no rules → guard skipped, execute runs, capture fires", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    // No rules
  });

  const result = await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
  } as never);

  assert.equal(guardCalls.length, 0, "guard should not be called in capture-only mode");
  assert.equal(executeCalls.length, 1, "execute should run");
  assert.strictEqual(result, sentinel);
  assert.equal(captureCalls.length, 1, "capture should fire");
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.strictEqual(captureCall.decisionId, undefined, "no decisionId in capture-only");
  const metadata = captureCall.metadata as Record<string, string>;
  assert.equal(metadata.outcome, "success");
});

test("Capture-only mode: empty rules array → guard skipped", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool, executeCalls, sentinel } = createTestTool();

  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [],
  });

  const result = await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
  } as never);

  assert.equal(guardCalls.length, 0, "guard should not be called with empty rules");
  assert.equal(executeCalls.length, 1);
  assert.strictEqual(result, sentinel);
});

test("Missing capture support: client without experimental_capture → warning only", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  // Remove experimental_capture to simulate an old client
  delete (client as Record<string, unknown>).experimental_capture;

  const { tool: testTool } = createTestTool();

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };

  process.env.ARCJET_LOG_LEVEL = "warn";
  try {
    const wrapped = protectTool(client, testTool, {
      action: "test.action",
      rules: [fakeRule],
    });

    await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
    } as never);

    assert.ok(
      warnCalls.some((call) =>
        JSON.stringify(call).includes("does not support experimental_capture"),
      ),
      "warning should mention capture unavailability",
    );
  } finally {
    console.warn = originalWarn;
    delete process.env.ARCJET_LOG_LEVEL;
  }
});

test("AC1.6: no context → warning, guard check runs uncorrelated", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };

  process.env.ARCJET_LOG_LEVEL = "warn";
  try {
    const wrapped = protectTool(client, testTool, {
      action: "test.action",
      rules: [fakeRule],
    });

    await wrapped.execute({ id: "input1" }, {
      toolCallId: "t1",
      messages: [],
    } as never);

    assert.strictEqual((guardCalls[0] as Record<string, unknown>).correlationId, undefined);
    assert.ok(
      warnCalls.some((call) => JSON.stringify(call).includes("no ArcjetAiContext")),
      "warning should mention missing context",
    );
  } finally {
    console.warn = originalWarn;
    delete process.env.ARCJET_LOG_LEVEL;
  }
});

test("Wrap-time error: tool without execute function throws", async () => {
  const { client } = stubClient(decisionAllow());

  const toolWithoutExecute = {
    name: "bad_tool",
    description: "Tool without execute",
    parameters: {},
  } as any;

  assert.throws(() => {
    protectTool(client, toolWithoutExecute, {
      action: "test.action",
      rules: [fakeRule],
    });
  }, /requires a tool with an execute function/);
});

test("Wrap-time error: tool with contextSchema throws", async () => {
  const { client } = stubClient(decisionAllow());

  const toolWithContextSchema = tool({
    description: "Test tool",
    inputSchema: jsonSchema<{ id: string }>({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
    execute: async () => ({}),
    contextSchema: jsonSchema({ type: "object" }),
  });

  assert.throws(() => {
    protectTool(client, toolWithContextSchema, {
      action: "test.action",
      rules: [fakeRule],
    });
  }, /cannot wrap a tool that declares its own contextSchema/);
});

test("Policy rules as a function: applied per input", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const ruleCalls: unknown[] = [];
  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: (input: { id: string }) => {
      ruleCalls.push(input);
      return input.id === "skip" ? [] : [fakeRule];
    },
  });

  // First call with rules
  await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
  } as never);
  assert.equal(guardCalls.length, 1, "first call should invoke guard");

  // Second call without rules (empty array)
  await wrapped.execute({ id: "skip" }, {
    toolCallId: "t2",
    messages: [],
  } as never);
  assert.equal(guardCalls.length, 1, "second call should not invoke guard (empty rules)");
});

test("Policy metadata as a function: applied per input, merged after context", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { tool: testTool } = createTestTool();

  const metadataCalls: unknown[] = [];
  const wrapped = protectTool(client, testTool, {
    action: "test.action",
    rules: [fakeRule],
    metadata: (input: { id: string }) => {
      metadataCalls.push(input);
      return { input_id: input.id };
    },
  });

  const ctx = createAiContext({
    correlationId: "corr",
    metadata: { context_key: "context_val" },
  });

  await wrapped.execute({ id: "input1" }, {
    toolCallId: "t1",
    messages: [],
    context: ctx,
  } as never);

  assert.equal(metadataCalls.length, 1);
  const guardCall = guardCalls[0] as Record<string, unknown>;
  assert.deepEqual(guardCall.metadata, {
    context_key: "context_val",
    input_id: "input1",
  });
});

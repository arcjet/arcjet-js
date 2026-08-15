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
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { DecisionDeny } from "../../types.ts";
import type { ArcjetDenialResult, ClaudeCallToolResult } from "./denial.ts";
import type { ClaudeToolDefinition } from "./guard-tool.ts";
import { guardTool } from "./guard-tool.ts";

function createClaudeTool<
  TInput extends Record<string, unknown> = Record<string, unknown>,
>(overrides?: {
  name?: string;
  handler?: (input: TInput, extra: unknown) => Promise<ClaudeCallToolResult>;
}): ClaudeToolDefinition<TInput> {
  const tool = {
    name: overrides?.name ?? "test-tool",
    description: "test tool",
    inputSchema: {},
    handler:
      overrides?.handler ?? (async () => ({ content: [{ type: "text" as const, text: "ok" }] })),
  };
  Object.defineProperty(tool, Symbol.for("claude.hidden"), {
    value: "keep-me",
    enumerable: false,
    configurable: true,
  });
  return tool;
}

function sessionExtra(sessionId: string) {
  return { session_id: sessionId };
}

function asToolResult(value: unknown): ClaudeCallToolResult {
  return asDenial<ClaudeCallToolResult>(value);
}

function denialFromResult(result: unknown): ArcjetDenialResult {
  return asDenial<ArcjetDenialResult>(asToolResult(result).structuredContent);
}

test("throws when the tool has no handler function", () => {
  const { client } = stubClient(decisionAllow());
  const tool = { name: "no-handler", description: "x", inputSchema: {} };
  assert.throws(
    () => guardTool(client, tool as ClaudeToolDefinition, { action: "test.executed" }),
    /handler function/,
  );
});

test("returned object is not the input tool and preserves non-enumerable markers", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createClaudeTool();
  const wrapped = guardTool(client, tool, { action: "test.executed" });

  assert.notStrictEqual(wrapped, tool);
  assert.equal((wrapped as any)[Symbol.for("claude.hidden")], "keep-me");
});

test("input tool.handler is unchanged after wrapping", () => {
  const { client } = stubClient(decisionAllow());
  const tool = createClaudeTool();
  const originalHandler = tool.handler;
  guardTool(client, tool, { action: "test.executed" });
  assert.strictEqual(tool.handler, originalHandler);
});

test("ALLOW → handler called once with input and extra by reference", async () => {
  const { client } = stubClient(decisionAllow());
  const input = { orderNumber: "A-1" };
  const extra = sessionExtra("session-1");
  let calls = 0;
  let capturedInput: unknown;
  let capturedExtra: unknown;

  const tool = createClaudeTool({
    handler: async (inp, context) => {
      calls += 1;
      capturedInput = inp;
      capturedExtra = context;
      return { content: [{ type: "text", text: "shipped" }] };
    },
  });

  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = await wrapped.handler(input, extra);

  assert.equal(calls, 1);
  assert.strictEqual(capturedInput, input);
  assert.strictEqual(capturedExtra, extra);
  assert.deepEqual(result, { content: [{ type: "text", text: "shipped" }] });
});

test("ALLOW → capture outcome is success and correlation comes from session_id", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const tool = createClaudeTool({
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.handler({}, sessionExtra("session-99"));

  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["correlationId"], "session-99");
  assert.equal(captureCalls.length, 1);
  assert.equal(
    recorded(captureCalls[0])["metadata"] &&
      (recorded(captureCalls[0])["metadata"] as Record<string, unknown>)["outcome"],
    "success",
  );
});

test("DENY → handler is not called and a CallToolResult with isError is returned (no throw)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createClaudeTool({
    handler: async () => {
      calls += 1;
      return { content: [{ type: "text", text: "ok" }] };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.handler({}, sessionExtra("s")));

  assert.equal(calls, 0);
  assert.equal(result.isError, true);
  const denial = denialFromResult(result);
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
  assert.equal(denial.retryable, false);
});

test("RATE_LIMIT DENY → structured result is retryable", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 12;
  const { client } = stubClient(decisionDenyRateLimit(resetAt));
  const tool = createClaudeTool({
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = denialFromResult(await wrapped.handler({}, sessionExtra("s")));

  assert.equal(result.retryable, true);
  assert.ok(typeof result.retryAfterSeconds === "number");
});

test("rules callback receives the tool input", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createClaudeTool<{ id: string }>({
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    rules: (input) => {
      assert.equal(input.id, "xyz");
      return [fakeRule];
    },
  });
  await wrapped.handler({ id: "xyz" }, sessionExtra("s"));
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("fail-closed unavailable → ERROR CallToolResult, handler not called", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createClaudeTool({
    handler: async () => {
      calls += 1;
      return { content: [{ type: "text", text: "ok" }] };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = asToolResult(await wrapped.handler({}, sessionExtra("s")));

  assert.equal(calls, 0);
  assert.equal(result.isError, true);
  assert.equal(denialFromResult(result).reason, "ERROR");
});

test("onGuardError allow → handler still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const tool = createClaudeTool({
    handler: async () => {
      calls += 1;
      return { content: [{ type: "text", text: "ok" }] };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onGuardError: "allow",
  });
  const result = await wrapped.handler({}, sessionExtra("s"));
  assert.equal(calls, 1);
  assert.deepEqual(result, { content: [{ type: "text", text: "ok" }] });
});

test("does not mint a correlation id when Claude provided none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createClaudeTool({
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.handler({}, {});
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("policy.sessionId is used when extra has no session_id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createClaudeTool({
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    sessionId: "options-session",
  });
  await wrapped.handler({}, {});
  assert.equal(recorded(guardCalls[0])["correlationId"], "options-session");
});

test("DENY + throwing onDeny still denies and does not throw", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const tool = createClaudeTool({
    handler: async () => {
      calls += 1;
      return { content: [{ type: "text", text: "ok" }] };
    },
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: () => {
      throw new Error("onDeny exploded");
    },
  });

  const result = asToolResult(await wrapped.handler({}, sessionExtra("s")));
  assert.equal(calls, 0);
  assert.equal(result.isError, true);
  assert.equal(denialFromResult(result).reason, "PROMPT_INJECTION");
});

test("onDeny reshape is returned and handler is not called", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let received: DecisionDeny | undefined;
  const tool = createClaudeTool({
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: (decision) => {
      received = decision;
      return { content: [{ type: "text", text: `blocked:${decision.reason}` }], isError: true };
    },
  });

  const result = await wrapped.handler({}, sessionExtra("s"));
  assert.equal(received?.reason, "PROMPT_INJECTION");
  assert.deepEqual(result, {
    content: [{ type: "text", text: "blocked:PROMPT_INJECTION" }],
    isError: true,
  });
});

test("onDeny is not called on unavailable", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let onDenyCalls = 0;
  const tool = createClaudeTool({
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, {
    action: "order.looked-up",
    onDeny: () => {
      onDenyCalls += 1;
      return { blocked: true };
    },
  });

  const result = await wrapped.handler({}, sessionExtra("s"));
  assert.equal(onDenyCalls, 0);
  assert.equal(denialFromResult(result).reason, "ERROR");
});

test("guard throw with default fail-closed does not execute", async () => {
  const { client } = stubClient(new Error("transport down"));
  let calls = 0;
  const tool = createClaudeTool({
    handler: async () => {
      calls += 1;
      return { content: [{ type: "text", text: "ok" }] };
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  const result = await wrapped.handler({}, sessionExtra("s"));
  assert.equal(calls, 0);
  assert.equal(denialFromResult(result).reason, "ERROR");
});

test("omitted rules still submit an empty guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createClaudeTool({
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.handler({}, sessionExtra("s"));
  assert.deepEqual(recorded(guardCalls[0])["rules"], []);
});

test("metadata callback is merged over derived context", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createClaudeTool<{ id: string }>({
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    metadata: (input) => ({ "app.item": input.id }),
  });
  await wrapped.handler({ id: "item-9" }, sessionExtra("session-meta"));
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.item"], "item-9");
  assert.equal(metadata["claude.tool"], "test-tool");
});

test("static metadata is merged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createClaudeTool({
    name: "",
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, {
    action: "thing.read",
    metadata: { "app.static": "yes" },
  });
  await wrapped.handler({}, sessionExtra("s"));
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.static"], "yes");
  assert.equal("claude.tool" in metadata, false);
});

test("rejects a second wrap (claude or vercel-ai brand)", async () => {
  const { client } = stubClient(decisionAllow());
  const tool = createClaudeTool();
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  assert.equal(arcjetProtectedTool in wrapped, true);
  assert.throws(() => guardTool(client, wrapped, { action: "order.looked-up" }), /already guarded/);

  const branded = createClaudeTool();
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  assert.throws(() => guardTool(client, branded, { action: "order.looked-up" }), /already guarded/);
});

test("handler throw is rethrown after capture", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const tool = createClaudeTool({
    handler: async (): Promise<ClaudeCallToolResult> => {
      throw new Error("tool failed");
    },
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await assert.rejects(async () => wrapped.handler({}, sessionExtra("s")), /tool failed/);
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "error");
});

test("non-object extra does not mint an id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = createClaudeTool({
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });
  const wrapped = guardTool(client, tool, { action: "order.looked-up" });
  await wrapped.handler({}, "not-context");
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
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
    const tool = createClaudeTool({
      handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
    });
    const wrapped = guardTool(client, tool, {
      action: "order.looked-up",
      onDeny: () => {
        throw new Error("onDeny exploded");
      },
    });
    await wrapped.handler({}, sessionExtra("s"));
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

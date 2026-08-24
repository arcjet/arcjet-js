// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unnecessary-type-assertion, typescript/unbound-method, typescript/require-await, eslint/require-await -- test fixtures built from the real SDK types
/**
 * wrapToolCall DENY against the real `@langchain/core` `ToolMessage`.
 *
 * wrapToolCall's return is NOT passed through `baseHandler`. A bare
 * object is the reducer-crash case (`ToolMessage.isInstance` fails).
 * These assertions live outside `src/langchain/` because constructing
 * the denial dynamically imports `@langchain/core/messages`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { ToolMessage } from "@langchain/core/messages";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardMiddleware } from "../../src/langchain/v1/guard-middleware.ts";
import { asDenial } from "../_shared/source-scan.ts";
import {
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  stubClient,
} from "../_shared/stub-client.ts";

function toolRequest(name: string, args: unknown = {}, id = "call-1", tool?: object) {
  return {
    toolCall: { name, args, id, type: "tool_call" as const },
    tool,
    runtime: { configurable: { thread_id: "thread-1" } },
  };
}

async function runHook(
  mw: ReturnType<typeof guardMiddleware>,
  request: unknown,
  handler: (request: unknown) => Promise<unknown>,
): Promise<unknown> {
  const wrap = mw.wrapToolCall;
  assert.equal(typeof wrap, "function", "guardMiddleware must install wrapToolCall");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- tests drive wrapToolCall with a structural request
  return wrap(request as never, handler as never);
}

function messageText(content: unknown): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

function requireToolMessage(value: unknown): ToolMessage {
  assert.equal(ToolMessage.isInstance(value), true);
  if (!ToolMessage.isInstance(value)) {
    throw new Error("expected a ToolMessage");
  }
  return value;
}

function denialFrom(message: ToolMessage): ArcjetDenialResult {
  return asDenial<ArcjetDenialResult>(JSON.parse(messageText(message.content)));
}

test("wrapToolCall DENY returns a real ToolMessage, not a bare object or status error", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let handlerCalls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolRequest("weather", { city: "Paris" }), async () => {
    handlerCalls += 1;
    return { ok: true };
  });

  assert.equal(handlerCalls, 0);
  const message = requireToolMessage(result);
  assert.equal(message.tool_call_id, "call-1");
  assert.equal(message.name, "weather");
  assert.notEqual(message.status, "error");
  const payload = denialFrom(message);
  assert.equal(payload.arcjetDenied, true);
  assert.equal(payload.reason, "PROMPT_INJECTION");
});

test("wrapToolCall still gates when request.tool is undefined (MCP / unwrapped)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let handlerCalls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(
    mw,
    toolRequest("mcp_search", { q: "hello" }, "call-mcp"),
    async () => {
      handlerCalls += 1;
      return { ok: true };
    },
  );

  assert.equal(handlerCalls, 0);
  const message = requireToolMessage(result);
  assert.equal(message.tool_call_id, "call-mcp");
  assert.equal(message.name, "mcp_search");
  assert.notEqual(message.status, "error");
  assert.equal(denialFrom(message).reason, "PROMPT_INJECTION");
});

test("wrapToolCall fail-closed unavailable is a completed ToolMessage, not a throw", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let handlerCalls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolRequest("weather"), async () => {
    handlerCalls += 1;
    return { ok: true };
  });

  assert.equal(handlerCalls, 0);
  const message = requireToolMessage(result);
  assert.notEqual(message.status, "error");
  assert.equal(denialFrom(message).reason, "ERROR");
});

test("wrapToolCall DENY does not throw (throws would drop arcjetDenied)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolRequest("weather"), async () => {
    throw new Error("handler should not run");
  });
  assert.equal(denialFrom(requireToolMessage(result)).arcjetDenied, true);
});

// A policy factory that throws is a guard error, not an allow. It has to
// reach the model as a completed ToolMessage for the same reason a DENY
// does: this return value skips `baseHandler`.
test("a throwing policy factory fail-closes as a completed ToolMessage", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  let handlerCalls = 0;
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    rules: () => {
      throw new Error("policy factory exploded");
    },
  });
  const result = await runHook(mw, toolRequest("weather"), async () => {
    handlerCalls += 1;
    return { ok: true };
  });

  assert.equal(handlerCalls, 0);
  assert.equal(guardCalls.length, 0);
  const message = requireToolMessage(result);
  assert.notEqual(message.status, "error");
  assert.equal(denialFrom(message).reason, "ERROR");
});

test("a throwing policy factory with onGuardError allow still runs the handler", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let handlerCalls = 0;
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    onGuardError: "allow",
    rules: () => {
      throw new Error("policy factory exploded");
    },
  });
  const result = await runHook(mw, toolRequest("weather"), async () => {
    handlerCalls += 1;
    return { ok: true };
  });

  assert.equal(handlerCalls, 1);
  assert.deepEqual(result, { ok: true });
});

test("a throwing onDeny falls back to the default denial ToolMessage", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let handlerCalls = 0;
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    onDeny: () => {
      throw new Error("onDeny exploded");
    },
  });
  const result = await runHook(mw, toolRequest("weather"), async () => {
    handlerCalls += 1;
    return { ok: true };
  });

  assert.equal(handlerCalls, 0);
  const message = requireToolMessage(result);
  assert.notEqual(message.status, "error");
  const payload = denialFrom(message);
  assert.equal(payload.arcjetDenied, true);
  assert.equal(payload.reason, "PROMPT_INJECTION");
});

// createAgent always supplies a string id, so this is a degenerate input.
// It must still deny — the alternatives are a throw that drops arcjetDenied
// or a bare object that crashes the reducer — but it must not pass a blank
// id off as a correlated message.
test("a tool call with no id still denies, and warns instead of silently blanking the id", async () => {
  const oldLogLevel = process.env.ARCJET_LOG_LEVEL;
  process.env.ARCJET_LOG_LEVEL = "warn";
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (format: string) => {
    warnings.push(format);
  };

  try {
    const { client } = stubClient(decisionDenyPromptInjection());
    let handlerCalls = 0;
    const mw = guardMiddleware(client, { action: "tool.invoked" });
    const request = {
      toolCall: { name: "weather", args: {}, type: "tool_call" as const },
      runtime: { configurable: { thread_id: "thread-1" } },
    };
    const result = await runHook(mw, request, async () => {
      handlerCalls += 1;
      return { ok: true };
    });

    assert.equal(handlerCalls, 0);
    const message = requireToolMessage(result);
    assert.notEqual(message.status, "error");
    assert.equal(denialFrom(message).arcjetDenied, true);
    assert.ok(
      warnings.some((format) => format.includes("no tool_call_id")),
      `expected a missing-id warning, got: ${warnings.join(", ")}`,
    );
  } finally {
    console.warn = originalWarn;
    if (oldLogLevel === undefined) {
      delete process.env.ARCJET_LOG_LEVEL;
    } else {
      process.env.ARCJET_LOG_LEVEL = oldLogLevel;
    }
  }
});

test("onDeny reshapes the payload carried on the denial ToolMessage", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    onDeny: (decision) => ({ blocked: decision.reason }),
  });
  const result = await runHook(mw, toolRequest("weather"), async () => ({ ok: true }));

  const message = requireToolMessage(result);
  assert.notEqual(message.status, "error");
  assert.deepEqual(JSON.parse(messageText(message.content)), { blocked: "PROMPT_INJECTION" });
});

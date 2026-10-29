// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type, eslint/require-await, eslint/strict-boolean-expressions, typescript/strict-boolean-expressions, unicorn/no-object-as-default-parameter -- test infrastructure and mocks
import assert from "node:assert/strict";
import { test } from "node:test";

import { asDenial, recorded } from "../../../test/_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import type { ArcjetDenialResult } from "../../agents/denial.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import { policyInput } from "../../policy-input.ts";
import { guardMiddleware } from "./guard-middleware.ts";
import type { TanStackAiGuardMiddleware } from "./guard-middleware.ts";

function middlewareCtx(context: unknown = { sessionId: "sess-1" }, threadId?: string) {
  return {
    requestId: "req-auto",
    streamId: "stream-auto",
    ...(threadId !== undefined && { threadId }),
    context,
  };
}

function toolHook(name: string, args: unknown = {}, tool?: object) {
  return {
    toolCall: { id: "call-1", type: "function" as const, function: { name, arguments: "{}" } },
    tool,
    args,
    toolName: name,
    toolCallId: "call-1",
  };
}

async function runHook(
  mw: TanStackAiGuardMiddleware,
  hookCtx: unknown,
  ctx: unknown = middlewareCtx(),
) {
  const hook = mw.onGuardToolCall;
  assert.ok(hook, "guardMiddleware must install onGuardToolCall");
  return hook(ctx as never, hookCtx as never);
}

/**
 * TanStack 1.0 `MiddlewareRunner.runOnGuardToolCall`: guards run in
 * order until one returns a non-void / non-null decision.
 */
async function guardTier(
  middlewares: Array<{
    onGuardToolCall?: (...args: never[]) => unknown;
  }>,
  ctx: unknown,
  hookCtx: unknown,
): Promise<unknown> {
  for (const mw of middlewares) {
    if (mw.onGuardToolCall === undefined) {
      continue;
    }
    const decision = await mw.onGuardToolCall(ctx as never, hookCtx as never);
    if (decision !== undefined && decision !== null) {
      return decision;
    }
  }
  return undefined;
}

test("returns a named ChatMiddleware with onGuardToolCall (not a raw function)", () => {
  const { client } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  assert.equal(typeof mw, "object");
  assert.equal(typeof mw.name, "string");
  assert.ok(mw.name.startsWith("arcjet-guard-"));
  assert.equal(typeof mw.onGuardToolCall, "function");
  assert.equal("onBeforeToolCall" in mw, false);
  assert.equal("onInterruptBoundary" in mw, false);
  assert.equal("contentGuardMiddleware" in mw, false);
});

test("each call gets a unique name so two instances do not collide", () => {
  const { client } = stubClient(decisionAllow());
  const a = guardMiddleware(client);
  const b = guardMiddleware(client);
  assert.notEqual(a.name, b.name);
});

test("ALLOW → void decision so the tool can run", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolHook("lookup"));
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 1);
});

test("skip-deny: DENY → { type: skip, result: ArcjetDenialResult }", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolHook("lookup", { note: "x" }));
  assert.ok(result && typeof result === "object" && "type" in result);
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  const denial = asDenial<ArcjetDenialResult>(decision.result);
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
});

test("abort-deny: onDeny abort → { type: abort, reason }", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const mw = guardMiddleware(client, { action: "tool.invoked", onDeny: "abort" });
  const result = await runHook(mw, toolHook("lookup", { note: "x" }));
  assert.ok(result && typeof result === "object" && "type" in result);
  const decision = result as { type: string; reason?: string };
  assert.equal(decision.type, "abort");
  assert.equal(typeof decision.reason, "string");
  assert.match(String(decision.reason), /PROMPT_INJECTION/);
});

test("rules see hookCtx.args, not the opaque toolCallId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let scanned: unknown;
  const mw = guardMiddleware(client, {
    action: "note.read",
    rules: ({ input, toolName }) => {
      scanned = { input, toolName };
      return [fakeRule];
    },
  });
  await runHook(mw, toolHook("lookup", { note: "hello" }));
  assert.deepEqual(scanned, { input: { note: "hello" }, toolName: "lookup" });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("correlation comes from chat({ context }).sessionId before threadId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(mw, toolHook("lookup"), middlewareCtx({ sessionId: "sess-mw" }, "thread-caller"));
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-mw");
});

test("policy.sessionId is used when chat context has none, before threadId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    sessionId: "policy-sess",
  });
  await runHook(mw, toolHook("lookup"), middlewareCtx({}, "thread-caller"));
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("chat({ threadId }) is the last correlation fallback", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(mw, toolHook("lookup"), middlewareCtx({}, "thread-caller"));
  const call = recorded(guardCalls[0]);
  assert.equal(call["correlationId"], "thread-caller");
  assert.deepEqual(call["metadata"], {
    "tanstack-ai.thread": "thread-caller",
    "tanstack-ai.tool": "lookup",
  });
});

test("never-mint: does not mint a correlation id when nothing is present", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(mw, toolHook("lookup"), middlewareCtx({}));
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("never-mint: does not use requestId / streamId / runId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(mw, toolHook("lookup"), {
    requestId: "req-auto",
    streamId: "stream-auto",
    runId: "run-auto",
    context: {},
  });
  const call = recorded(guardCalls[0]);
  assert.equal("correlationId" in call, false);
});

test("fail-closed unavailable → skip with ERROR payload", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolHook("lookup"));
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).reason, "ERROR");
});

test("onGuardError allow → void so the tool still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked", onGuardError: "allow" });
  const result = await runHook(mw, toolHook("lookup"));
  assert.equal(result, undefined);
});

test("policy factory throw fail-closes and does not throw from the hook", async () => {
  const { client } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await runHook(mw, toolHook("lookup"));
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).reason, "ERROR");
});

test("onDeny abort does not abort unavailable: fail-open stays skip", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked", onDeny: "abort" });
  const result = await runHook(mw, toolHook("lookup"));
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).reason, "ERROR");
});

test("onDeny abort does not abort unavailable: policy factory throw stays skip", async () => {
  const { client } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    onDeny: "abort",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await runHook(mw, toolHook("lookup"));
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).reason, "ERROR");
});

test("onDeny abort does not abort unavailable: thrown guard() stays skip", async () => {
  const { client } = stubClient(new Error("transport down"));
  const mw = guardMiddleware(client, { action: "tool.invoked", onDeny: "abort" });
  const result = await runHook(mw, toolHook("lookup"));
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).reason, "ERROR");
});

test("no-throw: a throwing guard() becomes a skip denial, not a thrown error", async () => {
  const { client } = stubClient(new Error("transport down"));
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolHook("lookup"));
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).reason, "ERROR");
});

test("skips a sibling guardTool-branded tool so Guard is not double-called", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const branded = { name: "lookup_order" };
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolHook("lookup_order", {}, branded));
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 0);
});

test("still gates an unwrapped tool when hookCtx.tool is undefined", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolHook("mcp_search"));
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).arcjetDenied, true);
});

test("inbound guard() before chat() is a separate call; middleware still gates tools", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const inbound = await client.guard({
    label: "message.received",
    rules: [],
  });
  assert.equal(inbound.hasFailedOpen(), false);

  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(mw, toolHook("lookup"));
  assert.equal(guardCalls.length, 2);
  assert.equal(recorded(guardCalls[0])["label"], "message.received");
  assert.equal(recorded(guardCalls[1])["label"], "tool.invoked");
});

test("a non-tool-call hook context is passed through without a guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, { text: "not a tool" });
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 0);
});

test("guard tier: an earlier guard's decision stops the call before Arcjet runs", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const earlier = {
    name: "earlier-guard",
    onGuardToolCall: async () => ({ type: "skip" as const, result: { denied: "earlier" } }),
  };
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await guardTier([earlier, mw], middlewareCtx(), toolHook("lookup"));
  assert.deepEqual(result, { type: "skip", result: { denied: "earlier" } });
  assert.equal(guardCalls.length, 0);
});

test("guard tier: an Arcjet ALLOW lets later guards run", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let later = 0;
  const laterMw = {
    name: "later",
    onGuardToolCall: async () => {
      later += 1;
    },
  };
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await guardTier([mw, laterMw], middlewareCtx(), toolHook("lookup"));
  assert.equal(result, undefined);
  assert.equal(later, 1);
  assert.equal(guardCalls.length, 1);
});

test("guard tier: an Arcjet deny stops later guards", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  let later = 0;
  const laterMw = {
    name: "later",
    onGuardToolCall: async () => {
      later += 1;
    },
  };
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await guardTier([mw, laterMw], middlewareCtx(), toolHook("lookup"));
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).arcjetDenied, true);
  assert.equal(later, 0);
  assert.equal(guardCalls.length, 1);
});

test("action callback names the guard call from the tool name", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });
  await runHook(mw, toolHook("mcp_search"));
  assert.equal(recorded(guardCalls[0])["label"], "mcp_search.invoked");
});

test("defaults the guard label to tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client);
  await runHook(mw, toolHook("mcp_search"));
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("sessionId callback receives the tool name and input", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let seen: unknown;
  const mw = guardMiddleware(client, {
    sessionId: (call) => {
      seen = call;
      return "sess-from-callback";
    },
  });
  await runHook(mw, toolHook("mcp_search", { q: "hello" }), middlewareCtx({}));
  assert.deepEqual(seen, { toolName: "mcp_search", input: { q: "hello" } });
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-from-callback");
});

test("resolves actor and typed inputs onto the guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    actor: (_call, ctx) => String((ctx.context as { sessionId?: string } | undefined)?.sessionId),
    inputs: (call) => ({
      id: policyInput.server.string(String((call.input as { id?: string }).id)),
    }),
  });
  await runHook(mw, toolHook("lookup", { id: "one" }));
  assert.equal(recorded(guardCalls[0]).actor, "sess-1");
  assert.deepEqual(recorded(guardCalls[0]).inputs, {
    id: policyInput.server.string("one"),
  });
});

test("an input resolver failure follows the fail-closed unavailable path", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    inputs: () => {
      throw new Error("mapping failed");
    },
  });
  const result = await runHook(mw, toolHook("lookup", { id: "one" }));
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).reason, "ERROR");
  assert.equal(guardCalls.length, 1);
  assert.equal("inputs" in recorded(guardCalls[0]), false);
});

function withWarnings<T>(fn: () => T): { result: T; warnings: unknown[][] } {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  try {
    return { result: fn(), warnings };
  } finally {
    console.warn = originalWarn;
  }
}

test("onStart does nothing on a 1.x context (it has retry)", () => {
  const { client } = stubClient(decisionAllow());
  const mw = guardMiddleware(client);
  const aborts: unknown[] = [];
  const ctx = {
    ...middlewareCtx(),
    retry: () => {},
    abort: (reason?: string) => aborts.push(reason),
  };
  const { warnings } = withWarnings(() => mw.onStart(ctx as never));
  assert.equal(aborts.length, 0);
  assert.equal(warnings.length, 0);
});

test("onStart warns and aborts on a 0.x context (no retry)", () => {
  const { client } = stubClient(decisionAllow());
  const mw = guardMiddleware(client);
  const aborts: unknown[] = [];
  const ctx = { ...middlewareCtx(), abort: (reason?: string) => aborts.push(reason) };
  const { warnings } = withWarnings(() => mw.onStart(ctx as never));
  assert.equal(aborts.length, 1);
  assert.match(String(aborts[0]), /needs @tanstack\/ai 1\.x/);
  assert.equal(warnings.length, 1);
});

test("onStart only warns on a 0.x context with onGuardError allow", () => {
  const { client } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { onGuardError: "allow" });
  const aborts: unknown[] = [];
  const ctx = { ...middlewareCtx(), abort: (reason?: string) => aborts.push(reason) };
  const { warnings } = withWarnings(() => mw.onStart(ctx as never));
  assert.equal(aborts.length, 0);
  assert.equal(warnings.length, 1);
});

test("onStart does not throw on a context without abort", () => {
  const { client } = stubClient(decisionAllow());
  const mw = guardMiddleware(client);
  const { warnings } = withWarnings(() => mw.onStart({} as never));
  assert.equal(warnings.length, 1);
});

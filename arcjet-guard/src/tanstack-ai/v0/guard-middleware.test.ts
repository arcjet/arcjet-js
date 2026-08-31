// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/explicit-function-return-type, eslint/require-await, eslint/strict-boolean-expressions, typescript/strict-boolean-expressions, unicorn/no-useless-undefined, unicorn/no-object-as-default-parameter -- test infrastructure and mocks
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
import { guardMiddleware } from "./guard-middleware.ts";
import type { TanStackAiGuardMiddleware } from "./guard-middleware.ts";

function middlewareCtx(context: unknown = { sessionId: "sess-1" }) {
  return {
    requestId: "req-auto",
    streamId: "stream-auto",
    threadId: "thread-auto",
    conversationId: "thread-auto",
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
  const hook = mw.onBeforeToolCall;
  assert.ok(hook, "guardMiddleware must install onBeforeToolCall");
  return hook(ctx as never, hookCtx as never);
}

/**
 * TanStack 0.52 `MiddlewareRunner.runOnBeforeToolCall`: first non-void /
 * non-null decision wins.
 */
async function firstWin(
  middlewares: Array<{
    onBeforeToolCall?: (...args: never[]) => unknown;
  }>,
  ctx: unknown,
  hookCtx: unknown,
): Promise<unknown> {
  for (const mw of middlewares) {
    if (mw.onBeforeToolCall === undefined) {
      continue;
    }
    const decision = await mw.onBeforeToolCall(ctx as never, hookCtx as never);
    if (decision !== undefined && decision !== null) {
      return decision;
    }
  }
  return undefined;
}

test("returns a named ChatMiddleware with onBeforeToolCall (not a raw function)", () => {
  const { client } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  assert.equal(typeof mw, "object");
  assert.equal(typeof mw.name, "string");
  assert.ok(mw.name.startsWith("arcjet-guard-"));
  assert.equal(typeof mw.onBeforeToolCall, "function");
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

test("correlation comes from chat({ context }).sessionId, never threadId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(mw, toolHook("lookup"), middlewareCtx({ sessionId: "sess-mw" }));
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-mw");
});

test("policy.sessionId is used when chat context has none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    sessionId: "policy-sess",
  });
  await runHook(mw, toolHook("lookup"), middlewareCtx({}));
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("never-mint: does not mint a correlation id when nothing is present", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(mw, toolHook("lookup"), middlewareCtx({}));
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("never-mint: does not use auto-generated threadId / requestId / streamId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(mw, toolHook("lookup"), {
    requestId: "req-auto",
    streamId: "stream-auto",
    threadId: "thread-auto",
    conversationId: "thread-auto",
    runId: "run-auto",
    context: {},
  });
  const call = recorded(guardCalls[0]);
  assert.equal("correlationId" in call, false);
  assert.notEqual(call["correlationId"], "thread-auto");
  assert.notEqual(call["correlationId"], "req-auto");
  assert.notEqual(call["correlationId"], "stream-auto");
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

test("no-throw: a throwing guard() becomes a skip denial, not a thrown error", async () => {
  const { client } = stubClient(new Error("transport down"));
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolHook("lookup"));
  const decision = result as { type: string; result: unknown };
  assert.equal(decision.type, "skip");
  assert.equal(asDenial<ArcjetDenialResult>(decision.result).reason, "ERROR");
});

test("inbound brand-skip: a branded tool skips so a preceding guard() is not double-called", async () => {
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

test("first-win: a preceding skip wins and Guard never runs", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const cache = {
    name: "tool-cache",
    onBeforeToolCall: async () => ({ type: "skip" as const, result: { cached: true } }),
  };
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await firstWin([cache, mw], middlewareCtx(), toolHook("lookup"));
  assert.deepEqual(result, { type: "skip", result: { cached: true } });
  assert.equal(guardCalls.length, 0);
});

test("first-win: Arcjet first deny wins and later middleware never runs", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  let later = 0;
  const laterMw = {
    name: "later",
    onBeforeToolCall: async () => {
      later += 1;
      return { type: "skip" as const, result: { later: true } };
    },
  };
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await firstWin([mw, laterMw], middlewareCtx(), toolHook("lookup"));
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

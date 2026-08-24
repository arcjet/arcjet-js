// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/explicit-function-return-type, eslint/require-await, eslint/strict-boolean-expressions, typescript/strict-boolean-expressions, unicorn/no-useless-undefined, unicorn/no-object-as-default-parameter -- test infrastructure and mocks
import assert from "node:assert/strict";
import { test } from "node:test";

import { recorded } from "../../../test/_shared/source-scan.ts";
import { decisionAllow, decisionDenyPromptInjection, fakeRule, stubClient } from "../../../test/_shared/stub-client.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import { guardMiddleware } from "./guard-middleware.ts";
import { guardTool } from "./guard-tool.ts";
import type { LangChainTool } from "./guard-tool.ts";

const MIDDLEWARE_BRAND = Symbol.for("AgentMiddleware");

function toolRequest(name: string, args: unknown = {}, id = "call-1") {
  return {
    toolCall: { name, args, id, type: "tool_call" as const },
    tool: { name },
    runtime: { configurable: { thread_id: "thread-1" } },
    state: { messages: [] },
  };
}

async function runHook(
  mw: ReturnType<typeof guardMiddleware>,
  request: unknown,
  handler: (request: unknown) => Promise<unknown>,
): Promise<unknown> {
  return mw.wrapToolCall(request, handler);
}

test("returns a named object with wrapToolCall (not a raw function)", () => {
  const { client } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  assert.equal(typeof mw, "object");
  assert.equal(typeof mw.name, "string");
  assert.ok(mw.name.startsWith("arcjet-guard-"));
  assert.equal(typeof mw.wrapToolCall, "function");
  assert.equal((mw as unknown as Record<symbol, unknown>)[MIDDLEWARE_BRAND], true);
  assert.equal("afterModel" in mw, false);
  assert.equal("wrapModelCall" in mw, false);
});

test("each call gets a unique name so two instances do not collide", () => {
  const { client } = stubClient(decisionAllow());
  const a = guardMiddleware(client);
  const b = guardMiddleware(client);
  assert.notEqual(a.name, b.name);
});

test("ALLOW → handler is called and its result is returned", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let calls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolRequest("lookup"), async () => {
    calls += 1;
    return { ok: true };
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
  assert.equal(guardCalls.length, 1);
});

test("rules see toolCall.args, not the opaque id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let scanned: unknown;
  const mw = guardMiddleware(client, {
    action: "note.read",
    rules: ({ input, toolName }) => {
      scanned = { input, toolName };
      return [fakeRule];
    },
  });
  await runHook(mw, toolRequest("lookup", { note: "hello" }, "ref-opaque"), async () => ({
    ok: true,
  }));
  assert.deepEqual(scanned, { input: { note: "hello" }, toolName: "lookup" });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("correlation comes from runtime.configurable.thread_id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(mw, toolRequest("lookup"), async () => ({ ok: true }));
  assert.equal(recorded(guardCalls[0])["correlationId"], "thread-1");
});

test("policy.sessionId is used when runtime has no thread_id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    sessionId: "policy-sess",
  });
  await runHook(
    mw,
    {
      toolCall: { name: "lookup", args: {}, id: "c1" },
      tool: { name: "lookup" },
      runtime: { configurable: {} },
    },
    async () => ({ ok: true }),
  );
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("does not mint a correlation id when nothing is present", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(
    mw,
    {
      toolCall: { name: "lookup", args: {}, id: "c1" },
      tool: { name: "lookup" },
      runtime: {},
    },
    async () => ({ ok: true }),
  );
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("skips an already-branded tool on request.tool", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const branded = { name: "lookup_order" };
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  let calls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(
    mw,
    {
      toolCall: { name: "lookup_order", args: {}, id: "c1" },
      tool: branded,
      runtime: { configurable: { thread_id: "t" } },
    },
    async () => {
      calls += 1;
      return { ran: true };
    },
  );
  assert.equal(calls, 1);
  assert.equal(guardCalls.length, 0);
  assert.deepEqual(result, { ran: true });
});

test("guardTool-wrapped fake is skipped when present on request.tool", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const raw: LangChainTool = {
    name: "authored",
    func: async () => ({ ok: true }),
    invoke: async () => ({ ok: true }),
  };
  const wrapped = guardTool(client, raw, { action: "order.looked-up" });
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  let nextCalls = 0;
  await runHook(
    mw,
    {
      toolCall: { name: "authored", args: {}, id: "c1" },
      tool: wrapped,
      runtime: { configurable: { thread_id: "s" } },
    },
    async () => {
      nextCalls += 1;
      return { ok: true };
    },
  );
  assert.equal(nextCalls, 1);
  assert.equal(guardCalls.length, 0);
});

test("a non-tool-call request is passed through without a guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  let calls = 0;
  const result = await runHook(mw, { text: "not a tool" }, async (req) => {
    calls += 1;
    return req;
  });
  assert.equal(calls, 1);
  assert.equal(guardCalls.length, 0);
  assert.deepEqual(result, { text: "not a tool" });
});

test("action callback names the guard call from the tool name", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });
  await runHook(mw, toolRequest("mcp_search"), async () => ({ ok: true }));
  assert.equal(recorded(guardCalls[0])["label"], "mcp_search.invoked");
});

test("defaults the guard label to tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client);
  await runHook(mw, toolRequest("mcp_search"), async () => ({ ok: true }));
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
  await runHook(
    mw,
    {
      toolCall: { name: "mcp_search", args: { q: "hello" }, id: "c1" },
      tool: { name: "mcp_search" },
      runtime: {},
    },
    async () => ({ ok: true }),
  );
  assert.deepEqual(seen, { toolName: "mcp_search", input: { q: "hello" } });
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-from-callback");
});

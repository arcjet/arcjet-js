// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/explicit-function-return-type, eslint/require-await, eslint/strict-boolean-expressions, typescript/strict-boolean-expressions, typescript/unbound-method, unicorn/no-useless-undefined, unicorn/no-object-as-default-parameter -- test infrastructure and mocks
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
import { guardPlugin } from "./guard-plugin.ts";
import type { GoogleAdkGuardPlugin } from "./guard-plugin.ts";

function toolContext(context: unknown = { sessionId: "sess-1" }) {
  return {
    invocationId: "inv-auto",
    sessionId: "sess-auto",
    functionCallId: "call-auto",
    userId: "user-auto",
    context,
  };
}

function beforeToolParams(name: string, args: Record<string, unknown> = {}, tool?: object) {
  return {
    tool: tool ?? { name },
    toolArgs: args,
    toolContext: toolContext(),
  };
}

async function runHook(plugin: GoogleAdkGuardPlugin, params: unknown) {
  assert.ok(plugin.beforeToolCallback, "guardPlugin must install beforeToolCallback");
  return plugin.beforeToolCallback(params as never);
}

/**
 * ADK 2.0.0 `PluginManager.runCallbacks`: first non-undefined result
 * wins and remaining plugins are skipped.
 */
async function firstWin(
  plugins: Array<{
    beforeToolCallback?: (params: never) => unknown;
  }>,
  params: unknown,
): Promise<unknown> {
  for (const plugin of plugins) {
    if (plugin.beforeToolCallback === undefined) {
      continue;
    }
    const decision = await plugin.beforeToolCallback(params as never);
    if (decision !== undefined) {
      return decision;
    }
  }
  return undefined;
}

test("returns a named BasePlugin with beforeToolCallback (not a raw function)", () => {
  const { client } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  assert.equal(typeof plugin, "object");
  assert.equal(typeof plugin.name, "string");
  assert.ok(plugin.name.startsWith("arcjet-guard-"));
  assert.equal(typeof plugin.beforeToolCallback, "function");
  assert.equal(typeof plugin.onUserMessageCallback, "function");
  assert.equal(typeof plugin.beforeModelCallback, "function");
});

test("each call gets a unique name so two instances do not collide", () => {
  const { client } = stubClient(decisionAllow());
  const a = guardPlugin(client);
  const b = guardPlugin(client);
  assert.notEqual(a.name, b.name);
});

test("ALLOW → undefined so the tool can run", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const result = await runHook(plugin, beforeToolParams("lookup"));
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 1);
});

test("deny-dict skip: DENY → ArcjetDenialResult, never undefined", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const result = await runHook(plugin, beforeToolParams("lookup", { note: "x" }));
  assert.notEqual(result, undefined);
  const denial = asDenial<ArcjetDenialResult>(result);
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
});

test("rules see toolArgs, not the opaque functionCallId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let scanned: unknown;
  const plugin = guardPlugin(client, {
    action: "note.read",
    rules: ({ input, toolName }) => {
      scanned = { input, toolName };
      return [fakeRule];
    },
  });
  await runHook(plugin, beforeToolParams("lookup", { note: "hello" }));
  assert.deepEqual(scanned, { input: { note: "hello" }, toolName: "lookup" });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("correlation comes from nested context.sessionId, never invocationId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  await runHook(plugin, {
    tool: { name: "lookup" },
    toolArgs: {},
    toolContext: toolContext({ sessionId: "sess-mw" }),
  });
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-mw");
});

test("policy.sessionId is used when tool context has none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, {
    action: "tool.invoked",
    sessionId: "policy-sess",
  });
  await runHook(plugin, {
    tool: { name: "lookup" },
    toolArgs: {},
    toolContext: toolContext({}),
  });
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("never-mint: does not mint a correlation id when nothing is present", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  await runHook(plugin, {
    tool: { name: "lookup" },
    toolArgs: {},
    toolContext: toolContext({}),
  });
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("never-mint: does not use auto-generated sessionId / invocationId / functionCallId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  await runHook(plugin, {
    tool: { name: "lookup" },
    toolArgs: {},
    toolContext: {
      invocationId: "inv-auto",
      sessionId: "sess-auto",
      functionCallId: "call-auto",
      userId: "user-auto",
      context: {},
    },
  });
  const call = recorded(guardCalls[0]);
  assert.equal("correlationId" in call, false);
  assert.notEqual(call["correlationId"], "sess-auto");
  assert.notEqual(call["correlationId"], "inv-auto");
  assert.notEqual(call["correlationId"], "call-auto");
});

test("fail-closed unavailable → deny dict with ERROR, never undefined", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const result = await runHook(plugin, beforeToolParams("lookup"));
  assert.notEqual(result, undefined);
  assert.equal(asDenial<ArcjetDenialResult>(result).reason, "ERROR");
});

test("onGuardError allow → undefined so the tool still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const plugin = guardPlugin(client, { action: "tool.invoked", onGuardError: "allow" });
  const result = await runHook(plugin, beforeToolParams("lookup"));
  assert.equal(result, undefined);
});

test("policy factory throw fail-closes and does not throw from the callback", async () => {
  const { client } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, {
    action: "tool.invoked",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await runHook(plugin, beforeToolParams("lookup"));
  assert.notEqual(result, undefined);
  assert.equal(asDenial<ArcjetDenialResult>(result).reason, "ERROR");
});

test("no-throw: a throwing guard() becomes a deny dict, not a thrown error", async () => {
  const { client } = stubClient(new Error("transport down"));
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const result = await runHook(plugin, beforeToolParams("lookup"));
  assert.notEqual(result, undefined);
  assert.equal(asDenial<ArcjetDenialResult>(result).reason, "ERROR");
});

test("fail-closed: thrown guard() never returns undefined", async () => {
  const { client } = stubClient(new Error("transport down"));
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const result = await runHook(plugin, beforeToolParams("lookup"));
  assert.notEqual(result, undefined);
  assert.equal(typeof result, "object");
});

test("skips a sibling guardTool-branded tool so Guard is not double-called", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const branded = { name: "lookup_order" };
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const result = await runHook(plugin, beforeToolParams("lookup_order", {}, branded));
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 0);
});

test("still gates an unwrapped tool", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const result = await runHook(plugin, beforeToolParams("mcp_search"));
  assert.notEqual(result, undefined);
  assert.equal(asDenial<ArcjetDenialResult>(result).arcjetDenied, true);
});

test("inbound guard() before Runner.run is a separate call; plugin still gates tools", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const inbound = await client.guard({
    label: "message.received",
    rules: [],
  });
  assert.equal(inbound.hasFailedOpen(), false);

  const plugin = guardPlugin(client, { action: "tool.invoked" });
  await runHook(plugin, beforeToolParams("lookup"));
  assert.equal(guardCalls.length, 2);
  assert.equal(recorded(guardCalls[0])["label"], "message.received");
  assert.equal(recorded(guardCalls[1])["label"], "tool.invoked");
});

test("inbound callbacks are no-ops so a preceding guard() does not double-call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const inbound = await plugin.onUserMessageCallback({} as never);
  const beforeModel = await plugin.beforeModelCallback({} as never);
  const beforeRun = await plugin.beforeRunCallback({} as never);
  assert.equal(inbound, undefined);
  assert.equal(beforeModel, undefined);
  assert.equal(beforeRun, undefined);
  assert.equal(guardCalls.length, 0);
});

test("a non-tool-call hook context is passed through without a guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const result = await runHook(plugin, { text: "not a tool" });
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 0);
});

test("first-plugin short-circuit: a preceding deny dict wins and Guard never runs", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const cache = {
    name: "cache",
    beforeToolCallback: async () => ({ cached: true }),
  };
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const result = await firstWin([cache, plugin], beforeToolParams("lookup"));
  assert.deepEqual(result, { cached: true });
  assert.equal(guardCalls.length, 0);
});

test("first-plugin short-circuit: Arcjet first deny wins and later plugins never run", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  let later = 0;
  const laterPlugin = {
    name: "later",
    beforeToolCallback: async () => {
      later += 1;
      return { later: true };
    },
  };
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const result = await firstWin([plugin, laterPlugin], beforeToolParams("lookup"));
  assert.equal(asDenial<ArcjetDenialResult>(result).arcjetDenied, true);
  assert.equal(later, 0);
  assert.equal(guardCalls.length, 1);
});

test("action callback names the guard call from the tool name", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });
  await runHook(plugin, beforeToolParams("mcp_search"));
  assert.equal(recorded(guardCalls[0])["label"], "mcp_search.invoked");
});

test("defaults the guard label to tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const plugin = guardPlugin(client);
  await runHook(plugin, beforeToolParams("mcp_search"));
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("sessionId callback receives the tool name and input", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let seen: unknown;
  const plugin = guardPlugin(client, {
    sessionId: (call) => {
      seen = call;
      return "sess-from-callback";
    },
  });
  await runHook(plugin, {
    tool: { name: "mcp_search" },
    toolArgs: { q: "hello" },
    toolContext: toolContext({}),
  });
  assert.deepEqual(seen, { toolName: "mcp_search", input: { q: "hello" } });
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-from-callback");
});

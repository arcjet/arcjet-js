// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-type-assertion, typescript/require-await, eslint/require-await, eslint/max-classes-per-file -- two BasePlugin fixtures for first-win
/**
 * Behaviour against the real `@google/adk` `PluginManager` /
 * `Context` / `State`, rather than the structural fakes in
 * `src/google-adk/v2/*.test.ts`.
 *
 * These assertions live outside `src/google-adk/` — that directory is
 * globbed by the google-adk-absent CI job and scanned for type-only
 * imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { BasePlugin, BaseTool } from "@google/adk";
import {
  BasePlugin as AdkBasePlugin,
  Context,
  InvocationContext,
  PluginManager,
  createSession,
} from "@google/adk";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardPlugin } from "../../src/google-adk/v2/guard-plugin.ts";
import { asDenial, recorded } from "../_shared/source-scan.ts";
import { decisionAllow, decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

function realToolContext(state: Record<string, unknown> = {}) {
  const session = createSession({
    id: "sess-auto",
    appName: "app",
    userId: "user-auto",
    state,
  });
  const invocationContext = new InvocationContext({
    invocationId: "inv-auto",
    session,
    pluginManager: new PluginManager([]),
  });
  return new Context({ invocationContext, functionCallId: "call-auto" });
}

function beforeToolParams(name: string, state: Record<string, unknown> = {}) {
  return {
    tool: { name } as BaseTool,
    toolArgs: { q: "hello" },
    toolContext: realToolContext(state),
  };
}

class CachePlugin extends AdkBasePlugin {
  constructor() {
    super("cache");
  }

  override async beforeToolCallback(): Promise<Record<string, unknown> | undefined> {
    return { cached: true };
  }
}

class LaterPlugin extends AdkBasePlugin {
  later = 0;

  constructor() {
    super("later");
  }

  override async beforeToolCallback(): Promise<Record<string, unknown> | undefined> {
    this.later += 1;
    return { later: true };
  }
}

test("real ADK Context has no nested context field", () => {
  const toolContext = realToolContext({ sessionId: "sess-state" });
  assert.equal(toolContext.invocationId, "inv-auto");
  assert.equal(toolContext.sessionId, "sess-auto");
  assert.equal("context" in toolContext, false);
  assert.equal((toolContext as { context?: unknown }).context, undefined);
  assert.equal(toolContext.state.toRecord()["sessionId"], "sess-state");
});

test("guardPlugin is a BasePlugin Runner({ plugins }) accepts without a cast", () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const plugins: BasePlugin[] = [guardPlugin(client)];
  assert.equal(typeof plugins[0]?.beforeToolCallback, "function");
  assert.equal(typeof plugins[0]?.name, "string");
});

test("PluginManager registers the duck-typed plugin by name", () => {
  const { client } = stubClient(decisionAllow());
  const plugin = guardPlugin(client);
  const manager = new PluginManager([plugin]);
  assert.equal(manager.getPlugin(plugin.name), plugin);
});

test("PluginManager first-plugin short-circuit: a preceding deny dict means Guard never runs", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const manager = new PluginManager([new CachePlugin(), guardPlugin(client)]);
  const result = await manager.runBeforeToolCallback(beforeToolParams("lookup"));
  assert.deepEqual(result, { cached: true });
  assert.equal(guardCalls.length, 0);
});

test("PluginManager first-plugin short-circuit: Arcjet first deny skips later plugins", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const later = new LaterPlugin();
  const manager = new PluginManager([guardPlugin(client, { action: "tool.invoked" }), later]);
  const result = await manager.runBeforeToolCallback(beforeToolParams("lookup"));
  assert.equal(asDenial<ArcjetDenialResult>(result).arcjetDenied, true);
  assert.equal(later.later, 0);
  assert.equal(guardCalls.length, 1);
});

test("PluginManager deny dict skips runAsync: ALLOW returns undefined", async () => {
  const { client } = stubClient(decisionAllow());
  const manager = new PluginManager([guardPlugin(client, { action: "tool.invoked" })]);
  const result = await manager.runBeforeToolCallback(beforeToolParams("lookup"));
  assert.equal(result, undefined);
});

test("PluginManager deny dict is the skip shape ADK treats as skip", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const manager = new PluginManager([guardPlugin(client, { action: "tool.invoked" })]);
  const result = await manager.runBeforeToolCallback(beforeToolParams("lookup"));
  assert.notEqual(result, undefined);
  assert.equal(asDenial<ArcjetDenialResult>(result).arcjetDenied, true);
});

test("PluginManager inbound no-ops do not throw and do not call Guard", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const plugin = guardPlugin(client, { action: "tool.invoked" });
  const manager = new PluginManager([plugin]);
  const toolContext = realToolContext();
  const invocationContext = toolContext.invocationContext;

  const inbound = await manager.runOnUserMessageCallback({
    userMessage: { role: "user", parts: [{ text: "hello" }] },
    invocationContext,
  });
  const beforeRun = await manager.runBeforeRunCallback({ invocationContext });
  await manager.runAfterRunCallback({ invocationContext });
  const beforeModel = await manager.runBeforeModelCallback({
    callbackContext: toolContext,
    llmRequest: { contents: [], liveConnectConfig: {}, toolsDict: {} },
  });

  assert.equal(inbound, undefined);
  assert.equal(beforeRun, undefined);
  assert.equal(beforeModel, undefined);
  assert.equal(guardCalls.length, 0);
});

test("real Context: policy.sessionId is the correlation id, never session auto-id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const manager = new PluginManager([
    guardPlugin(client, { action: "tool.invoked", sessionId: "policy-sess" }),
  ]);
  await manager.runBeforeToolCallback(beforeToolParams("lookup", { sessionId: "sess-stale" }));
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("real Context: durable state is used only when helper options have no id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const manager = new PluginManager([guardPlugin(client, { action: "tool.invoked" })]);
  await manager.runBeforeToolCallback(beforeToolParams("lookup", { sessionId: "sess-state" }));
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-state");
});

test("real Context: never reads Context.sessionId or invocationId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const manager = new PluginManager([guardPlugin(client, { action: "tool.invoked" })]);
  const toolContext = realToolContext();
  assert.equal(toolContext.sessionId, "sess-auto");
  assert.equal(toolContext.invocationId, "inv-auto");
  await manager.runBeforeToolCallback({
    tool: { name: "lookup" } as BaseTool,
    toolArgs: {},
    toolContext,
  });
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

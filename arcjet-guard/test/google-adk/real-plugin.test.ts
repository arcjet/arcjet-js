// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-type-assertion, typescript/require-await, eslint/require-await, eslint/max-classes-per-file -- two BasePlugin fixtures for first-win
/**
 * Behaviour against the real `@google/adk` `PluginManager` /
 * `BasePlugin`, rather than the structural fakes in
 * `src/google-adk/v2/*.test.ts`.
 *
 * These assertions live outside `src/google-adk/` — that directory is
 * globbed by the google-adk-absent CI job and scanned for type-only
 * imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { BasePlugin, BaseTool, Context } from "@google/adk";
import { BasePlugin as AdkBasePlugin, PluginManager } from "@google/adk";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardPlugin } from "../../src/google-adk/v2/guard-plugin.ts";
import { asDenial } from "../_shared/source-scan.ts";
import { decisionAllow, decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

function beforeToolParams(name: string) {
  return {
    tool: { name } as BaseTool,
    toolArgs: { q: "hello" },
    toolContext: {
      invocationId: "inv-auto",
      sessionId: "sess-auto",
      context: { sessionId: "sess-1" },
    } as Context,
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

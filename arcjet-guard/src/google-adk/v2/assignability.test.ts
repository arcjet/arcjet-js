/**
 * Compile-time assignability: the helpers accept the values a Google
 * ADK `Runner` app actually has, with no casts at the call site.
 *
 * The declarations are types only (`declare const`, never executed) so
 * this suite still runs in the google-adk-absent CI job, where the
 * peer is gone and the type-only import scan applies. Runtime
 * behaviour against the real `PluginManager` / `Runner` lives in
 * `test/google-adk/`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { BasePlugin } from "@google/adk";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { guardPlugin } from "./guard-plugin.ts";

declare const client: ArcjetAgentClient;

// Never called: the declarations above have no runtime value. Typecheck is
// the assertion.
function typeProbe(): void {
  const plugin = guardPlugin(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });

  const runnerOpts: { plugins?: BasePlugin[] } = {
    plugins: [plugin],
  };

  void [plugin, runnerOpts];
}

test("helpers accept a Runner({ plugins }) BasePlugin without casts", () => {
  assert.equal(typeof typeProbe, "function");
});

/**
 * Compile-time assignability: the helpers accept the values a Strands
 * Agents app actually has, with no casts at the call site.
 *
 * The declarations are types only (`declare const`, never executed) so
 * this suite still runs in the strands-agents-absent CI job, where the
 * peer is gone and the type-only import scan applies. Runtime
 * behaviour against the real `tool()` / `Agent` lives in
 * `test/strands-agents/`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { InvokableTool, Plugin } from "@strands-agents/sdk";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { guardHooks } from "./hooks.ts";
import { guardTool } from "./guard-tool.ts";

declare const client: ArcjetAgentClient;
declare const authoredTool: InvokableTool<{ orderNumber: string }, { status: string }>;

// Never called: the declarations above have no runtime value. Typecheck is
// the assertion.
function typeProbe(): void {
  const guarded: InvokableTool<{ orderNumber: string }, { status: string }> = guardTool(
    client,
    authoredTool,
    {
      action: "order.looked-up",
      rules: (input: { orderNumber: string }) => {
        void input.orderNumber;
        return [];
      },
    },
  );

  const plugin: Plugin = guardHooks(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });

  const agentOpts: { plugins?: Plugin[] } = {
    plugins: [plugin],
  };

  void [guarded, agentOpts];
}

test("helpers accept a real tool() result and Plugin slot without casts", () => {
  assert.equal(typeof typeProbe, "function");
});

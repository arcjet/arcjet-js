/**
 * Compile-time assignability: the helpers accept the values an OpenAI
 * Agents app actually has, with no casts at the call site.
 *
 * The declarations are types only (`declare const`, never executed) so this
 * suite still runs in the openai-agents-absent CI job, where the peer is
 * gone and the type-only import scan applies. Runtime behaviour against
 * the real `tool()` lives in `test/openai-agents/real-tool.test.ts`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { FunctionTool } from "@openai/agents";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { guardTool } from "./guard-tool.ts";

declare const client: ArcjetAgentClient;
declare const authoredTool: FunctionTool;

// Never called: the declarations above have no runtime value. Typecheck is
// the assertion.
function typeProbe(): void {
  const guarded: FunctionTool = guardTool(client, authoredTool, {
    action: "order.looked-up",
    rules: (input: { orderNumber: string }) => {
      void input.orderNumber;
      return [];
    },
  });

  void guarded;
}

test("helpers accept a real FunctionTool without casts", () => {
  assert.equal(typeof typeProbe, "function");
});

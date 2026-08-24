/**
 * Compile-time assignability: the helpers accept the values a LangChain
 * `createAgent` app actually has, with no casts at the call site.
 *
 * The declarations are types only (`declare const`, never executed) so
 * this suite still runs in the langchain-absent CI job, where the peers
 * are gone and the type-only import scan applies. Runtime behaviour
 * against the real `tool()` / `createAgent` lives in `test/langchain/`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { AgentMiddleware } from "langchain";
import type { DynamicStructuredTool, StructuredToolInterface } from "@langchain/core/tools";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { guardMiddleware } from "./guard-middleware.ts";
import { guardTool } from "./guard-tool.ts";

declare const client: ArcjetAgentClient;
declare const authoredTool: DynamicStructuredTool;

// Never called: the declarations above have no runtime value. Typecheck is
// the assertion.
function typeProbe(): void {
  const guarded: DynamicStructuredTool = guardTool(client, authoredTool, {
    action: "order.looked-up",
    rules: (input: { orderNumber: string }) => {
      void input.orderNumber;
      return [];
    },
  });

  const asStructured: StructuredToolInterface = guarded;

  const middleware = guardMiddleware(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });

  const createAgentOpts: { middleware?: AgentMiddleware[] } = {
    middleware: [middleware],
  };

  void [guarded, asStructured, createAgentOpts];
}

test("helpers accept a real tool() and createMiddleware-shaped result without casts", () => {
  assert.equal(typeof typeProbe, "function");
});

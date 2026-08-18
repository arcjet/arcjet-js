/**
 * Compile-time assignability: the helpers accept the values a LangGraph app
 * actually has, with no casts at the call site.
 *
 * This file exists because the first version of this namespace typed `invoke`
 * as a property rather than a method, which made its parameters contravariant
 * and rejected every real `DynamicStructuredTool` and `ToolNode` — a user
 * could only call the helpers by writing `as never`. Nothing below may cast
 * an argument or a helper's result: a cast is exactly what a user would have
 * been forced to write, so it would hide the regression this file catches.
 *
 * The declarations are types only (`declare const`, never executed) so this
 * suite still runs in the langgraph-absent CI job, where the peers are gone
 * and the type-only import scan applies. Runtime behaviour against the real
 * classes lives in `test/langgraph/real-tool-node.test.ts`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { DynamicStructuredTool, StructuredToolInterface } from "@langchain/core/tools";
import type { ToolNode } from "@langchain/langgraph/prebuilt";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { guardToolNode } from "./guard-tool-node.ts";
import { guardTool } from "./guard-tool.ts";

declare const client: ArcjetAgentClient;
declare const authoredTool: DynamicStructuredTool;
declare const toolNode: ToolNode;

// Never called: the declarations above have no runtime value. Typecheck is
// the assertion.
function typeProbe(): void {
  const guarded: DynamicStructuredTool = guardTool(client, authoredTool, {
    action: "order.looked-up",
  });

  // A guarded tool must still be usable everywhere the unguarded one was.
  const asStructured: StructuredToolInterface = guarded;
  const asNodeTools: ToolNode["tools"] = [guarded];

  // Both call shapes: an existing node, and a tools array.
  const guardedNode: ToolNode = guardToolNode(client, toolNode, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });
  const guardedTools: DynamicStructuredTool[] = guardToolNode(client, [authoredTool], {
    action: "tool.invoked",
  });

  void [guarded, asStructured, asNodeTools, guardedNode, guardedTools];
}

test("helpers accept real LangGraph values without casts", () => {
  assert.equal(typeof typeProbe, "function");
});

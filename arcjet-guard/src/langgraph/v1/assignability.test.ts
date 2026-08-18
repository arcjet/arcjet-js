/**
 * Compile-time assignability: LangGraph helpers fit the slots they document.
 *
 * Uses typed `const` declarations rather than casts on the helper output —
 * a cast of the result would make the test pass regardless. Vendor types
 * are imported so a rename on `ToolNode.tools` or `StructuredToolInterface.name`
 * fails this file's typecheck.
 */
import { test } from "node:test";

import type { StructuredToolInterface } from "@langchain/core/tools";
import type { ToolNode } from "@langchain/langgraph/prebuilt";

import { decisionAllow, stubClient } from "../../../test/_shared/stub-client.ts";
import { guardToolNode } from "./guard-tool-node.ts";
import type { LangGraphToolNodeLike } from "./guard-tool-node.ts";
import { guardTool } from "./guard-tool.ts";
import type { LangGraphTool } from "./guard-tool.ts";

test("helpers are assignable to LangGraph tool / ToolNode slots", () => {
  const { client } = stubClient(decisionAllow());

  const tool: LangGraphTool<{ id: string }> = {
    name: "assignability-tool",
    description: "assignability",
    func: (input: { id: string }) => Promise.resolve({ ok: input.id.length > 0 }),
    invoke: (input: unknown) => Promise.resolve(input),
  };
  const wrapped: LangGraphTool<{ id: string }> = guardTool(client, tool, {
    action: "thing.read",
  });

  const toolName: StructuredToolInterface["name"] = wrapped.name;

  const nodeTool: LangGraphTool = {
    name: "node-tool",
    invoke: (input: unknown) => Promise.resolve(input),
  };
  const node: LangGraphToolNodeLike = {
    tools: [nodeTool],
    invoke: (input: unknown, config?: unknown) => Promise.resolve(wrapped.invoke?.(input, config)),
  };
  const wrappedNode: LangGraphToolNodeLike = guardToolNode(client, node, {
    action: "tool.invoked",
  });
  const toolNodeTools: ToolNode["tools"] | LangGraphTool[] = wrappedNode.tools;

  void [toolName, toolNodeTools];
});

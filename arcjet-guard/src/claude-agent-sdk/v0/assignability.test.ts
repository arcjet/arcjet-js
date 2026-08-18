/**
 * Compile-time assignability: Claude helpers fit the slots they document.
 *
 * Uses typed `const` declarations rather than casts — a cast would make the
 * test pass regardless.
 */
import { test } from "node:test";

import type { Options, SdkMcpToolDefinition } from "@anthropic-ai/claude-agent-sdk";

import { decisionAllow, stubClient } from "../../../test/_shared/stub-client.ts";
import { guardTool } from "./guard-tool.ts";
import { guardHooks } from "./hooks.ts";

test("helpers are assignable to Claude Agent SDK tool / hooks slots", () => {
  const { client } = stubClient(decisionAllow());

  const hooks: NonNullable<Options["hooks"]> = guardHooks(client, { action: "tool.invoked" });

  const tool: SdkMcpToolDefinition = {
    name: "assignability-tool",
    description: "assignability",
    inputSchema: {},
    handler: (input: Record<string, unknown>) => {
      const id = input["id"];
      const text = typeof id === "string" ? id : "";
      return Promise.resolve({
        content: [{ type: "text", text }],
      });
    },
  };
  const wrapped: SdkMcpToolDefinition = guardTool(client, tool, {
    action: "thing.read",
  });

  void [hooks, wrapped];
});

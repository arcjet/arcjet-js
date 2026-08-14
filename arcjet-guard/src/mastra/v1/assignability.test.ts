/**
 * Compile-time assignability: Mastra helpers fit the slots they document.
 *
 * Uses typed `const` declarations rather than casts — a cast would make the
 * test pass regardless.
 */
import { test } from "node:test";

import type { AgentConfig } from "@mastra/core/agent";
import type {
  InputProcessorOrWorkflow,
  OutputProcessorOrWorkflow,
  Processor,
} from "@mastra/core/processors";
import type { ToolAction, ToolHooks } from "@mastra/core/tools";

import { decisionAllow, stubClient } from "../../../test/_shared/stub-client.ts";
import { guardProcessor } from "./guard-processor.ts";
import { guardTool } from "./guard-tool.ts";
import { guardHooks } from "./hooks.ts";

test("helpers are assignable to Mastra Agent / Processor / Tool slots", () => {
  const { client } = stubClient(decisionAllow());

  const processor = guardProcessor(client, { action: "message.received" });
  const asProcessor: Processor = processor;

  const hooks: ToolHooks = guardHooks(client, { action: "tool.invoked" });

  const tool: ToolAction<{ id: string }, { ok: boolean }> = {
    id: "assignability-tool",
    description: "assignability",
    execute: (input: { id: string }) => Promise.resolve({ ok: input.id.length > 0 }),
  };
  const wrapped: ToolAction<{ id: string }, { ok: boolean }> = guardTool(client, tool, {
    action: "thing.read",
  });

  const inputProcessors: InputProcessorOrWorkflow[] = [processor];
  const outputProcessors: OutputProcessorOrWorkflow[] = [processor];
  const agentHooks: NonNullable<AgentConfig["hooks"]> = hooks;
  const step: NonNullable<Processor["processInputStep"]> = processor.processInputStep;

  void [asProcessor, hooks, wrapped, inputProcessors, outputProcessors, agentHooks, step];
});

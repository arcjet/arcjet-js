// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await -- cases pass deliberately ill-typed callbacks through the policy
import type { ToolAction } from "@mastra/core/tools";

import {
  callbackFailureCases,
  captureOnlyCallbackFailureCases,
} from "../../../test/_shared/callback-failures.ts";
import { guardProcessor } from "./guard-processor.ts";
import { guardTool } from "./guard-tool.ts";
import type { GuardToolPolicy } from "./guard-tool.ts";
import { guardHooks } from "./hooks.ts";

callbackFailureCases({
  name: "mastra guardTool",
  action: "test.executed",
  metadata: true,
  sessionId: false,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    const testTool = {
      id: "test-tool",
      description: "test tool",
      execute: async () => {
        ran = true;
        return { ok: true };
      },
    } as unknown as ToolAction<{ id: string }, { ok: boolean }>;
    const wrapped = guardTool(client, testTool, {
      action: "test.executed",
      ...policy,
    } as GuardToolPolicy<{ id: string }>);
    await wrapped.execute!({ id: "one" }, {} as never);
    return ran;
  },
});

callbackFailureCases({
  name: "mastra guardHooks beforeToolCall",
  action: "tool.invoked",
  fallbackAction: "tool.invoked",
  metadata: true,
  sessionId: false,
  allowedOutcome: "allowed",
  degradedOutcome: "allowed",
  async run(client, policy) {
    const hooks = guardHooks(client, policy as never);
    const result = await hooks.beforeToolCall!({
      toolName: "mcp_search",
      input: { q: "1" },
      context: {},
    });
    return result === undefined;
  },
});

callbackFailureCases({
  name: "mastra guardProcessor",
  action: "message.received",
  metadata: true,
  sessionId: false,
  allowedOutcome: "allowed",
  degradedOutcome: "allowed",
  async run(client, policy) {
    const processor = guardProcessor(client, { action: "message.received", ...policy } as never);
    const abort = ((reason?: string): never => {
      throw new Error(`tripwire:${reason ?? ""}`);
    }) as never;
    try {
      await processor.processInput({
        messages: [{ role: "user", content: { parts: [{ type: "text", text: "hello" }] } }],
        abort,
        systemMessages: [],
        state: {},
        messageList: {},
        retryCount: 0,
      } as never);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("tripwire:")) {
        return false;
      }
      throw error;
    }
    return true;
  },
});

for (const { outcome, error } of [
  { outcome: "success", error: undefined },
  { outcome: "error", error: new Error("tool failed") },
]) {
  captureOnlyCallbackFailureCases({
    name: `mastra guardHooks afterToolCall (${outcome})`,
    action: "tool.invoked",
    outcome,
    async run(client, policy) {
      const hooks = guardHooks(client, policy as never);
      await hooks.afterToolCall!({
        toolName: "mcp_search",
        input: { q: "1" },
        context: {},
        ...(error === undefined ? { output: { hits: 1 } } : { error }),
      });
    },
  });
}

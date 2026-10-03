// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await, eslint/explicit-function-return-type -- cases pass deliberately ill-typed callbacks through the policy
import { callbackFailureCases } from "../../../test/_shared/callback-failures.ts";
import { guardTool } from "./guard-tool.ts";
import { createBeforeToolCallHandler } from "./hooks.ts";

callbackFailureCases({
  name: "strands-agents guardTool",
  action: "order.looked-up",
  metadata: true,
  sessionId: true,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    const callback = async (_input: unknown, _context?: unknown) => {
      ran = true;
      return { ok: true };
    };
    const tool = {
      name: "test-tool",
      description: "test",
      toolSpec: { name: "test-tool" },
      _callback: callback,
    };
    const wrapped = guardTool(client, tool, { action: "order.looked-up", ...policy } as never);
    await wrapped._callback(
      { note: "hello" },
      { invocationState: {}, toolUse: { name: "test-tool", toolUseId: "tu-1", input: {} } },
    );
    return ran;
  },
});

callbackFailureCases({
  name: "strands-agents guardHooks BeforeToolCallEvent",
  action: "tool.invoked",
  fallbackAction: "tool.invoked",
  metadata: true,
  sessionId: true,
  allowedOutcome: "allowed",
  degradedOutcome: "allowed",
  async run(client, policy) {
    const handler = createBeforeToolCallHandler(client, policy as never);
    const event = {
      toolUse: { name: "mcp_search", toolUseId: "tu-1", input: { q: "1" } },
      invocationState: { sessionId: "sess-hooks" },
      cancel: false as boolean | string,
      interrupt: () => {
        throw new Error("interrupt() must not be called");
      },
    };
    await handler(event as never);
    return event.cancel === false;
  },
});

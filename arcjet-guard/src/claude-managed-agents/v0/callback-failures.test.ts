// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await, eslint/explicit-function-return-type -- cases pass deliberately ill-typed callbacks through the policy
import { callbackFailureCases } from "../../../test/_shared/callback-failures.ts";
import { guardCustomTool } from "./guard-custom-tool.ts";
import { guardEvents } from "./guard-events.ts";

callbackFailureCases({
  name: "claude-managed-agents guardCustomTool (event)",
  action: "order.looked-up",
  metadata: true,
  sessionId: false,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    await guardCustomTool(
      client,
      {
        event: {
          type: "agent.custom_tool_use",
          id: "sevt_tool_1",
          name: "lookup_order",
          input: { orderNumber: "1234" },
          processed_at: "2026-03-15T10:00:00Z",
        },
        execute: async () => {
          ran = true;
          return "ok";
        },
        send: async (result: unknown) => ({ data: [result] }),
      },
      { action: "order.looked-up", ...policy } as never,
    );
    return ran;
  },
});

callbackFailureCases({
  name: "claude-managed-agents guardCustomTool (runnable)",
  action: "order.looked-up",
  metadata: true,
  sessionId: false,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    const tool = {
      name: "lookup_order",
      run: async (_input: unknown) => {
        ran = true;
        return "ok";
      },
    };
    const wrapped = guardCustomTool(client, tool, {
      action: "order.looked-up",
      ...policy,
    } as never);
    try {
      await wrapped.run({ orderNumber: "1234" });
    } catch {
      // A refusal from a runnable tool is a thrown error.
      return false;
    }
    return ran;
  },
});

callbackFailureCases({
  name: "claude-managed-agents guardEvents",
  action: "message.received",
  // The inbound policy takes only a `rules` callback; `metadata` is static.
  metadata: false,
  sessionId: false,
  allowedOutcome: "allowed",
  degradedOutcome: "allowed",
  async run(client, policy) {
    const verdict = await guardEvents(
      client,
      {
        events: [{ type: "user.message", content: [{ type: "text", text: "hello" }] }],
        inbound: policy,
      } as never,
      async (body: unknown) => body,
    );
    return verdict.allowed;
  },
});

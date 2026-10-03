// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await, eslint/explicit-function-return-type -- cases pass deliberately ill-typed callbacks through the policy
import { callbackFailureCases } from "../../../test/_shared/callback-failures.ts";
import { guardMiddleware } from "./guard-middleware.ts";

callbackFailureCases({
  name: "tanstack-ai guardMiddleware",
  action: "tool.invoked",
  fallbackAction: "tool.invoked",
  metadata: true,
  sessionId: true,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    const mw = guardMiddleware(client, policy as never);
    const result = await mw.onBeforeToolCall!(
      { requestId: "req", streamId: "stream", threadId: "thread", context: {} } as never,
      {
        toolCall: { id: "call-1", type: "function", function: { name: "lookup", arguments: "{}" } },
        args: { note: "x" },
        toolName: "lookup",
        toolCallId: "call-1",
      } as never,
    );
    return result === undefined;
  },
});

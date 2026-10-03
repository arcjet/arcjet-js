// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await, eslint/explicit-function-return-type -- cases pass deliberately ill-typed callbacks through the policy
import { callbackFailureCases } from "../../../test/_shared/callback-failures.ts";
import { guardTool } from "./guard-tool.ts";

callbackFailureCases({
  name: "openai-agents guardTool",
  action: "order.looked-up",
  metadata: true,
  sessionId: true,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    const tool = {
      name: "test-tool",
      description: "test tool",
      type: "function" as const,
      invoke: async (_runContext: unknown, _input: string) => {
        ran = true;
        return { ok: true };
      },
    };
    const wrapped = guardTool(client, tool, { action: "order.looked-up", ...policy } as never);
    await wrapped.invoke({ context: { sessionId: "s" } }, JSON.stringify({ note: "hello" }));
    return ran;
  },
});

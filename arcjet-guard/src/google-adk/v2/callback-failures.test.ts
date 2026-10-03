// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await, eslint/explicit-function-return-type -- cases pass deliberately ill-typed callbacks through the policy
import { callbackFailureCases } from "../../../test/_shared/callback-failures.ts";
import { guardPlugin } from "./guard-plugin.ts";

callbackFailureCases({
  name: "google-adk guardPlugin",
  action: "tool.invoked",
  fallbackAction: "tool.invoked",
  metadata: true,
  sessionId: true,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    const plugin = guardPlugin(client, policy as never);
    const result = await plugin.beforeToolCallback!({
      tool: { name: "lookup" },
      toolArgs: { note: "x" },
      toolContext: { invocationId: "inv", sessionId: "sess", functionCallId: "call", context: {} },
    } as never);
    return result === undefined;
  },
});

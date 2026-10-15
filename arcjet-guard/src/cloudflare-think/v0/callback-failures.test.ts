// oxlint-disable eslint/no-unsafe-type-assertion -- cases pass deliberately ill-typed callbacks through the policy
import { callbackFailureCases } from "../../../test/_shared/callback-failures.ts";
import { guardHooks } from "./hooks.ts";

callbackFailureCases({
  name: "cloudflare-think guardHooks",
  action: "tool.invoked",
  fallbackAction: "tool.invoked",
  metadata: true,
  sessionId: true,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    const hooks = guardHooks(client, policy as never);
    const result = await hooks.beforeToolCall({
      toolName: "lookup",
      toolCallId: "call-1",
      input: { note: "x" },
      messages: [],
      abortSignal: undefined,
      stepNumber: 0,
    } as never);
    return result === undefined;
  },
});

// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await -- cases pass deliberately ill-typed callbacks through the policy
// The middleware builds its refusal as a `ToolMessage` from a dynamic import of
// `@langchain/core/messages`, so these cases need the peer installed and live
// here rather than under `src/`, which also runs with the peer removed.
import { guardMiddleware } from "../../src/langchain/v1/guard-middleware.ts";
import { callbackFailureCases } from "../_shared/callback-failures.ts";

callbackFailureCases({
  name: "langchain guardMiddleware",
  action: "tool.invoked",
  fallbackAction: "tool.invoked",
  metadata: true,
  sessionId: true,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    const mw = guardMiddleware(client, policy as never);
    const request = {
      toolCall: { name: "weather", args: { city: "x" }, id: "call-1" },
      tool: { name: "weather" },
      state: {},
      runtime: {},
    };
    const hook = mw.wrapToolCall as unknown as (
      request: unknown,
      handler: (request: unknown) => Promise<unknown>,
    ) => Promise<unknown>;
    await hook(request, async () => {
      ran = true;
      return { ok: true };
    });
    return ran;
  },
});

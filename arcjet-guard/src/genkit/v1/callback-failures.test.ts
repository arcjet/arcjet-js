// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await, eslint/explicit-function-return-type -- cases pass deliberately ill-typed callbacks through the policy
import { callbackFailureCases } from "../../../test/_shared/callback-failures.ts";
import { guardMiddleware } from "./guard-middleware.ts";
import { guardTool } from "./guard-tool.ts";

callbackFailureCases({
  name: "genkit guardTool",
  action: "order.looked-up",
  metadata: true,
  sessionId: true,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    const call = async () => {
      ran = true;
      return { ok: true };
    };
    const tool = Object.assign(call, {
      __action: { name: "test-tool", metadata: { type: "tool" }, actionType: "tool" },
    });
    const wrapped = guardTool(
      client,
      tool as never,
      {
        action: "order.looked-up",
        ...policy,
      } as never,
    ) as unknown as (input: unknown, options: unknown) => Promise<unknown>;
    await wrapped({ note: "hello" }, { context: { sessionId: "s" } });
    return ran;
  },
});

callbackFailureCases({
  name: "genkit guardMiddleware",
  action: "tool.invoked",
  fallbackAction: "tool.invoked",
  metadata: true,
  sessionId: true,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    const mw = guardMiddleware(client, policy as never);
    const def = mw.instantiate();
    await def.tool(
      { toolRequest: { name: "lookup", input: { note: "x" }, ref: "call-1" } } as never,
      { context: { sessionId: "sess-1" } } as never,
      (async () => {
        ran = true;
        return { toolResponse: { name: "lookup", output: { ok: true } } };
      }) as never,
    );
    return ran;
  },
});

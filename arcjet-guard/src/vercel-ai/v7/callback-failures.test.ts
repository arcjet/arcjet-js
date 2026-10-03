// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await, eslint/explicit-function-return-type -- cases pass deliberately ill-typed callbacks through the policy
import { jsonSchema, tool } from "ai";

import { callbackFailureCases } from "../../../test/_shared/callback-failures.ts";
import { guardTool } from "./guard-tool.ts";
import type { GuardToolPolicy } from "./guard-tool.ts";

callbackFailureCases({
  name: "vercel-ai guardTool",
  action: "test.action",
  metadata: true,
  sessionId: false,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    const testTool = tool({
      description: "Test tool",
      inputSchema: jsonSchema<{ id: string }>({ type: "object" }),
      execute: async () => {
        ran = true;
        return { result: "success" };
      },
    });
    const wrapped = guardTool(client, testTool, {
      action: "test.action",
      ...policy,
    } as GuardToolPolicy<typeof testTool>);
    await wrapped.execute!({ id: "one" }, { toolCallId: "t1", messages: [], context: undefined });
    return ran;
  },
});

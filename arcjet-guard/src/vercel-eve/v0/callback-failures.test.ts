// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await, eslint/explicit-function-return-type -- cases pass deliberately ill-typed callbacks through the policy
import type { ToolDefinition } from "eve/tools";

import { callbackFailureCases } from "../../../test/_shared/callback-failures.ts";
import { ArcjetDeniedError, ArcjetGuardUnavailableError } from "../../agents/guard-action.ts";
import { guardApproval } from "./guard-approval.ts";
import { guardInbound } from "./guard-inbound.ts";
import { guardTool } from "./guard-tool.ts";
import type { GuardToolPolicy } from "./guard-tool.ts";

callbackFailureCases({
  name: "vercel-eve guardTool",
  action: "test.executed",
  metadata: true,
  sessionId: false,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    const testTool = {
      description: "test-tool",
      inputSchema: { type: "object" },
      execute: async () => {
        ran = true;
        return { success: true };
      },
    } as unknown as ToolDefinition<{ id: string }, { success: boolean }>;
    const wrapped = guardTool(client, testTool, {
      action: "test.executed",
      ...policy,
    } as GuardToolPolicy<{ id: string }>);
    try {
      await wrapped.execute({ id: "one" }, { toolName: "my-tool", callId: "c1" } as never);
    } catch (error) {
      if (error instanceof ArcjetDeniedError || error instanceof ArcjetGuardUnavailableError) {
        return false;
      }
      throw error;
    }
    return ran;
  },
});

const approvalContext = {
  session: {
    id: "ses_123",
    auth: { current: { principalId: "user_456" }, initiator: null },
    turn: { id: "turn_789", sequence: 1 },
  },
  approvedTools: new Set(),
  callId: "call_abc",
  toolName: "test.tool",
  getSandbox: () => null,
  getSkill: () => null,
};

callbackFailureCases({
  name: "vercel-eve guardApproval",
  action: "resource.read",
  metadata: true,
  sessionId: false,
  allowedOutcome: "allowed",
  degradedOutcome: "allowed",
  async run(client, policy) {
    const approval = guardApproval(client, { action: "resource.read", ...policy } as never);
    const result = await (approval as unknown as (ctx: unknown) => Promise<unknown>)(
      approvalContext,
    );
    return result === "not-applicable";
  },
});

callbackFailureCases({
  name: "vercel-eve guardApproval response",
  action: "resource.approved",
  metadata: true,
  sessionId: false,
  allowedOutcome: "allowed",
  degradedOutcome: "allowed",
  async run(client, policy) {
    const approval = guardApproval(client, {
      action: "resource.read",
      response: { action: "resource.approved", ...policy },
    } as never) as unknown as { response: (ctx: unknown) => Promise<{ status: string }> };
    const result = await approval.response({
      auth: { getToken: async () => ({ token: "t" }) },
      request: { callId: "call_abc", requestId: "req_xyz", toolName: "test.tool", toolInput: {} },
      response: { decision: "approve" },
      responder: { attributes: {}, principalId: "approver_789", principalType: "user" },
      session: { id: "ses_123", initiator: null, turn: { id: "turn_789", sequence: 1 } },
    });
    return result.status === "allowed";
  },
});

callbackFailureCases({
  name: "vercel-eve guardInbound",
  action: "message.received",
  // The options take `rules` and `metadata` only as values.
  rules: false,
  metadata: false,
  sessionId: false,
  allowedOutcome: "allowed",
  degradedOutcome: "allowed",
  async run(client, policy) {
    const verdict = await guardInbound(client, "hello", { rules: [], ...policy } as never);
    return verdict.allowed;
  },
});

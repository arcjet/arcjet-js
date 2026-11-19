/**
 * Compile-time assignability test for Eve 1.x: `guardApproval` returns Eve's
 * `Approval`, `guardTool` returns a `ToolDefinition`, and `arcjetHooks` returns
 * a `HookDefinition` that `defineHook` accepts.
 *
 * Eve 1.0 adds a fourth approval slot, `AgentDefinition.approval` in
 * `agent.ts`, which takes only the function form (`ApprovalPolicy`).
 *
 * Uses typed `const` declarations rather than casts — a cast would make the test
 * pass regardless, which defeats its entire purpose.
 */

import { test } from "node:test";

import type { AgentDefinition } from "eve";
import type { McpClientConnectionDefinition, OpenAPIConnectionDefinition } from "eve/connections";
import type { HookDefinition } from "eve/hooks";
import type { ToolDefinition } from "eve/tools";

import { decisionAllow, stubClient } from "../../../test/_shared/stub-client.ts";
import { arcjetHooks, guardApproval, guardTool } from "./index.ts";

test("guardApproval function form is assignable to all four Eve 1.x approval slots", () => {
  const { client } = stubClient(decisionAllow());

  const forTool: NonNullable<ToolDefinition<{ id: string }>["approval"]> = guardApproval(client, {
    action: "thing.read",
  });
  const forOpenAPI: NonNullable<OpenAPIConnectionDefinition["approval"]> = guardApproval(client, {
    action: "thing.read",
  });
  const forMcp: NonNullable<McpClientConnectionDefinition["approval"]> = guardApproval(client, {
    action: "thing.read",
  });
  const forAgent: NonNullable<AgentDefinition["approval"]> = guardApproval(client, {
    action: "thing.read",
  });

  void [forTool, forOpenAPI, forMcp, forAgent];
});

test("guardApproval { request, response } form is assignable to the tool and connection slots", () => {
  const { client } = stubClient(decisionAllow());

  const forTool: NonNullable<ToolDefinition<{ id: string }>["approval"]> = guardApproval(client, {
    action: "thing.read",
    response: { action: "thing.approved" },
  });
  const forOpenAPI: NonNullable<OpenAPIConnectionDefinition["approval"]> = guardApproval(client, {
    action: "thing.read",
    response: { action: "thing.approved" },
  });
  const forMcp: NonNullable<McpClientConnectionDefinition["approval"]> = guardApproval(client, {
    action: "thing.read",
    response: { action: "thing.approved" },
  });

  void [forTool, forOpenAPI, forMcp];
});

test("guardApproval response rules read the Eve 1.x responder and interaction id", () => {
  const { client } = stubClient(decisionAllow());

  const approval = guardApproval(client, {
    action: "thing.read",
    onAllow: "user-approval",
    response: {
      action: "thing.approved",
      actor: (ctx) => ctx.response.principal.principalId ?? "anonymous",
      metadata: (ctx) => ({ interaction: ctx.request.interactionId }),
    },
  });

  void approval;
});

test("guardTool and arcjetHooks return Eve 1.x definitions", () => {
  const { client } = stubClient(decisionAllow());

  const tool: ToolDefinition<{ q: string }, string> = {
    description: "t",
    inputSchema: { type: "object", properties: { q: { type: "string" } } },
    execute: (input) => Promise.resolve(input.q),
  };
  const guarded: ToolDefinition<{ q: string }, string> = guardTool(client, tool, {
    action: "thing.read",
  });
  const hooks: HookDefinition = arcjetHooks(client);

  void [guarded, hooks];
});

/**
 * Compile-time assignability test: `guardApproval` returns Eve's `Approval`
 * — a function (`ApprovalPolicy`) or `{ request, response }`
 * (`ApprovalConfiguration`) — assignable to Eve's three approval slots:
 * `ToolDefinition.approval`, `OpenAPIConnectionDefinition.approval`, and
 * `McpClientConnectionDefinition.approval`.
 *
 * Verifies AC4.1: the design's central claim that one helper covers authored tools,
 * OpenAPI connections and MCP connections. Type-level tests are the right instrument
 * for this because the assignability would silently rot when Eve's minor version moves.
 *
 * Uses typed `const` declarations rather than casts — a cast would make the test
 * pass regardless, which defeats its entire purpose.
 *
 * Scope: these declarations pin assignability, not `guardApproval`'s default type
 * parameter. Each one supplies a contextual target type that TypeScript infers
 * `TInput` from, so the default never participates. The default is pinned in
 * `guard-approval.test.ts`, where every `await approval(ctx)` passes an
 * `ApprovalContext` into an uninferred call — do not delete those calls expecting
 * this file to cover them.
 */

// oxlint-disable eslint/no-unnecessary-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import { test } from "node:test";

import type { McpClientConnectionDefinition, OpenAPIConnectionDefinition } from "eve/connections";
import type { ToolDefinition } from "eve/tools";

import { decisionAllow, stubClient } from "../../../test/_shared/stub-client.ts";
import { guardApproval } from "./guard-approval.ts";

test("AC4.1: guardApproval function form is assignable to all three Eve approval slots", () => {
  const { client } = stubClient(decisionAllow());

  // Tool slot: parameterised as Approval<ApprovalContextInput<TInput>>, unlike
  // the two connection slots below, which take the unparameterised Approval.
  const forTool: NonNullable<ToolDefinition<{ id: string }>["approval"]> = guardApproval(client, {
    action: "thing.read",
  });

  // OpenAPI connection slot: OpenAPIConnectionDefinition["approval"]
  // Unparameterised Approval (Approval<Record<string, unknown>>)
  const forOpenAPI: NonNullable<OpenAPIConnectionDefinition["approval"]> = guardApproval(client, {
    action: "thing.read",
  });

  // MCP connection slot: McpClientConnectionDefinition["approval"]
  // Unparameterised Approval (Approval<Record<string, unknown>>)
  const forMcp: NonNullable<McpClientConnectionDefinition["approval"]> = guardApproval(client, {
    action: "thing.read",
  });

  // Suppress unused variable warnings and ensure values are evaluated at runtime
  void [forTool, forOpenAPI, forMcp];
});

test("AC4.1: guardApproval { request, response } form is assignable to all three Eve approval slots", () => {
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

/**
 * Compile-time assignability test: `guardApproval` returns an `Approval` function
 * assignable to Eve's three approval slots — `ToolDefinition.approval`,
 * `OpenAPIConnectionDefinition.approval`, and `McpClientConnectionDefinition.approval`.
 *
 * Verifies AC4.1: the design's central claim that one helper covers authored tools,
 * OpenAPI connections and MCP connections. Type-level tests are the right instrument
 * for this because the assignability would silently rot when Eve's minor version moves.
 *
 * Uses typed `const` declarations rather than casts — a cast would make the test
 * pass regardless, which defeats its entire purpose.
 */

// oxlint-disable eslint/no-unnecessary-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import { test } from "node:test";
import type { ToolDefinition } from "eve/tools";
import type {
  McpClientConnectionDefinition,
  OpenAPIConnectionDefinition,
} from "eve/connections";

import { decisionAllow, stubClient } from "../../../test/_shared/stub-client.ts";
import { guardApproval } from "./guard-approval.ts";

test("AC4.1: guardApproval is assignable to all three Eve approval slots", () => {
  const { client } = stubClient(decisionAllow());

  // Tool slot: ToolDefinition<TInput, TOutput>["approval"]
  // TInput is typed, TOutput is unknown
  const forTool: NonNullable<ToolDefinition<{ id: string }, unknown>["approval"]> = guardApproval(client, {
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

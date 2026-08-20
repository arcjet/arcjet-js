/**
 * Compile-time assignability: the helpers accept the values a Genkit
 * app actually has, with no casts at the call site.
 *
 * The declarations are types only (`declare const`, never executed) so this
 * suite still runs in the genkit-absent CI job, where the peer is gone
 * and the type-only import scan applies. Runtime behaviour against the
 * real `defineTool` / `ai.generate` lives in `test/genkit/`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { GenerateOptions, ToolAction } from "genkit";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { guardMiddleware } from "./guard-middleware.ts";
import { guardTool } from "./guard-tool.ts";

declare const client: ArcjetAgentClient;
declare const authoredTool: ToolAction;

// Never called: the declarations above have no runtime value. Typecheck is
// the assertion.
function typeProbe(): void {
  const guarded: ToolAction = guardTool(client, authoredTool, {
    action: "order.looked-up",
    rules: (input: { orderNumber: string }) => {
      void input.orderNumber;
      return [];
    },
  });

  const middleware = guardMiddleware(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });

  const generateOpts: Pick<GenerateOptions, "use"> = {
    use: [middleware],
  };

  void [guarded, generateOpts];
}

test("helpers accept a real ToolAction and generate({ use }) without casts", () => {
  assert.equal(typeof typeProbe, "function");
});

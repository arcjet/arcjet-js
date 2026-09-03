/**
 * Compile-time assignability: the helpers accept the values a
 * Cloudflare Think subclass actually has, with no casts at the call
 * site.
 *
 * The declarations are types only (`declare const`, never executed) so
 * this suite still runs in the cloudflare-think-absent CI job, where
 * the peer is gone and the type-only import scan applies. Runtime
 * behaviour against the real wrap lives in `test/cloudflare-think/`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ToolCallContext, ToolCallDecision } from "@cloudflare/think";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { guardHooks } from "./hooks.ts";

declare const client: ArcjetAgentClient;

// Never called: the declarations above have no runtime value. Typecheck is
// the assertion.
function typeProbe(): void {
  const hooks = guardHooks(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
    onDeny: "block",
  });

  const beforeToolCall: (ctx: ToolCallContext) => Promise<ToolCallDecision | void> =
    hooks.beforeToolCall;

  void [hooks, beforeToolCall];
}

test("helpers accept a Think beforeToolCall hook without casts", () => {
  assert.equal(typeof typeProbe, "function");
});

/**
 * Compile-time assignability: the helpers accept the values a TanStack
 * AI `chat()` app actually has, with no casts at the call site.
 *
 * The declarations are types only (`declare const`, never executed) so
 * this suite still runs in the tanstack-ai-absent CI job, where the
 * peer is gone and the type-only import scan applies. Runtime
 * behaviour against the real `chat()` / `toolCacheMiddleware` lives in
 * `test/tanstack-ai/`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ChatMiddleware } from "@tanstack/ai";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { guardMiddleware } from "./guard-middleware.ts";

declare const client: ArcjetAgentClient;

// Never called: the declarations above have no runtime value. Typecheck is
// the assertion.
function typeProbe(): void {
  const middleware = guardMiddleware(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
    onDeny: "abort",
  });

  const chatOpts: { middleware?: ChatMiddleware[] } = {
    middleware: [middleware],
  };

  void [middleware, chatOpts];
}

test("helpers accept a chat({ middleware }) ChatMiddleware without casts", () => {
  assert.equal(typeof typeProbe, "function");
});

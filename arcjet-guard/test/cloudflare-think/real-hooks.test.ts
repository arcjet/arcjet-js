// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-type-assertion -- test fixtures built from the real SDK types
/**
 * Behaviour against the real `@cloudflare/think` `ToolCallDecision` /
 * `ToolCallContext` types, rather than the structural fakes in
 * `src/cloudflare-think/v0/*.test.ts`.
 *
 * These assertions live outside `src/cloudflare-think/` — that
 * directory is globbed by the cloudflare-think-absent CI job and
 * scanned for type-only imports.
 *
 * Think wraps `execute` inside a Durable Object harness, so this
 * suite cannot construct a live `Think` instance. It does prove the
 * hook return is a real `ToolCallDecision` and that Think's
 * documented wrap skips `execute` on block / substitute.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ToolCallContext, ToolCallDecision } from "@cloudflare/think";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardHooks } from "../../src/cloudflare-think/v0/hooks.ts";
import { asDenial } from "../_shared/source-scan.ts";
import { decisionAllow, decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

function toolCtx(name: string, input: unknown = {}): ToolCallContext {
  return {
    type: "tool-call",
    toolCallId: "call-1",
    toolName: name,
    input,
    stepNumber: 0,
    messages: [],
    abortSignal: undefined,
  };
}

/**
 * Think 0.3+ `_resolveToolCallDecision` contract.
 */
function applyThinkDecision(
  decision: ToolCallDecision | void,
  execute: (input: unknown) => unknown,
  input: unknown,
): unknown {
  if (decision === undefined) {
    return execute(input);
  }
  if (decision.action === "allow") {
    return execute(decision.input ?? input);
  }
  if (decision.action === "block") {
    return decision.reason ?? "Tool call blocked";
  }
  return decision.output;
}

test("guardHooks().beforeToolCall is assignable to Think's hook", () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client);
  const beforeToolCall: (ctx: ToolCallContext) => Promise<ToolCallDecision | void> =
    hooks.beforeToolCall;
  assert.equal(typeof beforeToolCall, "function");
});

test("ALLOW is void: Think runs execute", async () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  let executed = 0;
  const decision = await hooks.beforeToolCall(toolCtx("lookup", { q: "hi" }));
  const output = await applyThinkDecision(
    decision,
    (input) => {
      executed += 1;
      return { ran: true, input };
    },
    { q: "hi" },
  );
  assert.equal(decision, undefined);
  assert.equal(executed, 1);
  assert.deepEqual(output, { ran: true, input: { q: "hi" } });
});

test("DENY substitute: Think skips execute and the model sees ArcjetDenialResult", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client);
  let executed = 0;
  const decision = await hooks.beforeToolCall(toolCtx("lookup"));
  const output = await applyThinkDecision(
    decision,
    () => {
      executed += 1;
      return { ran: true };
    },
    {},
  );
  assert.ok(decision && decision.action === "substitute");
  assert.equal(executed, 0);
  assert.equal(asDenial<ArcjetDenialResult>(output).arcjetDenied, true);
});

test("DENY block: Think skips execute and the model sees reason", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { onDeny: "block" });
  let executed = 0;
  const decision = await hooks.beforeToolCall(toolCtx("lookup"));
  const output = await applyThinkDecision(
    decision,
    () => {
      executed += 1;
      return { ran: true };
    },
    {},
  );
  assert.ok(decision && decision.action === "block");
  assert.equal(executed, 0);
  assert.equal(typeof output, "string");
});

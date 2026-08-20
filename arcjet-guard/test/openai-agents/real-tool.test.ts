// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion, typescript/unbound-method, typescript/require-await, eslint/require-await -- test fixtures built from the real SDK types
/**
 * Behaviour against the real `@openai/agents` `tool()` / `FunctionTool`,
 * rather than hand-written fakes.
 *
 * Every assertion here corresponds to a bypass the fakes in
 * `src/openai-agents/v0/*.test.ts` could not see:
 *
 * - `tool({ execute })` closes over `execute` inside `invoke`. The returned
 *   object has no `execute`. Wrapping a property named `execute` on that
 *   object would report success in a fake that kept both, while the real
 *   class ran the unguarded body.
 * - The runner calls `invoke(runContext, argumentsJson, details)`. A fake
 *   that invoked `execute` directly never exercises that path.
 *
 * This file value-imports the optional peer, so it lives outside
 * `src/openai-agents/` — that directory is globbed by the openai-agents-absent
 * CI job and scanned for type-only imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { RunContext, tool } from "@openai/agents";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardTool } from "../../src/openai-agents/v0/guard-tool.ts";
import { asDenial, recorded } from "../_shared/source-scan.ts";
import { decisionAllow, decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

const parameters = {
  type: "object" as const,
  properties: { note: { type: "string" as const } },
  required: ["note"] as Array<"note">,
  additionalProperties: false as const,
};

test("real tool() has invoke and no execute; wrapping invoke gates execute", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const authored = tool({
    name: "lookup_order",
    description: "real dependency test tool",
    parameters,
    execute: (input) => {
      calls += 1;
      const { note } = input as { note: string };
      return `ran:${note}`;
    },
  });

  assert.equal(typeof authored.invoke, "function");
  assert.equal("execute" in authored, false);

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const result = asDenial<ArcjetDenialResult>(
    await wrapped.invoke(new RunContext({ sessionId: "sess-1" }), '{"note":"hello"}'),
  );

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
});

test("real tool() ALLOW still reaches execute through invoke", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let calls = 0;
  const authored = tool({
    name: "lookup_order",
    description: "real dependency test tool",
    parameters,
    execute: (input) => {
      calls += 1;
      const { note } = input as { note: string };
      return { note, status: "shipped" };
    },
  });

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const result = await wrapped.invoke(new RunContext({ sessionId: "sess-real" }), '{"note":"n1"}');

  assert.equal(calls, 1);
  assert.deepEqual(result, { note: "n1", status: "shipped" });
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-real");
});

test("real tool() DENY does not throw (errorFunction is not the deny path)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const authored = tool({
    name: "lookup_order",
    description: "real dependency test tool",
    parameters,
    execute: () => {
      throw new Error("should not run");
    },
  });

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const result = asDenial<ArcjetDenialResult>(
    await wrapped.invoke(new RunContext({}), '{"note":"x"}'),
  );
  assert.equal(result.arcjetDenied, true);
});

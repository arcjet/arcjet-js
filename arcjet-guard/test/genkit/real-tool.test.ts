// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion, typescript/unbound-method, typescript/require-await, eslint/require-await -- test fixtures built from the real SDK types
/**
 * Behaviour against the real `genkit` `defineTool` / `ToolAction`,
 * rather than hand-written fakes.
 *
 * Every assertion here corresponds to a bypass the fakes in
 * `src/genkit/v1/*.test.ts` could not see:
 *
 * - `defineTool(config, handler)` closes over `handler` inside the
 *   returned `ToolAction`. Wrapping a property named `handler` on that
 *   object would report success in a fake that kept both, while the
 *   real action ran the unguarded body.
 * - `generate()` calls the action as a function
 *   (`tool(input, options)`), which delegates to `.run`. A fake that
 *   invoked a `handler` property never exercises that path.
 *
 * This file value-imports the optional peer, so it lives outside
 * `src/genkit/` — that directory is globbed by the genkit-absent CI
 * job and scanned for type-only imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { genkit, z } from "genkit";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardTool } from "../../src/genkit/v1/guard-tool.ts";
import { asDenial, recorded } from "../_shared/source-scan.ts";
import { decisionAllow, decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

const ai = genkit({});

test("real defineTool is a callable ToolAction; wrapping it gates the handler", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const authored = ai.defineTool(
    {
      name: "lookup_order",
      description: "real dependency test tool",
      inputSchema: z.object({ note: z.string() }),
    },
    async (input) => {
      calls += 1;
      return `ran:${input.note}`;
    },
  );

  assert.equal(typeof authored, "function");
  assert.equal(typeof authored.run, "function");
  assert.equal(typeof authored.__action?.name, "string");

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const result = asDenial<ArcjetDenialResult>(
    await wrapped({ note: "hello" }, { context: { sessionId: "sess-1" } }),
  );

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
});

test("real defineTool ALLOW still reaches the handler", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let calls = 0;
  const authored = ai.defineTool(
    {
      name: "lookup_order_allow",
      description: "real dependency test tool",
      inputSchema: z.object({ note: z.string() }),
    },
    async (input) => {
      calls += 1;
      return { note: input.note, status: "shipped" };
    },
  );

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const result = await wrapped({ note: "n1" }, { context: { sessionId: "sess-real" } });

  assert.equal(calls, 1);
  assert.deepEqual(result, { note: "n1", status: "shipped" });
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-real");
});

test("real defineTool DENY does not throw (interrupt is not the deny path)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const authored = ai.defineTool(
    {
      name: "lookup_order_nothrow",
      description: "real dependency test tool",
      inputSchema: z.object({ note: z.string() }),
    },
    async () => {
      throw new Error("should not run");
    },
  );

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const result = asDenial<ArcjetDenialResult>(await wrapped({ note: "x" }, { context: {} }));
  assert.equal(result.arcjetDenied, true);
});

test("DENY bypasses outputSchema so a mismatched ArcjetDenialResult is still returned", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const authored = ai.defineTool(
    {
      name: "lookup_order_schema",
      description: "outputSchema is a string; a denial is an object",
      inputSchema: z.object({ note: z.string() }),
      outputSchema: z.string(),
    },
    async (input) => {
      calls += 1;
      return `ran:${input.note}`;
    },
  );

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const result = asDenial<ArcjetDenialResult>(await wrapped({ note: "x" }, { context: {} }));
  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
});

test("the tool.v2 twin defineTool registers over the same handler is guarded too", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const authored = ai.defineTool(
    {
      name: "lookup_order_twin",
      description: "defineTool also registers basicToolV2 over this handler",
      inputSchema: z.object({ note: z.string() }),
    },
    async (input) => {
      calls += 1;
      return `ran:${input.note}`;
    },
  );

  guardTool(client, authored, { action: "order.looked-up" });

  const twin = await ai.registry.lookupAction("/tool.v2/lookup_order_twin");
  assert.equal(
    typeof twin,
    "function",
    "defineTool registers a tool.v2 twin for a non-multipart tool",
  );
  const result = await (twin as (input: unknown, options: unknown) => Promise<unknown>)(
    { note: "x" },
    {},
  );

  assert.equal(calls, 0, "the twin must not reach the unguarded handler");
  const denial = asDenial<ArcjetDenialResult>((result as { output?: unknown }).output);
  assert.equal(denial.arcjetDenied, true);
});

test("a guarded ToolAction is still assignable as a defineTool result", async () => {
  const { client } = stubClient(decisionAllow());
  const authored = ai.defineTool(
    {
      name: "lookup_order_assign",
      description: "assignability at runtime",
      inputSchema: z.object({ note: z.string() }),
    },
    async (input) => input.note,
  );
  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  assert.equal(typeof wrapped, "function");
  assert.equal(wrapped.__action?.name, authored.__action.name);
});

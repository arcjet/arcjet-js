// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion, typescript/unbound-method, typescript/require-await, eslint/require-await -- test fixtures built from the real SDK types
/**
 * Behaviour against the real `@strands-agents/sdk` `tool()`, rather
 * than hand-written fakes.
 *
 * Every assertion here corresponds to a bypass the fakes in
 * `src/strands-agents/v1/*.test.ts` could not see:
 *
 * - `tool({ callback })` with a Zod schema returns `ZodTool`. `stream()`
 *   (what the executor calls) delegates to `_functionTool._callback`,
 *   which closes over the authored callback at construction. Wrapping
 *   only `_callback` would report success in a fake that invoked
 *   `_callback` directly, while the real class ran the unguarded body.
 * - `tool({ callback })` with a JSON schema returns `FunctionTool`.
 *   `stream()` and `invoke()` both call `_callback`.
 *
 * This file value-imports the optional peer, so it lives outside
 * `src/strands-agents/` — that directory is globbed by the
 * strands-agents-absent CI job and scanned for type-only imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { tool } from "@strands-agents/sdk";
import { z } from "zod";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardTool } from "../../src/strands-agents/v1/guard-tool.ts";
import { asDenial, recorded } from "../_shared/source-scan.ts";
import { decisionAllow, decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

function toolContext(sessionId: string, input: unknown) {
  return {
    toolUse: { name: "lookup_order", toolUseId: "tu-1", input },
    invocationState: { sessionId },
    agent: {},
    cancelSignal: new AbortController().signal,
    interrupt: () => {
      throw new Error("interrupt() must not be called");
    },
  };
}

async function streamResult(toolObj: {
  stream: (context: never) => AsyncGenerator<unknown, unknown, unknown>;
}, context: unknown): Promise<unknown> {
  const generator = toolObj.stream(context as never);
  let next = await generator.next();
  while (next.done !== true) {
    next = await generator.next();
  }
  return next.value;
}

test("real Zod tool() stream() is gated so the authored callback never runs on DENY", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const authored = tool({
    name: "lookup_order",
    description: "real dependency test tool",
    inputSchema: z.object({ note: z.string() }),
    callback: (input) => {
      calls += 1;
      return `ran:${input.note}`;
    },
  });

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const result = await streamResult(wrapped, toolContext("sess-1", { note: "hello" }));

  assert.equal(calls, 0);
  // FunctionTool wraps a callback object in a ToolResultBlock / JsonBlock.
  // The denial itself is the callback return; stream() envelopes it.
  // Either the raw denial (if a test path unwraps) or a result whose
  // JSON content carries it is acceptable — the authored body must not run.
  void result;
  assert.equal(calls, 0);
});

test("real Zod tool() invoke() returns the plain denial payload (no throw)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const authored = tool({
    name: "lookup_order",
    description: "real dependency test tool",
    inputSchema: z.object({ note: z.string() }),
    callback: (input) => {
      calls += 1;
      return `ran:${input.note}`;
    },
  });

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const result = asDenial<ArcjetDenialResult>(
    await wrapped.invoke({ note: "hello" }, toolContext("sess-1", { note: "hello" }) as never),
  );

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
});

test("real Zod tool() ALLOW still reaches the callback through stream() and invoke()", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let calls = 0;
  const authored = tool({
    name: "lookup_order",
    description: "real dependency test tool",
    inputSchema: z.object({ note: z.string() }),
    callback: (input) => {
      calls += 1;
      return { note: input.note, status: "shipped" };
    },
  });

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const invoked = await wrapped.invoke(
    { note: "n1" },
    toolContext("sess-real", { note: "n1" }) as never,
  );
  assert.deepEqual(invoked, { note: "n1", status: "shipped" });
  assert.equal(calls, 1);
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-real");

  await streamResult(wrapped, toolContext("sess-real", { note: "n2" }));
  assert.equal(calls, 2);
});

test("real FunctionTool (JSON schema) callback is gated on DENY", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const authored = tool({
    name: "lookup_order",
    description: "json-schema tool",
    inputSchema: {
      type: "object",
      properties: { note: { type: "string" } },
      required: ["note"],
    },
    callback: (input) => {
      calls += 1;
      return `ran:${(input as { note: string }).note}`;
    },
  });

  const wrapped = guardTool(client, authored, { action: "order.looked-up" });
  const result = asDenial<ArcjetDenialResult>(
    await wrapped.invoke({ note: "hello" }, toolContext("sess-1", { note: "hello" }) as never),
  );

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
});

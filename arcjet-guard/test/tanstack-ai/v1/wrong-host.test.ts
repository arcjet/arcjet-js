// oxlint-disable typescript/no-unsafe-type-assertion -- the v1 middleware is typed for 1.x and passed to a 0.x chat() on purpose
/**
 * `@arcjet/guard/tanstack-ai/v1` on a TanStack AI 0.x host (the
 * `@tanstack/ai-v0` development alias). 0.x never calls
 * `onGuardToolCall`, so the middleware's `onStart` must make the wrong
 * install loud instead of letting tools run ungated.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { chat, toolDefinition } from "@tanstack/ai-v0";
import { fakeText } from "@tanstack/ai-v0/testing";

import { guardMiddleware } from "../../../src/tanstack-ai/v1/guard-middleware.ts";
import type { GuardMiddlewarePolicy } from "../../../src/tanstack-ai/v1/guard-middleware.ts";
import { decisionAllow, stubClient } from "../../_shared/stub-client.ts";

const originalWarn = console.warn;
let warnings: unknown[][] = [];

beforeEach(() => {
  warnings = [];
  console.warn = (...args: unknown[]): void => {
    warnings.push(args);
  };
});

afterEach(() => {
  console.warn = originalWarn;
});

async function runOnZeroX(policy?: GuardMiddlewarePolicy): Promise<{
  guardCalls: unknown[];
  toolRuns: unknown[];
  modelCalls: number;
}> {
  const { client, guardCalls } = stubClient(decisionAllow());
  const toolRuns: unknown[] = [];
  const tool = toolDefinition({ name: "lookup", description: "Look up an order" }).server(
    (args: unknown) => {
      toolRuns.push(args);
      return { ok: true };
    },
  );
  const fake = fakeText();
  fake.setResponses([
    { toolCalls: [{ name: "lookup", input: { q: "original" } }] },
    { text: "done" },
  ]);
  for await (const chunk of chat({
    adapter: fake as never,
    messages: [{ role: "user", content: "where is my order?" }],
    tools: [tool],
    middleware: [guardMiddleware(client, policy) as never],
  })) {
    void chunk;
  }
  return { guardCalls, toolRuns, modelCalls: fake.state.callCount };
}

test("on a 0.x host, v1 warns and aborts before the model or any tool runs", async () => {
  const run = await runOnZeroX();
  assert.equal(run.modelCalls, 0);
  assert.equal(run.toolRuns.length, 0);
  assert.equal(run.guardCalls.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0]?.[0]), /needs @tanstack\/ai 1\.x/);
  assert.match(String(warnings[0]?.[0]), /tanstack-ai\/v0/);
});

test("on a 0.x host with onGuardError allow, v1 only warns and tools run ungated", async () => {
  const run = await runOnZeroX({ onGuardError: "allow" });
  assert.deepEqual(run.toolRuns, [{ q: "original" }]);
  assert.equal(run.guardCalls.length, 0);
  assert.equal(warnings.length, 1);
});

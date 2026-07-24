import assert from "node:assert/strict";
import { test } from "node:test";

import { jsonSchema, tool } from "ai";

import { protectTool } from "../dist/index.js";
import { decisionAllow, stubClient } from "./_shared/stub-client.ts";

// A capture-only protected tool (no rules), so execute runs without a guard
// call and the only thing under test is the missing-context warning.
function makeTool() {
  const { client } = stubClient(decisionAllow());
  return protectTool(
    client,
    tool({
      description: "noop",
      inputSchema: jsonSchema<{ x: string }>({
        type: "object",
        properties: { x: { type: "string" } },
        required: ["x"],
      }),
      execute: async () => ({ ok: true }),
    }),
    { action: "test.noop" },
  );
}

// `node --test` runs each file in its own process, so the module-level
// "warned" flag starts fresh here and the occurrence order below is
// deterministic. These tests must stay in this file for that isolation.

test("first uncorrelated tool call warns even with ARCJET_LOG_LEVEL unset", async () => {
  delete process.env.ARCJET_LOG_LEVEL;
  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };
  try {
    const wrapped = makeTool();
    await wrapped.execute({ x: "a" }, { toolCallId: "t1", messages: [] } as never);
    assert.ok(
      warnCalls.some((c) => JSON.stringify(c).includes("no ArcjetAiContext")),
      "the first uncorrelated call should warn even with logging off",
    );
  } finally {
    console.warn = originalWarn;
  }
});

test("later uncorrelated calls stay silent with ARCJET_LOG_LEVEL unset", async () => {
  delete process.env.ARCJET_LOG_LEVEL;
  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };
  try {
    const wrapped = makeTool();
    await wrapped.execute({ x: "a" }, { toolCallId: "t2", messages: [] } as never);
    assert.equal(
      warnCalls.length,
      0,
      "after the first warning, further uncorrelated calls are silent unless ARCJET_LOG_LEVEL is set",
    );
  } finally {
    console.warn = originalWarn;
  }
});

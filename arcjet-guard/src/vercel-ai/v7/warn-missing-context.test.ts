import assert from "node:assert/strict";
import { test } from "node:test";

import { jsonSchema, tool } from "ai";

import { guardTool } from "./guard-tool.ts";
import { setLogLevel } from "../../../test/_shared/log-level.ts";
import { decisionAllow, stubClient } from "../../../test/_shared/stub-client.ts";

// A capture-only protected tool (no rules), so execute runs without a guard
// call and the only thing under test is the missing-context warning.
function makeTool(): ReturnType<typeof guardTool> {
  const { client } = stubClient(decisionAllow());
  return guardTool(
    client,
    tool({
      description: "noop",
      inputSchema: jsonSchema<{ x: string }>({
        type: "object",
        properties: { x: { type: "string" } },
        required: ["x"],
      }),
      execute: () => Promise.resolve({ ok: true }),
    }),
    { action: "test.noop" },
  );
}

// `node --test` runs each file in its own process, so the module-level
// "warned" flag starts fresh here and the occurrence order below is
// deterministic. These tests must stay in this file for that isolation.

test("first uncorrelated tool call warns even with ARCJET_LOG_LEVEL unset", async () => {
  const restoreLogLevel = setLogLevel(undefined);
  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnCalls.push(args);
  };
  try {
    const wrapped = makeTool();
    assert.ok(wrapped.execute, "wrapped tool must have an execute function");
    await wrapped.execute({ x: "a" }, { toolCallId: "t1", messages: [] } as never);
    assert.ok(
      warnCalls.some((c) => JSON.stringify(c).includes("no ArcjetAgentContext")),
      "the first uncorrelated call should warn even with logging off",
    );
  } finally {
    console.warn = originalWarn;
    restoreLogLevel();
  }
});

test("later uncorrelated calls stay silent with ARCJET_LOG_LEVEL unset", async () => {
  const restoreLogLevel = setLogLevel(undefined);
  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnCalls.push(args);
  };
  try {
    const wrapped = makeTool();
    assert.ok(wrapped.execute, "wrapped tool must have an execute function");
    await wrapped.execute({ x: "a" }, { toolCallId: "t2", messages: [] } as never);
    assert.equal(
      warnCalls.length,
      0,
      "after the first warning, further uncorrelated calls are silent unless ARCJET_LOG_LEVEL is set",
    );
  } finally {
    console.warn = originalWarn;
    restoreLogLevel();
  }
});

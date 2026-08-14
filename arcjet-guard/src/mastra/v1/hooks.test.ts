// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { asDenial, recorded } from "../../../test/_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import { MASTRA_THREAD_ID_KEY } from "./context.ts";
import type { ArcjetDenialResult } from "./denial.ts";
import { guardHooks } from "./hooks.ts";

function hookContext(input?: unknown) {
  const resolvedInput = input === undefined ? { q: "1" } : input;
  return {
    toolName: "mcp_search",
    input: resolvedInput,
    context: {
      requestContext: {
        get(key: string): unknown {
          return key === MASTRA_THREAD_ID_KEY ? "thread-hooks" : undefined;
        },
      },
    },
  };
}

test("beforeToolCall ALLOW returns undefined so the tool proceeds", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "mcp.invoked" });
  const result = await hooks.beforeToolCall!(hookContext());

  assert.equal(result, undefined);
  assert.equal(recorded(guardCalls[0])["correlationId"], "thread-hooks");
  assert.equal(
    (recorded(captureCalls[0])["metadata"] as Record<string, unknown>)["outcome"],
    "allowed",
  );
});

test("beforeToolCall DENY returns proceed: false with a structured output", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "mcp.invoked" });
  const result = await hooks.beforeToolCall!(hookContext());

  assert.ok(result);
  assert.equal(result.proceed, false);
  const output = asDenial<ArcjetDenialResult>(result.output);
  assert.equal(output.arcjetDenied, true);
  assert.equal(output.reason, "PROMPT_INJECTION");
});

test("beforeToolCall fail-closed unavailable returns proceed: false", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client);
  const result = await hooks.beforeToolCall!(hookContext());

  assert.ok(result);
  assert.equal(result.proceed, false);
  const output = asDenial<ArcjetDenialResult>(result.output);
  assert.equal(output.reason, "ERROR");
});

test("rules callback receives the tool name and input", async () => {
  const { client } = stubClient(decisionAllow());
  let seenName = "";
  const hooks = guardHooks(client, {
    rules: ({ toolName, input }) => {
      seenName = toolName;
      assert.deepEqual(input, { q: "abc" });
      return [fakeRule];
    },
  });
  await hooks.beforeToolCall!(hookContext({ q: "abc" }));
  assert.equal(seenName, "mcp_search");
});

test("afterToolCall captures success and never throws", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "mcp.invoked" });
  await hooks.afterToolCall!({
    ...hookContext(),
    output: { hits: 1 },
  });

  assert.equal(captureCalls.length, 1);
  const metadata = recorded(captureCalls[0])["metadata"] as Record<string, unknown>;
  assert.equal(metadata["outcome"], "success");
  assert.equal(metadata["mastra.phase"], "after");
  assert.equal(metadata["mastra.tool"], "mcp_search");
});

test("afterToolCall captures error outcome", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await hooks.afterToolCall!({
    ...hookContext(),
    error: new Error("boom"),
  });

  const metadata = recorded(captureCalls[0])["metadata"] as Record<string, unknown>;
  assert.equal(metadata["outcome"], "error");
});

test("default action is tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await hooks.beforeToolCall!(hookContext());
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("action callback is used when provided", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });
  await hooks.beforeToolCall!(hookContext());
  assert.equal(recorded(guardCalls[0])["label"], "mcp_search.invoked");
});

test("empty action string falls back to tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "" });
  await hooks.beforeToolCall!(hookContext());
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("onGuardError allow lets beforeToolCall proceed on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client, { onGuardError: "allow" });
  const result = await hooks.beforeToolCall!(hookContext());
  assert.equal(result, undefined);
});

test("rules throw still returns proceed: false (fail closed)", async () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "warn";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const { client } = stubClient(decisionAllow());
    const hooks = guardHooks(client, {
      rules: () => {
        throw new Error("rules exploded");
      },
    });
    const result = await hooks.beforeToolCall!(hookContext());
    assert.ok(result);
    assert.equal(result.proceed, false);
    const output = asDenial<ArcjetDenialResult>(result.output);
    assert.equal(output.reason, "ERROR");
    assert.ok(warnings.length > 0);
    assert.match(String(warnings[0]?.[0]), /beforeToolCall threw/);
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) {
      delete process.env["ARCJET_LOG_LEVEL"];
    } else {
      process.env["ARCJET_LOG_LEVEL"] = previous;
    }
  }
});

test("rules throw with onGuardError allow proceeds", async () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    onGuardError: "allow",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await hooks.beforeToolCall!(hookContext());
  assert.equal(result, undefined);
});

test("empty toolName is omitted from metadata", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await hooks.beforeToolCall!({
    toolName: "",
    input: {},
    context: hookContext().context,
  });
  assert.equal("mastra.tool" in recorded(recorded(guardCalls[0])["metadata"]), false);
});

test("non-string toolName is treated as empty", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await hooks.beforeToolCall!({
    toolName: 12,
    input: {},
    context: hookContext().context,
  } as never);
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("non-object hook context does not mint an id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await hooks.beforeToolCall!({
    toolName: "mcp_search",
    input: {},
    context: "nope",
  });
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("metadata callback is merged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    metadata: ({ toolName }) => ({ "app.tool": toolName }),
  });
  await hooks.beforeToolCall!(hookContext());
  assert.equal(recorded(recorded(guardCalls[0])["metadata"])["app.tool"], "mcp_search");
});

test("static metadata is merged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { metadata: { "app.static": "yes" } });
  await hooks.beforeToolCall!(hookContext());
  assert.equal(recorded(recorded(guardCalls[0])["metadata"])["app.static"], "yes");
});

test("afterToolCall never throws when capture or metadata throws", async () => {
  const { client } = stubClient(decisionAllow());
  client.capture = () => {
    throw new Error("capture failed");
  };
  const hooks = guardHooks(client, {
    metadata: () => {
      throw new Error("metadata exploded");
    },
  });
  await hooks.afterToolCall!({
    ...hookContext(),
    output: { hits: 1 },
  });
});

test("afterToolCall omits empty toolName from metadata", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await hooks.afterToolCall!({
    toolName: "",
    input: {},
    context: hookContext().context,
    output: {},
  });
  assert.equal("mastra.tool" in recorded(recorded(captureCalls[0])["metadata"]), false);
});

test("afterToolCall with non-object context does not throw", async () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await hooks.afterToolCall!({
    toolName: "mcp_search",
    input: {},
    context: undefined,
    output: {},
  });
});

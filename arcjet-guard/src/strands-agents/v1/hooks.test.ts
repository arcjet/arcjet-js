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
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetDenialResult } from "../../agents/denial.ts";
import {
  createAfterToolCallHandler,
  createBeforeToolCallHandler,
  guardHooks,
} from "./hooks.ts";
import type { StrandsBeforeToolCallEvent } from "./hooks.ts";

function hookEvent(input?: unknown, extras?: Partial<StrandsBeforeToolCallEvent>): StrandsBeforeToolCallEvent {
  return {
    toolUse: {
      name: "mcp_search",
      toolUseId: "tu-1",
      input: input === undefined ? { q: "1" } : input,
    },
    invocationState: { sessionId: "sess-hooks" },
    cancel: false,
    interrupt: () => {
      throw new Error("interrupt() must not be called");
    },
    ...extras,
  };
}

function denialFromCancel(event: StrandsBeforeToolCallEvent): ArcjetDenialResult {
  assert.equal(typeof event.cancel, "string");
  return asDenial<ArcjetDenialResult>(JSON.parse(event.cancel as string));
}

test("guardHooks returns a named Plugin with initAgent", () => {
  const { client } = stubClient(decisionAllow());
  const plugin = guardHooks(client, { action: "tool.invoked" });
  assert.equal(typeof plugin, "object");
  assert.equal(typeof plugin.name, "string");
  assert.ok(plugin.name.startsWith("arcjet-guard-"));
  assert.equal(typeof plugin.initAgent, "function");
});

test("each call gets a unique name so two plugins do not collide", () => {
  const { client } = stubClient(decisionAllow());
  const a = guardHooks(client);
  const b = guardHooks(client);
  assert.notEqual(a.name, b.name);
});

test("ALLOW → cancel stays false so the tool proceeds", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const handler = createBeforeToolCallHandler(client, { action: "mcp.invoked" });
  const event = hookEvent();
  await handler(event);

  assert.equal(event.cancel, false);
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-hooks");
  assert.equal(
    (recorded(captureCalls[0])["metadata"] as Record<string, unknown>)["outcome"],
    "allowed",
  );
});

test("DENY → event.cancel is the JSON string of a structured denial (no throw)", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const handler = createBeforeToolCallHandler(client, { action: "mcp.invoked" });
  const event = hookEvent();
  await handler(event);

  const output = denialFromCancel(event);
  assert.equal(output.arcjetDenied, true);
  assert.equal(output.reason, "PROMPT_INJECTION");
  assert.equal(typeof event.cancel, "string");
  assert.doesNotThrow(() => JSON.parse(event.cancel as string));
});

test("fail-closed unavailable → event.cancel is an ERROR denial JSON string", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const handler = createBeforeToolCallHandler(client);
  const event = hookEvent();
  await handler(event);

  const output = denialFromCancel(event);
  assert.equal(output.reason, "ERROR");
});

test("rules callback receives the tool name and input", async () => {
  const { client } = stubClient(decisionAllow());
  let seenName = "";
  const handler = createBeforeToolCallHandler(client, {
    rules: ({ toolName, input }) => {
      seenName = toolName;
      assert.deepEqual(input, { q: "abc" });
      return [fakeRule];
    },
  });
  await handler(hookEvent({ q: "abc" }));
  assert.equal(seenName, "mcp_search");
});

test("afterToolCall captures success and never throws", () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const handler = createAfterToolCallHandler(client, { action: "mcp.invoked" });
  handler({
    toolUse: { name: "mcp_search", input: { q: "1" } },
    invocationState: { sessionId: "sess-hooks" },
  });

  assert.equal(captureCalls.length, 1);
  const metadata = recorded(captureCalls[0])["metadata"] as Record<string, unknown>;
  assert.equal(metadata["outcome"], "success");
  assert.equal(metadata["strands.phase"], "after");
  assert.equal(metadata["strands.tool"], "mcp_search");
});

test("afterToolCall captures error outcome", () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const handler = createAfterToolCallHandler(client);
  handler({
    toolUse: { name: "mcp_search", input: { q: "1" } },
    invocationState: { sessionId: "sess-hooks" },
    error: new Error("boom"),
  });

  const metadata = recorded(captureCalls[0])["metadata"] as Record<string, unknown>;
  assert.equal(metadata["outcome"], "error");
});

test("default action is tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const handler = createBeforeToolCallHandler(client, {});
  await handler(hookEvent());
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("action callback is used when provided", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const handler = createBeforeToolCallHandler(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });
  await handler(hookEvent());
  assert.equal(recorded(guardCalls[0])["label"], "mcp_search.invoked");
});

test("empty action string falls back to tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const handler = createBeforeToolCallHandler(client, { action: "" });
  await handler(hookEvent());
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("onGuardError allow lets BeforeToolCall proceed on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const handler = createBeforeToolCallHandler(client, { onGuardError: "allow" });
  const event = hookEvent();
  await handler(event);
  assert.equal(event.cancel, false);
});

test("rules throw still sets cancel (fail closed) and does not throw", async () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "warn";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const { client } = stubClient(decisionAllow());
    const handler = createBeforeToolCallHandler(client, {
      rules: () => {
        throw new Error("rules exploded");
      },
    });
    const event = hookEvent();
    await handler(event);
    const output = denialFromCancel(event);
    assert.equal(output.reason, "ERROR");
    assert.ok(warnings.length > 0);
    assert.match(String(warnings[0]?.[0]), /policy factory|threw/);
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
  const handler = createBeforeToolCallHandler(client, {
    onGuardError: "allow",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const event = hookEvent();
  await handler(event);
  assert.equal(event.cancel, false);
});

test("empty toolName is omitted from metadata", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const handler = createBeforeToolCallHandler(client, {});
  await handler(
    hookEvent({}, { toolUse: { name: "", input: {} } }),
  );
  assert.equal("strands.tool" in recorded(recorded(guardCalls[0])["metadata"]), false);
});

test("non-string toolName is treated as empty", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const handler = createBeforeToolCallHandler(client, {});
  await handler(
    hookEvent({}, { toolUse: { name: 12, input: {} } }),
  );
  assert.equal("strands.tool" in recorded(recorded(guardCalls[0])["metadata"]), false);
});

test("skips an already-branded tool so Guard is not double-called", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const branded = { name: "lookup_order" };
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  const handler = createBeforeToolCallHandler(client, { action: "tool.invoked" });
  const event = hookEvent({ note: "x" }, { tool: branded });
  await handler(event);
  assert.equal(guardCalls.length, 0);
  assert.equal(event.cancel, false);
});

test("still gates an unwrapped tool when event.tool is missing", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const handler = createBeforeToolCallHandler(client, { action: "tool.invoked" });
  const event = hookEvent();
  await handler(event);
  assert.equal(denialFromCancel(event).arcjetDenied, true);
});

test("does not mint a correlation id when nothing is present", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const handler = createBeforeToolCallHandler(client, { action: "tool.invoked" });
  await handler({
    toolUse: { name: "lookup", input: {} },
    invocationState: {},
    cancel: false,
  });
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("policy.sessionId is used when invocationState has none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const handler = createBeforeToolCallHandler(client, {
    action: "tool.invoked",
    sessionId: "policy-sess",
  });
  await handler({
    toolUse: { name: "lookup", input: {} },
    invocationState: {},
    cancel: false,
  });
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("never reads traceId from invocationState", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const handler = createBeforeToolCallHandler(client, { action: "tool.invoked" });
  await handler({
    toolUse: { name: "lookup", input: {} },
    invocationState: { traceId: "trace-minted" },
    cancel: false,
  });
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("interrupt() is never called on DENY", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let interruptCalls = 0;
  const handler = createBeforeToolCallHandler(client, { action: "tool.invoked" });
  const event = hookEvent(
    {},
    {
      interrupt: () => {
        interruptCalls += 1;
        throw new Error("HITL");
      },
    },
  );
  await handler(event);
  assert.equal(interruptCalls, 0);
  assert.equal(typeof event.cancel, "string");
});

test("onDeny reshape is JSON.stringified onto event.cancel", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const handler = createBeforeToolCallHandler(client, {
    action: "tool.invoked",
    onDeny: (decision) => ({ blocked: decision.reason }),
  });
  const event = hookEvent();
  await handler(event);
  assert.deepEqual(JSON.parse(event.cancel as string), { blocked: "PROMPT_INJECTION" });
});

test("handler never throws even when the guard client throws", async () => {
  const { client } = stubClient(new Error("transport down"));
  const handler = createBeforeToolCallHandler(client, { action: "tool.invoked" });
  const event = hookEvent();
  await handler(event);
  assert.equal(denialFromCancel(event).reason, "ERROR");
});

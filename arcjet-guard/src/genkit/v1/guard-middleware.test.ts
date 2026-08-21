// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/explicit-function-return-type, eslint/require-await, eslint/strict-boolean-expressions, typescript/strict-boolean-expressions, unicorn/no-useless-undefined, unicorn/no-object-as-default-parameter -- test infrastructure and mocks
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
import { guardMiddleware } from "./guard-middleware.ts";
import { guardTool } from "./guard-tool.ts";
import type { GenkitTool } from "./guard-tool.ts";

function toolRequest(name: string, input: unknown = {}, ref = "call-1") {
  return { toolRequest: { name, input, ref } };
}

function instantiate(mw: ReturnType<typeof guardMiddleware>, ai?: unknown) {
  return mw.instantiate(ai === undefined ? undefined : { ai });
}

async function runHook(
  mw: ReturnType<typeof guardMiddleware>,
  req: unknown,
  next: (req: unknown, ctx: unknown) => Promise<unknown>,
  ctx: unknown = { context: { sessionId: "sess-1" } },
  ai?: unknown,
): Promise<unknown> {
  const def = instantiate(mw, ai);
  return def.tool(req, ctx, next);
}

test("returns a named object with instantiate (not a raw function)", () => {
  const { client } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  assert.equal(typeof mw, "object");
  assert.equal(typeof mw.name, "string");
  assert.ok(mw.name.startsWith("arcjet-guard-"));
  assert.equal(typeof mw.instantiate, "function");
  assert.equal("plugin" in mw, false);
});

test("each call gets a unique name so two instances do not collide", () => {
  const { client } = stubClient(decisionAllow());
  const a = guardMiddleware(client);
  const b = guardMiddleware(client);
  assert.notEqual(a.name, b.name);
});

test("ALLOW → next is called and its result is returned", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let calls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolRequest("lookup"), async () => {
    calls += 1;
    return { toolResponse: { name: "lookup", output: { ok: true } } };
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { toolResponse: { name: "lookup", output: { ok: true } } });
  assert.equal(guardCalls.length, 1);
});

test("DENY → next is not called and a completed ToolResponsePart is returned", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolRequest("lookup", { note: "x" }), async () => {
    calls += 1;
    return { toolResponse: { name: "lookup", output: "must not run" } };
  });
  assert.equal(calls, 0);
  assert.ok(result && typeof result === "object" && "toolResponse" in result);
  const part = result as { toolResponse: { name: string; ref?: string; output: unknown } };
  assert.equal(part.toolResponse.name, "lookup");
  assert.equal(part.toolResponse.ref, "call-1");
  const denial = asDenial<ArcjetDenialResult>(part.toolResponse.output);
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
});

test("rules see toolRequest.input, not the opaque ref", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let scanned: unknown;
  const mw = guardMiddleware(client, {
    action: "note.read",
    rules: ({ input, toolName }) => {
      scanned = { input, toolName };
      return [fakeRule];
    },
  });
  await runHook(mw, toolRequest("lookup", { note: "hello" }, "ref-opaque"), async () => ({
    toolResponse: { name: "lookup", output: "ok" },
  }));
  assert.deepEqual(scanned, { input: { note: "hello" }, toolName: "lookup" });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("correlation comes from ctx.context.sessionId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(
    mw,
    toolRequest("lookup"),
    async () => ({ toolResponse: { name: "lookup", output: "ok" } }),
    { context: { sessionId: "sess-mw" } },
  );
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-mw");
});

test("policy.sessionId is used when ctx.context has none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    sessionId: "policy-sess",
  });
  await runHook(
    mw,
    toolRequest("lookup"),
    async () => ({ toolResponse: { name: "lookup", output: "ok" } }),
    { context: {} },
  );
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("does not mint a correlation id when nothing is present", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(
    mw,
    toolRequest("lookup"),
    async () => ({ toolResponse: { name: "lookup", output: "ok" } }),
    {},
  );
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("fail-closed unavailable → ERROR denial, next not called", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(mw, toolRequest("lookup"), async () => {
    calls += 1;
    return { toolResponse: { name: "lookup", output: "ok" } };
  });
  assert.equal(calls, 0);
  const part = result as { toolResponse: { output: unknown } };
  assert.equal(asDenial<ArcjetDenialResult>(part.toolResponse.output).reason, "ERROR");
});

test("onGuardError allow → next still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked", onGuardError: "allow" });
  const result = await runHook(mw, toolRequest("lookup"), async () => {
    calls += 1;
    return { toolResponse: { name: "lookup", output: "ran" } };
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { toolResponse: { name: "lookup", output: "ran" } });
});

test("policy factory throw fail-closes and does not call next", async () => {
  const { client } = stubClient(decisionAllow());
  let calls = 0;
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await runHook(mw, toolRequest("lookup"), async () => {
    calls += 1;
    return { toolResponse: { name: "lookup", output: "ok" } };
  });
  assert.equal(calls, 0);
  const part = result as { toolResponse: { output: unknown } };
  assert.equal(asDenial<ArcjetDenialResult>(part.toolResponse.output).reason, "ERROR");
});

test("skips an already-branded tool looked up on the registry", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const branded = { name: "lookup_order" };
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  const ai = {
    registry: {
      lookupAction: async (key: string) => (key === "/tool/lookup_order" ? branded : undefined),
    },
  };
  let calls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(
    mw,
    toolRequest("lookup_order"),
    async () => {
      calls += 1;
      return { toolResponse: { name: "lookup_order", output: "ran" } };
    },
    { context: { sessionId: "s" } },
    ai,
  );
  assert.equal(calls, 1);
  assert.equal(guardCalls.length, 0);
  assert.deepEqual(result, { toolResponse: { name: "lookup_order", output: "ran" } });
});

test("still gates an unwrapped tool when lookup finds nothing", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const ai = {
    registry: {
      lookupAction: async () => undefined,
    },
  };
  let calls = 0;
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  const result = await runHook(
    mw,
    toolRequest("mcp_search"),
    async () => {
      calls += 1;
      return { toolResponse: { name: "mcp_search", output: "ran" } };
    },
    { context: { sessionId: "s" } },
    ai,
  );
  assert.equal(calls, 0);
  const part = result as { toolResponse: { output: unknown } };
  assert.equal(asDenial<ArcjetDenialResult>(part.toolResponse.output).arcjetDenied, true);
});

test("a non-tool-request part is passed through without a guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  let calls = 0;
  const result = await runHook(mw, { text: "not a tool" }, async (req) => {
    calls += 1;
    return req;
  });
  assert.equal(calls, 1);
  assert.equal(guardCalls.length, 0);
  assert.deepEqual(result, { text: "not a tool" });
});

test("action callback names the guard call from the tool name", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });
  await runHook(mw, toolRequest("mcp_search"), async () => ({
    toolResponse: { name: "mcp_search", output: "ok" },
  }));
  assert.equal(recorded(guardCalls[0])["label"], "mcp_search.invoked");
});

test("defaults the guard label to tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client);
  await runHook(mw, toolRequest("mcp_search"), async () => ({
    toolResponse: { name: "mcp_search", output: "ok" },
  }));
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("sessionId callback receives the tool name and input", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let seen: unknown;
  const mw = guardMiddleware(client, {
    sessionId: (call) => {
      seen = call;
      return "sess-from-callback";
    },
  });
  await runHook(
    mw,
    toolRequest("mcp_search", { q: "hello" }),
    async () => ({ toolResponse: { name: "mcp_search", output: "ok" } }),
    { context: {} },
  );
  assert.deepEqual(seen, { toolName: "mcp_search", input: { q: "hello" } });
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-from-callback");
});

test("onDeny reshapes the payload carried by the ToolResponsePart", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    onDeny: (decision) => ({ blocked: true, reason: decision.reason }),
  });
  const result = await runHook(mw, toolRequest("mcp_search"), async () => ({
    toolResponse: { name: "mcp_search", output: "must not run" },
  }));
  const part = result as { toolResponse: { name: string; ref?: string; output: unknown } };
  assert.equal(part.toolResponse.name, "mcp_search");
  assert.equal(part.toolResponse.ref, "call-1");
  assert.deepEqual(part.toolResponse.output, { blocked: true, reason: "PROMPT_INJECTION" });
});

test("onDeny throw falls back to the default denial", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const mw = guardMiddleware(client, {
    action: "tool.invoked",
    onDeny: () => {
      throw new Error("onDeny exploded");
    },
  });
  const result = await runHook(mw, toolRequest("mcp_search"), async () => ({
    toolResponse: { name: "mcp_search", output: "must not run" },
  }));
  const part = result as { toolResponse: { output: unknown } };
  assert.equal(asDenial<ArcjetDenialResult>(part.toolResponse.output).arcjetDenied, true);
});

test("onDeny throw warns when ARCJET_LOG_LEVEL asks for warnings", async () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "warn";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const { client } = stubClient(decisionDenyPromptInjection());
    const mw = guardMiddleware(client, {
      action: "tool.invoked",
      onDeny: () => {
        throw new Error("onDeny exploded");
      },
    });
    const result = await runHook(mw, toolRequest("mcp_search"), async () => ({
      toolResponse: { name: "mcp_search", output: "must not run" },
    }));
    const part = result as { toolResponse: { output: unknown } };
    assert.equal(asDenial<ArcjetDenialResult>(part.toolResponse.output).arcjetDenied, true);
    assert.ok(warnings.length > 0);
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) {
      delete process.env["ARCJET_LOG_LEVEL"];
    } else {
      process.env["ARCJET_LOG_LEVEL"] = previous;
    }
  }
});

test("a non-object registry still gates the call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(
    mw,
    toolRequest("mcp_search"),
    async () => ({ toolResponse: { name: "mcp_search", output: "ok" } }),
    { context: { sessionId: "s" } },
    { registry: "not-a-registry" },
  );
  assert.equal(guardCalls.length, 1);
});

test("a registry without lookupAction still gates the call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  await runHook(
    mw,
    toolRequest("mcp_search"),
    async () => ({ toolResponse: { name: "mcp_search", output: "ok" } }),
    { context: { sessionId: "s" } },
    { registry: {} },
  );
  assert.equal(guardCalls.length, 1);
});

test("a lookupAction that throws does not skip the guard call", async () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "warn";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const { client, guardCalls } = stubClient(decisionAllow());
    const ai = {
      registry: {
        lookupAction: async () => {
          throw new Error("registry exploded");
        },
      },
    };
    const mw = guardMiddleware(client, { action: "tool.invoked" });
    await runHook(
      mw,
      toolRequest("mcp_search"),
      async () => ({ toolResponse: { name: "mcp_search", output: "ok" } }),
      { context: { sessionId: "s" } },
      ai,
    );
    // Gating is the safe direction, but a branded tool guarded twice is
    // worth a diagnostic.
    assert.equal(guardCalls.length, 1);
    assert.ok(warnings.length > 0);
    assert.match(String(warnings[0]?.[0]), /could not look up/);
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) {
      delete process.env["ARCJET_LOG_LEVEL"];
    } else {
      process.env["ARCJET_LOG_LEVEL"] = previous;
    }
  }
});

test("guardTool-wrapped fake is skipped when registered under its action name", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const raw: GenkitTool = Object.assign(async () => ({ ok: true }), {
    __action: { name: "authored", metadata: { type: "tool" }, actionType: "tool" },
    run: async () => ({ result: { ok: true }, telemetry: { traceId: "", spanId: "" } }),
  });
  const wrapped = guardTool(client, raw, { action: "order.looked-up" });
  const ai = {
    registry: {
      lookupAction: async (key: string) => (key === "/tool/authored" ? wrapped : undefined),
    },
  };
  const mw = guardMiddleware(client, { action: "tool.invoked" });
  let nextCalls = 0;
  await runHook(
    mw,
    toolRequest("authored"),
    async () => {
      nextCalls += 1;
      return { toolResponse: { name: "authored", output: "ok" } };
    },
    { context: { sessionId: "s" } },
    ai,
  );
  assert.equal(nextCalls, 1);
  // The middleware skipped; the only guard calls would come from next() (none here).
  assert.equal(guardCalls.length, 0);
});

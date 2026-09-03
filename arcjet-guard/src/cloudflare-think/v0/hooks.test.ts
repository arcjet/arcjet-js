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
import type { ArcjetDenialResult } from "../../agents/denial.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import { guardHooks } from "./hooks.ts";
import type { CloudflareThinkGuardHooks } from "./hooks.ts";

function toolCtx(name: string, input: unknown = {}, extra: Record<string, unknown> = {}) {
  return {
    type: "tool-call" as const,
    toolCallId: "call-auto",
    toolName: name,
    input,
    stepNumber: 0,
    messages: [],
    abortSignal: undefined,
    ...extra,
  };
}

async function runHook(hooks: CloudflareThinkGuardHooks, ctx: unknown) {
  return hooks.beforeToolCall(ctx as never);
}

/**
 * Think 0.3+ `_resolveToolCallDecision`: void / `{ action: "allow" }`
 * runs `execute`; `block` / `substitute` skip it.
 */
function applyThinkDecision(
  decision: unknown,
  execute: (input: unknown) => unknown,
  input: unknown,
): unknown {
  if (decision === undefined || decision === null) {
    return execute(input);
  }
  if (typeof decision !== "object" || !("action" in decision)) {
    return execute(input);
  }
  const record = decision as unknown as {
    action: string;
    input?: unknown;
    reason?: string;
    output?: unknown;
  };
  if (record.action === "allow") {
    return execute(record.input ?? input);
  }
  if (record.action === "block") {
    return record.reason ?? "Tool call blocked";
  }
  if (record.action === "substitute") {
    return record.output;
  }
  return execute(input);
}

test("returns beforeToolCall (not needsApproval)", () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  assert.equal(typeof hooks, "object");
  assert.equal(typeof hooks.beforeToolCall, "function");
  assert.equal("needsApproval" in hooks, false);
  assert.equal("guardApproval" in hooks, false);
  assert.equal("guardTool" in hooks, false);
});

test("ALLOW → void decision so the tool can run", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("lookup"));
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 1);
});

test("substitute-deny: DENY → { action: substitute, output: ArcjetDenialResult }", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("lookup", { note: "x" }));
  assert.ok(result && typeof result === "object" && "action" in result);
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  const denial = asDenial<ArcjetDenialResult>(decision.output);
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
});

test("block-deny: onDeny block → { action: block, reason }", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "tool.invoked", onDeny: "block" });
  const result = await runHook(hooks, toolCtx("lookup", { note: "x" }));
  assert.ok(result && typeof result === "object" && "action" in result);
  const decision = result as { action: string; reason?: string };
  assert.equal(decision.action, "block");
  assert.equal(typeof decision.reason, "string");
  assert.match(String(decision.reason), /PROMPT_INJECTION/);
});

test("tool execute is not called on substitute deny", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  let executed = 0;
  const decision = await runHook(hooks, toolCtx("lookup", { note: "x" }));
  const output = await applyThinkDecision(
    decision,
    () => {
      executed += 1;
      return { ran: true };
    },
    { note: "x" },
  );
  assert.equal(executed, 0);
  assert.equal(asDenial<ArcjetDenialResult>(output).arcjetDenied, true);
});

test("tool execute is not called on block deny", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "tool.invoked", onDeny: "block" });
  let executed = 0;
  const decision = await runHook(hooks, toolCtx("lookup"));
  const output = await applyThinkDecision(
    decision,
    () => {
      executed += 1;
      return { ran: true };
    },
    {},
  );
  assert.equal(executed, 0);
  assert.equal(typeof output, "string");
  assert.match(String(output), /PROMPT_INJECTION/);
});

test("tool execute is called on allow", async () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  let executed = 0;
  const decision = await runHook(hooks, toolCtx("lookup", { q: "hi" }));
  const output = await applyThinkDecision(
    decision,
    (input) => {
      executed += 1;
      return { ran: true, input };
    },
    { q: "hi" },
  );
  assert.equal(executed, 1);
  assert.deepEqual(output, { ran: true, input: { q: "hi" } });
});

test("rules see ctx.input, not the opaque toolCallId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let scanned: unknown;
  const hooks = guardHooks(client, {
    action: "note.read",
    rules: ({ input, toolName }) => {
      scanned = { input, toolName };
      return [fakeRule];
    },
  });
  await runHook(hooks, toolCtx("lookup", { note: "hello" }));
  assert.deepEqual(scanned, { input: { note: "hello" }, toolName: "lookup" });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("correlation comes from policy.sessionId, never toolCallId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked", sessionId: "policy-sess" });
  await runHook(hooks, toolCtx("lookup"));
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("policy.sessionId is used when hook context has none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    sessionId: "policy-sess",
  });
  await runHook(hooks, toolCtx("lookup"));
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("never-mint: does not mint a correlation id when nothing is present", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  await runHook(hooks, toolCtx("lookup"));
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("never-mint: does not use auto-generated toolCallId / name / id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  await runHook(
    hooks,
    toolCtx(
      "lookup",
      {},
      {
        name: "do-name-auto",
        id: "do-id-auto",
        traceId: "trace-auto",
      },
    ),
  );
  const call = recorded(guardCalls[0]);
  assert.equal("correlationId" in call, false);
  assert.notEqual(call["correlationId"], "call-auto");
  assert.notEqual(call["correlationId"], "do-name-auto");
  assert.notEqual(call["correlationId"], "do-id-auto");
  assert.notEqual(call["correlationId"], "trace-auto");
});

test("fail-closed unavailable → substitute with ERROR payload", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("onGuardError allow → void so the tool still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client, { action: "tool.invoked", onGuardError: "allow" });
  const result = await runHook(hooks, toolCtx("lookup"));
  assert.equal(result, undefined);
});

test("policy factory throw fail-closes and does not throw from the hook", async () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("onDeny block does not block unavailable: fail-open stays substitute", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client, { action: "tool.invoked", onDeny: "block" });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("onDeny block does not block unavailable: policy factory throw stays substitute", async () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    onDeny: "block",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("onDeny block does not block unavailable: thrown guard() stays substitute", async () => {
  const { client } = stubClient(new Error("transport down"));
  const hooks = guardHooks(client, { action: "tool.invoked", onDeny: "block" });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("no-throw: a throwing guard() becomes a substitute denial, not a thrown error", async () => {
  const { client } = stubClient(new Error("transport down"));
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("fail-closed: thrown guard() never returns void / allow", async () => {
  const { client } = stubClient(new Error("transport down"));
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("lookup"));
  assert.notEqual(result, undefined);
  const decision = result as { action: string };
  assert.notEqual(decision.action, "allow");
});

test("tool execute is not called on fail-closed substitute", async () => {
  const { client } = stubClient(new Error("transport down"));
  const hooks = guardHooks(client, { action: "tool.invoked" });
  let executed = 0;
  const decision = await runHook(hooks, toolCtx("lookup"));
  await applyThinkDecision(
    decision,
    () => {
      executed += 1;
      return { ran: true };
    },
    {},
  );
  assert.equal(executed, 0);
});

test("skips a sibling guardTool-branded tool so Guard is not double-called", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const branded = { name: "lookup_order" };
  Object.defineProperty(branded, arcjetProtectedTool, { value: true });
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("lookup_order", {}, { tool: branded }));
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 0);
});

test("still gates an unwrapped tool when ctx.tool is undefined", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("mcp_search"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).arcjetDenied, true);
});

test("inbound guard() before chat() is a separate call; hooks still gate tools", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const inbound = await client.guard({
    label: "message.received",
    rules: [],
  });
  assert.equal(inbound.hasFailedOpen(), false);

  const hooks = guardHooks(client, { action: "tool.invoked" });
  await runHook(hooks, toolCtx("lookup"));
  assert.equal(guardCalls.length, 2);
  assert.equal(recorded(guardCalls[0])["label"], "message.received");
  assert.equal(recorded(guardCalls[1])["label"], "tool.invoked");
});

test("a non-tool-call hook context is passed through without a guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, { text: "not a tool" });
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 0);
});

test("action callback names the guard call from the tool name", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });
  await runHook(hooks, toolCtx("mcp_search"));
  assert.equal(recorded(guardCalls[0])["label"], "mcp_search.invoked");
});

test("defaults the guard label to tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await runHook(hooks, toolCtx("mcp_search"));
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("sessionId callback receives the tool name and input", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let seen: unknown;
  const hooks = guardHooks(client, {
    sessionId: (call) => {
      seen = call;
      return "sess-from-callback";
    },
  });
  await runHook(hooks, toolCtx("mcp_search", { q: "hello" }));
  assert.deepEqual(seen, { toolName: "mcp_search", input: { q: "hello" } });
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-from-callback");
});

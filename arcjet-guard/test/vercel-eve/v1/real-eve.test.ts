/**
 * Behaviour against the installed Eve 1.x, rather than the structural fakes in
 * `src/vercel-eve/v1/*.test.ts`: the hook and approval loaders Eve runs on
 * every `agent/hooks/*.ts` and `approval` export, and a real `defineTool`.
 *
 * These assertions live outside `src/vercel-eve/` — that directory is globbed
 * by the eve-absent CI job and scanned for type-only imports.
 *
 * Eve's loaders are internal modules with no public export. They are loaded by
 * path from the installed package, so a release that moves them fails here by
 * name instead of silently skipping the check.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import type { ApprovalContext, ApprovalResponseContext } from "eve/tools/approval";

import {
  ArcjetDeniedError,
  arcjetHooks,
  guardApproval,
  guardTool,
} from "../../../src/vercel-eve/v1/index.ts";
import { recorded } from "../../_shared/source-scan.ts";
import { decisionAllow, decisionDenyRateLimit, stubClient } from "../../_shared/stub-client.ts";

const skip =
  Number(process.versions.node.split(".")[0]) < 24 ? "eve requires Node.js >= 24" : false;

const SESSION_ID = "01JTESTSESSION0000000000AB";

const requireFromV1 = createRequire(
  join(import.meta.dirname, "../../../src/vercel-eve/v1/index.ts"),
);

function eveRoot(): string {
  let dir = dirname(requireFromV1.resolve("eve/hooks"));
  while (!existsSync(join(dir, "package.json"))) dir = dirname(dir);
  return dir;
}

function eveVersion(): string {
  const manifest: unknown = JSON.parse(readFileSync(join(eveRoot(), "package.json"), "utf-8"));
  assert.ok(typeof manifest === "object" && manifest !== null && "version" in manifest);
  return String(manifest.version);
}

async function eveInternal<T>(path: string): Promise<T> {
  const file = join(eveRoot(), "dist/src/internal", path);
  assert.ok(existsSync(file), `eve ${eveVersion()} has no internal module ${path}`);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- module namespace object
  return (await import(pathToFileURL(file).href)) as T;
}

type HookLoader = {
  normalizeHookHandlers: (
    value: unknown,
    source: { logicalPath: string; exportName?: string },
  ) => Record<string, (event: unknown, ctx: unknown) => void>;
};

type ApprovalLoader = {
  normalizeApproval: (value: unknown, message: string) => unknown;
  normalizeAgentApproval: (value: unknown, message: string) => unknown;
};

function hookContext(): unknown {
  return {
    session: {
      id: SESSION_ID,
      turn: { id: "turn_1", sequence: 1 },
      auth: { current: { principalId: "user_1" }, initiator: null },
    },
    channel: { kind: "slack", continuationToken: "slack:1700000000.000100" },
    agent: { name: "support" },
  };
}

test("the installed eve is 1.x", { skip }, () => {
  assert.match(eveVersion(), /^1\./);
});

test("arcjetHooks loads through eve's hook loader for every family", { skip }, async () => {
  const { defineHook } = await import("eve/hooks");
  const { normalizeHookHandlers } = await eveInternal<HookLoader>("authored-definition/hook.js");
  const { client } = stubClient(decisionAllow());

  for (const events of [undefined, ["session"], ["turn"], ["tool"], ["subagent"]] as const) {
    const definition = defineHook(arcjetHooks(client, events ? { events } : undefined));
    const handlers = normalizeHookHandlers(definition, { logicalPath: "agent/hooks/arcjet.ts" });
    assert.deepEqual(
      // oxlint-disable-next-line unicorn/no-array-sort -- sorts a fresh Object.keys array
      Object.keys(handlers).sort(),
      // oxlint-disable-next-line unicorn/no-array-sort -- sorts a fresh Object.keys array
      Object.keys(definition.events).sort(),
      `every ${events ? events.join() : "default"} handler must survive eve's loader`,
    );
  }
});

test(
  "eve's loader rejects the Eve 0.x arcjetHooks, which is why /v1 exists",
  { skip },
  async () => {
    const { normalizeHookHandlers } = await eveInternal<HookLoader>("authored-definition/hook.js");
    // The v0 hooks type against Eve 0.x, so load them without the type checker
    // following the specifier.
    const v0Hooks: string = "../../../src/vercel-eve/v0/hooks.ts";
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- module namespace object
    const { arcjetHooks: v0ArcjetHooks } = (await import(v0Hooks)) as {
      arcjetHooks: typeof arcjetHooks;
    };
    const { client } = stubClient(decisionAllow());

    assert.throws(
      () => normalizeHookHandlers(v0ArcjetHooks(client), { logicalPath: "agent/hooks/arcjet.ts" }),
      /was removed in session stream version 27/,
    );
  },
);

test("arcjetHooks handlers capture from eve-shaped facts", { skip }, async () => {
  const { normalizeHookHandlers } = await eveInternal<HookLoader>("authored-definition/hook.js");
  const { client, captureCalls } = stubClient(decisionAllow());
  const handlers = normalizeHookHandlers(arcjetHooks(client), {
    logicalPath: "agent/hooks/arcjet.ts",
  });

  handlers["session.started"]?.({ type: "session.started", data: {} }, hookContext());
  handlers["call.settled"]?.(
    { type: "call.settled", data: { callId: "call_1", outcome: "completed" } },
    hookContext(),
  );
  handlers["task.started"]?.(
    {
      type: "task.started",
      data: { taskId: "task_1", startedBy: { callId: "call_2" }, kind: "agent", name: "research" },
    },
    hookContext(),
  );

  const actions = captureCalls.map((call) => recorded(call)["action"]);
  assert.deepEqual(actions, ["eve.session-started", "eve.action-result", "eve.subagent-called"]);
  const joinRecord = recorded(recorded(captureCalls[0])["metadata"]);
  assert.equal(joinRecord["eve.continuation-token"], "slack:1700000000.000100");
  assert.equal(recorded(captureCalls[0])["correlationId"], SESSION_ID);
});

test(
  "guardTool keeps both eve brands on a real defineTool and gates execute",
  { skip },
  async () => {
    const { defineTool } = await import("eve/tools");
    const tool = defineTool<{ q: string }, string>({
      description: "Look something up",
      inputSchema: { type: "object", properties: { q: { type: "string" } }, required: ["q"] },
      execute: (input) => Promise.resolve(`result for ${input.q}`),
    });

    const brand = Symbol.for("eve:tool-brand");
    const sourceKey = Symbol.for("eve.definition-source-key");
    const sourceDescriptor = Object.getOwnPropertyDescriptor(tool, sourceKey);
    assert.ok(sourceDescriptor, "eve 1.x still stamps the definition-source key");
    assert.equal(sourceDescriptor.enumerable, false);

    // A direct invocation has no Eve context, which guardTool documents and allows.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
    const noContext = undefined as unknown as Parameters<NonNullable<typeof tool.execute>>[1];

    const allow = stubClient(decisionAllow());
    const allowed = guardTool(allow.client, tool, { action: "lookup.read" });
    assert.equal(Reflect.get(allowed, brand), Reflect.get(tool, brand));
    assert.deepEqual(Object.getOwnPropertyDescriptor(allowed, sourceKey), sourceDescriptor);
    assert.equal(await allowed.execute?.({ q: "x" }, noContext), "result for x");
    assert.equal(allow.guardCalls.length, 1);

    const deny = stubClient(decisionDenyRateLimit(Math.floor(Date.now() / 1000) + 60));
    const denied = guardTool(deny.client, tool, { action: "lookup.read" });
    await assert.rejects(
      Promise.resolve(denied.execute?.({ q: "x" }, noContext)),
      ArcjetDeniedError,
    );
  },
);

test("guardApproval passes eve's approval loaders in every slot", { skip }, async () => {
  const { normalizeApproval, normalizeAgentApproval } = await eveInternal<ApprovalLoader>(
    "authored-definition/approval.js",
  );
  const { client } = stubClient(decisionAllow());

  const fn = guardApproval(client, { action: "thing.read" });
  const both = guardApproval(client, {
    action: "thing.read",
    response: { action: "thing.approved" },
  });

  assert.equal(normalizeApproval(fn, "tool approval"), fn);
  assert.equal(normalizeAgentApproval(fn, "agent approval"), fn);
  const normalized = normalizeApproval(both, "connection approval");
  assert.ok(typeof normalized === "object" && normalized !== null);
  assert.equal(Reflect.get(normalized, "request"), both.request);
  assert.equal(Reflect.get(normalized, "response"), both.response);
});

test("guardApproval reads eve 1.x approval and response contexts", { skip }, async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const approval = guardApproval(client, {
    action: "thing.read",
    onAllow: "user-approval",
    response: { action: "thing.approved" },
  });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a hand-built eve 1.x context
  const requestCtx = {
    abortSignal: new AbortController().signal,
    callId: "call_1",
    toolName: "deploy",
    toolInput: { env: "prod" },
    session: {
      id: SESSION_ID,
      turn: { id: "turn_1", sequence: 1 },
      auth: { current: { principalId: "requester" }, initiator: null },
    },
    getSandbox: () => Promise.reject(new Error("no sandbox")),
  } as unknown as ApprovalContext;
  assert.equal(await approval.request(requestCtx), "user-approval");

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a hand-built eve 1.x context
  const responseCtx = {
    auth: {},
    request: {
      callId: "call_1",
      interactionId: "int_1",
      principal: { principalId: "requester" },
      toolName: "deploy",
    },
    response: { decision: "approve", principal: { principalId: "approver" } },
    session: { id: SESSION_ID, initiator: null, turn: { id: "turn_1", sequence: 1 } },
  } as unknown as ApprovalResponseContext;
  assert.deepEqual(await approval.response?.(responseCtx), { status: "allowed" });

  const responseMetadata = recorded(recorded(guardCalls[1])["metadata"]);
  assert.equal(responseMetadata["eve.phase"], "approval-response");
  assert.equal(responseMetadata["eve.request"], "int_1");
  assert.equal(responseMetadata["eve.call"], "call_1");
  assert.equal(responseMetadata["user"], "approver");
});

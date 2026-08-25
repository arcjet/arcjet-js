// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion -- test fixtures built from the real SDK types
/**
 * Behaviour against the real `@strands-agents/sdk` Plugin / addHook
 * surface, rather than hand-written fakes.
 *
 * `addHook` keys the registry by constructor identity. A fake that
 * stored the callback under a string name would report success while
 * the real Agent never fired it. This file proves `initAgent` passes
 * the real `BeforeToolCallEvent` class and `HookOrder.SDK_FIRST - 1`.
 *
 * This file value-imports the optional peer, so it lives outside
 * `src/strands-agents/`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AfterToolCallEvent,
  BeforeToolCallEvent,
  HookOrder,
} from "@strands-agents/sdk";

import { guardHooks } from "../../src/strands-agents/v1/hooks.ts";
import { guardTool } from "../../src/strands-agents/v1/guard-tool.ts";
import { asDenial } from "../_shared/source-scan.ts";
import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";
import { tool } from "@strands-agents/sdk";
import { z } from "zod";

test("initAgent registers BeforeToolCallEvent at HookOrder.SDK_FIRST - 1", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const plugin = guardHooks(client, { action: "tool.invoked" });

  const registered: Array<{ eventType: unknown; options?: { order?: number } }> = [];
  await plugin.initAgent({
    addHook(eventType: unknown, _callback: unknown, options?: { order?: number }) {
      registered.push(options === undefined ? { eventType } : { eventType, options });
      return () => {
        /* cleanup */
      };
    },
  } as never);

  const before = registered.find((entry) => entry.eventType === BeforeToolCallEvent);
  assert.ok(before, "initAgent must register BeforeToolCallEvent by constructor identity");
  assert.equal(before.options?.order, HookOrder.SDK_FIRST - 1);

  const after = registered.find((entry) => entry.eventType === AfterToolCallEvent);
  assert.ok(after, "initAgent must register AfterToolCallEvent by constructor identity");
});

test("initAgent's BeforeToolCallEvent handler sets cancel to a JSON denial string", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const plugin = guardHooks(client, { action: "tool.invoked" });

  let beforeCb: ((event: InstanceType<typeof BeforeToolCallEvent>) => Promise<void>) | undefined;
  await plugin.initAgent({
    addHook(eventType: unknown, callback: unknown) {
      if (eventType === BeforeToolCallEvent) {
        beforeCb = callback as (event: InstanceType<typeof BeforeToolCallEvent>) => Promise<void>;
      }
      return () => {
        /* cleanup */
      };
    },
  } as never);

  assert.ok(beforeCb);
  const event = new BeforeToolCallEvent({
    agent: {} as never,
    toolUse: { name: "mcp_search", toolUseId: "tu-1", input: { q: "1" } },
    tool: undefined,
    invocationState: { sessionId: "sess-real" },
  });
  await beforeCb(event);

  assert.equal(typeof event.cancel, "string");
  const denial = asDenial<ArcjetDenialResult>(JSON.parse(event.cancel as string));
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
});

test("initAgent's handler skips a tool() already wrapped with guardTool", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const branded = guardTool(
    client,
    tool({
      name: "lookup_order",
      description: "already guarded",
      inputSchema: z.object({ note: z.string() }),
      callback: () => "ran",
    }),
    { action: "order.looked-up" },
  );

  const plugin = guardHooks(client, { action: "tool.invoked" });
  let beforeCb: ((event: InstanceType<typeof BeforeToolCallEvent>) => Promise<void>) | undefined;
  await plugin.initAgent({
    addHook(eventType: unknown, callback: unknown) {
      if (eventType === BeforeToolCallEvent) {
        beforeCb = callback as (event: InstanceType<typeof BeforeToolCallEvent>) => Promise<void>;
      }
      return () => {
        /* cleanup */
      };
    },
  } as never);

  assert.ok(beforeCb);
  const callsBefore = guardCalls.length;
  const event = new BeforeToolCallEvent({
    agent: {} as never,
    toolUse: { name: "lookup_order", toolUseId: "tu-1", input: { note: "x" } },
    tool: branded as never,
    invocationState: { sessionId: "sess-real" },
  });
  await beforeCb(event);

  assert.equal(event.cancel, false);
  assert.equal(guardCalls.length, callsBefore);
});

/**
 * Compile-time assignability: Managed Agents helpers fit the real SDK slots.
 *
 * Uses typed `const` declarations rather than casts — a cast would make the
 * test pass regardless.
 */
import { test } from "node:test";

import type {
  BetaManagedAgentsAgentCustomToolUseEvent,
  BetaManagedAgentsUserCustomToolResultEventParams,
  BetaManagedAgentsUserMessageEventParams,
  EventSendParams,
} from "@anthropic-ai/sdk/resources/beta/sessions/events";

import { decisionAllow, stubClient } from "../../../test/_shared/stub-client.ts";
import { claudeManagedAgentsContext } from "./context.ts";
import { guardCustomTool } from "./guard-custom-tool.ts";
import { guardEvents } from "./guard-events.ts";
import type {
  AgentCustomToolUseEvent,
  UserCustomToolResultEventParams,
  UserMessageEventParams,
} from "./types.ts";

function assignable<T>(_value: T): void {}

test("structural event types are assignable to @anthropic-ai/sdk event params", () => {
  const message: UserMessageEventParams = {
    type: "user.message",
    content: [{ type: "text", text: "Where is my order?" }],
  };
  assignable<BetaManagedAgentsUserMessageEventParams>(message);

  const use: AgentCustomToolUseEvent = {
    type: "agent.custom_tool_use",
    id: "sevt_1",
    name: "lookup_order",
    input: { orderNumber: "1" },
    processed_at: "2026-03-15T10:00:00Z",
  };
  assignable<BetaManagedAgentsAgentCustomToolUseEvent>(use);

  const result: UserCustomToolResultEventParams = {
    type: "user.custom_tool_result",
    custom_tool_use_id: "sevt_1",
    content: [{ type: "text", text: "denied" }],
    is_error: true,
  };
  assignable<BetaManagedAgentsUserCustomToolResultEventParams>(result);
});

test("guardEvents send body is assignable to EventSendParams", async () => {
  const { client } = stubClient(decisionAllow());
  const events: EventSendParams["events"] = [
    { type: "user.message", content: [{ type: "text", text: "hi" }] },
  ];

  await guardEvents(
    client,
    {
      events,
      inbound: { action: "message.received" },
      context: claudeManagedAgentsContext({ correlationId: "owned" }),
    },
    (body) => {
      const params: EventSendParams = { events: body.events };
      return Promise.resolve(params);
    },
  );
});

test("guardCustomTool send payload is assignable to user.custom_tool_result params", async () => {
  const { client } = stubClient(decisionAllow());
  const event: BetaManagedAgentsAgentCustomToolUseEvent = {
    type: "agent.custom_tool_use",
    id: "sevt_1",
    name: "lookup_order",
    input: {},
    processed_at: "2026-03-15T10:00:00Z",
  };

  await guardCustomTool(
    client,
    {
      event,
      execute: () => Promise.resolve("ok"),
      send: (result: UserCustomToolResultEventParams) => {
        assignable<BetaManagedAgentsUserCustomToolResultEventParams>(result);
        return Promise.resolve(result);
      },
    },
    { action: "order.looked-up" },
  );
});

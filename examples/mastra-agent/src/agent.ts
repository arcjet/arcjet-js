import {
  detectPromptInjection,
  localDetectSensitiveInfo,
} from "@arcjet/guard";
import {
  guardHooks,
  guardProcessor,
  guardTool,
} from "@arcjet/guard/mastra/v1";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { arcjet, mcpLimit, orderLookupLimit, refundLimit } from "./arcjet.js";

const lookupOrder = guardTool(
  arcjet,
  createTool({
    id: "lookup-order",
    description: "Look up an order by number",
    inputSchema: z.object({ orderNumber: z.string() }),
    execute: async ({ orderNumber }: { orderNumber: string }) => {
      return { orderNumber, status: "shipped" as const };
    },
  }),
  {
    action: "order.looked-up",
    onGuardError: "deny",
    rules: (input) => [
      orderLookupLimit({ key: input.orderNumber, requested: 1 }),
      localDetectSensitiveInfo()(input.orderNumber),
    ],
  },
);

const refundOrder = guardTool(
  arcjet,
  createTool({
    id: "refund-order",
    description: "Issue a refund for an order",
    inputSchema: z.object({
      orderNumber: z.string(),
      reason: z.string(),
    }),
    execute: async ({
      orderNumber,
      reason,
    }: {
      orderNumber: string;
      reason: string;
    }) => {
      return { orderNumber, refunded: true, reason };
    },
  }),
  {
    action: "order.refunded",
    onGuardError: "deny",
    rules: (input) => [
      refundLimit({ key: input.orderNumber, requested: 1 }),
      localDetectSensitiveInfo()(`${input.orderNumber} ${input.reason}`),
    ],
  },
);

const inbound = guardProcessor(arcjet, {
  action: "message.received",
  onGuardError: "deny",
  rules: ({ text }) => [detectPromptInjection()(text)],
});

const hooks = guardHooks(arcjet, {
  action: ({ toolName }) => `${toolName}.invoked`,
  onGuardError: "deny",
  rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
});

export const agent = new Agent({
  id: "support-agent",
  name: "support-agent",
  instructions:
    "Help the user look up orders and issue refunds. If a tool returns arcjetDenied, explain the denial and do not retry non-retryable ones.",
  model: "openai/gpt-4o",
  tools: { lookupOrder, refundOrder },
  inputProcessors: [inbound],
  outputProcessors: [inbound],
  hooks,
});

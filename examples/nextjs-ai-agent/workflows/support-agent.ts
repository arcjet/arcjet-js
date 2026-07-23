import {
  aiToolsContext,
  captureAction,
  protectAction,
  protectTool,
  securityMetadata,
} from "@arcjet/ai";
import type { ArcjetAiContext } from "@arcjet/ai";
import { slidingWindow, tokenBucket } from "@arcjet/guard";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { arcjet } from "@/lib/arcjet";

export interface SupportAgentInput {
  question: string;
  arcjet: ArcjetAiContext;
}

// Rule configs are created once at module scope; inputs per call.
const lookupLimit = tokenBucket({
  bucket: "order-lookups",
  refillRate: 5,
  intervalSeconds: 60,
  maxTokens: 10,
});

const ticketLimit = slidingWindow({
  bucket: "ticket-updates",
  maxRequests: 5,
  intervalSeconds: 60,
});

const baseMetadata = securityMetadata({
  agent: "support-agent",
  workflow: "support-request",
});

const tools = {
  lookupOrder: protectTool(
    arcjet,
    tool({
      description: "Look up an order by its number.",
      inputSchema: z.object({ orderNumber: z.string() }),
      async execute({ orderNumber }) {
        return lookupOrderRecord(orderNumber);
      },
    }),
    {
      action: "order.looked-up",
      rules: () => [lookupLimit({ key: "demo-user", requested: 1 })],
      metadata: ({ orderNumber }) =>
        securityMetadata({ resource: `order:${orderNumber}` }),
    },
  ),
};

export async function supportAgentWorkflow(input: SupportAgentInput) {
  "use workflow";
  const answer = await stepRunAgent(input);
  await stepUpdateTicket(input, answer);
  return { answer };
}

async function stepRunAgent(input: SupportAgentInput) {
  "use step";
  const result = await generateText({
    model: "anthropic/claude-haiku-4-5",
    instructions:
      "You are a support agent. Use the lookupOrder tool for order questions. " +
      "If a tool call is denied by security policy, do not retry it; explain to the user instead.",
    prompt: input.question,
    tools,
    toolsContext: aiToolsContext(input.arcjet, tools),
    stopWhen: stepCountIs(3),
  });
  return result.text;
}

async function stepUpdateTicket(input: SupportAgentInput, answer: string) {
  "use step";
  await protectAction(
    arcjet,
    input.arcjet,
    {
      action: "ticket.updated",
      rules: [ticketLimit({ key: "demo-user" })],
      metadata: {
        ...baseMetadata,
        destination: "internal",
        reversibility: "reversible",
      },
    },
    async () => {
      // Mock external action: a real app would call its ticketing system.
      console.log("ticket updated with answer:", answer.slice(0, 80));
    },
  );

  captureAction(arcjet, input.arcjet, {
    action: "notification.sent",
    metadata: { ...baseMetadata, destination: "internal" },
  });
}

// Mock order store.
function lookupOrderRecord(orderNumber: string) {
  return {
    orderNumber,
    status: "shipped",
    carrier: "ACME Post",
    eta: "2 days",
  };
}

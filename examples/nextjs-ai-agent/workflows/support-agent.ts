import {
  aiToolsContext,
  captureAction,
  guardAction,
  guardTool,
  securityMetadata,
  type ArcjetAgentContext,
} from "@arcjet/guard/vercel-ai/v7";
import { slidingWindow, tokenBucket } from "@arcjet/guard";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { arcjet } from "@/lib/arcjet";

export interface SupportAgentInput {
  question: string;
  ctx: ArcjetAgentContext;
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
  // Tool rules can be derived from the parsed input (orderNumber here).
  // Moderation rules could be computed the same way. An explicit guardAction()
  // inside execute() is also supported if you prefer visible control flow.
  lookupOrder: guardTool(
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
      // Order lookup is read-only; allow it even if policy evaluation fails.
      onGuardError: "allow",
      rules: ({ orderNumber }) => [
        lookupLimit({ key: `order:${orderNumber}`, requested: 1 }),
      ],
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
      "If a tool call is denied by security policy, do not retry it; explain the denial to the user or try a different approach.",
    prompt: input.question,
    tools,
    toolsContext: aiToolsContext(input.ctx, tools),
    stopWhen: stepCountIs(3),
  });
  return result.text;
}

async function stepUpdateTicket(input: SupportAgentInput, answer: string) {
  "use step";
  // If the policy is not evaluated, the call is blocked by default
  // (onGuardError: "deny"). This is appropriate for a write that creates a
  // ticket; see the lookupOrder tool for an example of onGuardError: "allow"
  // (read-only availability-first). An explicit guardAction() call inside the
  // execute block is also supported if you prefer visible control flow over
  // automatic context injection.
  await guardAction(
    arcjet,
    input.ctx,
    {
      action: "ticket.updated",
      rules: [ticketLimit({ key: "demo-user" })],
      metadata: {
        ...baseMetadata,
        ...securityMetadata({ destination: "internal", reversibility: "reversible" }),
      },
    },
    async () => {
      // Mock external action: a real app would call its ticketing system.
      console.log("ticket updated with answer:", answer.slice(0, 80));
    },
  );

  captureAction(arcjet, input.ctx, {
    action: "notification.sent",
    metadata: { ...baseMetadata, ...securityMetadata({ destination: "internal" }) },
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

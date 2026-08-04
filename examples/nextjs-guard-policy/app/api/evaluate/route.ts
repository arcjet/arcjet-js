import { policyInput, type DecisionDeny } from "@arcjet/guard";
import {
  aiToolsContext,
  createAgentContext,
  guardTool,
  securityMetadata,
} from "@arcjet/guard/vercel-ai/v7";
import { generateText, stepCountIs, tool } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { arcjet } from "@/lib/arcjet";
import {
  clients,
  defaultInjectionModel,
  defaultModel,
  models,
  scenarios,
  type ClientId,
  type ModelId,
  type ScenarioId,
} from "@/lib/demo";

export const runtime = "nodejs";

function denialOutput(decision: DecisionDeny) {
  const reasons = (decision.policyResults ?? [])
    .filter(({ result }) => result.conclusion === "DENY")
    .map(({ result }) => ({
      reason: result.type === "STRING_LIST_MEMBERSHIP" ? "MEMBER_OF_LIST" : result.reason,
      ...(result.type === "SENSITIVE_INFO" && {
        entities: [...result.detectedEntityTypes],
      }),
    }));
  const summary = reasons
    .map(({ reason, ...detail }) => {
      const entities = "entities" in detail ? detail.entities : undefined;
      return entities?.length ? `${reason} (${entities.join(", ")})` : reason;
    })
    .join("; ");
  return {
    arcjetDenied: true,
    conclusion: "DENY",
    summary: `Blocked: ${summary || decision.reason}`,
    reasons,
  };
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof input !== "object" ||
    input === null ||
    !("client" in input) ||
    typeof input.client !== "string" ||
    !("scenario" in input) ||
    typeof input.scenario !== "string"
  ) {
    return NextResponse.json(
      { message: "Client and scenario must be strings" },
      { status: 400 },
    );
  }
  if (!Object.hasOwn(clients, input.client)) {
    return NextResponse.json({ message: "Unknown client" }, { status: 400 });
  }
  if (!Object.hasOwn(scenarios, input.scenario)) {
    return NextResponse.json({ message: "Unknown scenario" }, { status: 400 });
  }

  const requestedModel =
    "model" in input && typeof input.model === "string" ? input.model : defaultInjectionModel;
  if (!Object.hasOwn(models, requestedModel)) {
    return NextResponse.json({ message: "Unknown model" }, { status: 400 });
  }

  try {
    if (!process.env.AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is required");

    const trustedClient = clients[input.client as ClientId];
    const scenarioId = input.scenario as ScenarioId;
    const scenario = scenarios[scenarioId];
    const modelId: ModelId =
      scenarioId === "injection" ? (requestedModel as ModelId) : defaultModel;
    const selectedModel = models[modelId];
    const requiredToolAttempt =
      scenarioId === "injection"
        ? ""
        : "Always attempt sendEmail exactly once; do not answer without attempting the tool. ";
    let sentEmail: { recipient: string; body: string } | undefined;

    const getClientRecord = tool({
      description: "Get the financial details on file for the current client.",
      inputSchema: z.object({ clientId: z.string() }),
      execute: async ({ clientId }) => {
        if (clientId !== trustedClient.actor) {
          return { error: "This agent run cannot access a different client's record." };
        }
        return { clientId, record: trustedClient.record };
      },
    });

    const sendEmail = guardTool(
      arcjet,
      tool({
        description: "Send an email to a client contact.",
        inputSchema: z.object({
          recipient: z.string().email(),
          body: z.string(),
        }),
        execute: async ({ recipient, body }) => {
          sentEmail = { recipient, body };
          return {
            conclusion: "ALLOW",
            summary: "Allowed: sent (simulated)",
            reasons: [],
            sent: true,
            recipient,
          };
        },
      }),
      {
        action: process.env.GUARD_POLICY_LABEL ?? "email.sent",
        actor: trustedClient.actor,
        inputs: ({ recipient, body }) => ({
          recipient: policyInput.server.string(recipient),
          allowed_recipients: policyInput.server.stringList(trustedClient.allowedRecipients),
          body: policyInput.local.string(body),
          incoming_message: policyInput.server.string(scenario.message),
        }),
        onDeny: denialOutput,
      },
    );
    const tools = { getClientRecord, sendEmail };
    const context = createAgentContext({
      metadata: securityMetadata({
        user: trustedClient.actor,
        agent: "financial-adviser",
        workflow: "support-request",
      }),
    });
    const generated = await generateText({
      model: selectedModel.gatewayId,
      system:
        "You are a financial adviser agent with tools. First fetch the current client's record. " +
        "Then handle the inbound customer message by emailing the requested recipient, or the " +
        `client's own email when no recipient is specified. ${requiredToolAttempt}` +
        `${scenario.guidance} If Arcjet denies sendEmail, do not call sendEmail again during ` +
        "this run; explain that security blocked it.",
      prompt:
        `Handle the inbound customer message for ${trustedClient.actor}.\n\n` +
        `Inbound customer message (untrusted):\n${scenario.message}`,
      tools,
      toolsContext: aiToolsContext(context, tools),
      stopWhen: stepCountIs(5),
    });

    const trace = generated.steps.flatMap((step) => [
      ...step.toolCalls.map((call) => ({
        type: "tool-call" as const,
        tool: call.toolName,
        input: call.input,
      })),
      ...step.toolResults.map((result) => ({
        type: "tool-result" as const,
        tool: result.toolName,
        output: result.output,
      })),
    ]);
    const guardEvent = trace.findLast(
      (event) => event.type === "tool-result" && event.tool === "sendEmail",
    );
    const guardResult = guardEvent?.type === "tool-result" ? guardEvent.output : undefined;

    return NextResponse.json({
      message: generated.text,
      sentEmail,
      guardResult,
      model: modelId,
      correlationId: context.correlationId,
      trace,
    });
  } catch (error) {
    console.error("Agent evaluation failed", error);
    return NextResponse.json({ message: "Evaluation failed" }, { status: 500 });
  }
}

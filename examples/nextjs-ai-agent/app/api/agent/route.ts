import { createAiContext, securityMetadata } from "@arcjet/ai";
import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { supportAgentWorkflow } from "@/workflows/support-agent";

export async function POST(request: Request) {
  const { question } = await request.json();

  if (!question || typeof question !== "string") {
    return new Response("Missing or invalid question parameter", { status: 400 });
  }

  // One context per run; its correlation ID joins every guard decision and
  // capture event this run produces. Pass an existing ID (e.g. a ticket or
  // request ID) instead to join Arcjet data to your own systems.
  const ctx = createAiContext({
    metadata: securityMetadata({
      agent: "support-agent",
      workflow: "support-request",
    }),
  });

  const run = await start(supportAgentWorkflow, [
    { question, arcjet: ctx },
  ]);

  return NextResponse.json({
    runId: run.runId,
    correlationId: ctx.correlationId,
  });
}

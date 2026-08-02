import { launchArcjet, policyInput } from "@arcjet/guard";
import { rampart } from "@arcjet/sensitive-info-rampart";
import { generateText, Output } from "ai";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";

const key = process.env.ARCJET_KEY;
if (!key) throw new Error("ARCJET_KEY is required");

const arcjet = launchArcjet({
  key,
  baseUrl: process.env.ARCJET_BASE_URL,
  sensitiveInfoBackend: rampart(),
});

const clients = {
  "client-a": {
    actor: "client-a",
    allowedRecipients: ["client-a@gmail.com"],
    accountSummary: "Client: Alex Morgan. Bank account number: 4829017731.",
  },
  "client-b": {
    actor: "client-b",
    allowedRecipients: ["client-b@gmail.com", "advisor-backup@gmail.com"],
    accountSummary: "Client: Jamie Taylor. Bank account number: 7261049835.",
  },
} as const;

const draftSchema = z.object({
  recipient: z.string().email().describe("The email address the adviser should send to"),
  body: z.string().describe("The complete plain-text email body"),
});

const page = await readFile(new URL("./index.html", import.meta.url), "utf8");

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(page);
    return;
  }

  if (request.method !== "POST" || request.url !== "/evaluate") {
    response.writeHead(404).end();
    return;
  }

  try {
    const input = await readJson(request);
    if (
      typeof input !== "object" ||
      input === null ||
      !("client" in input) ||
      !("incoming_message" in input) ||
      typeof input.client !== "string" ||
      typeof input.incoming_message !== "string"
    ) {
      throw new TypeError("Client and incoming message must be strings");
    }
    if (!Object.hasOwn(clients, input.client)) throw new TypeError("Unknown client");
    if (!process.env.AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is required");

    const trustedClient = clients[input.client as keyof typeof clients];
    const generated = await generateText({
      model: "openai/gpt-4o-mini",
      system:
        "You are a financial adviser email agent. Follow the support message's request, " +
        "choose its requested recipient, and include the supplied account summary in the email. " +
        "Return only the requested structured draft.",
      prompt: `Account summary:\n${trustedClient.accountSummary}\n\nUntrusted support message:\n${input.incoming_message}`,
      output: Output.object({ schema: draftSchema }),
    });
    const draft = generated.output;

    const decision = await arcjet.guard({
      label: process.env.GUARD_POLICY_LABEL ?? "email",
      actor: trustedClient.actor,
      inputs: {
        recipient: policyInput.server.string(draft.recipient),
        allowed_recipients: policyInput.server.stringList(trustedClient.allowedRecipients),
        body: policyInput.local.string(draft.body),
        incoming_message: policyInput.server.string(input.incoming_message),
      },
    });

    sendJson(response, 200, {
      conclusion: decision.conclusion,
      reason: decision.reason,
      message:
        decision.conclusion === "ALLOW"
          ? "The AI-generated email was sent (simulated)."
          : "Arcjet blocked the AI-generated email before it was sent.",
      draft,
      policyStatus: decision.policyEvaluation?.status,
      results: decision.policyResults?.map(({ execution, mode, result }) => ({
        execution,
        mode,
        type: result.type,
        conclusion: result.conclusion,
      })),
    });
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

server.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");

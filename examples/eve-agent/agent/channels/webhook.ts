import { defineChannel, POST } from "eve/channels";
import { detectPromptInjection } from "@arcjet/guard";
import { guardInbound } from "@arcjet/guard/vercel-eve/v0";

import { arcjet } from "../arcjet.js";

export default defineChannel({
  routes: [
    POST("/webhook", async (req, args) => {
      const body = (await req.json()) as Record<string, unknown>;
      const message = body.message as string | undefined;

      if (!message || typeof message !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing or invalid message" }),
          { status: 400 }
        );
      }

      // Screen inbound text with Arcjet before dispatching to the agent.
      // Use the request's IP or a generated ID as the correlation ID.
      const correlationId = args.requestIp ?? `webhook-${Date.now()}`;
      const verdict = await guardInbound(arcjet, message, {
        rules: [detectPromptInjection()(message)],
        action: "message.received",
        correlationId,
      });

      if (!verdict.allowed) {
        return new Response(
          JSON.stringify({ error: verdict.message }),
          { status: 403 }
        );
      }

      // Verdict allowed; create a session and run the agent.
      const session = await args.from(correlationId).send(message, { auth: null });

      return new Response(
        JSON.stringify({ success: true, sessionId: session.id }),
        { headers: { "Content-Type": "application/json" } }
      );
    }),
  ],
});

import { defineChannel, POST } from "eve/channels";
import { detectPromptInjection } from "@arcjet/guard";
import { guardInbound } from "@arcjet/guard/vercel-eve/v0";

import { arcjet } from "../arcjet.js";

export default defineChannel({
  routes: [
    POST("/webhook", async (req, args) => {
      const body = (await req.json()) as Record<string, unknown>;
      const message = body.message as string | undefined;
      const conversationId = body.conversationId as string | undefined;

      if (!message || typeof message !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing or invalid message" }),
          { status: 400 }
        );
      }

      if (!conversationId || typeof conversationId !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing or invalid conversationId" }),
          { status: 400 }
        );
      }

      // Screen inbound text with Arcjet before dispatching to the agent.
      // The correlationId is a stable conversation identity that joins two contexts:
      // (1) the inbound guard decision via guardInbound, and (2) the session context
      // via args.from(). Using the same value for both ensures the session.started
      // record in arcjetHooks can join the inbound decision to subsequent tool/approval
      // gate decisions, all under one Sequence in the Arcjet Console.
      const correlationId = conversationId;
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

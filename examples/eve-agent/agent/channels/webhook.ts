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

      // Screen inbound text before the agent sees it. This decision correlates
      // by the conversation id, while everything inside the session correlates
      // by the session id — two Sequences, joined by the `eve.session-started`
      // record arcjetHooks emits. Passing the same value to `from()` is what
      // makes them joinable: it becomes the channel-local continuation address,
      // which that record carries as `<channel-name>:<conversation-id>`.
      //
      // A real deployment must authenticate the caller first. `from()` resolves
      // this id to whichever session currently owns it, so an unauthenticated
      // route lets anyone post into a conversation whose id they can guess.
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

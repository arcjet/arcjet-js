<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Protecting a Vercel Eve agent with Arcjet

This example shows how to protect a [Vercel Eve](https://eve.vercel.com/) agent using [Arcjet AI guardrails](https://docs.arcjet.com/ai-guardrails).
It demonstrates a simple agent that looks up orders, consults an API, receives inbound webhook messages, and records all decisions with Arcjet.

The example includes:

- An authored tool (`lookup_order`) guarded with `guardTool` to rate-limit by order number.
- An OpenAPI connection (`orders` API) guarded with `guardApproval` to rate-limit API access.
- An HTTP channel that screens inbound webhook messages with `guardInbound` before dispatching to the agent.
- Hooks that capture all guard decisions for audit trails.
- Shared correlation IDs that join inbound decisions, gate decisions, and capture events from a single agent turn.

## Requirements

This example requires **Node.js 24 or later**. Eve's floor is Node 24.2.0 and higher; earlier versions lack required language features and APIs.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/eve-agent
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your keys:

   ```bash
   cp .env.local.example .env.local
   ```

   - Get your `ARCJET_KEY` from [https://app.arcjet.com](https://app.arcjet.com) (create a dev site).
   - Get your `AI_GATEWAY_API_KEY` from the [Vercel AI Gateway](https://vercel.com/docs/ai/gateway).

4. Start the agent in development mode.

   ```bash
   npm run dev
   ```

## Observing the run

Send a POST request to the webhook channel (e.g., to `http://localhost:3000/webhook` if running locally) with a JSON body containing your message. The agent will process it and respond.

Watch the Arcjet Console for the captured decisions:

- **Inbound decision:** The `guardInbound` gate screening the webhook message, carrying the correlation ID that ties everything together.
- **Tool and connection gates:** The `guardTool` rate limit on `lookup_order` and the `guardApproval` gate on the orders API connection.
- **Hook capture:** The `arcjetHooks` recording all guard decisions for audit.

## Understanding correlation IDs

The inbound decision and the tool/connection gate decisions are joined by **two distinct correlation IDs**, reconciled by the `arcjetHooks` record at `session.started`:

1. **Inbound correlation ID** — The `guardInbound` gate assigns a correlation ID passed from the webhook handler. This ID is immutable and comes from the caller (e.g. the `conversationId` in the request body), ensuring the same request always joins to the same decision even if the session is recreated.

2. **Session correlation ID** — once the inbound decision passes, the handler creates a session and runs the agent. The tools and connection gate their decisions using the **session id**, not the inbound id. Those land on one Sequence; the inbound decision is on a second one. `arcjetHooks` emits an `eve.session-started` capture carrying both, which is what lets you pivot from either Sequence to the other. Eve namespaces continuation tokens per channel, so that record's `eve.continuation-token` reads `<channel-name>:<conversation-id>` rather than the bare conversation id.

So the Console shows **two** Sequences per conversation — one for the inbound screen, one for everything inside the session — joined by the `eve.session-started` record. Two ids is the expected shape here, not a bug: the channel boundary runs before Eve creates the session, so there is no session id to correlate by yet.

## Notes

- The example uses an HTTP channel for simplicity and to avoid external dependencies. Swap it for a Slack channel by changing `agent/channels/webhook.ts` and adding Slack credentials to `.env.local`.
- The orders API connection is configured with a public test endpoint by default. To test against a real API, update `agent/connections/orders.ts` and set `ORDERS_API_BASE_URL` in `.env.local`.

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

The correlation ID in the console represents one agent turn. It appears in three places:

1. **`session.started`** — The inbound webhook message enters the session through a `guardInbound` gate, which records the initial inbound decision and establishes the session correlation ID.
2. **Tool and connection gates** — When the agent invokes `lookup_order` or the orders API, those guards record their decisions under the same correlation ID.
3. **Hook captures** — The `arcjetHooks` observer sees all three gates in one turn and emits capture events sharing the same ID.

All three decisions (inbound, tool, connection) share a single correlation ID because the `guardInbound` gate reads the session ID from the channel context, and all subsequent guards derive their correlation ID from that same session. This is the two-hop join: the inbound decision creates the session context, and the tool/connection gates automatically read it from the session already in progress.

## Notes

- The example uses an HTTP channel for simplicity and to avoid external dependencies. Swap it for a Slack channel by changing `agent/channels/webhook.ts` and adding Slack credentials to `.env.local`.
- The orders API connection is configured with a public test endpoint by default. To test against a real API, update `agent/connections/orders.ts` and set `ORDERS_API_BASE_URL` in `.env.local`.

<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Protecting a Vercel AI SDK agent with Arcjet

This example shows how to protect a Next.js application with the [Vercel AI
SDK](https://sdk.vercel.ai/) using [Arcjet AI guardrails](https://docs.arcjet.com/ai-guardrails).
It demonstrates a simple support agent workflow where route handlers create an AI context, start a
[Vercel Workflow](https://vercel.com/docs/workflows) that runs an LLM agent with
rate-limited tools, and guards external actions with Arcjet.

The example includes:

- A Next.js route handler that creates an Arcjet AI context and starts a workflow.
- A Vercel Workflow that runs an agent using the Vercel AI SDK's `generateText` function.
- A guarded tool (`lookupOrder`) that uses a token bucket rate limit to prevent abuse.
- A guarded external action (`ticket.updated`) that simulates updating a ticketing system.
- Action capture (`notification.sent`) that records side effects for audit trails.
- Shared correlation IDs that join all guard decisions and capture events from a single run.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-ai-agent
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your keys:

   ```bash
   cp .env.local.example .env.local
   ```

   - Get your `ARCJET_KEY` from [https://app.arcjet.com](https://app.arcjet.com) (create a dev site).
   - Get your `AI_GATEWAY_API_KEY` from the [Vercel AI Gateway](https://vercel.com/docs/ai/gateway).

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit [http://localhost:3000](http://localhost:3000).

6. Ask a question about an order, for example: "What's the status of order 42?"

## Observing the run

The API response returns a `runId` and `correlationId`. Use these to observe the workflow and
guard decisions:

- **Workflow execution:** Run `npx workflow inspect runs` to see the workflow steps, or
  `npx workflow web` to open an interactive dashboard.
- **Guard decisions:** Visit your Arcjet dashboard and filter by the returned `correlationId`
  to see the `order.looked-up` and `ticket.updated` decisions for this run.

To see the rate limit in action, ask the agent several questions quickly. After 10 token bucket
requests (spread across 60 seconds), the `lookupOrder` tool will be denied, and the model will
receive a structured denial and apologize instead of retrying.

## Capture events note

This example calls `captureAction()` and guarded tools/actions to record capture events
(`order.looked-up`, `ticket.updated`, `notification.sent`), but this requires
a version of `@arcjet/guard` that ships `experimental_capture()`. Until that version is
published, only guard decisions appear in the dashboard, and `@arcjet/ai` logs a warning at the
`warn` level (set `ARCJET_LOG_LEVEL=warn` to see it).

Once `@arcjet/guard` ships `experimental_capture()`, re-run this example to see capture events
alongside decisions, all sharing the same correlation ID.

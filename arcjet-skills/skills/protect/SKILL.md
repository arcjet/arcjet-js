---
name: protect
description: Add Arcjet request protection to JavaScript and TypeScript HTTP handlers. Use when protecting Next.js, Express, Fastify, SvelteKit, Remix, Bun, Deno, NestJS, or Node.js routes with rate limiting, bot detection, Shield, email validation, or sensitive info detection.
license: Apache-2.0
compatibility: JavaScript and TypeScript HTTP apps using an @arcjet/* framework adapter.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/skills"
  library_version: "1.11.0" # x-release-please-version
sources:
  - docs/protect.md
---

# Protect HTTP routes with Arcjet

Use this skill for HTTP route handlers. If there is no request object (tool
calls, MCP handlers, queue workers), load `@arcjet/skills#guard` instead.

Load `@arcjet/skills#choose-protections` when you need to pick rules.
Load `@arcjet/skills#cli` to get an `ARCJET_KEY` before writing code.

## Checklist

- [ ] Language is JS/TS (stop if not)
- [ ] `ARCJET_KEY` is in the env file (CLI first; do not leave a TODO)
- [ ] Shared `arcjet()` client at module scope, `withRule()` for extras
- [ ] `protect()` inside each route handler, not middleware
- [ ] Rules that should block use `mode: "LIVE"`
- [ ] Decisions verified with a real request plus CLI or Console

## Client

```ts
import arcjet, { shield, detectBot } from "@arcjet/next";

export const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({ mode: "LIVE", allow: ["CATEGORY:SEARCH_ENGINE"] }),
  ],
});
```

Pick the adapter the app already uses (`@arcjet/next`, `@arcjet/node`,
`@arcjet/fastify`, …). Install it with the project's package manager. Do not
hand-edit `package.json` and guess a version.

Omitted `mode` is `DRY_RUN`. `detectBot` requires exactly one of `allow` or
`deny`.

One client. `withRule()` clones share the decision cache. A second
`arcjet()` constructor does not.

## Handler

```ts
export async function GET(request: Request) {
  const decision = await aj.protect(request);

  if (decision.isDenied()) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ ok: true });
}
```

Call `protect()` once per request, in the route handler. Not Express
middleware. Not Next.js middleware.

Pass a trusted `userId` on the rule that needs it. Pass `ipSrc` only when the
app already has a trusted client IP. Nested `metadata` is for the Console —
no secrets, no PII.

## Common mistakes

- `@arcjet/guard` on an HTTP route (or a request adapter on a tool call)
- `protect()` in middleware
- Double `protect()` (double-counts rate limits)
- Dry-run rules that look like they block
- Both `allow` and `deny` on `detectBot`
- Hardcoded `ARCJET_KEY`

## Verify

Type-check, then `curl` the route. Confirm with
`npx @arcjet/cli@latest requests list --site-id <id>` or
https://console.arcjet.com.

Exact signatures live in the installed adapter's types. This skill is about
where Arcjet goes and how its HTTP API is used — match the project's
conventions for everything else.

---
name: protect
description: Add Arcjet request protection to JavaScript and TypeScript HTTP handlers. Use when protecting Next.js, Express, Fastify, SvelteKit, Remix, Astro, Nuxt, Bun, Deno, NestJS, or Node.js routes with rate limiting, bot detection, Shield, email validation, or sensitive info detection.
license: Apache-2.0
compatibility: JavaScript and TypeScript HTTP apps using an @arcjet/* framework adapter.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/skills"
  library_version: "1.12.0" # x-release-please-version
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
- [ ] Runtime is Node `>=22.21.0 <23 || >=24.5.0`, Bun ≥ 1.3.0, or Deno stable
- [ ] `ARCJET_KEY` is in the env file (CLI first; do not leave a TODO)
- [ ] Shared `arcjet()` client at module scope, `withRule()` for extras
- [ ] `protect()` inside each route handler, not middleware
- [ ] Rules that should block use `mode: "LIVE"`
- [ ] Client IP comes from trusted ingress, not a copied forwarding header
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
`deny`. `detectPromptInjection` takes `mode` only — no `threshold`.

One client. `withRule()` clones share the decision cache. A second
`arcjet()` constructor does not.

Astro is an integration (`arcjet:client`), not a shared file. Nuxt is a
module (`#arcjet`). NestJS is `ArcjetModule` + `@InjectArcjet()`. Bun and
Deno wrap fetch with `aj.handler()` for IP detection, then still call
`protect()`. Hono on Node passes `c.env.incoming`.

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

Branch only when the status differs: rate limit → 429; email / PII /
prompt injection → 400; everything else → 403. `isErrored()` is fail-open —
log and allow.

Pass a trusted `userId` on the rule that needs it. Pass `correlationId`
when the decision must join another request or guard call.

## Client IP

If the app already has a trusted client IP, pass `ipSrc`. An empty string
is omitted. A malformed value is rejected. Never copy `X-Forwarded-For` or
another client-controlled header into `ipSrc` — that relabels attacker
input as trusted.

When no usable public address is available, adapters may fall back to
forwarding headers and log one `unverified-header` warning per client.
Configure `proxies` (or `cloudflare()`). Inspect with
`clientIpDetails()` (`@arcjet/node`) or `findIpDetails()` /
`resolveClientIp()` (`@arcjet/ip`) before shipping.

Nested `metadata` is for the Console — no secrets, no PII.

## Common mistakes

- `@arcjet/guard` on an HTTP route (or a request adapter on a tool call)
- `protect()` in middleware
- Double `protect()` (double-counts rate limits)
- Dry-run rules that look like they block
- Both `allow` and `deny` on `detectBot`
- `threshold` on `detectPromptInjection`
- Copying `X-Forwarded-For` into `ipSrc` to hide `unverified-header`
- Hardcoded `ARCJET_KEY`

## Verify

Type-check, then `curl` the route. Confirm with
`npx @arcjet/cli@latest requests list --site-id <id>` or
https://console.arcjet.com.

Exact signatures live in the installed adapter's types. This skill is about
where Arcjet goes and how its HTTP API is used — match the project's
conventions for everything else.

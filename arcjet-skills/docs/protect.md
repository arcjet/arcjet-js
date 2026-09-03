# Protect HTTP routes with Arcjet

Source documentation for the `protect` Agent Skill. JavaScript and TypeScript
only. For non-HTTP tool calls, jobs, and MCP handlers, see `docs/guard.md`.

## When to use request protection

Use a framework adapter when the code has an HTTP request object (Next.js
`Request`, Express `req`, Fastify request, SvelteKit `RequestEvent`).

| Runtime / framework | Package |
| ------------------- | ------- |
| Next.js | `@arcjet/next` |
| Node.js (`http`, Express) | `@arcjet/node` |
| Bun | `@arcjet/bun` |
| Deno | `@arcjet/deno` |
| Fastify | `@arcjet/fastify` |
| NestJS | `@arcjet/nest` |
| Nuxt | `@arcjet/nuxt` |
| React Router | `@arcjet/react-router` |
| Remix | `@arcjet/remix` |
| SvelteKit | `@arcjet/sveltekit` |
| Astro | `@arcjet/astro` |

Hono on Node uses `@arcjet/node`. Hono on Bun uses `@arcjet/bun`.

MCP servers, queue workers, and agent tool calls do **not** receive an HTTP
request. Use `@arcjet/guard` instead.

Server actions, tRPC, and other RPC-over-HTTP still have an HTTP request —
use request protection.

Runtime baseline: Node.js `>=22.21.0 <23 || >=24.5.0`, Bun ≥ 1.3.0, Deno
`stable` / `lts`. Bump the runtime before installing if the project is below
those floors.

## Client setup

Create **one** `arcjet()` client at module scope in a shared file. Use
`withRule()` for route-specific extras so clones share the decision cache.
Sibling `arcjet()` constructors do not share cache.

Always include `shield({ mode: "LIVE" })` as a base rule.

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

Rules that omit `mode` default to `DRY_RUN` in the JavaScript HTTP SDKs. Pass
`mode: "LIVE"` to enforce.

Never hardcode `ARCJET_KEY`. Write it to the project's env file. Prefer
`npx @arcjet/cli@latest` to create a site and fetch a key (see `docs/cli.md`).

Install the adapter with the project's package manager. Do not hand-edit
`package.json` and guess a version.

### Frameworks that are not a shared client file

- **Astro** — register the integration in `astro.config.mjs` and import
  `arcjet:client`. There is no `lib/arcjet.ts` and no `withRule()`.
  `@arcjet/astro` validates with Zod `.strict()`, so leftover
  `detectPromptInjection({ threshold })` throws at startup.
- **Nuxt** — register the `@arcjet/nuxt` module. The key lives in
  `nuxt.config.ts`. Import from `#arcjet`. Each `arcjet()` call is its own
  cache — share one server module.
- **NestJS** — `ArcjetModule.forRoot()` plus `@InjectArcjet()`.
- **Bun / Deno** — wrap the fetch handler with `aj.handler()` so Arcjet can
  see the socket for client IP. Still call `protect()` inside. Deno imports
  use the `npm:` prefix.
- **Hono on Node** — type the app with `HttpBindings` from
  `@hono/node-server` and pass `c.env.incoming` to `protect()`. Hono on Bun
  passes `c.req.raw`.

### What to pass to `protect()`

| Framework | Argument |
| --------- | -------- |
| Express / Node.js | `req` |
| Next.js App Router | `req` |
| Next.js Server Components / actions | `await request()` from `@arcjet/next` |
| Fastify | `request` (Fastify request, not raw Node) |
| NestJS | `req` |
| SvelteKit / Nuxt | `event` |
| Remix / React Router | `args` |
| Astro / Bun / Deno | `request` |
| Hono on Node | `c.env.incoming` |
| Hono on Bun | `c.req.raw` |

## Call `protect()` in the handler

Call `protect()` inside each route handler, once per request. Do not call it
from Express middleware or Next.js middleware.

```ts
export async function GET(request: Request) {
  const decision = await aj.protect(request);

  if (decision.isDenied()) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ ok: true });
}
```

Map denial reasons to HTTP responses only when the status or body should
differ:

- `decision.reason.isRateLimit()` → 429
- `decision.reason.isEmail()` / `isSensitiveInfo()` / `isPromptInjection()` → 400
- everything else (bot, shield, filter) → 403

`decision.isErrored()` means the SDK failed open. Log it and allow.

`detectBot` requires exactly one of `allow` or `deny`. Neither or both throws.

`detectPromptInjection` takes `mode` only. Do not pass `threshold`. Do not
read `score`; branch on `isPromptInjection()` / `injectionDetected`.

Rules that need extra input at `protect()` time: `tokenBucket` needs
`{ requested }`, `validateEmail` / `protectSignup` need `{ email }`,
`sensitiveInfo` needs `{ sensitiveInfoValue }`, `detectPromptInjection`
needs `{ detectPromptInjectionMessage }`.

Pass `correlationId` when the decision must join another request, guard
call, or agent trace. It does not affect fingerprinting.

## Characteristics and client IP

Put a `userId` characteristic on the rule that needs it, then pass a trusted,
authenticated user ID at protection time. Never rate limit by a client-controlled
header unless a trusted proxy strips and rewrites it.

Treat client-IP provenance as security configuration. When no usable public
address is available, adapters may fall back to forwarding headers and log one
`client_ip_provenance="unverified-header"` warning for the lifetime of each
SDK client. Configure every trusted proxy (`proxies`, or a helper such as
`cloudflare()`). The application must be reachable only through infrastructure
that overwrites or safely appends those headers. Malformed proxy entries are
rejected. `0.0.0.0/0` and `::/0` warn because they trust every peer.

If the application already has an independently trusted client IP, pass it as
`ipSrc` to both `protect()` and the diagnostics API. A non-empty value wins
over automatic detection. An empty string is treated as omitted. Malformed
values are rejected. Syntax validation does not prove provenance.

Never silence an `unverified-header` warning by copying `X-Forwarded-For` (or
another client-controlled header) into `ipSrc`. That relabels attacker input
as trusted. Inspect representative requests with
`client.clientIpDetails(request)` in `@arcjet/node`, or `findIpDetails()` /
`resolveClientIp()` from `@arcjet/ip`. Check `ip`, `provenance`, `verified`,
and `header`. These diagnostics do not consume the once-per-client warning.

`protect()` accepts nested-JSON `metadata`. It does not affect fingerprinting.
Do not put secrets or PII in it. When present, request decisions also expose
optional IP threat intelligence (`decision.ip.threat`).

When present, `decision.ip.threat` is optional IP threat intelligence. Check
before reading.

## Common mistakes

- Using `@arcjet/guard` on an HTTP route, or a request adapter on a tool call
- Calling `protect()` in middleware instead of the route handler
- Calling `protect()` twice for the same request (double-counts rate limits)
- Leaving rules in `DRY_RUN` and expecting them to block
- Passing both `allow` and `deny` to `detectBot`
- Passing `threshold` to `detectPromptInjection`
- Copying `X-Forwarded-For` into `ipSrc` to hide an unverified-header warning
- Hardcoding `ARCJET_KEY`

## Verify

1. Type-check or build the project.
2. Hit the protected route (`curl`). To trip a rate limit, loop the request.
3. Confirm the decision with `npx @arcjet/cli@latest requests list --site-id <id>`
   or the [Console](https://console.arcjet.com).

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

MCP servers, queue workers, and agent tool calls do **not** receive an HTTP
request. Use `@arcjet/guard` instead.

Server actions, tRPC, and other RPC-over-HTTP still have an HTTP request —
use request protection.

## Client setup

Create **one** `arcjet()` client at module scope. Use `withRule()` for
route-specific extras so clones share the decision cache. Sibling `arcjet()`
constructors do not share cache.

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
differ. A Shield denial and a generic deny that both return 403 do not need
separate branches.

`detectBot` requires exactly one of `allow` or `deny`. Neither or both throws.

## Characteristics and client IP

Put a `userId` characteristic on the rule that needs it, then pass a trusted,
authenticated user ID at protection time. Never rate limit by a client-controlled
header unless a trusted proxy strips and rewrites it.

If the application already has a trusted client IP, pass it as `ipSrc`. The SDK
trusts the value.

`protect()` accepts nested-JSON `metadata`. It does not affect fingerprinting.
Do not put secrets or PII in it.

## Common mistakes

- Using `@arcjet/guard` on an HTTP route, or a request adapter on a tool call
- Calling `protect()` in middleware instead of the route handler
- Calling `protect()` twice for the same request (double-counts rate limits)
- Leaving rules in `DRY_RUN` and expecting them to block
- Passing both `allow` and `deny` to `detectBot`
- Hardcoding `ARCJET_KEY`

## Verify

1. Type-check or build the project.
2. Hit the protected route (`curl`). To trip a rate limit, loop the request.
3. Confirm the decision with `npx @arcjet/cli@latest requests list --site-id <id>`
   or the [Console](https://console.arcjet.com).

# Choose Arcjet protections

Map a product problem to Arcjet rules. JavaScript and TypeScript SDK names.

## Automated traffic and bot abuse

**Rule:** `detectBot` (request-based only). Pass exactly one of `allow` or
`deny`. `allow` is a safelist. `deny` blocks listed categories. Empty
`allow: []` blocks every detected bot. Combine with rate limiting.

Signed agents (Web Bot Auth, 1.15.0+): list signers in the same `allow` /
`deny` by catalog name (`CHATGPT_AGENT`, `BROWSERBASE`, …) or as
`SIGNED_BOT:https://<host>/.well-known/http-message-signatures-directory`.

- An existing allow list such as `CATEGORY:SEARCH_ENGINE` now denies verified
  browser agents. Add the signers you want.
- Check `isDenied()` before `isVerifiedBot`.
- A signature is identity, not authorization. Keep rate limits on. The first
  request from an uncached signer is unverified.
- Signatures covering `@path` verify only on `@arcjet/node` (Express),
  `@arcjet/fastify`, `@arcjet/nest`, and Next.js Pages API routes.

Bot rules can also be configured as remote rules via the CLI or MCP server.

## Cost explosion and budget control

**Rules:** `tokenBucket`, `fixedWindow`, `slidingWindow` (request-based and
Guard).

Token bucket fits variable-cost AI work — set `requested` per call. Fixed
window is a hard cap at period boundaries. Sliding window avoids boundary
bursts.

Request-based rate limits default to the client IP. Use
`characteristics: ["userId"]` to key by something else. Guard rate limits
always need an explicit `key` and `bucket`.

## Prompt injection

**Rule:** `detectPromptInjection` (request-based and Guard). Use on untrusted
text before it reaches a model or tool argument, and on tool results that
fetch untrusted content. The rule is a binary detect — there is no
`threshold` or `score`. Text over 128 KiB is denied in LIVE. Empty or
missing text is an error result, which fails open. Fail closed: deny (503)
when the decision errored. The text is sent to Arcjet and stored with the
decision.

## Unsafe content

**Rule:** Guard `moderateContent` only (not available on `protect()`). The
result is `{ detected, billing? }` (`text_units` when present). Gate on
`DENY || hasFailedOpen()`, never on `reason === "MODERATE_CONTENT"` alone.
Only the first 60 KB is evaluated (`AJ1142`); over 128 KiB is denied
(`AJ1141`). Don't copy the checked text into `metadata`.

## Data loss prevention

Detection runs on-device with `@arcjet/sensitive-info-rampart`
(`backend: rampart()`), which finds names, addresses, government and
financial identifiers, card numbers, email addresses, phone numbers, and IP
addresses. It needs a server runtime with filesystem access (Node.js, Bun, or
Deno), so its bundled loader can't run on Cloudflare Workers or edge
runtimes. Always pass the backend; a Rampart entity listed without it never
matches. The rule doesn't inherit the client's backend. Only each finding's
entity type and position leave the process, never the matched text. Input
over `maxInputChars` (default `100_000`) is denied without scanning. Fail closed: deny (503)
when the decision errored.

PHI types (`MEDICAL_RECORD_NUMBER`, `HEALTH_PLAN_BENEFICIARY_NUMBER`,
`LICENSE_PLATE_NUMBER`, `VEHICLE_IDENTIFICATION_NUMBER`, `DEVICE_IDENTIFIER`)
are detected only by the server-side detector in a remote Guard policy reading
a `SERVER` input. On-device rules never match them.

**Rules:** `sensitiveInfo` (request-based) and `localDetectSensitiveInfo`
(Guard).

## Unauthorized tool invocation

Guard protection with per-tool rate limits and labels. `capture()` records
that an action happened; it is not a protection rule.

## Common web attacks

**Rule:** `shield` (request-based only). Include it on the shared client as a
base rule. Omitted `mode` is dry run — pass `LIVE` to enforce.

Shield allows the request that makes a client suspicious and blocks later
requests from the same fingerprint. An IP-only fingerprint blocks everyone
behind a shared IP. Test with `x-arcjet-suspicious: true`: five requests pass,
the sixth is denied.

## Signup abuse

**Rules:** `validateEmail` plus `protectSignup` (request-based only).
`protectSignup` is one composite rule: bot detection, email validation, and
rate limiting.

## IP-based filtering

**Rule:** `filter` (request-based only). Can also be a remote rule via CLI or
MCP.

## Coding agents (no application SDK)

Claude Code, Copilot, Codex, Cursor, and Muse Code are not `protect()` or
`@arcjet/guard`. Publish a coding-agent policy from a Console starter,
attached to **Execute on** (Tool call, Prompt, or Model switch), then install
the hooks from the vendor's page under https://docs.arcjet.com/coding-agents.
Hooks take the project key (`aj_prj_key_`). Don't add a `matcher`, `label`,
or `?surface=`. Claude Code and Copilot HTTP hooks fail open on any non-2xx,
including `401`, so "no denials" does not mean "working".

## Shadow AI discovery

Which AI tools employees use is Arcjet Discovery, an MDM-deployed endpoint
agent. It is not an SDK. Don't write `protect()` or `guard()` code for it.

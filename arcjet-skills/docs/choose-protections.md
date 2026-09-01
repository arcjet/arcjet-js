# Choose Arcjet protections

Map a product problem to Arcjet rules. JavaScript and TypeScript SDK names.

## Automated traffic and bot abuse

**Rule:** `detectBot` (request-based only). Pass exactly one of `allow` or
`deny`. `allow` is a safelist. `deny` blocks listed categories. Empty
`allow: []` blocks every detected bot. Combine with rate limiting.

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
fetch untrusted content. The rule is a binary detect.

## Unsafe content

**Rule:** Guard `moderateContent` only (not available on `protect()`). Check
`hasFailedOpen()` when evaluation is incomplete.

## Data loss prevention

Detection runs locally. The default WebAssembly backend finds card numbers,
email addresses, phone numbers, and IP addresses. Names, addresses, and
government or financial identifiers need `@arcjet/sensitive-info-rampart`
(`rampart()`), which needs a server runtime with filesystem access.

**Rules:** `sensitiveInfo` (request-based) and `localDetectSensitiveInfo`
(Guard).

## Unauthorized tool invocation

Guard protection with per-tool rate limits and labels. `capture()` records
that an action happened; it is not a protection rule.

## Common web attacks

**Rule:** `shield` (request-based only). Include it on the shared client as a
base rule. Omitted `mode` is dry run — pass `LIVE` to enforce.

## Signup abuse

**Rules:** `validateEmail` plus `protectSignup` (request-based only).
`protectSignup` is one composite rule: bot detection, email validation, and
rate limiting.

## IP-based filtering

**Rule:** `filter` (request-based only). Can also be a remote rule via CLI or
MCP.

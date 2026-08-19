<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/guard`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/guard">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fguard?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fguard?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] is the runtime security platform that ships in your AI code. Detect prompt injection, authorize agent tool calls, redact sensitive data, and block bots and abuse. Real-time security building blocks you call inside your app, before an action happens.

This is the [Arcjet][arcjet] Guards SDK for **non-request protection** — use it
for AI agent tool calls, MCP server handlers, queue workers, background jobs,
and anything else that doesn't have an HTTP request object. If you're protecting
HTTP routes, use a [framework SDK](https://github.com/arcjet/arcjet-js#sdks)
like `@arcjet/next` or `@arcjet/node` instead.

## Why Arcjet?

Your app's AI features and agents take real actions, calling tools, reading data, hitting APIs. Arcjet runs inside that code and lets you enforce security on each action in real time, then audit what happened

## Getting started

### Quick setup with an AI agent

1. Log in with the CLI:
   ```sh
   npx @arcjet/cli auth login
   ```
2. Install the Arcjet skill to give your coding agent the docs it needs:
   ```sh
   npx skills add arcjet/skills
   ```
3. Tell your agent what to protect — it handles the rest.

### Manual setup

1. **Log in** with the CLI (or at [`app.arcjet.com`](https://app.arcjet.com?utm_campaign=arcjet-js)):
   ```sh
   npx @arcjet/cli auth login
   ```
2. `npm install @arcjet/guard`
3. Pass your key to `launchArcjet({ key: process.env.ARCJET_KEY! })`
4. Add a guard to your code — see the [quick start](#quick-start) below

[npm package](https://www.npmjs.com/package/@arcjet/guard) |
[GitHub source](https://github.com/arcjet/arcjet-js/tree/main/arcjet-guard) |
[Other SDKs][sdks-github]

## Features

Guards share some features with the request SDKs but are designed for
non-HTTP contexts. Here's what's available where:

| Feature                         | Request SDKs | `@arcjet/guard` |
| ------------------------------- | :----------: | :-------------: |
| Rate Limiting                   |      ✅      |       ✅        |
| Prompt Injection Detection      |      ✅      |       ✅        |
| Content Moderation              |      —       |       ✅        |
| Sensitive Information Detection |      ✅      |       ✅        |
| Custom Rules                    |      —       |       ✅        |
| Bot Protection                  |      ✅      |        —        |
| Shield WAF                      |      ✅      |        —        |
| Email Validation                |      ✅      |        —        |
| Request Filters                 |      ✅      |        —        |
| IP Analysis                     |      ✅      |        —        |

- 🪣 [Rate Limiting](#rate-limiting) — token bucket, fixed window, and sliding
  window algorithms; model AI token budgets per user.
- 🛡️ [Prompt Injection Detection](#prompt-injection-detection) — detect and
  block prompt injection attacks before they reach your LLM.
- 🧹 [Content Moderation](#content-moderation) — detect and block harmful
  content in user text, tool results, or model outputs.
- 🕵️ [Sensitive Information Detection](#sensitive-information-detection) —
  block PII, credit cards, and custom patterns from entering your AI pipeline.
- 🔧 [Custom Rules](#custom-rules) — define your own local evaluation logic
  with arbitrary data.

## Quick start

This example protects an AI tool call with token bucket rate limiting and
prompt injection detection.

```ts
import { launchArcjet, tokenBucket, detectPromptInjection, policyInput } from "@arcjet/guard";

// Create the Arcjet client once at module scope
const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

// Configure reusable rules
const limitRule = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
const piRule = detectPromptInjection();

// Per request — create rule inputs each time
const rl = limitRule({ key: userId, requested: tokenCount });
const decision = await arcjet.guard({
  label: "tools.weather",
  rules: [rl, piRule(userMessage)],
});

// Overall decision
if (decision.conclusion === "DENY") {
  if (decision.reason === "RATE_LIMIT") {
    throw new Error("Rate limited — try again later");
  }
  if (decision.reason === "PROMPT_INJECTION") {
    throw new Error("Prompt injection detected — please rephrase");
  }
  throw new Error("Request denied");
}

// Check for failures (fail-open — errors don't cause denials). hasFailedOpen()
// is true only when the conclusion is ALLOW because a rule or the decision
// could not be processed — gate a fail-closed policy on it.
if (decision.hasFailedOpen()) {
  console.warn("Allowed only because evaluation failed open", decision.errorResults());
}

// Remotely configured policies use explicit typed inputs. SERVER values are
// evaluated and retained by Arcjet; LOCAL values remain in SDK memory.
const policyDecision = await arcjet.guard({
  label: "email.sent",
  actor: userId,
  inputs: {
    recipient: policyInput.server.string(to),
    subject: policyInput.local.string(subject),
  },
});

// Remote results are keyed by policy/rule identity and remain separate from
// positional SDK rule results.
console.log(policyDecision.policyEvaluation, policyDecision.policyResults);

// Decision-level diagnostics (e.g. an invalid metadata key that was stripped).
// Warnings never change the conclusion.
for (const warning of decision.warnings) {
  console.warn(`${warning.code}: ${warning.message}`);
}

// From a RuleWithInput — result for this specific submission
const r = rl.result(decision);
if (r) {
  console.log(r.remainingTokens, r.maxTokens);
}

// From a RuleWithConfig — first denied result across all submissions
const denied = limitRule.deniedResult(decision);
if (denied) {
  console.log(denied.remainingTokens); // 0
}

// Proceed with your AI tool call...
```

## Rate limiting

### Token bucket

Use this when requests have variable cost — for example, an LLM endpoint
where each call consumes a different number of tokens. The bucket refills at
a steady rate and allows bursts up to `maxTokens`.

```ts
import { launchArcjet, tokenBucket } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limitRule = tokenBucket({
  bucket: "user-tokens", // Optional — defaults to "default-token-bucket"
  refillRate: 2_000, // Refill 2,000 tokens per interval
  intervalSeconds: 3600, // Refill every hour
  maxTokens: 5_000, // Maximum 5,000 tokens in the bucket
});

const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [limitRule({ key: userId, requested: tokenEstimate })],
});

if (decision.conclusion === "DENY" && decision.reason === "RATE_LIMIT") {
  throw new Error("Rate limit exceeded");
}
```

### Fixed window

Use this when you need a hard cap per time period — the counter resets at
the end of each window. Simple to reason about, but allows bursts at
window boundaries. If that matters, use sliding window instead.

```ts
import { launchArcjet, fixedWindow } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limitRule = fixedWindow({
  bucket: "page-views", // Optional — defaults to "default-fixed-window"
  maxRequests: 1000, // Maximum requests per window
  windowSeconds: 3600, // 1-hour window
});

const decision = await arcjet.guard({
  label: "api.search",
  rules: [limitRule({ key: teamId })],
});
```

### Sliding window

Use this when you need smooth rate limiting without the burst-at-boundary
problem of fixed windows. The server interpolates between the previous and
current window, so limits are enforced across any rolling time span. Good
default choice for API rate limits.

```ts
import { launchArcjet, slidingWindow } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limitRule = slidingWindow({
  bucket: "event-writes", // Optional — defaults to "default-sliding-window"
  maxRequests: 500, // Maximum requests per interval
  intervalSeconds: 60, // 1-minute rolling window
});

const decision = await arcjet.guard({
  label: "api.events",
  rules: [limitRule({ key: userId })],
});
```

## Prompt injection detection

Detect and block prompt injection attacks — attempts to override your AI
model's instructions — before they reach your model. Also useful for
scanning tool call results that contain untrusted input (e.g. a "fetch"
tool that loads a webpage which could embed injected instructions).

```ts
import { launchArcjet, detectPromptInjection } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const piRule = detectPromptInjection();

const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [piRule(userMessage)],
});

if (decision.conclusion === "DENY" && decision.reason === "PROMPT_INJECTION") {
  throw new Error("Prompt injection detected — please rephrase your message");
}

const result = piRule.result(decision);
// Billing is undefined when the service does not report usage. Prompt
// injection uses model tokens; content moderation uses text_units.
console.log(result?.billing?.unit, result?.billing?.count);

// Forward to your AI model...
```

## Content moderation

Detect and block harmful content in user-supplied text before it is stored,
displayed, or forwarded to another service. Also useful for scanning tool
call results or model outputs.

```ts
import { launchArcjet, moderateContent } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const moderate = moderateContent();

const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [moderate(userMessage)],
});

if (decision.conclusion === "DENY" && decision.reason === "MODERATE_CONTENT") {
  throw new Error("Harmful content detected — please rephrase your message");
}

const result = moderate.result(decision);
// `detected` is true when harmful content was found. Billing is undefined
// when the service does not report usage. Content moderation uses text_units.
console.log(result?.detected, result?.billing?.unit, result?.billing?.count);
```

## Sensitive information detection

Detect and block PII in text content. Use `allow` / `deny` to filter which
entity types trigger a denial. Built-in entity types are
`CREDIT_CARD_NUMBER`, `EMAIL`, `PHONE_NUMBER`, and `IP_ADDRESS`.

```ts
import { launchArcjet, localDetectSensitiveInfo } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const si = localDetectSensitiveInfo({
  deny: ["CREDIT_CARD_NUMBER", "PHONE_NUMBER"],
});

const decision = await arcjet.guard({
  label: "tools.summary",
  rules: [si(userMessage)],
});

if (decision.conclusion === "DENY" && decision.reason === "SENSITIVE_INFO") {
  throw new Error("Sensitive information detected");
}
```

### On-device detection with additional entity types

The default backend detects the four built-in types locally with pattern
matching. To detect additional types — names, addresses, and government or
financial identifiers — pass a `backend` such as
[`@arcjet/sensitive-info-rampart`](https://www.npmjs.com/package/@arcjet/sensitive-info-rampart),
which runs an on-device NER model. Detection still happens entirely locally;
only a SHA-256 hash of the text is sent to Arcjet.

```ts
import { launchArcjet, localDetectSensitiveInfo } from "@arcjet/guard";
import { rampart } from "@arcjet/sensitive-info-rampart";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const si = localDetectSensitiveInfo({
  deny: ["GIVEN_NAME", "SURNAME", "EMAIL", "SSN"],
  backend: rampart(),
});

const decision = await arcjet.guard({
  label: "tools.summary",
  rules: [si(userMessage)],
});
```

## Custom rules

Define your own local evaluation logic with arbitrary key-value data. When
`evaluate` is provided, the SDK calls it locally before sending the request.
The function receives `(config, input, { signal })` and must return
`{ conclusion: "ALLOW" | "DENY" }`.

```ts
import { launchArcjet, defineCustomRule } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const topicBlock = defineCustomRule<
  { blockedTopic: string },
  { topic: string },
  { matched: string }
>({
  evaluate: (config, input) => {
    if (input.topic === config.blockedTopic) {
      return { conclusion: "DENY", data: { matched: input.topic } };
    }
    return { conclusion: "ALLOW" };
  },
});

const rule = topicBlock({ data: { blockedTopic: "politics" } });

const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [rule({ data: { topic: userTopic } })],
});
```

## Capture

Use `capture()` to record a fact about what your application did. Captures are
visibility data, never security decisions:

```ts
arcjet.capture({
  action: "refund.issued",
  correlationId: runId,
  decisionId: decision.id,
  metadata: {
    invoice: { id: "inv_123", amount: 4200 },
    refunded: true,
  },
});
```

Capture is best-effort and never blocks or throws into application code. The SDK
keeps a bounded in-memory queue, sends batches on size or delay, drops the newest
event when the queue is full, and never retries a failed batch.

A platform `waitUntil` hook does not change any of that. Events still batch; the
hook is handed a promise that settles once they have been sent, so the runtime
keeps the invocation alive long enough for the batch to go out.

### Serverless and edge runtimes

A runtime that freezes or terminates between invocations can lose whatever is
still batched, so it needs telling that background work is outstanding. That is
all `waitUntil` does — it extends the invocation, it does not disable batching.
Thirty tool calls in one agent turn stay one request, not thirty, which matters
against a Worker's subrequest budget.

Pass `waitUntil` per call:

```ts
export default {
  async fetch(request, env, ctx) {
    arcjet.capture({
      action: "refund.issued",
      waitUntil: (promise) => ctx.waitUntil(promise),
    });
    return new Response("ok");
  },
};
```

Arcjet discovers Vercel's request context on its own, so `waitUntil` is not
needed there. Every other per-invocation hook — Cloudflare's `ExecutionContext`
included — has to be passed in, because a module-scoped client cannot reach it.

Where `capture()` is called too deep to reach the platform context, `flush()` at
the end of the handler instead:

```ts
export default {
  async fetch(request, env, ctx) {
    const response = await handle(request);
    ctx.waitUntil(arcjet.flush());
    return response;
  },
};
```

### Draining

Call `flush()` during graceful shutdown to avoid losing the final batch:

```ts
await arcjet.flush(); // one-second deadline by default
await arcjet.flush(250); // custom deadline in milliseconds
```

`flush()` is optional, repeatable, and does not close the client. If its deadline
expires, remaining events are dropped and the client stays usable.

Local failures use stable `AJxxxx` diagnostics. Pass a logger to receive every
diagnostic; without one, Arcjet logs once per code:

```ts
const arcjet = launchArcjet({
  key: process.env.ARCJET_KEY!,
  logger: {
    // `@arcjet/logger` shape: the merging object comes first, the message
    // second. `fields` carries `{ code, count? }`.
    warn(fields, message) {
      applicationLogger.warn(fields, message);
    },
  },
});
```

Metadata has the same nested-JSON shape and limits as `guard()`. A key the SDK
cannot encode is reported locally as `AJ1017` and also travels with that event in
`local_warnings`. A queue-full event or failed batch never reaches the server, so
those drops can only be reported locally.

## Registering a client (optional)

Passing the client explicitly is the recommended path, and everything above does
exactly that. Registration is a shortcut for the case it cannot cover: code too
deep in an application to be handed a client, where `capture()` is often most
useful.

`launchArcjet()` never touches global state. Registering is always a separate,
explicit call:

```ts
// instrumentation.ts, or whatever runs at startup
import { launchArcjet, registerArcjet } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

registerArcjet(arcjet); // now, and only now, something is global
```

`guard()`, `capture()` and `flush()` are then importable on their own, and reach
the registered client:

```ts
// deep in application code — nothing was passed down here
import { capture } from "@arcjet/guard";

export async function refund(id: string): Promise<void> {
  await issueRefund(id);
  capture({ action: "refund.issued", metadata: { invoice: id } });
}
```

### What happens with nothing registered

`guard()` returns a fail-open `ALLOW` carrying an error result, so
`decision.hasFailedOpen()` is `true`. It does not throw — these functions behave
exactly like the client methods they forward to, and the never-throw contract
holds.

```ts
const decision = await guard({ label: "refund", rules: [limit(input)] });

if (decision.hasFailedOpen()) {
  // No rule was evaluated. Treat this as "policy did not run", not as a pass.
}
```

`capture()` drops the event silently, and `flush()` resolves immediately.
Nothing is logged: the client that would have carried a logger is the thing
that is missing, so the only available sink would be an unconfigurable console
warning on a request path — noise an application cannot turn off. The decision
returned by `guard()` is the observable signal, and making the `capture()` case
observable is planned as an opt-in on the call itself.

### Registering twice, and unregistering

Registration is version-checked. The slot is shared by every copy of
`@arcjet/guard` in the process, so a registration is only used by the exact
build that wrote it — the stored value is a live object whose internals are
guaranteed within one build and not across them. A copy that finds a
registration from another version leaves it alone and fails open, exactly as if
nothing were registered, and reports `AJ3006` on its own logger. Two versions
in one process therefore do not share a client.

Registration is also guarded. A second client does not displace the first — the
attempt is reported as `AJ3004` on the **incumbent's** logger, so a library or a
stray second `launchArcjet()` cannot quietly redirect an application's telemetry
to a different key. Registering the client that is already registered is a
silent no-op.

```ts
registerArcjet(a); // registered: a
registerArcjet(b); // warns; a stays registered
unregisterArcjet(); // nothing registered
```

`unregisterArcjet()` takes no argument and clears whatever is there. That
asymmetry is deliberate: requiring the client back would mean every teardown has
to keep hold of it, which is the problem registration exists to avoid. The cost
is that anything calling it clears the application's client and every free call
afterwards fails open — so **libraries should not call it**. Libraries take a
client explicitly. That is a convention, not something the SDK enforces.

An explicitly passed client always wins; the registered one is only consulted
when none was passed.

### Testing

`@arcjet/guard/testing` registers an in-memory client that records calls and
talks to nothing:

```ts
import { registerTestClient } from "@arcjet/guard/testing";
import { refund } from "./refund.ts";

test("refund captures an event", async () => {
  using arcjet = registerTestClient();

  await refund("inv_1");

  assert.equal(arcjet.captures[0]?.action, "refund.issued");
});
```

`using` unregisters the client at the end of the block, including when the test
fails part-way through. Note the `await`: the capture happens wherever the code
under test reaches it, so a test that forgets to await an async function asserts
before the event exists.

<details>
<summary>Without <code>using</code> — Node.js 22, or no TypeScript compile step</summary>

The `using` _syntax_ needs Node.js 24 to run natively, or compilation through
TypeScript. Node.js 22 defines `Symbol.dispose` but cannot parse `using`. Call
`unregister()` from a `finally` instead:

```ts
test("refund captures an event", async () => {
  const arcjet = registerTestClient();
  try {
    await refund("inv_1");

    assert.equal(arcjet.captures[0]?.action, "refund.issued");
  } finally {
    arcjet.unregister();
  }
});
```

`unregister()` and `[Symbol.dispose]` are the same function under two names, so
neither can drift from the other. It is safe to call twice, so it also works
from an `afterEach`.

One related caveat: because `[Symbol.dispose]` appears in the published types, a
project compiling with `skipLibCheck: false` needs `esnext.disposable` in its
`lib` even if it never writes `using`. `unregister()` is unaffected either way.

</details>

It throws if a client is already registered, which surfaces a leak from an
earlier test rather than letting this one assert against the wrong recorder.

Each recorded capture goes through the same validation and metadata encoding as
a real `capture()`, so a call the real client would drop is not recorded here
either. Recording itself is synchronous — once the code under test reaches
`capture()`, the event is there with no flushing or waiting.

`guard()` on the test client records the call and returns a fail-open `ALLOW`,
because no rule actually ran. It is not a mock server and does not let you stub
per-rule verdicts. One consequence worth knowing: helpers that fail closed on a
failed-open decision — `guardTool`, `guardAction` — will therefore **deny**
against this client.

## Metadata

`guard()` and every rule accept `metadata`: an object of string keys mapped to
**any JSON-serializable value**, including nested objects and arrays. It is
attached to the decision for correlation and analytics.

```ts
const decision = await arcjet.guard({
  label: "tools.weather",
  rules: [limitRule({ key: userId })],
  metadata: {
    user: { id: userId, plan: "pro" },
    toolName: "get_weather",
    durationMs: 160,
    success: true,
  },
});
```

Each top-level value is JSON-encoded by the SDK and stored verbatim.
Server-enforced limits:

| Limit                    | Value                          | Over the limit     |
| ------------------------ | ------------------------------ | ------------------ |
| Top-level keys           | 128                            | Extra keys dropped |
| Serialized bytes / value | 4 KiB                          | That key dropped   |
| Nesting depth / value    | 10                             | That key dropped   |
| Key names                | letters, digits, `-`, `.`, `_` | That key dropped   |

Nothing here can fail a call or change a decision — metadata is excluded from
fingerprinting. Every dropped key is reported on `decision.warnings`: the server
warns once per key it drops, and the SDK adds a single warning naming every key
it could not encode (`undefined`, a function, a `BigInt`, a circular reference). A
`metadata` that is not a plain object is ignored entirely.

Metadata is untrusted and is not redacted — do not put secrets or PII in it.

Two JavaScript-specific notes:

- Numbers are IEEE-754 doubles, so an integer above `Number.MAX_SAFE_INTEGER`
  loses precision before it reaches the wire. Pass such values as strings.
- `BigInt` cannot be JSON-encoded, so it is dropped with a warning. Convert it
  yourself.

Rule-level metadata is merged with `guard()`-level metadata shallowly: a
duplicate key's whole value is replaced, never deep-merged.

Some limits are the SDK's own, not the server's. The SDK drops keys once one
request's metadata exceeds 768 KiB in total (keys plus JSON-encoded values,
counted before compression). That ceiling sits well above anything the server
would accept — its own caps allow roughly 512 KiB in a single map — and exists
only so oversized metadata cannot push a request past the 1 MiB protocol limit,
where it would be rejected outright and fail open.

Objects with a `toJSON()` method, including `Date`, are serialized by their
`toJSON()` result. The Python SDK has no equivalent protocol and drops such values
with a warning, so convert explicitly if both SDKs must agree on a value.

## Decision inspection

Every `.guard()` call returns a `Decision` object. You can inspect it at
three levels of detail:

```ts
const rl = limitRule({ key: userId, requested: tokenCount });
const decision = await arcjet.guard({
  label: "tools.weather",
  rules: [rl, piRule(userMessage)],
});

// Overall decision
decision.conclusion; // "ALLOW" | "DENY"
decision.reason; // "RATE_LIMIT" | "PROMPT_INJECTION" | ... (only on DENY)

// Failure check (fail-open — errors don't cause denials)
decision.hasFailedOpen(); // true if ALLOW only because a rule/decision could not be processed
decision.errorResults(); // the results that errored
decision.warnings; // decision-level request-validation diagnostics

// Per-rule results — iterate all
for (const result of decision.results) {
  console.log(result.type, result.conclusion);
}

// From a RuleWithInput — this specific submission's result
const r = rl.result(decision);
if (r) {
  console.log(r.remainingTokens, r.maxTokens);
}

// From a RuleWithConfig — first denied result across all submissions
const denied = limitRule.deniedResult(decision);
if (denied) {
  console.log(denied.remainingTokens); // 0
}
```

Methods available on both `RuleWithConfig` and `RuleWithInput`:

| Method                   | `RuleWithConfig` (e.g. `limit`) | `RuleWithInput` (e.g. `rl`)        |
| ------------------------ | ------------------------------- | ---------------------------------- |
| `results(decision)`      | All results for this config     | Single-element or empty array      |
| `result(decision)`       | First result (any conclusion)   | This submission's result           |
| `deniedResult(decision)` | First denied result             | This submission's result if denied |

## Best practices

- **Create the client and rule configs once** at module scope, not per
  request. The client holds a persistent connection (HTTP/2 on Node.js);
  rule configs carry stable IDs used for server-side aggregation.

  ```ts
  // Create the client once at module scope
  const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

  // Configure reusable rules (also at module scope)
  const limitRule = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });

  // Per request — created each time
  const decision = await arcjet.guard({
    label: "tools.weather",
    rules: [limitRule({ key: userId })],
  });
  ```

- **Don't wrap `launchArcjet()` in a helper function.** This defeats
  connection reuse. Bad — creates a new client every call:

  ```ts
  function getArcjet() {
    return launchArcjet({ key: process.env.ARCJET_KEY! });
  }
  const decision = await getArcjet().guard({
    label: "tools.chat",
    rules: [
      tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 })({
        key: userId,
        requested: 1,
      }),
    ],
  });
  ```

  Good — reuses the client:

  ```ts
  const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
  const decision = await arcjet.guard({
    label: "tools.chat",
    rules: [
      tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 })({
        key: userId,
        requested: 1,
      }),
    ],
  });
  ```

- **Start rules in `DRY_RUN` mode** to observe behavior before switching to
  `LIVE`. This lets you tune thresholds without affecting real traffic:

  ```ts
  const limitRule = tokenBucket({
    mode: "DRY_RUN",
    refillRate: 10,
    intervalSeconds: 60,
    maxTokens: 100,
  });
  ```

- **Handle failures explicitly.** The SDK fails open — an errored rule does not
  cause a denial. Check `decision.hasFailedOpen()` to detect when a decision
  returned `ALLOW` only because a rule or the decision could not be processed,
  and inspect `decision.errorResults()` for the details. Gate a fail-closed
  policy on it:

  ```ts
  if (decision.hasFailedOpen()) {
    // Evaluation degraded — decide whether to proceed or deny.
    console.error("Guard failed open", decision.errorResults());
  }
  ```

  `decision.hasError()` still works but is deprecated: it conflated request
  diagnostics with errors. Use `decision.warnings` for diagnostics and
  `decision.errorResults()` / `decision.hasFailedOpen()` for errors.

- **Use labels** to identify protection boundaries. Labels appear in the
  Arcjet dashboard and help correlate decisions with specific tool calls or
  API endpoints.

- **Use `bucket`** on rate limit rules to name your counters in the
  dashboard. Different configs sharing the same bucket name still get
  independent counters — a config hash is appended server-side.

## SDK namespaces: core and integrations

`@arcjet/guard` exposes two import layers, plus `@arcjet/guard/testing` for the
in-memory test client:

### Core guard (`@arcjet/guard`)

The fundamental client and rule builders. Use this to evaluate guards without
any AI SDK integration:

```ts
import { launchArcjet, tokenBucket, detectPromptInjection } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [
    tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 })({
      key: userId,
      requested: 1,
    }),
    detectPromptInjection()(userMessage),
  ],
});
```

### Vendor SDK integration (`@arcjet/guard/<vendor-sdk>/v<major>`)

Vendor-specific wrappers that integrate with particular SDKs, plus every agent
helper. Currently available:

- **`@arcjet/guard/vercel-ai/v7`** — Vercel AI SDK v7 integration. Exports
  `guardTool` and `aiToolsContext` for tool wrapping, alongside the helpers
  that are not tied to any SDK — `createAgentContext`, `guardAction`,
  `captureAction`, and `securityMetadata`:

  ```ts
  import {
    guardTool,
    aiToolsContext,
    createAgentContext,
    guardAction,
    captureAction,
    securityMetadata,
  } from "@arcjet/guard/vercel-ai/v7";
  import { policyInput } from "@arcjet/guard";

  const ctx = createAgentContext({
    correlationId: requestId,
    metadata: securityMetadata({ user: userId }),
  });

  const tools = {
    getData: guardTool(arcjet, getDataTool, {
      action: "data.fetched",
      onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
      actor: (_input, context) => String(context?.metadata?.userId),
      inputs: (input) => ({ query: policyInput.server.string(input.query) }),
      rules: [dataLimit({ key: userId, requested: 1 })],
    }),
  };

  const result = await generateText({
    // ...
    tools,
    toolsContext: aiToolsContext(ctx, tools),
  });

  await guardAction(
    arcjet,
    ctx,
    {
      action: "data.updated",
      onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
      rules: [updateLimit({ key: userId })],
    },
    () => updateData(),
  );
  captureAction(arcjet, ctx, { action: "audit.logged" });
  ```

- **`@arcjet/guard/vercel-eve/v0`** — Vercel Eve v0 integration. Exports
  `guardTool`, `guardApproval`, `guardInbound`, and `arcjetHooks` for Eve's four
  guard surfaces, alongside the `eveAgentContext` helper that derives context
  from Eve's session:

  ```ts
  import { launchArcjet, tokenBucket } from "@arcjet/guard";
  import { guardApproval, arcjetHooks } from "@arcjet/guard/vercel-eve/v0";
  import { defineOpenAPIConnection } from "eve/connections";
  import { defineHook } from "eve/hooks";

  const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
  const limit = tokenBucket({
    refillRate: 10,
    intervalSeconds: 60,
    maxTokens: 10,
  });

  // Gate a connection's operations
  export const ordersConnection = defineOpenAPIConnection({
    description: "Orders API",
    spec: {/* ... */},
    approval: guardApproval(arcjet, {
      action: "orders-api.read",
      onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
      rules: (ctx) => [limit({ key: ctx.session.id, requested: 1 })],
    }),
    operations: { allow: ["GetOrder"] },
  });

  // Record agent lifecycle events
  export default defineHook(arcjetHooks(arcjet));
  ```

- **`@arcjet/guard/claude-agent-sdk/v0`** — Claude Agent SDK v0 integration.
  Exports `guardTool`, `guardHooks`, and `claudeAgentContext`. There is no
  `guardInbound` (inbound is `UserPromptSubmit` on `guardHooks`) and no
  `canUseTool` helper (`canUseTool` is skipped by `allowedTools`, allow
  rules, and `bypassPermissions` / `acceptEdits`):

  ```ts
  import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
  import { guardTool, guardHooks } from "@arcjet/guard/claude-agent-sdk/v0";
  import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
  import { z } from "zod";

  const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
  const limit = tokenBucket({
    refillRate: 10,
    intervalSeconds: 60,
    maxTokens: 10,
  });

  const lookupOrder = guardTool(
    arcjet,
    tool(
      "lookup_order",
      "Look up an order",
      { orderNumber: z.string() },
      async ({ orderNumber }) => ({
        content: [{ type: "text", text: `${orderNumber}: shipped` }],
      }),
    ),
    {
      action: "order.looked-up",
      onGuardError: "deny",
      rules: (input) => [limit({ key: input.orderNumber, requested: 1 })],
    },
  );

  // The Claude CLI requires `sessionId` to be a UUID and refuses to create the
  // same one twice: a non-UUID exits with "Invalid session ID", and reusing an
  // id on a second `query()` exits with "already in use". So mint a UUID for
  // the conversation, then continue it with `resume` — which keeps the id the
  // adapter reads, so every turn lands on one Sequence.
  const sessionId = conversationId; // a UUID, e.g. crypto.randomUUID()

  for await (const message of query({
    prompt: userText,
    options: {
      // First turn: `sessionId`. Later turns in the same conversation:
      // `resume: sessionId` instead.
      sessionId,
      mcpServers: {
        app: createSdkMcpServer({ name: "app", tools: [lookupOrder] }),
      },
      hooks: guardHooks(arcjet, {
        sessionId,
        // `lookupOrder` guards itself through `guardTool`, so exclude it here
        // or PreToolUse gates it a second time — two round trips, two quota
        // units, for one invocation. Naming the server keeps the match exact,
        // so another server's tool of the same name stays gated.
        exclude: [{ server: "app", name: "lookup_order" }],
        inbound: {
          action: "message.received",
          rules: ({ prompt }) => [detectPromptInjection()(prompt)],
        },
      }),
    },
  })) {
    void message;
  }
  ```

- **`@arcjet/guard/mastra/v1`** — Mastra v1 integration. Exports `guardTool`,
  `guardProcessor`, `guardHooks`, and `mastraAgentContext`. There is no
  `guardInbound` (channels already hit `processInput`) and no `guardApproval`
  (Mastra `requireApproval` is human HITL, not policy):

  ```ts
  import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
  import { guardTool, guardProcessor, guardHooks } from "@arcjet/guard/mastra/v1";
  import { Agent } from "@mastra/core/agent";
  import { createTool } from "@mastra/core/tools";
  import { z } from "zod";

  const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
  const limit = tokenBucket({
    refillRate: 10,
    intervalSeconds: 60,
    maxTokens: 10,
  });

  const lookupOrder = guardTool(
    arcjet,
    createTool({
      id: "lookup-order",
      description: "Look up an order",
      inputSchema: z.object({ orderNumber: z.string() }),
      execute: async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
    }),
    {
      action: "order.looked-up",
      onGuardError: "deny",
      rules: (input) => [limit({ key: input.orderNumber, requested: 1 })],
    },
  );

  export const agent = new Agent({
    id: "support-agent",
    name: "support-agent",
    instructions: "Help the user.",
    model: "openai/gpt-4o",
    tools: { lookupOrder },
    inputProcessors: [
      guardProcessor(arcjet, {
        action: "message.received",
        rules: ({ text }) => [detectPromptInjection()(text)],
      }),
    ],
    hooks: guardHooks(arcjet),
  });
  ```

- **`@arcjet/guard/langgraph/v1`** — LangGraph Graph API (`StateGraph` +
  `ToolNode`) integration. Exports `guardTool`, `guardToolNode`, and
  `langgraphAgentContext`. This is **not** LangChain `createAgent` /
  `wrapToolCall`, and `createReactAgent` is deprecated in LangGraph JS v1
  — do not build on it. There is no `guardInbound` (screen before
  `invoke` or at the first graph node) and no `guardInterrupt` /
  `guardApproval` (`interrupt()` is human HITL, not policy).

  On DENY a guarded tool does not run and does not throw: it returns a
  structured `ArcjetDenialResult`, which `ToolNode` turns into a real
  `ToolMessage` the model reads. Because the tool did not throw, that
  message's `status` is `success` — the denial is in the payload
  (`arcjetDenied: true`), not the envelope. `guardToolNode` guards a
  `ToolNode`'s tools **in place** and returns the same node, because
  `ToolNode` resolves its tools through a closure captured when it was
  constructed:

  ```ts
  import { launchArcjet, tokenBucket } from "@arcjet/guard";
  import { guardTool, guardToolNode } from "@arcjet/guard/langgraph/v1";
  import { ToolNode } from "@langchain/langgraph/prebuilt";
  import { tool } from "@langchain/core/tools";
  import { z } from "zod";

  const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
  const limit = tokenBucket({
    refillRate: 10,
    intervalSeconds: 60,
    maxTokens: 10,
  });

  const lookupOrder = guardTool(
    arcjet,
    tool(async ({ orderNumber }) => ({ orderNumber, status: "shipped" }), {
      name: "lookup_order",
      description: "Look up an order",
      schema: z.object({ orderNumber: z.string() }),
    }),
    {
      action: "order.looked-up",
      onGuardError: "deny",
      rules: (input) => [limit({ key: input.orderNumber, requested: 1 })],
    },
  );

  export const tools = guardToolNode(arcjet, new ToolNode([lookupOrder]));
  ```

#### Screen inbound before `invoke` (or at the first graph node)

LangGraph has no first-class inbound channel, so there is no
`guardInbound`. Put prompt-injection (and other inbound rules) in the
application before `graph.invoke`, or in the graph's first node.

#### `interrupt()` is not a policy gate

`interrupt()` / `interrupt_before=["tools"]` is human-in-the-loop, not
policy. Same trap as Mastra `requireApproval` and Claude `canUseTool`.
There is no `guardInterrupt`.

#### `ToolNode` is the deny point for tools; hooks / HITL cannot enforce

Unwrapped and MCP tools run inside `ToolNode`. Graph hooks and HITL
pauses cannot stop `tool.invoke`. Use `guardToolNode` (or `guardTool` for
authored tools you invoke yourself).

`guardToolNode` guards the node's tools in place and hands the same node
back. That is not an optimisation: `ToolNode`'s constructor captures
`func: (input, config) => this.run(input, config)`, and `run` reads
`this.tools`, so a copy holding a fresh tools array would leave the original
node executing unguarded tools. Guarding in place also means a caller that
still holds the pre-wrap node cannot bypass Guard. Passing an array of tools
instead returns guarded copies and leaves your array untouched. Tools
appended after wrapping — MCP discovered mid-run — are guarded on the next
`invoke`.

If you invoke a guarded tool yourself rather than through `ToolNode`, read
the denial and build your own `ToolMessage`; do not push the denial object
straight into `messages`, because the graph's message reducer only accepts
real messages.

- **`@arcjet/guard/openai-agents/v0`** — OpenAI Agents text `Agent` +
  `run()` / `Runner` integration. Exports `guardTool` and
  `openaiAgentsContext`. This is **not** Realtime, Sandbox, hosted tools,
  computer / shell / apply_patch, MCP, or `agent.asTool()`. There is no
  `guardInbound` (screen before `run()`; SDK `inputGuardrails` are not
  Arcjet), no `guardApproval` (`needsApproval` is human HITL, not
  policy), and no `guardHooks` / `guardToolNode` (there is no ToolNode;
  hosted / MCP / handoffs skip authored `execute`).

  On DENY a guarded tool does not run and does not throw: it returns a
  structured `ArcjetDenialResult`. The runner stringifies that object
  onto a `function_call_result` with `status: "completed"` — the denial
  is in the payload (`arcjetDenied: true`), not a fabricated envelope.
  Throwing would hit the SDK `errorFunction` (a generic string, or
  `ToolCallError` when `outputSchema` / `errorFunction: null`).
  `RunContext` has no session / conversation id; put the id you already
  have on `run(..., { context })`:

  ```ts
  import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
  import { guardTool, openaiAgentsContext } from "@arcjet/guard/openai-agents/v0";
  import { Agent, run, tool } from "@openai/agents";
  import { z } from "zod";

  const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
  const limit = tokenBucket({
    refillRate: 10,
    intervalSeconds: 60,
    maxTokens: 10,
  });

  const lookupOrder = guardTool(
    arcjet,
    tool({
      name: "lookup_order",
      description: "Look up an order",
      parameters: z.object({ orderNumber: z.string() }),
      execute: async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
    }),
    {
      action: "order.looked-up",
      onGuardError: "deny",
      rules: (input: { orderNumber: string }) => [limit({ key: input.orderNumber, requested: 1 })],
    },
  );

  const agent = new Agent({
    name: "support-agent",
    instructions: "Help the user.",
    tools: [lookupOrder],
  });

  const appContext = { sessionId: conversationId };
  const inbound = detectPromptInjection();
  const decision = await arcjet.guard({
    label: "message.received",
    rules: [inbound(userText)],
    ...openaiAgentsContext({ context: appContext, conversationId }),
  });

  if (decision.conclusion === "DENY") {
    throw new Error("message blocked");
  }
  // `guard()` fails open, so an ALLOW is not proof the rules ran. Gate on
  // `decision.hasFailedOpen()` here if this call site must fail closed; the
  // agent helpers below already default to that.
  await run(agent, userText, { context: appContext });
  ```

#### Screen inbound before `run()` (SDK `inputGuardrails` are not Arcjet)

OpenAI Agents has no first-class inbound channel, so there is no
`guardInbound`. Put prompt-injection (and other inbound rules) in the
application before `run()`. SDK `inputGuardrails` / `outputGuardrails` /
`defineToolInputGuardrail` / `defineToolOutputGuardrail` are the SDK's
own tripwires, not this policy gate.

#### `needsApproval` is not a policy gate

`needsApproval` / `requireApproval` / `onApproval` is human-in-the-loop,
not policy. The run pauses; `result.state.approve` / `reject`. Same trap
as Mastra `requireApproval`, Claude `canUseTool`, and LangGraph
`interrupt()`. There is no `guardApproval`.

#### `tool()` execute is the deny point; hosted, MCP, and handoffs are not on that path

The runner executes authored function tools in `toolExecution.ts` via
`invoke`. Hosted tools, handoffs, computer / shell / apply_patch, and
MCP (`mcpServers` → `mcpToFunctionTool`) skip that authored-`execute`
path. `agent_tool_start` / `agent_tool_end` are void observe-only hooks;
they are not a deny. There is no `guardHooks` and no `guardToolNode`.

### Naming and versions

Integration paths are `@arcjet/guard/<vendor-sdk>/v<major>` — the SDK being
integrated, then its major version.

**The version is always explicit.** `@arcjet/guard/vercel-ai/v7` resolves;
`@arcjet/guard/vercel-ai` deliberately does not. Against a fast-moving SDK
surface an unversioned alias would silently change meaning the moment a new
major is supported, turning an upgrade you did not ask for into a runtime
surprise. Importing an unexported path throws `ERR_PACKAGE_PATH_NOT_EXPORTED`,
so a wrong path fails at resolution rather than somewhere further in.

Supporting a new major is additive — a future `/v8` can ship alongside `/v7`,
so you migrate on your own schedule.

**Pre-1.0 SDKs:** when an SDK has not reached 1.0, the segment is `v0`. A `v1`
is added when that SDK ships its first stable release. `eve` is currently 0.x
and a 0.x minor may introduce breaking changes, so `v0` names a range this
package supports rather than a promise the SDK makes.

### Optional peer dependencies

Vendor integrations declare their SDK dependencies as optional peers, so users
importing only core guards are not forced to install unneeded packages:

- **`@arcjet/guard`** (core) has no peer dependencies.
- **`@arcjet/guard/vercel-ai/v7`** requires `ai` and `@ai-sdk/provider-utils`
  (optional peers — the package will not be installed automatically, but the
  imports will fail clearly if the peers are missing).
- **`@arcjet/guard/vercel-eve/v0`** requires `eve` (optional peer, installed
  only to use `@arcjet/guard/vercel-eve/v0`). **Eve requires Node.js >= 24**,
  which is higher than `@arcjet/guard`'s own floor of >= 22. If you are using
  Eve, ensure your deployment environment and CI both run Node 24 or later.
- **`@arcjet/guard/mastra/v1`** requires `@mastra/core` (optional peer,
  installed only to use `@arcjet/guard/mastra/v1`). The peer range is `>=1 <2`.
- **`@arcjet/guard/claude-agent-sdk/v0`** requires
  `@anthropic-ai/claude-agent-sdk` (optional peer, installed only to use
  `@arcjet/guard/claude-agent-sdk/v0`). The peer range is `>=0.1.0 <1`.
- **`@arcjet/guard/langgraph/v1`** requires `@langchain/langgraph` and
  `@langchain/core` (optional peers, installed only to use
  `@arcjet/guard/langgraph/v1`). The peer range is `>=1 <2` for both.
- **`@arcjet/guard/openai-agents/v0`** requires `@openai/agents` (optional
  peer, installed only to use `@arcjet/guard/openai-agents/v0`). The peer
  range is `>=0.17.0 <1`. Zod is their peer, not ours.

**pnpm caveat**: pnpm does not reliably honour
`peerDependenciesMeta.*.optional` (pnpm#5152, #8142), especially with
`--strict-peer-dependencies` enabled. If `pnpm install` fails with missing
peers, either install them explicitly or relax strict peer checking:

Install only the peer for the integration you use — not a combined set.
Users pick one of these; Eve and Mastra are not installed together:

```sh
# @arcjet/guard/vercel-ai/v7
pnpm install ai @ai-sdk/provider-utils
```

```sh
# @arcjet/guard/vercel-eve/v0 (Node.js >= 24)
pnpm install eve
```

```sh
# @arcjet/guard/mastra/v1
pnpm install @mastra/core
```

```sh
# @arcjet/guard/claude-agent-sdk/v0
pnpm install @anthropic-ai/claude-agent-sdk
```

```sh
# @arcjet/guard/langgraph/v1
pnpm install @langchain/langgraph @langchain/core
```

```sh
# @arcjet/guard/openai-agents/v0
pnpm install @openai/agents
```

```sh
# or skip the peer install and relax the check:
pnpm install --no-strict-peer-dependencies
```

### Where the SDK-agnostic helpers live

`createAgentContext`, `guardAction`, `captureAction`, and `securityMetadata`
are not tied to any AI SDK, and internally they are kept that way — nothing
they import reaches `ai`. They are published on each vendor namespace, so there
is one path to learn and no layering to reason about.

`@arcjet/guard/vercel-ai/v7`, `@arcjet/guard/vercel-eve/v0`,
`@arcjet/guard/mastra/v1`, `@arcjet/guard/claude-agent-sdk/v0`,
`@arcjet/guard/langgraph/v1`, and `@arcjet/guard/openai-agents/v0` now export
these helpers. The open next step is
promoting them to the root `@arcjet/guard` export so a caller can get the
agnostic layer without installing a vendor peer. That change is a follow-up
with its own ADR; there is still no public `@arcjet/guard/agents`.

### `onGuardError`: handling evaluation failures

> `guard()` fails **open** by default. It is the lower-level client API: it
> returns a decision and leaves the application in control of whether to
> proceed. The agent helpers (`guardTool`, `guardAction`, Eve's `guardInbound`)
> fail **closed** by default because they are designed to wrap tool calls and
> actions that are assumed to be sensitive. The core client reports degraded
> evaluation via `hasFailedOpen()`; the helpers decide to block on it.

| API                                     | Default on Arcjet outage                    | How to flip                        |
| --------------------------------------- | ------------------------------------------- | ---------------------------------- |
| `guard()` (core)                        | Allow (fail open), `hasFailedOpen()===true` | gate manually on `hasFailedOpen()` |
| `guardTool` / `guardAction`             | Deny (fail closed)                          | `onGuardError: "allow"`            |
| Eve `guardInbound` / `guardApproval`    | Deny (fail closed)                          | `onGuardError: "allow"`            |
| Mastra `guardProcessor` / `guardHooks`  | Deny (fail closed)                          | `onGuardError: "allow"`            |
| Claude `guardTool` / `guardHooks`       | Deny (fail closed)                          | `onGuardError: "allow"`            |
| LangGraph `guardTool` / `guardToolNode` | Deny (fail closed)                          | `onGuardError: "allow"`            |
| OpenAI Agents `guardTool`               | Deny (fail closed)                          | `onGuardError: "allow"`            |

`onGuardError` is broader than Arcjet Cloud availability. It governs both an
unexpected throw from `guard()` and an ALLOW decision whose `hasFailedOpen()`
is `true`. With the default `"deny"`, either blocks the call; this can also
happen on a deadline, response parse failure, local rule failure, missing
decision, or server-returned rule error.

When guard policy evaluation fails (e.g. the Arcjet API is unreachable), the
SDK still allows the request to proceed — this is the platform's fail-open
default. The agent-level helpers deliberately flip this default where needed,
because they wrap consequential effects. Their `onGuardError` option controls
what happens:

- **Default: `"deny"`** — if the policy cannot be evaluated, the call is
  blocked. For AI tool calls and application actions, this is the safe choice.
  - Vercel AI SDK (`guardTool`, `guardAction`): `guardTool` returns
    `{ reason: "ERROR", retryable: true, retryAfterSeconds: 5 }` to the model.
    `guardAction` throws `ArcjetGuardUnavailableError`, which is deliberately
    distinct from `ArcjetDeniedError` so an unavailable guard can be alerted on
    separately; it carries `cause` or `decision`, making the two distinguishable
    in a handler.
  - Vercel Eve (`guardTool`, `guardApproval`): `guardTool` throws
    `ArcjetGuardUnavailableError`, which Eve projects as a failed `action.result`
    to the agent. `guardApproval` returns a `denied` status carrying a reason the
    model reads.
  - The capture `outcome` on that path is `"unavailable"`, not `"denied"` on both
    SDKs. The AI SDK returns a fixed `retryAfterSeconds: 5` backoff hint. Eve
    supplies `retryAfterSeconds` only on a rate-limit denial surfaced via
    `onDeny: "result"`, derived from the decision's reset time; its default
    denial throws and carries no hint.

- **Opt-out: `onGuardError: "allow"`** — if the policy cannot be evaluated,
  proceed anyway. Use this for call sites where availability matters more than
  enforcement — e.g. a read-only tool like an order lookup, or a channel
  screening gate where blocking is costly. During an Arcjet incident, that call
  site is unaffected, but enforcement at other sites is not.
  - Eve's `guardInbound` defaults to `"deny"` — the channel stops answering if
    the guard is unavailable, which is the safe choice. To allow messages
    through during an outage, explicitly set `onGuardError: "allow"`, where the
    human cost of rejecting a legitimate message exceeds the security cost.

The layering resolves a potential confusion: the core `@arcjet/guard` client
still fails open by construction and _reports_ it via `hasFailedOpen()`; the
agent-level helpers _decide_ to block on it.

### The explicit-call alternative

`guardTool` extracts the context from the tool call automatically via the
injected `contextSchema`, which is convenient. Alternatively, call `guardAction`
directly inside the tool's `execute` block:

```ts
import { tool } from "ai";
import { z } from "zod";

const tools = {
  getData: tool({
    description: "Fetch data",
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      return await guardAction(
        arcjet,
        ctx,
        {
          action: "data.fetched",
          onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
          rules: [dataLimit({ key: `user:${userId}`, requested: 1 })],
        },
        () => fetchData(id),
      );
    },
  }),
};
```

This form keeps control flow visible but requires threading the context in by
hand. Both are supported; choose based on whether you prefer automatic context
extraction or explicit control flow.

### What `correlationId` is for

The `correlationId` is a user-supplied string that joins every guard decision
and capture event from one logical run **or session** into a single sequence
in the Arcjet console, so the best value is an ID the app already has and can
search by (request ID, job ID, ticket ID, review ID). If omitted, a ULID is
generated. Using a consistent ID across multiple tool calls and actions within
the same logical operation makes it easy to reconstruct the full context of
what happened.

### Rules derived from tool input

When wrapping a tool, `rules` can be a static array or a callback that
computes rules from the tool's parsed input:

```ts
const tools = {
  lookupOrder: guardTool(arcjet, lookupOrderTool, {
    action: "order.looked-up",
    onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
    rules: ({ orderNumber }) => [
      // Key the rate limit to the specific order being looked up
      orderLimit({ key: `order:${orderNumber}`, requested: 1 }),
    ],
  }),
};
```

This allows rules to vary based on the request — e.g. stricter limits for
certain users or resources. `guardAction` takes a resolved `RuleWithInput[]`,
so compute the rules at the call site and pass the array.

## Using the agent helpers

> `guard()` fails **open** by default. It is the lower-level client API: it
> returns a decision and leaves the application in control of whether to
> proceed. The agent helpers (`guardTool`, `guardAction`, Eve's `guardInbound`)
> fail **closed** by default because they are designed to wrap tool calls and
> actions that are assumed to be sensitive. The core client reports degraded
> evaluation via `hasFailedOpen()`; the helpers decide to block on it.

### End-to-end example

Here's a complete example protecting both an AI tool call and an app-invoked action:

```ts
import { launchArcjet, tokenBucket } from "@arcjet/guard";
import { tool, jsonSchema, generateText } from "ai";
import {
  aiToolsContext,
  captureAction,
  createAgentContext,
  guardAction,
  guardTool,
  securityMetadata,
} from "@arcjet/guard/vercel-ai/v7";

// 1. Launch the guard client once (at module scope)
const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

// 2. Create security context (at request entry point)
const ctx = createAgentContext({
  correlationId: existingRunId, // omit to auto-generate
  metadata: securityMetadata({ agent: "support", user: userId }),
});

// 3. Wrap a tool with rate limiting
const emailLimit = tokenBucket({
  bucket: "emails",
  refillRate: 5,
  intervalSeconds: 60,
  maxTokens: 10,
});

const sendEmail = guardTool(
  arcjet,
  tool({
    description: "Send an email",
    inputSchema: jsonSchema<{ to: string; subject: string }>({
      type: "object",
      properties: { to: { type: "string" }, subject: { type: "string" } },
      required: ["to", "subject"],
    }),
    execute: async ({ to, subject }) => ({ sent: true }),
  }),
  {
    action: "email.sent",
    onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
    rules: () => [emailLimit({ key: userId, requested: 1 })],
  },
);

// 4. Pass context to AI SDK tools
const tools = { sendEmail };
const result = await generateText({
  model: languageModel, // Use a real language model, e.g., from @ai-sdk/openai
  instructions: "If a tool is denied by Arcjet, explain to the user instead of retrying.",
  tools,
  toolsContext: aiToolsContext(ctx, tools),
  prompt: userMessage, // User input or conversation context
});

// 5. Protect an app-invoked action (e.g., external API call)
const commentLimit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 20,
});

await guardAction(
  arcjet,
  ctx,
  {
    action: "github.pr-commented",
    onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
    rules: [commentLimit({ key: userId })],
  },
  () => github.createComment({ body: result.text }),
);

// 6. Capture observational events
captureAction(arcjet, ctx, {
  action: "notification.sent",
  metadata: { destination: "slack" },
});
```

The `action` is the guard label: use `resource.verb` past tense (e.g. `order.looked-up`). Labels are validated server-side as slugs — lowercase letters, digits, dash, and dot only, starting and ending with a letter or digit. Underscores and uppercase are rejected.

### Failure posture

- **Guard errors** (API timeouts, network failures): Fail **closed** by default. Both unavailability signals — the `guard()` call throwing, and a decision whose `hasFailedOpen()` is true — block the call: `guardTool` returns `reason: "ERROR"` with `retryable: true` and `retryAfterSeconds: 5`, and `guardAction` throws `ArcjetGuardUnavailableError`. Set `onGuardError: "allow"` to opt back into fail-open, where the tool or action still runs. A warning is logged either way when `ARCJET_LOG_LEVEL` is `debug`, `info`, or `warn`.
- **Capture events**: Fire-and-forget; never throw. They go through the client's [`capture()`](#capture), so a capture failure is diagnosed rather than raised, and it never fails the tool call or action it is recording.
- **Missing correlation ID**: Guard checks still run (uncorrelated). The first uncorrelated tool call always warns; further ones respect `ARCJET_LOG_LEVEL`.

### Which helper?

| Scenario                       | Helper            | Guard  | Model Sees                         |
| ------------------------------ | ----------------- | ------ | ---------------------------------- |
| LLM decided to call a tool     | `guardTool()`     | Always | `ArcjetDenialResult` on DENY       |
| Your app invokes an action     | `guardAction()`   | Always | Throws `ArcjetDeniedError` on DENY |
| Record that something happened | `captureAction()` | No     | — (fire-and-forget)                |

`guardTool` and `guardAction` call `guard()` on every invocation, including when
`rules` is omitted or resolves to `[]`. Submitting no rules is not the same as
skipping the call: Arcjet still returns a decision, so the event is correlatable
by `decisionId` and the call site stays reachable by policy configured outside
your code. It does cost a round trip — reach for `captureAction()` when you want
a record and no decision.

### Threading context through boundaries

The context is a plain JSON-serializable object: thread it explicitly through function calls and workflow/queue inputs (never use module state or `AsyncLocalStorage`). Each correlation ID is 1–256 printable ASCII characters; auto-generated ones are ULIDs.

Thread an existing run identifier (request/job/review ID) so Arcjet data joins your own systems:

```ts
const ctx = createAgentContext({ correlationId: requestId });
await workflow({ question, arcjet: ctx });
```

Or omit `correlationId` to auto-generate a ULID:

```ts
const ctx = createAgentContext();
console.log(ctx.correlationId); // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
```

`guardAction` and `captureAction` take the context directly. Tools can't — the model calls them, so their context arrives through the AI SDK's `toolsContext` channel instead: `aiToolsContext(ctx, tools)` builds that map, which is why `guardTool` itself never takes `ctx`.

> **Don't forget `toolsContext`.** The injected context type includes `undefined`, so the compiler will not flag a missing `toolsContext: aiToolsContext(ctx, tools)` at the `generateText` call. Omit it and guard checks run uncorrelated: the first uncorrelated call always warns, but further ones are silent unless `ARCJET_LOG_LEVEL` is set. Run once with `ARCJET_LOG_LEVEL=warn` and confirm the correlation ID reaches the dashboard.

### Denial responses

When a guard check denies a tool call, `guardTool` returns an `ArcjetDenialResult` object:

```ts
const result: ArcjetDenialResult = {
  arcjetDenied: true,
  reason: "RATE_LIMIT",
  message: "Arcjet denied this tool call (RATE_LIMIT). It may be retried after 30 seconds.",
  retryable: true,
  retryAfterSeconds: 30,
};
```

To reshape what the model sees on denial, pass `onDeny` in the tool policy — it receives the `DecisionDeny` and its return value replaces the default `ArcjetDenialResult`:

```ts
guardTool(arcjet, lookupOrderTool, {
  action: "order.looked-up",
  onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
  rules: () => [limit({ key: userId })],
  onDeny: (decision) => ({ error: `blocked: ${decision.reason}` }),
});
```

An Arcjet Cloud outage does not take this `onDeny` path. It takes the
`onUnavailable` path and returns the fixed
`{ reason: "ERROR", retryable: true, retryAfterSeconds: 5 }`; `onDeny` fires
only for a real DENY decision, not for an unavailable guard.

`reason: "ERROR"` alone does not prove the guard was unavailable: a real DENY
decision may also use that reason. Capture records distinguish the paths as
`outcome: "unavailable"` versus `outcome: "denied"`; `guardAction` additionally
distinguishes them with `ArcjetGuardUnavailableError` and `ArcjetDeniedError`.

A common application pattern is to retry or alert when evaluation was
unavailable, while handling a real policy denial without retrying the action:

```ts
import {
  ArcjetDeniedError,
  ArcjetGuardUnavailableError,
  guardAction,
} from "@arcjet/guard/vercel-ai/v7";

async function guardedRefund(paymentId: string, userId: string): Promise<void> {
  try {
    await guardAction(
      arcjet,
      ctx,
      {
        action: "payment.refunded",
        onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
        rules: [refundLimit({ key: userId })],
      },
      () => refundPayment(paymentId),
    );
  } catch (error) {
    if (error instanceof ArcjetGuardUnavailableError) {
      alertOperator(error);
      await queueForRetry(paymentId);
      return;
    }
    if (error instanceof ArcjetDeniedError) {
      reportPolicyDenial(error.decision.reason);
      return;
    }
    throw error;
  }
}
```

When a guard check denies an action, `guardAction` throws `ArcjetDeniedError` carrying the decision. Recommended system prompt line for tools:

> If a tool call is denied by security policy, do not retry it; explain the denial to the user or try a different approach.

### Security metadata vocabulary

Use `securityMetadata()` keys consistently across your app:

| Key             | Meaning                              | Example                                           |
| --------------- | ------------------------------------ | ------------------------------------------------- |
| `user`          | Whose authority (opaque ID, not PII) | `"user_alice"`, `"org_123"`                       |
| `agent`         | Type or identity of the AI actor     | `"support-agent"`, `"code-reviewer"`              |
| `workflow`      | Process name this request belongs to | `"support-request"`, `"pr-review"`                |
| `dataClass`     | Data sensitivity level               | `"public"`, `"confidential"`, `"regulated"`       |
| `destination`   | Where effects are sent               | `"github"`, `"slack"`, `"email"`                  |
| `reversibility` | Whether the action can be undone     | `"reversible"`, `"compensable"`, `"irreversible"` |
| `resource`      | What's being acted on                | `"order:12345"`, `"repo:owner/name"`              |

## Example

For a complete working example integrating `@arcjet/guard` with the Vercel AI SDK, see [`nextjs-ai-agent`](https://github.com/arcjet/examples/tree/main/examples/nextjs-ai-agent) in [`arcjet/examples`](https://github.com/arcjet/examples), which demonstrates wrapping agent tools with guard checks, enforcing rules on application-invoked actions, and emitting audit events joined by correlation ID.

For an example with Vercel Eve, see [`eve-agent`](https://github.com/arcjet/examples/tree/main/examples/eve-agent), which shows how to protect tools, connections, and channels with Arcjet guards, and record agent lifecycle events with hooks.

For an example with Mastra, see [`mastra-agent`](https://github.com/arcjet/examples/tree/main/examples/mastra-agent), which shows inbound prompt-injection screening, guarded tools (deny, PII on args, rate limit, fail-closed), hooks for unwrapped tools, and thread/resource correlation. These Guard examples land with [arcjet/examples#193](https://github.com/arcjet/examples/pull/193).

For an example with LangGraph, see [`langgraph-agent`](https://github.com/arcjet/examples/tree/main/examples/langgraph-agent) (follow-up on that same PR): inbound screening before `invoke`, `guardTool` / `guardToolNode` (deny, PII on args, rate limit, fail-closed), and `thread_id` correlation. `interrupt()` is HITL, not a policy gate; `ToolNode` is the deny point for tools.

For an example with OpenAI Agents, see [`openai-agent`](https://github.com/arcjet/examples/tree/main/examples/openai-agent) (follow-up on that same PR): inbound screening before `run()`, `guardTool` (deny, PII on args, rate limit, fail-closed), and a caller-owned id on `run(..., { context })`. `needsApproval` is HITL, not a policy gate; authored `tool()` `invoke` is the deny point.

## Agent skill

For integration help in Claude Code or other AI coding agents, a skill file per integration is packaged with `@arcjet/guard`:

**For Vercel AI SDK:**

```bash
# Extract the skill from node_modules into your Claude Code skills directory:
cp -r node_modules/@arcjet/guard/skills/integrate-arcjet-guard-agents ~/.claude/skills/

# Or symlink it instead:
ln -s /path/to/node_modules/@arcjet/guard/skills/integrate-arcjet-guard-agents ~/.claude/skills/
```

In Claude Code, use `/integrate-arcjet-guard-agents` to start an integration session.

**For Vercel Eve:**

```bash
cp -r node_modules/@arcjet/guard/skills/integrate-arcjet-guard-eve ~/.claude/skills/
# or
ln -s /path/to/node_modules/@arcjet/guard/skills/integrate-arcjet-guard-eve ~/.claude/skills/
```

In Claude Code, use `/integrate-arcjet-guard-eve` to start an integration session.

**For Mastra:**

```bash
cp -r node_modules/@arcjet/guard/skills/integrate-arcjet-guard-mastra ~/.claude/skills/
# or
ln -s /path/to/node_modules/@arcjet/guard/skills/integrate-arcjet-guard-mastra ~/.claude/skills/
```

In Claude Code, use `/integrate-arcjet-guard-mastra` to start an integration session.

**For the Claude Agent SDK:**

```bash
cp -r node_modules/@arcjet/guard/skills/integrate-arcjet-guard-claude-agent-sdk ~/.claude/skills/
# or
ln -s /path/to/node_modules/@arcjet/guard/skills/integrate-arcjet-guard-claude-agent-sdk ~/.claude/skills/
```

In Claude Code, use `/integrate-arcjet-guard-claude-agent-sdk` to start an integration session.

**For LangGraph:**

```bash
cp -r node_modules/@arcjet/guard/skills/integrate-arcjet-guard-langgraph ~/.claude/skills/
# or
ln -s /path/to/node_modules/@arcjet/guard/skills/integrate-arcjet-guard-langgraph ~/.claude/skills/
```

In Claude Code, use `/integrate-arcjet-guard-langgraph` to start an integration session.

**For OpenAI Agents:**

```bash
cp -r node_modules/@arcjet/guard/skills/integrate-arcjet-guard-openai-agents ~/.claude/skills/
# or
ln -s /path/to/node_modules/@arcjet/guard/skills/integrate-arcjet-guard-openai-agents ~/.claude/skills/
```

In Claude Code, use `/integrate-arcjet-guard-openai-agents` to start an integration session.

Each skill guides you through wrapping tools, screening inbound messages, and recording lifecycle events joined by correlation ID.

Note: `npx skills add arcjet/skills` refers to the separate Anthropic skills marketplace, not the packaged file.

## MCP server

Connect your AI assistant to the Arcjet MCP server at
`https://api.arcjet.com/mcp` to manage sites, retrieve SDK keys, and more.
See the [docs](https://docs.arcjet.com/mcp-server) for setup instructions.

You can also manage sites and keys with the CLI: `npx @arcjet/cli`.

## Proxy support

The standard proxy environment variables (`HTTP_PROXY` and `HTTPS_PROXY`, while
respecting `NO_PROXY`) are auto-detected, making it possible to connect to the
Arcjet API through a proxy such as [Squid](https://www.squid-cache.org/). When a
proxy is in use, a line is logged at startup; the proxy
URL itself is not logged, since it can contain credentials. How the request is
actually proxied depends on the runtime:

- **Node.js** — uses the HTTP/2 transport; when a proxy is detected, requests
  are routed through it over HTTP/1.1 using the built-in proxy support of the
  Node.js HTTP agent, otherwise made directly over HTTP/2.
- **Bun** — uses the HTTP/2 transport directly, but its Node HTTP agent doesn't
  support proxying, so when a proxy is detected it falls back to the fetch-based
  transport and Bun's `fetch` performs the proxying natively.
- **Deno** — the runtime's `fetch` performs the proxying natively.
- **Cloudflare Workers** and other edge runtimes don't support outbound proxy
  environment variables, so no proxy is used.

`NO_PROXY` accepts a comma- or space-separated list of host suffixes, each with
an optional leading `.` or `*.` and an optional `:port`, plus `*` to bypass the
proxy for every host. Entries are matched as host names; IP/CIDR ranges (such as
`10.0.0.0/8`) are not supported, the same as
[curl](https://curl.se/docs/manpage.html#--noproxy). On Bun and Deno the
runtime's `fetch` applies `NO_PROXY` itself, so its exact semantics are the
runtime's.

## Runtime support

| Runtime            | Minimum version          |
| ------------------ | ------------------------ |
| Node.js            | 22.21.0 [^node]          |
| Bun                | 1.3.0                    |
| Deno               | `stable` / `lts`         |
| Cloudflare Workers | compat date `2025-09-01` |

[^node]:
    Requires `>=22.21.0 <23 || >=24.5.0`. Node.js 20 is end-of-life and Node.js
    23 is not supported; on the 24 line the built-in HTTP agent proxy support
    used for the API transport landed in 24.5.0. Anyone tracking an active LTS
    release is unaffected.

> [!TIP]
> Import from `@arcjet/guard` — the correct transport is selected
> automatically via conditional exports (HTTP/2 on Node.js and Bun,
> fetch-based on Deno and Cloudflare Workers).

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[sdks-github]: https://github.com/arcjet
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0

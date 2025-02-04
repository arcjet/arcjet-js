<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/next`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/next">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fnext?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fnext?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Bot detection. Rate limiting. Email validation. Attack protection. Data
redaction. A developer-first approach to security.

This is the [Arcjet][arcjet] SDK for the [Next.js][next-js] framework. **Find
our other [SDKs on GitHub][sdks-github]**.

## Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## Features

Arcjet security features for protecting Next.js apps:

- 🤖 [Bot protection][bot-protection-quick-start] - manage traffic by automated
  clients and bots.
- 🛑 [Rate limiting][rate-limiting-quick-start] - limit the number of requests a
  client can make.
- 🛡️ [Shield WAF][shield-quick-start] - protect your application against common
  attacks.
- 📧 [Email validation][email-validation-quick-start] - prevent users from
  signing up with fake email addresses.
- 📝 [Signup form protection][signup-protection-quick-start] - combines rate
  limiting, bot protection, and email validation to protect your signup forms.
- 🕵️‍♂️ [Sensitive information detection][sensitive-info-quick-start] - block
  personally identifiable information (PII).
- 🚅 [Nosecone][nosecone-quick-start] - set security headers such as
  `Content-Security-Policy` (CSP).

## Quick start

This example will protect a Next.js API route with a rate limit, bot detection,
and Shield WAF.

You can also find this [quick start guide][quick-start] in the docs.

### 1. Installation

```shell
npm i @arcjet/next
```

### 2. Set your key

[Create a free Arcjet account][arcjet-account] then follow the instructions to
add a site and get a key.

Add your key to a `.env.local` file in your project root.

```ini
ARCJET_KEY=ajkey_yourkey
```

### 3. Add rules

Create a new API route at `/app/api/arcjet/route.ts`:

```ts
import arcjet, {
  type ArcjetRuleResult,
  detectBot,
  shield,
  tokenBucket,
} from "@arcjet/next";
import { NextResponse } from "next/server";

const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories
        // See the full list at https://arcjet.com/bot-list
        //"CATEGORY:MONITOR", // Uptime monitoring services
        //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
    // Create a token bucket rate limit. Other algorithms are supported.
    tokenBucket({
      mode: "LIVE",
      refillRate: 5, // Refill 5 tokens per interval
      interval: 10, // Refill every 10 seconds
      capacity: 10, // Bucket capacity of 10 tokens
    }),
  ],
});

function isSpoofed(result: ArcjetRuleResult) {
  return (
    // You probably don't want DRY_RUN rules resulting in a denial
    // since they are generally used for evaluation purposes but you
    // could log here.
    result.state !== "DRY_RUN" &&
    result.reason.isBot() &&
    result.reason.isSpoofed()
  );
}

export async function GET(req: Request) {
  const decision = await aj.protect(req, { requested: 5 }); // Deduct 5 tokens from the bucket
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json(
        { error: "Too Many Requests", reason: decision.reason },
        { status: 429 },
      );
    } else if (decision.reason.isBot()) {
      return NextResponse.json(
        { error: "No bots allowed", reason: decision.reason },
        { status: 403 },
      );
    } else {
      return NextResponse.json(
        { error: "Forbidden", reason: decision.reason },
        { status: 403 },
      );
    }
  }

  // Arcjet Pro plan verifies the authenticity of common bots using IP data.
  // Verification isn't always possible, so we recommend checking the decision
  // separately.
  // https://docs.arcjet.com/bot-protection/reference#bot-verification
  if (decision.results.some(isSpoofed)) {
    return NextResponse.json(
      { error: "Forbidden", reason: decision.reason },
      { status: 403 },
    );
  }

  return NextResponse.json({ message: "Hello world" });
}
```

### 4. Start your app

```shell
npm run dev
```

Visit `http://localhost:3000/api/arcjet` in your browser and refresh a few times
to hit the rate limit.

Wait 10 seconds, then run:

```shell
curl -v http://localhost:3000/api/arcjet
```

The wait is necessary because the decision is cached for your IP based on the
`interval` rate limit configuration.

You should see a `403` response because `curl` is considered a bot by default
([customizable][customizable]).

The requests will also show in the [Arcjet dashboard][arcjet-account].

### What next?

- [Customize allowed bots][identifying-bots]
- [Protect server actions][server-actions]
- [Learn how Arcjet works][architecture].
- [Review the Next.js SDK reference][nextjs-reference].

## Accessing the decision

The [protect function][protect-function] returns a `Promise` that resolves to an
[`ArcjetDecision`][decision] object. This allows you to access the full decision
and results.

```ts
for (const result of decision.results) {
  // Check the rate limit rule results
  if (result.reason.isRateLimit()) {
    if (result.isDenied()) {
      console.log("Rate limit rule returned deny conclusion", result);
    }

    // Log how many tokens are remaining in the bucket
    const remaining = decision.reason.remaining;
    console.log("Remaining rate limit tokens", remaining);
  }

  // Log the name of any denied bots
  if (result.reason.isBot()) {
    if (result.isDenied()) {
      console.log("Detected bot", reason.denied);
    }
  }
}
```

### IP address analysis

For each request, Arcjet [returns additional data about the IP
address][ip-analysis]. The available fields depends on the pricing plan you're
on. The free plan includes country and IP type e.g. VPN or proxy.

```ts
if (decision.ip.hasCountry()) {
  console.log("Country", decision.ip.countryName);
}

if (decision.ip.isVpn()) {
  console.log("VPN detected");
}
```

## FAQs

### Do I need to run any infrastructure e.g. Redis?

No, Arcjet handles all the infrastructure for you so you don't need to worry
about deploying global Redis clusters, designing data structures to track rate
limits, or keeping security detection rules up to date.

### What is the performance overhead?

Arcjet SDK tries to do as much as possible asynchronously and locally to
minimize latency for each request. Where decisions can be made locally or
previous decisions are cached in-memory, latency is usually <1ms.

When a call to the Arcjet API is required, such as when tracking a rate limit in
a serverless environment, there is some additional latency before a decision is
made. The Arcjet API has been designed for high performance and low latency, and
is deployed to multiple regions around the world. The SDK will automatically use
the closest region which means the total overhead is typically no more than
20-30ms, often significantly less.

### What happens if Arcjet is unavailable?

Where a decision has been cached locally e.g. blocking a client, Arcjet will
continue to function even if the service is unavailable.

If a call to the Arcjet API is needed and there is a network problem or Arcjet
is unavailable, the default behavior is to fail open and allow the request. You
have control over how to handle errors, including choosing to fail close if you
prefer. See the reference docs for details.

### How does Arcjet protect me against DDoS attacks?

Network layer attacks tend to be generic and high volume, so these are best
handled by your hosting platform. Most cloud providers include network DDoS
protection by default.

Arcjet sits closer to your application so it can understand the context. This is
important because some types of traffic may not look like a DDoS attack, but can
still have the same effect. For example, a customer making too many API requests
and affecting other customers, or large numbers of signups from disposable email
addresses.

Network-level DDoS protection tools find it difficult to protect against this
type of traffic because they don't understand the structure of your application.
Arcjet can help you to identify and block this traffic by integrating with your
codebase and understanding the context of the request e.g. the customer ID or
sensitivity of the API route.

Volumetric network attacks are best handled by your hosting provider.
Application level attacks need to be handled by the application. That's where
Arcjet helps.

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[next-js]: https://nextjs.org/
[quick-start]: https://docs.arcjet.com/get-started?f=next-js
[example-url]: https://example.arcjet.com
[example-source]: https://github.com/arcjet/arcjet-js-example
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[bot-protection-quick-start]: https://docs.arcjet.com/bot-protection/quick-start?f=next-js
[rate-limiting-quick-start]: https://docs.arcjet.com/rate-limiting/quick-start?f=next-js
[shield-quick-start]: https://docs.arcjet.com/shield/quick-start?f=next-js
[email-validation-quick-start]: https://docs.arcjet.com/email-validation/quick-start?f=next-js
[signup-protection-quick-start]: https://docs.arcjet.com/signup-protection/quick-start?f=next-js
[sensitive-info-quick-start]: https://docs.arcjet.com/sensitive-info/quick-start?f=next-js
[nosecone-quick-start]: https://docs.arcjet.com/nosecone/quick-start?f=next-js
[sdks-github]: https://github.com/arcjet
[customizable]: https://docs.arcjet.com/bot-protection/identifying-bots
[arcjet-account]: https://app.arcjet.com/
[identifying-bots]: https://docs.arcjet.com/bot-protection/identifying-bots
[server-actions]: https://docs.arcjet.com/reference/nextjs#server-actions
[architecture]: https://docs.arcjet.com/architecture
[nextjs-reference]: https://docs.arcjet.com/reference/nextjs
[protect-function]: https://docs.arcjet.com/reference/nextjs#protect
[ip-analysis]: https://docs.arcjet.com/reference/nextjs#ip-analysis
[decision]: https://docs.arcjet.com/reference/nextjs#decision

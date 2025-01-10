/*
 If you are building an AI application you may be more interested in the number
 of AI tokens rather than the number of HTTP requests. The token bucket
 algorithm is a good fit for this use case because you can vary the number of
 tokens withdrawn from the bucket with every request.

 This example is adapted from
 https://sdk.vercel.ai/docs/getting-started/nextjs-app-router and calculates as
 estimate of the number of tokens required to process the request. It then uses
 a token bucket rate limit algorithm to limit the number of tokens consumed,
 keeping costs under control.

 The IP address is used to track tokens used, which could be used to provide a
 free service to users with a limited number of tokens. Arcjet also supports
 adding custom characteristics so you could use a user ID to track authenticated
 users instead. See the `chat_userid` example for an example of this.
*/
import arcjet, { ArcjetRateLimitReason, ArcjetRuleResult, shield, tokenBucket } from "@arcjet/next";
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { promptTokensEstimate } from "openai-chat-tokens";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY,
  characteristics: ["ip.src"], // track requests by IP address
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
    tokenBucket({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only      
      refillRate: 2_000, // fill the bucket up by 2,000 tokens
      interval: "1h", // every hour
      capacity: 5_000, // up to 5,000 tokens
    }),
  ],
});

function nearestLimit(
  current: ArcjetRateLimitReason,
  next: ArcjetRateLimitReason,
) {
  if (current.remaining < next.remaining) {
    return current;
  }

  if (current.remaining > next.remaining) {
    return next;
  }

  // Reaching here means `remaining` is equal so prioritize closest reset
  if (current.reset < next.reset) {
    return current;
  }

  if (current.reset > next.reset) {
    return next;
  }

  // Reaching here means that `remaining` and `reset` are equal, so prioritize
  // the smallest `max`
  if (current.max < next.max) {
    return current;
  }

  // All else equal, just return the next item in the list
  return next;
}

function reduceNearestLimit(currentNearest: ArcjetRateLimitReason | undefined, rule: ArcjetRuleResult) {
  if (rule.reason.isRateLimit()) {
    if (typeof currentNearest !== "undefined") {
      return nearestLimit(currentNearest, rule.reason);
    } else {
      return rule.reason;
    }
  } else {
    return currentNearest;
  }
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Edge runtime allows for streaming responses
export const runtime = "edge";

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Estimate the number of tokens required to process the request
  const estimate = promptTokensEstimate({
    messages,
  });

  console.log("Token estimate", estimate);

  // Withdraw tokens from the token bucket
  const decision = await aj.protect(req, { requested: estimate });
  console.log("Arcjet decision", decision.conclusion);

  // We need to find the nearest rate limit, because multiple rate limit rules could be defined
  const nearestRateLimit = decision.results.reduce<ArcjetRateLimitReason | undefined>(reduceNearestLimit, undefined)

  if (typeof nearestRateLimit !== "undefined") {
    console.log("Requests remaining", nearestRateLimit.remaining);
  }

  // If the request is denied, return a 429
  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return new Response("Too Many Requests", {
        status: 429,
      });
    } else {
      return new Response("Forbidden", {
        status: 403,
      });
    }
  }

  // If the request is allowed, continue to use OpenAI
  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
  });

  return result.toDataStreamResponse();
}

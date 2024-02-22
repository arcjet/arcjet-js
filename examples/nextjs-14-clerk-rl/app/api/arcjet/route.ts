import arcjet, { ArcjetDecision, tokenBucket } from "@arcjet/next";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs";

// The root Arcjet client is created outside of the handler.
const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [],
});

export async function GET(req: Request) {
  // Get the current user from Clerk
  // See https://clerk.com/docs/references/nextjs/current-user
  const user = await currentUser();

  let decision: ArcjetDecision;
  if (user) {
    // Allow higher limits for signed in users.
    const rl = aj.withRule(
      // Create a token bucket rate limit. Fixed and sliding window rate limits
      // are also supported. See https://docs.arcjet.com/rate-limiting/algorithms
      tokenBucket({
        mode: "LIVE", // will block requests at the limit. Use "DRY_RUN" to log only
        // Rate limit based on the Clerk userId
        // See https://clerk.com/docs/references/nextjs/authentication-object
        // See https://docs.arcjet.com/rate-limiting/configuration#characteristics
        characteristics: ["userId"],
        refillRate: 20, // refill 20 tokens per interval
        interval: 10, // refill every 10 seconds
        capacity: 100, // bucket maximum capacity of 100 tokens
      })
    );

    // Deduct 5 tokens from the token bucket
    decision = await rl.protect(req, { userId: user.id, requested: 5 } );
  } else {
    // Limit the amount of requests for anonymous users.
    const rl = aj.withRule(
      // Create a token bucket rate limit. Fixed and sliding window rate limits
      // are also supported. See https://docs.arcjet.com/rate-limiting/algorithms
      tokenBucket({
        mode: "LIVE", // will block requests at the limit. Use "DRY_RUN" to log only
        // Use the built in ip.src characteristic
        // See https://docs.arcjet.com/rate-limiting/configuration#characteristics
        characteristics: ["ip.src"],
        refillRate: 5, // refill 5 tokens per interval
        interval: 10, // refill every 10 seconds
        capacity: 10, // bucket maximum capacity of 10 tokens
      })
    );

    // Deduct 5 tokens from the token bucket
    decision = await rl.protect(req, { requested: 5 })
  }

  if (decision.isDenied()) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        reason: decision.reason,
      },
      {
        status: 429,
      }
    );
  }

  return NextResponse.json({ message: "Hello World" });
}

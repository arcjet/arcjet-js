import arcjet, { ArcjetDecision, tokenBucket, shield } from "@arcjet/next";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// The root Arcjet client is created outside of the handler.
const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
});

export async function GET(req: Request) {
  // Get the current user from Clerk
  // See https://clerk.com/docs/references/nextjs/current-user
  const user = await currentUser();

  let decision: ArcjetDecision;
  if (user) {
    // Allow higher limits for signed in users.
    const rl = aj.withRule(
      // Create a token bucket rate limit. Other algorithms are supported.
      tokenBucket({
        mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
        characteristics: ["userId"], // Rate limit based on the Clerk userId
        refillRate: 20, // refill 20 tokens per interval
        interval: 10, // refill every 10 seconds
        capacity: 100, // bucket maximum capacity of 100 tokens
      })
    );

    // Deduct 5 tokens from the token bucket
    decision = await rl.protect(req, { userId: user.id, requested: 5 });
  } else {
    // Limit the amount of requests for anonymous users.
    const rl = aj.withRule(
      // Create a token bucket rate limit. Other algorithms are supported.
      tokenBucket({
        mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
        characteristics: ["ip.src"], // Use the built in ip.src characteristic
        refillRate: 5, // refill 5 tokens per interval
        interval: 10, // refill every 10 seconds
        capacity: 10, // bucket maximum capacity of 10 tokens
      })
    );

    // Deduct 5 tokens from the token bucket
    decision = await rl.protect(req, { requested: 5 });
  }

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          reason: decision.reason,
        },
        {
          status: 429,
        }
      );
    } else {
      // Detected a bot
      return NextResponse.json(
        {
          error: "Forbidden",
          reason: decision.reason,
        },
        {
          status: 403,
        }
      );
    }
  }

  return NextResponse.json({ message: "Hello World" });
}

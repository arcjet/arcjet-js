/**
 * Testing this route requires a Clerk user JWT token passed in the
 * Authorization header.
 *
 * `curl -v http://localhost:3000/api/private -H "Authorization: Bearer TOKENHERE"`
 *
 * Get the token from the /api/token route.
 */
import arcjet, { tokenBucket } from "@arcjet/next";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs";

// The arcjet instance is created outside of the handler
const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [
    // Create a token bucket rate limit. Fixed and sliding window rate limits
    // are also supported. See https://docs.arcjet.com/rate-limiting/algorithms
    tokenBucket({
      mode: "LIVE", // will block requests at the limit. Use "DRY_RUN" to log only
      // Rate limit based on the Clerk userId
      // See https://clerk.com/docs/references/nextjs/authentication-object
      // See https://docs.arcjet.com/rate-limiting/configuration#characteristics
      characteristics: ["userId"],
      refillRate: 5, // refill 5 tokens per interval
      interval: 10, // refill every 10 seconds
      capacity: 10, // bucket maximum capacity of 10 tokens
    }),
  ],
});

export async function GET(req: Request) {
  // Get the current user from Clerk
  // See https://clerk.com/docs/references/nextjs/current-user
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Deduct 5 tokens from the user's bucket
  const decision = await aj.protect(req, { userId: user.id, requested: 5 });

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
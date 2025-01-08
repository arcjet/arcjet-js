import arcjet, { ArcjetDecision, tokenBucket, shield, ArcjetRateLimitReason, ArcjetReason, ArcjetRuleResult } from "@arcjet/next";
import format from "@arcjet/sprintf";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import ip from "@arcjet/ip";

// The root Arcjet client is created outside of the handler.
const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  // We specify a custom fingerprint so we can dynamically build it within each
  // demo route.
  characteristics: ["fingerprint"],
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
});

function extractReason(result: ArcjetRuleResult): ArcjetReason {
  return result.reason;
}

function isRateLimitReason(
  reason?: ArcjetReason,
): reason is ArcjetRateLimitReason {
  return typeof reason !== "undefined" && reason.isRateLimit();
}

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

export async function GET(req: NextRequest) {
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
        refillRate: 20, // refill 20 tokens per interval
        interval: 10, // refill every 10 seconds
        capacity: 100, // bucket maximum capacity of 100 tokens
      })
    );

    const fingerprint = user.id; // Use the user ID as the fingerprint

    // Deduct 5 tokens from the token bucket
    decision = await rl.protect(req, { fingerprint, requested: 5 });
  } else {
    // Limit the amount of requests for anonymous users.
    const rl = aj.withRule(
      // Create a token bucket rate limit. Other algorithms are supported.
      tokenBucket({
        mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
        refillRate: 5, // refill 5 tokens per interval
        interval: 10, // refill every 10 seconds
        capacity: 10, // bucket maximum capacity of 10 tokens
      })
    );

    const fingerprint = ip(req) || "127.0.0.1"; // Fall back to local IP if none

    // Deduct 5 tokens from the token bucket
    decision = await rl.protect(req, { fingerprint, requested: 5 });
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
    }
  }

  let reset: Date | undefined;
  let remaining: number | undefined;

  const rateLimitReasons = decision.results
    .map(extractReason)
    .filter(isRateLimitReason);

  if (rateLimitReasons.length > 0) {
    const policies = new Map<number, number>();
    for (const reason of rateLimitReasons) {
      if (policies.has(reason.max)) {
        console.error(
          "Invalid rate limit policy—two policies should not share the same limit",
        );
      }

      if (
        typeof reason.max !== "number" ||
        typeof reason.window !== "number" ||
        typeof reason.remaining !== "number" ||
        typeof reason.reset !== "number"
      ) {
        console.error(format("Invalid rate limit encountered: %o", reason));
      }

      policies.set(reason.max, reason.window);
    }

    const rl = rateLimitReasons.reduce(nearestLimit);

    reset = rl.resetTime;
    remaining = rl.remaining;
  }

  return NextResponse.json({ message: "Hello World", reset, remaining });
}

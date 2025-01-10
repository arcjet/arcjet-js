import arcjet, { ArcjetDecision, tokenBucket, shield, ArcjetRateLimitReason, ArcjetReason, ArcjetRuleResult, Arcjet } from "@arcjet/next";
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

  // We need to find the nearest rate limit, because multiple rate limit rules could be defined
  const nearestRateLimit = decision.results.reduce<ArcjetRateLimitReason | undefined>(reduceNearestLimit, undefined)

  let reset: Date | undefined;
  let remaining: number | undefined;
  if (typeof nearestRateLimit !== "undefined") {
    reset = nearestRateLimit.resetTime;
    remaining = nearestRateLimit.remaining;
  }

  return NextResponse.json({ message: "Hello World", reset, remaining });
}

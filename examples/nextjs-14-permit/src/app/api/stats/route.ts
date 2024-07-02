import { NextRequest, NextResponse } from "next/server";
import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/next";
import { currentUser } from "@clerk/nextjs/server";
import { Permit } from "permitio";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  // Define a global characteristic that we can use to identify users
  characteristics: ["fingerprint"],
  rules: [
    // Shield detects suspicious behavior, such as SQL injection and cross-site
    // scripting attacks. We want to ru nit on every request
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
});

const permit = new Permit({
  pdp: process.env.PERMIT_PDP!,
  token: process.env.PERMIT_TOKEN!,
});

// Returns ad-hoc rules depending on whether the user is logged in, and if they
// are, whether they have permission to update stats.
async function getClient() {
  // If the user is not logged in then give them a low rate limit
  const user = await currentUser();
  if (!user) {
    return aj
      .withRule(
        slidingWindow({
          mode: "LIVE",
          max: 5,
          interval: 60,
        })
      )
      .withRule(
        detectBot({
          mode: "LIVE",
          block: ["AUTOMATED"],
        })
      );
  }

  // If the user is logged in but does not have permission to update stats
  // then give them a medium rate limit.
  const canUpdate = await permit.check(user.id, "update", "stats");
  if (!canUpdate) {
    return aj.withRule(
      slidingWindow({
        mode: "LIVE",
        max: 10,
        interval: 60,
      })
    );
  }

  // User is logged in and has permission to update stats, so give them no rate limit
  return aj;
}

export async function GET(req: NextRequest) {
  // Get the user's ID if they are logged in, otherwise use their IP address as a fingerprint
  const user = await currentUser();
  const fingerprint: string | number = user ? user.id : req.ip;

  // Get the Arcjet client and request a decision
  const aj = await getClient();
  const decision = await aj.protect(req, { fingerprint: fingerprint });

  // If the decision is denied then return an error response
  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json(
        { error: "Too Many Requests", reason: decision.reason },
        { status: 429 }
      );
    } else {
      return NextResponse.json(
        { error: "Suspicious Activity Detected", reason: decision.reason },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({
    stats: {
      title: "Pizza Topping Orders",
      week: "2024-06-10",
      total_orders: 150,
      toppings: [
        { name: "baked beans", orders: 10 },
        { name: "black pudding", orders: 5 },
        { name: "haggis", orders: 6 },
        { name: "kimchi", orders: 8 },
        { name: "marmite", orders: 4 },
        { name: "spam", orders: 20 },
        { name: "vegemite", orders: 60 },
      ],
    },
    reason: decision.reason,
  });
}

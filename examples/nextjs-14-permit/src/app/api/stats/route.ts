import { NextRequest, NextResponse } from "next/server";
import { detectBot, slidingWindow } from "@arcjet/next";
import { currentUser } from "@clerk/nextjs/server";
import { aj } from "@/lib/arcjet";
import { permit } from "@/lib/permit";
import { getLastFriday } from "@/lib/dateHelper";
import { getOrderCount, getToppings } from "@/data/stats";

// Returns ad-hoc rules depending on whether the user is logged in, and if they
// are, whether they have permission to update stats.
async function getClient() {
  // If the user is not logged in then give them a low rate limit
  const user = await currentUser();
  if (!user) {
    return (
      aj
        // Add a sliding window rule to limit the number of requests to 5 per minute
        .withRule(slidingWindow({ mode: "LIVE", max: 5, interval: 60 }))
        // Add bot detection to block automated requests
        .withRule(detectBot({ mode: "LIVE", block: ["AUTOMATED"] }))
    );
  }

  // If the user is logged in but does not have permission to update stats
  // then give them a medium rate limit.
  const canUpdate = await permit.check(user.id, "update", "stats");
  if (!canUpdate) {
    return aj.withRule(
      // Add a sliding window rule to limit the number of requests to 10 per minute
      slidingWindow({ mode: "LIVE", max: 10, interval: 60 })
    );
  }

  // User is logged in and has permission to update stats, so give them no rate limit
  return aj;
}

export async function GET(req: NextRequest) {
  // Get the user's ID if they are logged in, otherwise use their IP address as a fingerprint
  const user = await currentUser();
  const fingerprint: string = user ? user.id : req.ip!;

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

  // Get rate limit information from the decision to return to the client
  let ratelimitData = null;
  for (const result of decision.results) {
    console.log("Results", ratelimitData);
    if (result.reason.isRateLimit()) {
      ratelimitData = result.reason;
    }
  }
  if (!ratelimitData) {
    ratelimitData = {};
  }

  return NextResponse.json({
    stats: {
      title: "Pizza Topping Orders",
      week: getLastFriday(),
      total_orders: getOrderCount(),
      toppings: getToppings(),
    },
    ratelimitData,
  });
}

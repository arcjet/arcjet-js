import { NextResponse } from "next/server";
import { detectBot, slidingWindow } from "@arcjet/next";
import { currentUser } from "@clerk/nextjs/server";
import { aj } from "@/lib/arcjet";
import { permit } from "@/lib/permit";

export async function GET(req: Request) {
  let user = await currentUser();
  if (!user) {
    return NextResponse.json({ canUpdate: false });
  }

  const decision = await aj
    // Add a sliding window rule to limit the number of requests to 2 per second
    .withRule(slidingWindow({ mode: "LIVE", max: 2, interval: 1 }))
    // Add bot detection to block automated requests
    .withRule(detectBot({ mode: "LIVE", block: ["AUTOMATED"] }))
    // Request a decision from Arcjet with the user's ID as a fingerprint
    .protect(req, { fingerprint: user.id });

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

  // Check with Permit.io if the user has permission to update stats
  const canUpdate = await permit.check(user.id, "update", "stats");

  return NextResponse.json({ canUpdate });
}

import { NextResponse } from "next/server";
import { detectBot, slidingWindow } from "@arcjet/next";
import { currentUser } from "@clerk/nextjs/server";
import { arcjet } from "@/lib/arcjet";
import { permit } from "@/lib/permit";

const aj = arcjet
    // Add a sliding window to limit requests to 2 per second
    .withRule(slidingWindow({ mode: "LIVE", max: 2, interval: 1 }))
    // Add detection to block all detected bots
    .withRule(detectBot({ mode: "LIVE", allow: [] }));

export async function GET(req: Request) {
  let user = await currentUser();
  if (!user) {
    return NextResponse.json({ canUpdate: false });
  }

  // Request a decision from Arcjet with the user's ID as a fingerprint
  const decision = await aj.protect(req, { fingerprint: user.id });

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

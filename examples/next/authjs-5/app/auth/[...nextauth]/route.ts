import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/next";
import { handlers } from "auth";
import { NextRequest, NextResponse } from "next/server";

const aj = arcjet({
    key: process.env.ARCJET_KEY,
    rules: [
      shield({
        mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      }),
      slidingWindow({
        mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
        interval: 60, // tracks requests across a 60 second sliding window
        max: 10, // allow a maximum of 10 requests
      }),
      detectBot({
        mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
        allow: [], // blocks all detected bots
      }),
    ],
});

// Protect the sensitive actions e.g. login, signup, etc with Arcjet
const ajProtectedPOST = async (req: NextRequest) => {
  const decision = await aj.protect(req);
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return handlers.POST(req);
};

// You could also protect the GET handler, but these tend to be less sensitive
// so it's not always necessary
const GET = async (req: NextRequest) => {
    return handlers.GET(req);
}

export { GET, ajProtectedPOST as POST };

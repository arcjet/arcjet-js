// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import arcjet, { fixedWindow, shield, withArcjet } from "@arcjet/next";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  runtime: "edge",
};

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [
    // Protect against common attacks with Arcjet Shield
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
    // Fixed window rate limit. Arcjet also supports sliding window and token
    // bucket.
    fixedWindow({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      // Limiting by ip.src is the default if not specified
      //characteristics: ["ip.src"],
      window: "1m", // 1 min fixed window
      max: 1, // allow a single request (for demo purposes)
    }),
  ],
});

export default withArcjet(aj, async function handler(req: NextRequest) {
  return NextResponse.json({
    message: "Hello world",
  });
});
import arcjet, { fixedWindow } from "@arcjet/next";
import { setRateLimitHeaders } from "@arcjet/decorate";
import { NextResponse } from "next/server";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [
    // Fixed window rate limit. Arcjet also supports sliding window and token
    // bucket.
    fixedWindow({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      // Limiting by ip.src is the default if not specified
      //characteristics: ["ip.src"],
      window: "2m", // 2 min fixed window
      max: 1, // allow a single request (for demo purposes)
    }),
  ],
});

export async function GET(req: Request) {
  const decision = await aj.protect(req);

  let response: NextResponse;
  if (decision.isDenied()) {
    response = NextResponse.json(
      {
        error: "Too Many Requests",
        reason: decision.reason,
      },
      {
        status: 429,
      },
    );
  } else {
    response = NextResponse.json({
      message: "Hello World"
    });
  }

  setRateLimitHeaders(response, decision);

  return response;
}

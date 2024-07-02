import { NextResponse } from "next/server";
import arcjet, {
  detectBot,
  shield,
  slidingWindow,
} from "@arcjet/next";
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
    slidingWindow({
      mode: "LIVE",
      max: 2,
      interval: 1,
    }),
    detectBot({
      mode: "LIVE",
      block: ["AUTOMATED"],
    }),
  ],
});

const permit = new Permit({
  pdp: process.env.PERMIT_PDP!,
  token: process.env.PERMIT_TOKEN!,
});

export async function GET(req: Request) {
  let user = await currentUser();
  if (!user) {
    return NextResponse.json({ canUpdate: false });
  }

  const decision = await aj.protect(req, { fingerprint: user.id });

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
    } else {
      return NextResponse.json(
        {
          error: "Suspicious Activity Detected",
          reason: decision.reason,
        },
        {
          status: 403,
        }
      );
    }
  }

  const canUpdate = await permit.check(user.id, "update", "stats");

  return NextResponse.json({ canUpdate });
}

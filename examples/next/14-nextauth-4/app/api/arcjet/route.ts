import ip from "@arcjet/ip";
import arcjet, { ArcjetDecision, tokenBucket, detectBot, shield} from "@arcjet/next";
import { getServerSession } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { NextRequest, NextResponse } from "next/server";

const authOptions = {
  // Configure one or more authentication providers
  // See https://next-auth.js.org/configuration/initialization#route-handlers-app
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
};

// The arcjet instance is created outside of the handler
const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  // We specify a custom fingerprint so we can dynamically build it within each
  // demo route.
  characteristics: ["fingerprint"],
  rules: [
    // Protect against common attacks with Arcjet Shield
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
    detectBot({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      allow: [], // blocks all detected bots
    }),
  ],
});

export async function GET(req: NextRequest, res: Response) {
  // Get the current user from NextAuth
  const session = await getServerSession(authOptions);
  console.log("Session", session)

  let decision: ArcjetDecision;
  if (session && session.user && session.user!.email) {
    // A very simple hash to avoid sending PII to Arcjet. You may wish to add a
  // unique salt prefix to protect against reverse lookups.
  const email = session.user!.email;
  const emailHash = require("crypto")
    .createHash("sha256")
    .update(email)
    .digest("hex");

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

    const fingerprint = emailHash; // Use the email hash as the fingerprint

    // Deduct 5 tokens from the token bucket
    decision = await rl.protect(req, { fingerprint, requested: 5 });
    console.log("Arcjet logged in decision", decision)
  } else {
    const fingerprint = ip(req);

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

    // Deduct 5 tokens from the token bucket
    decision = await rl.protect(req, { fingerprint, requested: 5 });
    console.log("Arcjet logged out decision", decision)
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
    } else {
      // Detected a bot
      return NextResponse.json(
        {
          error: "Forbidden",
          reason: decision.reason,
        },
        {
          status: 403,
        }
      );
    }
  }

  return NextResponse.json({ message: "Hello World" });
}
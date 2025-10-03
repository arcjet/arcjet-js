// This example is for NextAuth 4, the current stable version
import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/next";
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { NextResponse } from "next/server";

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

const handler = NextAuth(authOptions);

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    // Protect against common attacks with Arcjet Shield
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

const ajProtectedPOST = async (req: Request, res: Response) => {
  // Protect with Arcjet
  const decision = await aj.protect(req);
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  // Then call the original handler
  return handler(req, res);
};

export { handler as GET, ajProtectedPOST as POST };

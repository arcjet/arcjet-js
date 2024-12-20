import arcjet, { validateEmail, createRemoteClient } from "@arcjet/next";
import { NextResponse } from "next/server";

const client = createRemoteClient({
  timeout: 10,
});

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [
    validateEmail({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      deny: ["NO_MX_RECORDS"], // block email addresses with no MX records
      // Alternatively, you can specify a list of email types to allow.
      // This will block all others.
      // allow: ['FREE'],
    }),
  ],
  client,
});

export async function GET(req: Request) {
  const decision = await aj.protect(req, { email: "test@arcjet.co" });

  if (decision.isDenied()) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        reason: decision.reason,
      },
      {
        status: 429,
      },
    );
  }

  return NextResponse.json({ message: "Hello World" });
}

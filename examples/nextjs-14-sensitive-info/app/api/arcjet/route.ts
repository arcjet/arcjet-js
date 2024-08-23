import arcjet, { sensitiveInfo } from "@arcjet/next";
import { NextResponse } from "next/server";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [
    // Allows email addresses to be submitted and blocks all other types of sensitive information
    sensitiveInfo({
      allow: ["email"], // Will block all sensitive information types other than email.
      // deny: ["credit-card-number", (tokens) => { return new Array(tokens.length).fill("custom") }], // Will block all sensitive information types other than email.
      mode: "LIVE" // Will block requests, use "DRY_RUN" to log only
    })
  ],
});

export async function POST(req: Request) {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    return NextResponse.json(
      {
        error: "Sensitive Information Identified",
        reason: decision.reason,
      },
      {
        status: 400,
      },
    );
  }

  const message = await req.text();
  return NextResponse.json({ message: `You said: ${message}` });
}

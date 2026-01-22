import arcjet, { sensitiveInfo, shield } from "@arcjet/next";
import { NextResponse } from "next/server";

// This function is called by the `sensitiveInfo` rule to perform custom detection on strings.
function detectDash(tokens: string[]): Array<"CONTAINS_DASH" | undefined> {
  return tokens.map((token) => {
    if (token.includes("-")) {
      return "CONTAINS_DASH";
    }
  });
}

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
    // allows all pii entities other than email addresses and those containing a dash character.
    sensitiveInfo({
      // allow: ["EMAIL"], Will block all sensitive information types other than email.
      deny: ["EMAIL", "CONTAINS_DASH"], // Will block email and any custom detected values that "contain dash"
      mode: "LIVE", // Will block requests, use "DRY_RUN" to log only
      detect: detectDash,
      contextWindowSize: 2, // Two tokens will be provided to the custom detect function at a time.
    }),
  ],
});

export async function POST(req: Request) {
  const value = await req.text();
  const decision = await aj.protect(req, { sensitiveInfoValue: value });

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

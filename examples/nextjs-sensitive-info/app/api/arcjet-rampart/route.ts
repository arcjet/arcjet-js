import arcjet, { sensitiveInfo, shield } from "@arcjet/next";
import { rampart } from "@arcjet/sensitive-info-rampart";
import { NextResponse } from "next/server";

// Route handlers that load the on-device model must run on the Node.js runtime.
export const runtime = "nodejs";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
    sensitiveInfo({
      deny: ["EMAIL", "GIVEN_NAME", "SURNAME", "STREET_NAME", "SSN"],
      mode: "LIVE", // Will block requests, use "DRY_RUN" to log only
      // Detect sensitive info with the on-device Rampart NER model instead of
      // the default WebAssembly engine. Everything still runs locally — no data
      // leaves your environment. Omit `backend` to use the default engine.
      backend: rampart(),
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

  return NextResponse.json({ message: `You said: ${value}` });
}

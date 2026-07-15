import { launchArcjet, localDetectSensitiveInfo } from "@arcjet/guard";
import { rampart } from "@arcjet/sensitive-info-rampart";
import { NextResponse } from "next/server";

// The Rampart backend loads a native ONNX model, so this route must run on the
// Node.js runtime rather than the Edge runtime.
export const runtime = "nodejs";

// Create the guard client once at module scope and reuse it across requests.
// `@arcjet/guard` never reads environment variables directly, so the key is
// passed explicitly.
const arcjet = launchArcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
});

// Configure the rule once at module scope. Detection runs locally — only a
// SHA-256 hash of the text is sent to Arcjet, never the raw content.
const sensitiveInfo = localDetectSensitiveInfo({
  deny: ["EMAIL", "GIVEN_NAME", "SURNAME", "STREET_NAME", "SSN"],
  mode: "LIVE", // Will block, use "DRY_RUN" to log only.
  // Detect additional entity types with the on-device Rampart NER model.
  // Omit `backend` to use the default WebAssembly engine, which detects
  // EMAIL, PHONE_NUMBER, IP_ADDRESS, and CREDIT_CARD_NUMBER.
  backend: rampart(),
});

export async function POST(req: Request) {
  const value = await req.text();

  const decision = await arcjet.guard({
    label: "api.sensitive-info",
    rules: [sensitiveInfo(value)],
  });

  if (decision.conclusion === "DENY" && decision.reason === "SENSITIVE_INFO") {
    const denied = sensitiveInfo.deniedResult(decision);
    return NextResponse.json(
      {
        error: "Sensitive Information Identified",
        reason: decision.reason,
        detectedEntityTypes: denied?.detectedEntityTypes ?? [],
      },
      {
        status: 400,
      },
    );
  }

  return NextResponse.json({ message: `You said: ${value}` });
}

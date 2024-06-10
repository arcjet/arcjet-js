import arcjet, {
  validateEmail,
  createNextRemoteClient,
} from "@arcjet/next";
import { baseUrl } from "@arcjet/env";
import { NextResponse } from "next/server";

const client = createNextRemoteClient({
  baseUrl: baseUrl(process.env),
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
      block: ["NO_MX_RECORDS"], // block email addresses with no MX records
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
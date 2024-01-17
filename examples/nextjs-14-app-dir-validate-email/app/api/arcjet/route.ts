import arcjet, { validateEmail } from "@arcjet/next";
import { NextResponse } from "next/server";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.AJ_KEY!,
  rules: [
    validateEmail({
      mode: "LIVE",
      block: ["NO_MX_RECORDS"],
    }),
  ],
});

export async function GET(req: Request) {
  const decision = await aj.protect(req, {
    email: "test@arcjet.co",
  });

  if (decision.isDenied()) {
    return NextResponse.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      },
    );
  }

  return NextResponse.json({
    message: "Hello world",
  });
}
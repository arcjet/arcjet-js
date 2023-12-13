import arcjet, { rateLimit } from "@arcjet/next";
import { NextResponse } from "next/server";

const aj = arcjet({
  key: "ajkey_yourkey",
  rules: [
    rateLimit({
      mode: "LIVE",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
      timeout: "10m",
    }),
  ],
});

export async function GET(req: Request) {
  const decision = await aj.protect(req);

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

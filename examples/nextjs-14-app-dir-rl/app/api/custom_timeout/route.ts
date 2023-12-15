import arcjet, {
  validateEmail,
  createNextRemoteClient,
  defaultBaseUrl,
} from "@arcjet/next";
import { NextResponse } from "next/server";

const client = createNextRemoteClient({
  baseUrl: defaultBaseUrl(),
  timeout: 10,
});

const aj = arcjet({
  key: "ajkey_yourkey",
  rules: [
    validateEmail({
      mode: "LIVE",
      block: ["NO_MX_RECORDS"],
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

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import arcjet, { rateLimit, withArcjet } from "@arcjet/next";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  runtime: "edge",
};

const aj = arcjet({
  // mark
  key: "ajkey_yourkey",
  rules: [
    rateLimit({
      mode: "LIVE",
      // Limiting by ip.src is the default if not specified
      //characteristics: ["ip.src"],
      window: "1m",
      max: 1,
      timeout: "10m",
    }),
  ],
});

export default withArcjet(aj, async function handler(req: NextRequest) {
  return NextResponse.json({
    message: "Hello world",
  });
});

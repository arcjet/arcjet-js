import arcjet, { createMiddleware, shield } from "@arcjet/next";
import pino from "pino";

export const config = {
  runtime: "nodejs",
  // matcher tells Next.js which routes to run the middleware on
  matcher: ["/"],
};

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [
    // Protect against common attacks with Arcjet Shield
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
  log: pino({ level: "debug" })
});

export default createMiddleware(aj);

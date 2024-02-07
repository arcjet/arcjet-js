import arcjet, { createMiddleware } from "@arcjet/next";

export const config = {
  // matcher tells Next.js which routes to run the middleware on
  matcher: ["/"],
};

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [],
});

export default createMiddleware(aj);
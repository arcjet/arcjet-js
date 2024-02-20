import { authMiddleware } from "@clerk/nextjs";
import arcjet, { createMiddleware } from "@arcjet/next";

export const config = {
  // Protects all routes, including api/trpc.
  // See https://clerk.com/docs/references/nextjs/auth-middleware
  // for more information about configuring your Middleware
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
 
const clerkMiddleware = authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: ["/"],
  apiRoutes: ["/api/private"],
});

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  // No rules are required for Arcjet Shield - it runs on every request.
  // You can also add other rules, such as bot protection, here.
  rules: [],
});

// Clerk middleware will run after the Arcjet middleware. You could also use
// Clerk's beforeAuth options to run Arcjet first. See
// https://clerk.com/docs/references/nextjs/auth-middleware#use-before-auth-to-execute-middleware-before-authentication
export default createMiddleware(aj, clerkMiddleware);
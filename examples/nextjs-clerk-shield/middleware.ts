import arcjet, { shield } from "@arcjet/next";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const config = {
  // Protects all routes, including api/trpc.
  // See https://clerk.com/docs/references/nextjs/clerk-middleware
  // for more information about configuring your Middleware
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
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
});

const isProtectedRoute = createRouteMatcher(["/api/private"]);

// Arcjet runs first to protect all routes defined in the matcher config above.
// Then if the request is allowed, Clerk runs
export default clerkMiddleware(async (auth, req) => {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});
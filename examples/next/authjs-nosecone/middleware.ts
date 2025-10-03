import { type Options, createMiddleware, defaults } from "@nosecone/next";
import { auth } from "auth";

// Nosecone security headers configuration
// https://docs.arcjet.com/nosecone/quick-start
const noseconeOptions: Options = {
  ...defaults,
};

const securityHeaders = createMiddleware(noseconeOptions);

export default auth(async (req) => {
  if (!req.auth && !req.nextUrl.pathname.startsWith("/auth")) {
    const newUrl = new URL("/auth/signin", req.nextUrl.origin)
    return Response.redirect(newUrl)
  }

  return securityHeaders();
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
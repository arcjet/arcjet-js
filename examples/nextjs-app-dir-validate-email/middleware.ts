import { createMiddleware } from "@nosecone/next";

export const config = {
  // matcher tells Next.js which routes to run the middleware on
  matcher: ["/(.*)"],
};

export default createMiddleware();

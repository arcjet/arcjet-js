import { createMiddleware, rateLimit } from "@arcjet/next";
export const config = {
  // matcher tells Next.js which routes to run the middleware on
  matcher: ["/"],
};
const middleware = createMiddleware({
  key: "ajkey_yourkey",
  rules: [],
});
export default middleware;

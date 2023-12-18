import arcjet, { createMiddleware } from "@arcjet/next";

export const config = {
  // matcher tells Next.js which routes to run the middleware on
  matcher: ["/"],
};

const aj = arcjet({
  key: "ajkey_yourkey",
  rules: [],
});

export default createMiddleware(aj);

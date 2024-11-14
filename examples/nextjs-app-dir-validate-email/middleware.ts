import nosecone from "nosecone";

export const config = {
  // matcher tells Next.js which routes to run the middleware on
  matcher: ["/(.*)"],
};

export default nosecone({ env: process.env.NODE_ENV });

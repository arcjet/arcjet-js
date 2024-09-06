import arcjet, { shield, tokenBucket } from "@arcjet/bun";

const aj = arcjet({
  key: Bun.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  // We specify a custom fingerprint so we can dynamically build it within each
  // demo route.
  characteristics: ["userId"],
  rules: [
    // Shield protects your app from common attacks like SQL injection
    shield({ mode: "LIVE" }),
    // Create a token bucket rate limit. Other algorithms are supported.
    tokenBucket({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only      
      refillRate: 5, // refill 5 tokens per interval
      interval: 10, // refill every 10 seconds
      capacity: 10, // bucket maximum capacity of 10 tokens
    }),
  ],
});

// Exporting a server
export default {
  port: 3000,
  fetch: aj.handler(async (req) => {
    const userId = "user123"; // Replace with your authenticated user ID
    const decision = await aj.protect(req, { userId, requested: 5 }); // Deduct 5 tokens from the bucket
    console.log("Arcjet request ID", decision.id);
    console.log("Arcjet decision", decision.conclusion);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return new Response("Too many requests", { status: 429 });
      } else {
        return new Response("Forbidden", { status: 403 });
      }
    }

    return new Response("Hello world");
  }),
};

// Or using the `Bun.serve()` API
/*
const server = Bun.serve({
  port: 3000,
  fetch: aj.handler(async (req) => {
    const userId = "user123"; // Replace with your authenticated user ID
    const decision = await aj.protect(req, { userId, requested: 5 }); // Deduct 5 tokens from the bucket
    console.log("Arcjet request ID", decision.id);
    console.log("Arcjet decision", decision.conclusion);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return new Response("Too many requests", { status: 429 });
      } else {
        return new Response("Forbidden", { status: 403 });
      }
    }

    return new Response("Hello world");
  }),
});

console.log(`Listening on ${server.url}`);
*/
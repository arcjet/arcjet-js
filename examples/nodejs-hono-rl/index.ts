import arcjet, { shield, tokenBucket } from "@arcjet/node";
import { serve, type HttpBindings } from "@hono/node-server";
import { Hono } from "hono";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  characteristics: ["userId"], // track requests by a custom user ID
  rules: [
    // Protect against common attacks with Arcjet Shield
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
    // Create a token bucket rate limit. Other algorithms are supported.
    tokenBucket({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only      
      refillRate: 5, // refill 5 tokens per interval
      interval: 10, // refill every 10 seconds
      capacity: 10, // bucket maximum capacity of 10 tokens
    }),
  ],
});

const app = new Hono<{ Bindings: HttpBindings }>();

app.get("/", async (c) => {
  const userId = "user123"; // Replace with your authenticated user ID

  const decision = await aj.protect(c.env.incoming, { userId, requested: 9 }); // Deduct 9 tokens from the bucket

  if (decision.isDenied()) {
    return c.json({ error: "Too Many Requests" }, 429);
  }

  return c.json({ message: "Hello Hono!" });
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
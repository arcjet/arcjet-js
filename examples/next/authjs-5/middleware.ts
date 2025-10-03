import arcjet, { shield, tokenBucket } from "@arcjet/next";
import { auth } from "auth";

const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
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

// A very simple hash to avoid sending PII to Arcjet. You may wish to add a
// unique salt prefix to protect against reverse lookups. Uses WebCrypto because
// crypto is not available in the Edge Runtime which is what middleware runs as
async function getEmailHash(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash)); 
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); 
  return hashHex;
}

export default auth(async (req) => {
  if (req.auth) {
    console.log("User:", req.auth.user);
    
    // If there is a user ID then use it, otherwise use the email
    let userId: string;
    if (req.auth.user?.id) {
      userId = req.auth.user.id;
    } else if (req.auth.user?.email) {
      const email = req.auth.user!.email;
      const emailHash = await getEmailHash(email);
      userId = emailHash;
    } else {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Deduct 2 tokens from the token bucket
    const decision = await aj.protect(req, { userId, requested: 2 });
    console.log("Arcjet Decision:", decision);

    if (decision.isDenied()) {
      return Response.json(
        {
          error: "Too Many Requests",
          reason: decision.reason,
        },
        {
          status: 429,
        },
      );
    }
  } else {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }
})

// Read more: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: ["/middleware-example"],
}
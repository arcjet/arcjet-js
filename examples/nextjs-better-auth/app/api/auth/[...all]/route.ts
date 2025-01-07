import { auth } from "@/auth";
import ip from "@arcjet/ip";
import arcjet, { shield, tokenBucket } from "@arcjet/next";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

// The arcjet instance is created outside of the handler
const aj = arcjet({
    key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
    characteristics: ["userId"],
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

const betterAuthHandlers = toNextJsHandler(auth.handler);

const ajProtectedPOST = async (req: NextRequest) => {
    const session = await auth.api.getSession({
        headers: await req.headers,
    })

    // If the user is logged in we'll use their ID as the identifier. This
    // allows limits to be applied across all devices and sessions (you could
    // also use the session ID). Otherwise, fall back to the IP address.
    let userId: string;
    if (session?.user.id) {
        userId = session.user.id;
    } else {
        userId = ip(req) || "127.0.0.1"; // Fall back to local IP if none
    }

    // Deduct 5 tokens from the token bucket
    const decision = await aj.protect(req, { userId, requested: 5 });

    console.log("Arcjet Decision:", decision);

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            return Response.json(
                {
                    error: "Rate Limit Exceeded",
                    reason: decision.reason,
                },
                {
                    status: 429,
                }
            );
        } else {
            return Response.json(
                {
                    error: "Forbidden",
                    reason: decision.reason,
                },
                {
                    status: 403,
                }
            );
        }
    } else {
        return betterAuthHandlers.POST(req);
    }
}

export { ajProtectedPOST as POST };
export const { GET } = betterAuthHandlers;
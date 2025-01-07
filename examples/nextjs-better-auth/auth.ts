// We recommend implementing Arcjet here as a hook. However, you can also
// implement it in the route handler at app/api/auth/[...all]/route.ts. Pick one
// and delete the other so you don't have duplicate protections.

import arcjet, { detectBot, protectSignup, request, shield, slidingWindow, type ArcjetDecision } from "@arcjet/next";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import Database from "better-sqlite3";

// The arcjet instance is created outside of the handler
const aj = arcjet({
    key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
    characteristics: ["userId"],
    rules: [
        // Protect against common attacks with Arcjet Shield. Other rules are
        // added dynamically using `withRule`.
        shield({
            mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
        }),
    ],
});

export const auth = betterAuth({
    database: new Database("./sqlite.db"),
    emailAndPassword: {
        enabled: true
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }
    },
    hooks: {
        // Run on every auth request
        before: createAuthMiddleware(async (ctx) => {
            let decision: ArcjetDecision;
            const req = await request(); // Gets the request object

            // If the user is logged in we'll use their ID as the identifier. This
            // allows limits to be applied across all devices and sessions (you could
            // also use the session ID). Otherwise, fall back to the IP address.
            let userId: string;
            if (ctx.context.session?.user.id) {
                userId = ctx.context.session?.user.id;
            } else {
                userId = req.ip || "127.0.0.1"; // Fall back to local IP if none
            }

            // If this is a signup then use the special protectSignup rule
            // See https://docs.arcjet.com/signup-protection/quick-start
            if (ctx.path.startsWith("/sign-up")) {
                // If the email is in the body of the request then we can run
                // the email validation checks as well. See
                // https://www.better-auth.com/docs/concepts/hooks#example-enforce-email-domain-restriction
                if (ctx.body?.email) {
                    decision = await aj.withRule(
                        protectSignup({
                            email: {
                                mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
                                // Block emails that are disposable, invalid, or have no MX records
                                block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
                            },
                            bots: {
                                mode: "LIVE",
                                // configured with a list of bots to allow from
                                // https://arcjet.com/bot-list
                                allow: [], // prevents bots from submitting the form
                            },
                            // It would be unusual for a form to be submitted more than 5 times in 10
                            // minutes from the same IP address
                            rateLimit: {
                                // uses a sliding window rate limit
                                mode: "LIVE",
                                interval: "2m", // counts requests over a 10 minute sliding window
                                max: 5, // allows 5 submissions within the window
                            },
                        })).protect(req, { email: ctx.body.email, userId });
                } else {
                    // Otherwise use rate limit and detect bot
                    decision = await aj.withRule(
                        detectBot({
                            mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
                            // configured with a list of bots to allow from
                            // https://arcjet.com/bot-list
                            allow: [], // blocks all automated clients
                        }))
                        .withRule(
                            slidingWindow({
                                mode: "LIVE",
                                interval: "2m", // counts requests over a 1 minute sliding window
                                max: 5, // allows 5 requests within the window
                            }))
                        .protect(req, { userId });
                }
            } else {
                // For all other auth requests
                decision = await aj
                    .withRule(
                        detectBot({
                            mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
                            // configured with a list of bots to allow from
                            // https://arcjet.com/bot-list
                            allow: [], // blocks all automated clients
                        }))
                    .protect(req, { userId });
            }

            console.log("Arcjet Decision:", decision);

            if (decision.isDenied()) {
                if (decision.reason.isRateLimit()) {
                    throw new APIError("TOO_MANY_REQUESTS");
                } else if (decision.reason.isEmail()) {
                    let message: string;

                    if (decision.reason.emailTypes.includes("INVALID")) {
                        message = "Email address format is invalid. Is there a typo?";
                    } else if (decision.reason.emailTypes.includes("DISPOSABLE")) {
                        message = "We do not allow disposable email addresses.";
                    } else if (decision.reason.emailTypes.includes("NO_MX_RECORDS")) {
                        message =
                            "Your email domain does not have an MX record. Is there a typo?";
                    } else {
                        // This is a catch all, but the above should be exhaustive based on the
                        // configured rules.
                        message = "Invalid email.";
                    }

                    throw new APIError("BAD_REQUEST", { message });
                } else {
                    throw new APIError("FORBIDDEN");
                }
            }
        }),
    },
});
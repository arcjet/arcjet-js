import { auth } from "@/auth";
import ip from "@arcjet/ip";
import arcjet, {
  type ArcjetDecision,
  type BotOptions,
  type EmailOptions,
  type ProtectSignupOptions,
  type SlidingWindowRateLimitOptions,
  detectBot,
  protectSignup,
  shield,
  slidingWindow,
} from "@arcjet/next";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

// The arcjet instance is created outside of the handler
const aj = arcjet({
  key: process.env.ARCJET_KEY, // Get your site key from https://app.arcjet.com
  characteristics: ["userId"],
  rules: [
    // Protect against common attacks with Arcjet Shield. Other rules are
    // added dynamically using `withRule`.
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
});

const emailOptions = {
  mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
  // Block emails that are disposable, invalid, or have no MX records
  block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
} satisfies EmailOptions;

const botOptions = {
  mode: "LIVE",
  // configured with a list of bots to allow from
  // https://arcjet.com/bot-list
  allow: [], // prevents bots from submitting the form
} satisfies BotOptions;

const rateLimitOptions = {
  // uses a sliding window rate limit
  mode: "LIVE",
  interval: "2m", // counts requests over a 10 minute sliding window
  max: 5, // allows 5 submissions within the window
} satisfies SlidingWindowRateLimitOptions<[]>;

const signupOptions = {
  email: emailOptions,
  bots: botOptions,
  // It would be unusual for a form to be submitted more than 5 times in 10
  // minutes from the same IP address
  rateLimit: rateLimitOptions,
} satisfies ProtectSignupOptions<[]>;

async function protect(req: NextRequest): Promise<ArcjetDecision> {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  // If the user is logged in we'll use their ID as the identifier. This
  // allows limits to be applied across all devices and sessions (you could
  // also use the session ID). Otherwise, fall back to the IP address.
  let userId: string;
  if (session?.user.id) {
    userId = session.user.id;
  } else {
    userId = ip(req) || "127.0.0.1"; // Fall back to local IP if none
  }

  // If this is a signup then use the special protectSignup rule
  // See https://docs.arcjet.com/signup-protection/quick-start
  if (req.nextUrl.pathname.startsWith("/api/auth/sign-up")) {
    // Better-Auth doesn't clone the body, so we need to clone the request preemptively
    const body = await req.clone().json();

    // If the email is in the body of the request then we can run
    // the email validation checks as well. See
    // https://www.better-auth.com/docs/concepts/hooks#example-enforce-email-domain-restriction
    if (typeof body.email === "string") {
      return aj
        .withRule(protectSignup(signupOptions))
        .protect(req, { email: body.email, userId });
    } else {
      // Otherwise use rate limit and detect bot
      return aj
        .withRule(detectBot(botOptions))
        .withRule(slidingWindow(rateLimitOptions))
        .protect(req, { userId });
    }
  } else {
    // For all other auth requests
    return aj.withRule(detectBot(botOptions)).protect(req, { userId });
  }
}

const authHandlers = toNextJsHandler(auth.handler);

export const { GET } = authHandlers;

// Wrap the POST handler with Arcjet protections
export const POST = async (req: NextRequest) => {
  const decision = await protect(req);

  console.log("Arcjet Decision:", decision);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return new Response(null, { status: 429 });
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

      return Response.json({ message }, { status: 400 });
    } else {
      return new Response(null, { status: 403 });
    }
  }

  return authHandlers.POST(req);
};

import arcjet, { ArcjetRuleResult, botCategories, detectBot } from "@arcjet/next";
import { NextResponse } from "next/server";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: process.env.ARCJET_KEY,
  rules: [
    // Detect bots with the ability to allow or deny subsets
    detectBot({
      mode: "LIVE",
      // explicitly allow bots in the list while denying all others
      allow: [
        // allow any developer tools, such as the curl command
        "CATEGORY:TOOL",
        // allow a single detected bot, such as Vercel's screenshot bot
        "VERCEL_MONITOR_PREVIEW",
        // filter a category to remove individual bots from our provided lists
        ...botCategories["CATEGORY:GOOGLE"].filter((bot) => bot !== "GOOGLE_ADSBOT" && bot !== "GOOGLE_ADSBOT_MOBILE")
      ]
      // deny: [] // explicitly deny bots in the list while allowing all others
    }),
  ],
});

function reduceAllowedBots(bots: string[], rule: ArcjetRuleResult) {
  if (rule.reason.isBot()) {
    return [...bots, ...rule.reason.allowed]
  } else {
    return bots;
  }
}

function reduceDeniedBots(bots: string[], rule: ArcjetRuleResult) {
  if (rule.reason.isBot()) {
    return [...bots, ...rule.reason.denied]
  } else {
    return bots;
  }
}

function checkSpoofed(rule: ArcjetRuleResult) {
  return rule.reason.isBot() && rule.reason.isSpoofed()
}

function collectErrors(errors: string[], rule: ArcjetRuleResult) {
  if (rule.reason.isError()) {
    return [...errors, rule.reason.message];
  } else {
    return errors;
  }
}

export async function GET(req: Request) {
  const decision = await aj.protect(req);

  const errors = decision.results.reduce(collectErrors, []);
  if (errors.length > 0) {
    return NextResponse.json(
      { errors },
      { status: 500, statusText: "Internal Server Error" },
    )
  }

  const allowedBots = decision.results.reduce<string[]>(reduceAllowedBots, []);

  const deniedBots = decision.results.reduce<string[]>(reduceDeniedBots, []);

  const isSpoofed = decision.results.some(checkSpoofed);

  // WARNING: This is illustrative! Don't share this metadata with users;
  // otherwise they may use it to subvert bot detection!
  const headers = new Headers({
    "X-Arcjet-Bot-Allowed": allowedBots.join(", "),
    "X-Arcjet-Bot-Denied": deniedBots.join(", "),
  });
  headers.set("X-Arcjet-Bot-Allowed", allowedBots.join(", "))
  headers.set("X-Arcjet-Bot-Denied", deniedBots.join(", "))

  // We need to check that the bot is who they say they are.
  if (isSpoofed) {
    return NextResponse.json(
      { error: "You are pretending to be a good bot!" },
      { status: 403, headers },
    );
  }

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: "You are a Bot!" },
      { status: 403, headers },
    );
  }

  return NextResponse.json(
    { message: "Hello World" },
    { status: 200, headers }
  );
}

import arcjet, { botCategories, detectBot } from "@arcjet/next";
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

export async function GET(req: Request) {
  const decision = await aj.protect(req);

  if (decision.isErrored()) {
    return NextResponse.json(
      { error: decision.reason.message },
      { status: 500, statusText: "Internal Server Error" },
    )
  }

  const headers = new Headers();
  if (decision.reason.type === "BOT") {
    // WARNING: This is illustrative! Don't share this metadata with users;
    // otherwise they may use it to subvert bot detection!
    headers.set("X-Arcjet-Bot-Allowed", decision.reason.allowed.join(", "))
    headers.set("X-Arcjet-Bot-Denied", decision.reason.denied.join(", "))

    // We need to check that the bot is who they say they are.
    if (decision.reason.isSpoofed()) {
      return NextResponse.json(
        { error: "You are pretending to be a good bot!" },
        { status: 403, headers },
      );
    }
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

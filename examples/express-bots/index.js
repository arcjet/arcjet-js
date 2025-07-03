import arcjet, { detectBot, shield } from "@arcjet/node";
import { isSpoofedBot } from "@arcjet/inspect";
import express from "express";

const app = express();
const port = 3000;

const aj = arcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: process.env.ARCJET_KEY,
  rules: [
    // Protect against common attacks with Arcjet Shield
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
    // Detect bots with the ability to allow or deny subsets
    detectBot({
      mode: "LIVE",
      deny: ["CURL"] // explicitly deny the curl command
      // allow: [] // explicitly allow bots in the list while denying all others
    }),
  ],
});

app.get('/', async (req, res) => {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    // We want to check for disallowed bots
    if (decision.reason.isBot()) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        error: "You are a bot",
      }));
    }

    res.writeHead(403, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      error: "Forbidden",
    }));
  }

  // We need to check that the bot is who they say they are.
  if (decision.results.some(isSpoofedBot)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      error: "You are pretending to be a good bot!",
    }));
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: `Hello world!` }));
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})

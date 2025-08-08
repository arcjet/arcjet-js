import arcjet, { detectBot, shield } from "@arcjet/node";
import { isSpoofedBot } from "@arcjet/inspect";
import express from "express";

const app = express();
const port = 3000;

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const aj = arcjet({
  key: arcjetKey,
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
    if (decision.reason.type === "BOT") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: "You are a bot",
      }));
      return
    }

    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Forbidden",
    }));
    return
  }

  // We need to check that the bot is who they say they are.
  if (decision.results.some(isSpoofedBot)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "You are pretending to be a good bot!",
    }));
    return
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: `Hello world!` }));
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})

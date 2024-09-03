import arcjet, { detectBot, shield } from "@arcjet/node";
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
    detectBot({
      mode: "LIVE",
      deny: ["CURL"]
    }),
  ],
});

app.get('/', async (req, res) => {
  const decision = await aj.protect(req);

  if (decision.isDenied() && decision.reason.isBot()) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "You are a bot",
      detected: decision.reason.denied[0]
    }));
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: `Hello world!` }));
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})

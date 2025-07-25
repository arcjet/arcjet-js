import express from "express";
import arcjet, { detectBot, fixedWindow } from "@arcjet/node";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const aj = arcjet({
  key: arcjetKey,
  rules: [],
});

const app = express();

app.get("/api/low-rate-limit", async (req, res) => {
  const decision = await aj
    // Only inline to self-contain the sample code.
    // Static rules should be defined outside the handler for performance.
    .withRule(fixedWindow({ mode: "LIVE", window: "1s", max: 1 }))
    .protect(req);

  if (decision.isDenied()) {
    res.status(429).json({ error: "rate limited" });
  } else {
    res.json({ hello: "world" });
  }
});

app.get("/api/high-rate-limit", async (req, res) => {
  const decision = await aj
    // Only inline to self-contain the sample code.
    // Static rules should be defined outside the handler for performance.
    .withRule(fixedWindow({ mode: "LIVE", window: "3s", max: 50 }))
    .protect(req);

  if (decision.isDenied()) {
    res.status(429).json({ error: "rate limited" });
  } else {
    res.json({ hello: "world" });
  }
});

app.get("/api/bots", async (req, res) => {
  const decision = await aj
    // Only inline to self-contain the sample code.
    // Static rules should be defined outside the handler for performance.
    .withRule(detectBot({ mode: "LIVE", allow: [] }))
    .protect(req);

  if (decision.isDenied()) {
    res.status(403).json({ error: "bot detected" });
  } else {
    res.json({ hello: "world" });
  }
});

const server = app.listen(8080);

// Export the server close function so we can shut it down in our tests
export const close = server.close.bind(server);

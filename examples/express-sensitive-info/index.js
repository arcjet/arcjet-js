import arcjet, { sensitiveInfo, shield } from "@arcjet/node";
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
    // Fixed window rate limit. Arcjet also supports sliding window and token
    // bucket.
    sensitiveInfo({
      mode: "LIVE",
      deny: ["EMAIL"]
    }),
  ],
});

app.use(express.text());

app.post('/', async (req, res) => {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    if (decision.reason.type === "SENSITIVE_INFO") {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Sensitive Information Detected", denied: decision.reason.denied }));
    }
    res.writeHead(403, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Forbidden" }));
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: `You said: ${req.body}` }));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

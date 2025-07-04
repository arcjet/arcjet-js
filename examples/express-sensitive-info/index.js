import arcjet, { sensitiveInfo, shield } from "@arcjet/node";
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
    if (decision.reason.isSensitiveInfo()) {
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

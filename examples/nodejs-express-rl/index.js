import arcjet, { fixedWindow } from "@arcjet/node";
import express from "express";

const app = express();
const port = 3000;

const aj = arcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: process.env.ARCJET_KEY,
  rules: [
    // Fixed window rate limit. Arcjet also supports sliding window and token
    // bucket.
    fixedWindow({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      // Limiting by ip.src is the default if not specified
      //characteristics: ["ip.src"],
      window: "1m", // 1 min fixed window
      max: 1, // allow a single request (for demo purposes)
    }),
  ],
});

app.get('/', async (req, res) => {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    res.writeHead(429, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Too Many Requests" }));
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Hello World" }));
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
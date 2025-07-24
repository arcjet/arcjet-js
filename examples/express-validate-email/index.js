import arcjet, { shield, validateEmail } from "@arcjet/node";
import express from "express";

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: false }));

const aj = arcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: process.env.ARCJET_KEY,
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
    validateEmail({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      block: ["NO_MX_RECORDS"], // block email addresses with no MX records
    }),
  ],
});

app.post('/', async (req, res) => {
  const decision = await aj.protect(req, {
    email: req.body.email,
  });
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Forbidden" }));
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Hello World", email: req.body.email }));
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
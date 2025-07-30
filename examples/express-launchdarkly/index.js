import express from "express";
import arcjet from "./lib/arcjet.js";

const app = express();
app.get("/", async (req, res) => {
  // Get an instance of Arcjet from our custom module
  const aj = await arcjet();

  // Get a decision from Arcjet for the incoming request
  const decision = await aj.protect(req);

  // If the decision is denied, return an appropriate status code
  if (decision.isDenied()) {
    if (decision.reason.type === "RATE_LIMIT") {
      return res.status(429).send("Too many requests");
    } else {
      return res.status(403).send("Forbidden");
    }
  }

  // If the decision is allowed, return a successful response
  res.send("Hello World!");
});

app.listen(3000, () => {
  console.log("Server started at http://localhost:3000");
});

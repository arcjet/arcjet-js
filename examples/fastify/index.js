import arcjetFastify, { fixedWindow, sensitiveInfo, shield } from "@arcjet/fastify";
import Fastify from "fastify";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error(
    "Cannot find `ARCJET_KEY` environment variable; please set it to an Arcjet key and make sure to run Node with `--env-file .env.local`",
  );
}

const arcjet = arcjetFastify({
  key: arcjetKey,

  rules: [
    // Rate limit with a fixed window.
    // Arcjet also supports other types (sliding window, token bucket).
    // See <https://docs.arcjet.com/rate-limiting/reference/> for more info.
    fixedWindow({
      max: 1, // Allow a single request (for demo purposes).
      mode: "LIVE", // Use `DRY_RUN` instead of `LIVE` to only log.
      window: "1m", // …reset after this duration.
    }),
    // Protect against clients sending sensitive information.
    // See <https://docs.arcjet.com/sensitive-info/reference> for more info.
    sensitiveInfo({
      allow: [], // Disallow all potential sensitive info.
      mode: "LIVE", // Use `DRY_RUN` instead of `LIVE` to only log.
    }),
    // Protect against common attacks.
    // See <https://docs.arcjet.com/shield/reference> for more info.
    shield({
      mode: "LIVE", // Use `DRY_RUN` instead of `LIVE` to only log.
    }),
  ],
});

const fastify = Fastify({ logger: true });

fastify.get("/", async function (request, reply) {
  const decision = await arcjet.protect(request);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return reply
        .status(429)
        .header("Content-Type", "application/json")
        .send({ message: "Too many requests" });
    }

    return reply
      .status(403)
      .header("Content-Type", "application/json")
      .send({ message: "Forbidden" });
  }

  return reply
    .status(200)
    .header("Content-Type", "application/json")
    .send({ message: "Hello world" });
});


fastify.post("/", async function (request, reply) {
  const decision = await arcjet.protect(request);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return reply
        .status(429)
        .header("Content-Type", "application/json")
        .send({ message: "Too many requests" });
    }

    if (decision.reason.isSensitiveInfo()) {
      return reply
        .status(400)
        .header("Content-Type", "application/json")
        .send({ message: "Message contains sensitive info" });
    }

    return reply
      .status(403)
      .header("Content-Type", "application/json")
      .send({ message: "Forbidden" });
  }

  return reply
    .status(200)
    .header("Content-Type", "application/json")
    .send({ message: "Thanks for the submission" });
});

await fastify.listen({ port: 3000 });

import arcjetFastify, { filter } from "@arcjet/fastify";
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
    filter({
      allow: ['not vpn'],
      mode: "LIVE",
    }),
  ],
});

const fastify = Fastify({ logger: true });

fastify.get("/", async function (request, reply) {
  // Overwrite dev IP to one by GH.
  const decision = await arcjet.protect({ ...request, ip: "185.199.108.153" });

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

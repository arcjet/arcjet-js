import arcjet, { shield } from "@arcjet/bun";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = Bun.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const aj = arcjet({
  key: arcjetKey,
  rules: [
    // Shield protects your app from common attacks.
    // Use `DRY_RUN` instead of `LIVE` to only log.
    shield({ mode: "LIVE" }),
  ],
});

export default {
  port: 8000,
  fetch: aj.handler(async function (request: Request) {
    const decision = await aj.protect(request);

    if (decision.isDenied()) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    return Response.json({ message: "Hello world" });
  }),
};

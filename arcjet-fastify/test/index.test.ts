import assert from "node:assert/strict";
import test from "node:test";
import { default as Fastify, type FastifyRequest } from "fastify";
import arcjetFastify, { sensitiveInfo } from "../index.js";

const exampleKey = "ajkey_yourkey";
const oneMegabyte = 1024 * 1024;
let port = 3000;

test("`@arcjet/fastify`", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "ArcjetAllowDecision",
      "ArcjetBotReason",
      "ArcjetChallengeDecision",
      "ArcjetDecision",
      "ArcjetDenyDecision",
      "ArcjetEdgeRuleReason",
      "ArcjetEmailReason",
      "ArcjetErrorDecision",
      "ArcjetErrorReason",
      "ArcjetFilterReason",
      "ArcjetIpDetails",
      "ArcjetRateLimitReason",
      "ArcjetReason",
      "ArcjetRuleResult",
      "ArcjetSensitiveInfoReason",
      "ArcjetShieldReason",
      "botCategories",
      "createRemoteClient",
      "default",
      "detectBot",
      "filter",
      "fixedWindow",
      "protectSignup",
      "sensitiveInfo",
      "shield",
      "slidingWindow",
      "tokenBucket",
      "validateEmail",
    ]);
  });

  await t.test("should support `sensitiveInfo`", async function () {
    const restore = capture();

    const arcjet = arcjetFastify({
      key: exampleKey,
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    });

    const server = await createSimpleServer({ arcjet, port });

    const response = await fetch("http://localhost:" + port, {
      body: "This is fine.",
      headers: { "Content-Type": "text/plain" },
      method: "POST",
    });

    await server.close();
    restore();
    port++;

    assert.equal(response.status, 200);
  });

  await t.test(
    "should support reading body before `sensitiveInfo`",
    async function () {
      const restore = capture();
      let body: unknown;

      const arcjet = arcjetFastify({
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const server = await createSimpleServer({
        arcjet,
        async before(request) {
          body = request.body;
        },
        port,
      });

      const response = await fetch("http://localhost:" + port, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      await server.close();
      restore();
      port++;

      assert.equal(body, "My email is alice@arcjet.com");
      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support reading body after `sensitiveInfo`",
    async function () {
      const restore = capture();
      let body: unknown;

      const arcjet = arcjetFastify({
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const server = await createSimpleServer({
        async after(request) {
          body = request.body;
        },
        arcjet,
        port,
      });

      const response = await fetch("http://localhost:" + port, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      await server.close();
      restore();
      port++;

      assert.equal(response.status, 403);
      assert.equal(body, "My email is alice@arcjet.com");
    },
  );

  await t.test("should support `sensitiveInfo` on JSON", async function () {
    const restore = capture();

    const arcjet = arcjetFastify({
      key: exampleKey,
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    });

    const server = await createSimpleServer({ arcjet, port });

    const response = await fetch("http://localhost:" + port, {
      body: JSON.stringify({ message: "My email is alice@arcjet.com" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    await server.close();
    restore();
    port++;

    assert.equal(response.status, 403);
  });

  // TODO: support form data with `https://github.com/fastify/fastify-formbody`.
  // Document that it is needed.
  // await t.test("should support `sensitiveInfo` on form data", async function () {
  //   const restore = capture();

  //   const arcjet = arcjetFastify({
  //     key: exampleKey,
  //     rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  //   });

  //   const server = await createSimpleServer({ arcjet, port });

  //   const formData = new FormData();
  //   formData.append("message", "My email is My email is alice@arcjet.com");

  //   const response = await fetch("http://localhost:" + port, {
  //     body: formData,
  //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //     method: "POST",
  //   });

  //   await server.close();
  //   restore();
  //   port++

  //   assert.equal(response.status, 403);
  // });

  await t.test(
    "should support `sensitiveInfo` on plain text",
    async function () {
      const restore = capture();

      const arcjet = arcjetFastify({
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const server = await createSimpleServer({ arcjet, port });

      const response = await fetch("http://localhost:" + port, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      await server.close();
      restore();
      port++;

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on streamed plain text",
    async function () {
      const restore = capture();

      const arcjet = arcjetFastify({
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const server = await createSimpleServer({ arcjet, port });

      const response = await fetch("http://localhost:" + port, {
        body: new ReadableStream({
          start(controller) {
            const parts = "My email is alice@arcjet.com".split(" ");
            let first = true;
            const time = 10;

            setTimeout(tick, time);

            function tick() {
              const part = parts.shift();
              if (part) {
                controller.enqueue(
                  new TextEncoder().encode((first ? "" : " ") + part),
                );
                first = false;
                setTimeout(tick, time);
              } else {
                controller.enqueue(new TextEncoder().encode("\n"));
                controller.close();
              }
            }
          },
        }),
        duplex: "half",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      await server.close();
      restore();
      port++;

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` a megabyte of data",
    async function () {
      const restore = capture();

      const arcjet = arcjetFastify({
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const server = await createSimpleServer({ arcjet, port });
      const message = "My email is alice@arcjet.com";
      const body = "a".repeat(oneMegabyte - message.length - 1) + " " + message;

      const response = await fetch("http://localhost:" + port, {
        body,
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      await server.close();
      restore();
      port++;

      assert.equal(response.status, 403);
    },
  );

  // TODO: configure fastify.
  // Document that it is needed.
  // await t.test("should support `sensitiveInfo` 5 megabytes of data", async function () {
  //   const restore = capture();

  //   const arcjet = arcjetFastify({
  //     key: exampleKey,
  //     rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  //   });

  //   const server = await createSimpleServer({ arcjet, port });
  //   const message = "My email is alice@arcjet.com";
  //   const body = "a".repeat(5 * oneMegabyte - message.length - 1) + " " + message;

  //   const response = await fetch("http://localhost:" + port, {
  //     body,
  //     headers: { "Content-Type": "text/plain" },
  //     method: "POST",
  //   });

  //   await server.close();
  //   restore();
  //   port++;

  //   assert.equal(response.status, 403);
  // });
});

// TODO: add test case for removal of body parser.
// Document that it will fail.

function capture() {
  const currentArcjetEnv = process.env.ARCJET_ENV;
  const currentArcjetLogLevel = process.env.ARCJET_LOG_LEVEL;

  process.env.ARCJET_ENV = "development";
  process.env.ARCJET_LOG_LEVEL = "error";

  return restore;

  function restore() {
    process.env.ARCJET_ENV = currentArcjetEnv;
    process.env.ARCJET_LOG_LEVEL = currentArcjetLogLevel;
  }
}

interface SimpleServerOptions {
  after?(request: FastifyRequest): Promise<undefined> | undefined;
  arcjet: ReturnType<typeof arcjetFastify>;
  before?(request: FastifyRequest): Promise<undefined> | undefined;
  port: number;
}

async function createSimpleServer(options: SimpleServerOptions) {
  const { after, arcjet, before, port } = options;
  const fastify = Fastify();

  fastify.post("/", async function (request, reply) {
    await before?.(request);
    const decision = await arcjet.protect(request);
    await after?.(request);
    return decision.isDenied()
      ? reply.status(403).send("Forbidden")
      : reply.send("Hello world");
  });

  await fastify.listen({ port });

  return fastify;
}

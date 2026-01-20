import assert from "node:assert/strict";
import test from "node:test";
import { default as Fastify, type FastifyRequest } from "fastify";
import { ArcjetAllowDecision, ArcjetReason } from "@arcjet/protocol";
import arcjetFastify, { sensitiveInfo } from "../index.js";

const exampleKey = "ajkey_yourkey";
const oneMegabyte = 1024 * 1024;

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
      client: {
        async decide() {
          // sensitiveInfo rule only runs locally.
          return new ArcjetAllowDecision({
            reason: new ArcjetReason(),
            results: [],
            ttl: 0,
          });
        },
        report() {},
      },
      key: exampleKey,
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    });

    const { server, url } = await createSimpleServer({ arcjet });

    const response = await fetch(url, {
      body: "This is fine.",
      headers: { "Content-Type": "text/plain" },
      method: "POST",
    });

    await server.close();
    restore();

    assert.equal(
      response.status,
      200,
      `Unexpected status: ${await response.text()}`,
    );
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

      const { server, url } = await createSimpleServer({
        arcjet,
        async before(request) {
          body = request.body;
        },
      });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      await server.close();
      restore();

      assert.equal(body, "My email is alice@arcjet.com");
      assert.equal(
        response.status,
        403,
        `Unexpected status: ${await response.text()}`,
      );
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

      const { server, url } = await createSimpleServer({
        async after(request) {
          body = request.body;
        },
        arcjet,
      });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      await server.close();
      restore();

      assert.equal(
        response.status,
        403,
        `Unexpected status: ${await response.text()}`,
      );
      assert.equal(body, "My email is alice@arcjet.com");
    },
  );

  await t.test("should support `sensitiveInfo` on JSON", async function () {
    const restore = capture();

    const arcjet = arcjetFastify({
      key: exampleKey,
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    });

    const { server, url } = await createSimpleServer({ arcjet });

    const response = await fetch(url, {
      body: JSON.stringify({ message: "My email is alice@arcjet.com" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    await server.close();
    restore();

    assert.equal(
      response.status,
      403,
      `Unexpected status: ${await response.text()}`,
    );
  });

  // TODO: support form data with `https://github.com/fastify/fastify-formbody`.
  // Document that it is needed.
  // await t.test("should support `sensitiveInfo` on form data", async function () {
  //   const restore = capture();

  //   const arcjet = arcjetFastify({
  //     key: exampleKey,
  //     rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  //   });

  //   const { server, url } = await createSimpleServer({ arcjet });

  //   const formData = new FormData();
  //   formData.append("message", "My email is My email is alice@arcjet.com");

  //   const response = await fetch(url, {
  //     body: formData,
  //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //     method: "POST",
  //   });

  //   await server.close();
  //   restore();

  //   assert.equal(response.status, 403, `Unexpected status: ${await response.text()}`);
  // });

  await t.test(
    "should support `sensitiveInfo` on plain text",
    async function () {
      const restore = capture();

      const arcjet = arcjetFastify({
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({ arcjet });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      await server.close();
      restore();

      assert.equal(
        response.status,
        403,
        `Unexpected status: ${await response.text()}`,
      );
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

      const { server, url } = await createSimpleServer({ arcjet });

      const response = await fetch(url, {
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

      assert.equal(
        response.status,
        403,
        `Unexpected status: ${await response.text()}`,
      );
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

      const { server, url } = await createSimpleServer({ arcjet });
      const message = "My email is alice@arcjet.com";
      const body = "a".repeat(oneMegabyte - message.length - 1) + " " + message;

      const response = await fetch(url, {
        body,
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      await server.close();
      restore();

      assert.equal(
        response.status,
        403,
        `Unexpected status: ${await response.text()}`,
      );
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

  //   const { server, url } = await createSimpleServer({ arcjet });
  //   const message = "My email is alice@arcjet.com";
  //   const body = "a".repeat(5 * oneMegabyte - message.length - 1) + " " + message;

  //   const response = await fetch(url, {
  //     body,
  //     headers: { "Content-Type": "text/plain" },
  //     method: "POST",
  //   });

  //   await server.close();
  //   restore();

  //   assert.equal(response.status, 403, `Unexpected status: ${await response.text()}`);
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
}

let uniquePort = 3200;
async function createSimpleServer(options: SimpleServerOptions) {
  const { after, arcjet, before } = options;
  const fastify = Fastify();
  const port = uniquePort++;

  fastify.post("/", async function (request, reply) {
    await before?.(request);
    const decision = await arcjet.protect(request);
    await after?.(request);

    if (decision.isErrored()) {
      return reply
        .status(500)
        .send(`Internal Server Error: "${decision.reason.message}"`);
    }

    if (decision.isAllowed()) {
      return reply.status(200).send("OK");
    }

    if (decision.isDenied()) {
      return reply.status(403).send("Forbidden");
    }

    // Differentiate unexpected cases.
    return reply.status(501).send("Not Implemented");
  });

  await fastify.listen({ port });

  return { server: fastify, url: "http://localhost:" + port };
}

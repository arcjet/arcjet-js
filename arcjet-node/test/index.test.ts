import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import arcjetNode, { sensitiveInfo } from "../index.js";

const exampleKey = "ajkey_yourkey";
const oneMegabyte = 1024 * 1024;

test("`@arcjet/node`", async function (t) {
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

    const arcjet = arcjetNode({
      key: exampleKey,
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    });

    const { server, url } = await createSimpleServer({ arcjet });

    const response = await fetch(url, {
      body: "This is fine.",
      headers: { "Content-Type": "text/plain" },
      method: "POST",
    });

    server.close();
    restore();

    assert.equal(response.status, 200);
  });

  await t.test(
    "should emit an error log when the body is read before `sensitiveInfo`",
    async function () {
      const restore = capture();
      let body = "";
      let parameters: Array<unknown> | undefined;

      const arcjet = arcjetNode({
        key: exampleKey,
        log: {
          debug() {},
          error(...values) {
            parameters = values;
          },
          info() {},
          warn() {},
        },
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        arcjet,
        async before(request) {
          return new Promise(function (resolve) {
            request.on("data", function (chunk) {
              body += chunk;
            });
            request.on("end", function () {
              resolve(undefined);
            });
          });
        },
      });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      server.close();
      restore();

      assert.equal(body, "My email is alice@arcjet.com");
      assert.equal(response.status, 200);
      assert.deepEqual(parameters, [
        "failed to get request body: %s",
        "stream is not readable",
      ]);
    },
  );

  await t.test(
    "should support accessing body after `sensitiveInfo`",
    async function () {
      const restore = capture();
      let body = "";

      const arcjet = arcjetNode({
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        async after(request) {
          // @ts-expect-error: non-standard but common field.
          body = request.body;
        },
        arcjet,
      });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      server.close();
      restore();

      assert.equal(response.status, 403);
      assert.equal(body, "My email is alice@arcjet.com");
    },
  );

  await t.test("should support `sensitiveInfo` on JSON", async function () {
    const restore = capture();

    const arcjet = arcjetNode({
      key: exampleKey,
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    });

    const { server, url } = await createSimpleServer({ arcjet });

    const response = await fetch(url, {
      body: JSON.stringify({ message: "My email is alice@arcjet.com" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    server.close();
    restore();

    assert.equal(response.status, 403);
  });

  await t.test(
    "should support `sensitiveInfo` on form data",
    async function () {
      const restore = capture();

      const arcjet = arcjetNode({
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({ arcjet });

      const formData = new FormData();
      formData.append("message", "My email is My email is alice@arcjet.com");

      const response = await fetch(url, {
        body: formData,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        method: "POST",
      });

      server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on plain text",
    async function () {
      const restore = capture();

      const arcjet = arcjetNode({
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({ arcjet });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on streamed plain text",
    async function () {
      const restore = capture();

      const arcjet = arcjetNode({
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

      server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` a megabyte of data",
    async function () {
      const restore = capture();

      const arcjet = arcjetNode({
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

      server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  // TODO(GH-4562): this is hardcoded in `arcjet-node` currently to allow up to 1mb.
  // Make configurable and document.
  // await t.test("should support `sensitiveInfo` 5 megabytes of data", async function () {
  //   const restore = capture();

  //   const arcjet = arcjetNode({
  //     key: exampleKey,
  //     rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  //   });

  //   const { server, url } = await createSimpleServer({ arcjet, port });
  //   const message = "My email is alice@arcjet.com";
  //   const body = "a".repeat(5 * oneMegabyte - message.length - 1) + " " + message;

  //   const response = await fetch(url, {
  //     body,
  //     headers: { "Content-Type": "text/plain" },
  //     method: "POST",
  //   });

  //   server.close();
  //   restore();
  //   port++;

  //   assert.equal(response.status, 403);
  // });
});

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
  after?(request: http.IncomingMessage): Promise<undefined> | undefined;
  arcjet: ReturnType<typeof arcjetNode>;
  before?(request: http.IncomingMessage): Promise<undefined> | undefined;
}

let uniquePort = 3300;
async function createSimpleServer(options: SimpleServerOptions) {
  const { after, arcjet, before } = options;
  const port = uniquePort++;

  const server = http.createServer(async function (request, response) {
    await before?.(request);
    // @ts-expect-error: TODO: fix types to allow `undefined`.
    const decision = await arcjet.protect(request);
    await after?.(request);
    if (decision.isDenied()) {
      response.statusCode = 403;
      response.end("Forbidden");
    } else {
      response.statusCode = 200;
      response.end("Hello world");
    }
  });

  await new Promise(function (resolve) {
    server.listen({ port }, function () {
      resolve(undefined);
    });
  });

  return { server, url: "http://localhost:" + port };
}

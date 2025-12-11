// This monorepo is tested with Node.js but this package targets Deno.
// Run the tests from this package folder with:
//
// ```sh
// deno test test/index.test.ts --allow-env --allow-net --no-check
// ```

import assert from "node:assert/strict";
import test from "node:test";
import arcjetDeno, { sensitiveInfo } from "../index.js";

const exampleKey = "ajkey_yourkey";
const oneMegabyte = 1024 * 1024;

test("should expose the public api", async function () {
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

test("should support `sensitiveInfo`", async function () {
  const restore = capture();

  const arcjet = arcjetDeno({
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({ arcjet });

  const response = await fetch(url, {
    body: "This is fine.",
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.shutdown();
  restore();

  assert.equal(response.status, 200);
});

test("should emit an error log when the body is read before `sensitiveInfo`", async function () {
  const restore = capture();
  let body: string | undefined;
  let parameters: Array<unknown> | undefined;

  const arcjet = arcjetDeno({
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

  const { server, url } = createSimpleServer({
    arcjet,
    async before(request) {
      body = await request.text();
    },
  });

  const response = await fetch(url, {
    body: "My email is alice@arcjet.com",
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.shutdown();
  restore();

  assert.equal(body, "My email is alice@arcjet.com");
  assert.equal(response.status, 200);
  assert.deepEqual(parameters, [
    "failed to get request body: %s",
    "Body is unusable",
  ]);
});

test("should support reading body after `sensitiveInfo`", async function () {
  const restore = capture();
  let body: string | undefined;

  const arcjet = arcjetDeno({
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({
    async after(request) {
      body = await request.text();
    },
    arcjet,
  });

  const response = await fetch(url, {
    body: "This is fine.",
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.shutdown();
  restore();

  assert.equal(response.status, 200);
  assert.equal(body, "This is fine.");
});

test("should support `sensitiveInfo` on JSON", async function () {
  const restore = capture();

  const arcjet = arcjetDeno({
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({ arcjet });

  const response = await fetch(url, {
    body: JSON.stringify({ message: "My email is alice@arcjet.com" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  await server.shutdown();
  restore();

  assert.equal(response.status, 403);
});

test("should support `sensitiveInfo` on form data", async function () {
  const restore = capture();

  const arcjet = arcjetDeno({
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({ arcjet });

  const formData = new FormData();
  formData.append("message", "My email is My email is alice@arcjet.com");

  const response = await fetch(url, {
    body: formData,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  await server.shutdown();
  restore();

  assert.equal(response.status, 403);
});

test("should support `sensitiveInfo` on plain text", async function () {
  const restore = capture();

  const arcjet = arcjetDeno({
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({ arcjet });

  const response = await fetch(url, {
    body: "My email is alice@arcjet.com",
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.shutdown();
  restore();

  assert.equal(response.status, 403);
});

test("should support `sensitiveInfo` on streamed plain text", async function () {
  const restore = capture();

  const arcjet = arcjetDeno({
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({ arcjet });

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

  await server.shutdown();
  restore();

  assert.equal(response.status, 403);
});

test("should support `sensitiveInfo` a megabyte of data", async function () {
  const restore = capture();

  const arcjet = arcjetDeno({
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({ arcjet });
  const message = "My email is alice@arcjet.com";
  const body = "a".repeat(oneMegabyte - message.length - 1) + " " + message;

  const response = await fetch(url, {
    body,
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.shutdown();
  restore();

  assert.equal(response.status, 403);
});

// TODO(GH-5517): make this configurable.
test("should support `sensitiveInfo` 5 megabytes of data", async function () {
  const restore = capture();

  const arcjet = arcjetDeno({
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({ arcjet });
  const message = "My email is alice@arcjet.com";
  const body = "a".repeat(5 * oneMegabyte - message.length - 1) + " " + message;

  const response = await fetch(url, {
    body,
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.shutdown();
  restore();

  assert.equal(response.status, 403);
});

function capture() {
  const currentArcjetEnv = Deno.env.get("ARCJET_ENV") ?? "";
  const currentArcjetLogLevel = Deno.env.get("ARCJET_LOG_LEVEL") ?? "";

  Deno.env.set("ARCJET_ENV", "development");
  Deno.env.set("ARCJET_LOG_LEVEL", "error");

  return restore;

  function restore() {
    Deno.env.set("ARCJET_ENV", currentArcjetEnv);
    Deno.env.set("ARCJET_LOG_LEVEL", currentArcjetLogLevel);
  }
}

interface SimpleServerOptions {
  after?(request: Request): Promise<undefined> | undefined;
  arcjet: ReturnType<typeof arcjetDeno>;
  before?(request: Request): Promise<undefined> | undefined;
}

let uniquePort = 3100;
function createSimpleServer(options: SimpleServerOptions) {
  const { after, arcjet, before } = options;
  const server = Deno.serve(
    { port: uniquePort++, onListen() {} },
    arcjet.handler(async function (request) {
      await before?.(request);
      const decision = await arcjet.protect(request);
      await after?.(request);
      return decision.isDenied()
        ? new Response("Forbidden", { status: 403 })
        : new Response("Hello world");
    }),
  );
  return { server, url: "http://localhost:" + server.addr.port };
}

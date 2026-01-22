// This monorepo is tested with Node.js but this package targets Bun.
// Run the tests from this package folder with:
//
// ```sh
// bun test
// ```

import assert from "node:assert/strict";
import test from "node:test";
import type { Client } from "@arcjet/protocol/client.js";
import arcjetBun, {
  type ArcjetBun,
  type ArcjetRule,
  ArcjetAllowDecision,
  ArcjetDecision,
  ArcjetReason,
  ArcjetRuleResult,
  sensitiveInfo,
} from "../index.js";

const exampleKey = "ajkey_yourkey";
const oneMegabyte = 1024 * 1024;

let uniquePort = 3000;

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
  const warnings: Array<Array<unknown>> = [];

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    log: {
      debug() {},
      error() {},
      info() {},
      warn(...parameters) {
        warnings.push([...parameters]);
      },
    },
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  });

  const response = await fetch(url, {
    body: "This is fine.",
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.stop();
  restore();

  assert.equal(response.status, 200);
  assert.deepEqual(warnings, [
    [
      "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
    ],
    [
      "Automatically reading the request body is deprecated; please pass an explicit `sensitiveInfoValue` field.",
    ],
  ]);
});

test("should emit an error log when the body is read before `sensitiveInfo`", async function () {
  const restore = capture();
  let body: string | undefined;
  let parameters: Array<unknown> | undefined;

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    log: {
      debug() {},
      error(...values) {
        parameters = values;
      },
      info() {},
      warn() {},
    },
  });

  const { server, url } = createSimpleServer({
    async before(request) {
      body = await request.text();
    },
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  });

  const response = await fetch(url, {
    body: "My email is alice@arcjet.com",
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.stop();
  restore();

  assert.equal(body, "My email is alice@arcjet.com");
  assert.equal(response.status, 200);
  assert.deepEqual(parameters, [
    "failed to get request body: %s",
    "Cannot read body: already read",
  ]);
});

test("should support reading body after `sensitiveInfo`", async function () {
  const restore = capture();
  let body: string | undefined;

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({
    async after(request) {
      body = await request.text();
    },
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  });

  const response = await fetch(url, {
    body: "My email is alice@arcjet.com",
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.stop();
  restore();

  assert.equal(response.status, 403);
  assert.equal(body, "My email is alice@arcjet.com");
});

test("should support `sensitiveInfo` on JSON", async function () {
  const restore = capture();

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  });

  const response = await fetch(url, {
    body: JSON.stringify({ message: "My email is alice@arcjet.com" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  await server.stop();
  restore();

  assert.equal(response.status, 403);
});

test("should support `sensitiveInfo` on form data", async function () {
  const restore = capture();

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  });

  const formData = new FormData();
  formData.append("message", "My email is My email is alice@arcjet.com");

  const response = await fetch(url, {
    body: formData,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  await server.stop();
  restore();

  assert.equal(response.status, 403);
});

test("should support `sensitiveInfo` on plain text", async function () {
  const restore = capture();

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  });

  const response = await fetch(url, {
    body: "My email is alice@arcjet.com",
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.stop();
  restore();

  assert.equal(response.status, 403);
});

test("should support `sensitiveInfo` on streamed plain text", async function () {
  const restore = capture();

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  });

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
            controller.enqueue((first ? "" : " ") + part);
            first = false;
            setTimeout(tick, time);
          } else {
            controller.enqueue("\n");
            controller.close();
          }
        }
      },
    }),
    duplex: "half",
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.stop();
  restore();

  assert.equal(response.status, 403);
});

test("should support `sensitiveInfo` a megabyte of data", async function () {
  const restore = capture();

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  });
  const message = "My email is alice@arcjet.com";
  const body = "a".repeat(oneMegabyte - message.length - 1) + " " + message;

  const response = await fetch(url, {
    body,
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.stop();
  restore();

  assert.equal(response.status, 403);
});

// TODO(GH-5517): make this configurable.
test("should not support `sensitiveInfo` 5 megabytes of data", async function () {
  const restore = capture();
  let parameters: Array<unknown> | undefined;

  const arcjet = arcjetBun({
    client: createLocalClient(),
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
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  });
  const message = "My email is alice@arcjet.com";
  const body = "a".repeat(5 * oneMegabyte - message.length - 1) + " " + message;

  const response = await fetch(url, {
    body,
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.stop();
  restore();

  assert.equal(response.status, 200);
  assert.deepEqual(parameters, [
    "failed to get request body: %s",
    "Cannot read stream whose expected length exceeds limit",
  ]);
});

test("should support `sensitiveInfo` w/ `sensitiveInfoValue`", async function () {
  const restore = capture();

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [sensitiveInfo({ allow: [], mode: "LIVE" })],
  });

  const { server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request, {
        sensitiveInfoValue: "My email is alice@arcjet.com",
      });
    },
    handler: arcjet.handler,
  });

  const response = await fetch(url, {
    headers: { "Content-Type": "text/plain" },
    method: "POST",
  });

  await server.stop();
  restore();

  assert.equal(response.status, 403);
});

test("should support a custom rule", async function () {
  const restore = capture();
  // Custom rule that denies requests when a `q` search parameter is `"alpha"`.
  const denySearchAlpha: ArcjetRule<{}> = {
    mode: "LIVE",
    priority: 1,
    async protect(_context, details) {
      const parameters = new URLSearchParams(details.query);
      const q = parameters.get("q");

      if (q === "alpha") {
        return new ArcjetRuleResult({
          conclusion: "DENY",
          fingerprint: "",
          reason: new ArcjetReason(),
          ruleId: "",
          state: "RUN",
          ttl: 0,
        });
      }

      return new ArcjetRuleResult({
        conclusion: "ALLOW",
        fingerprint: "",
        reason: new ArcjetReason(),
        ruleId: "",
        state: "RUN",
        ttl: 0,
      });
    },
    type: "",
    validate() {},
    version: 0,
  };

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [[denySearchAlpha]],
  });

  const { server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  });

  const responseAlpha = await fetch(url + "?q=alpha");
  const responseBravo = await fetch(url + "?q=bravo");

  await server.stop();
  restore();

  assert.equal(responseAlpha.status, 403);
  assert.equal(responseBravo.status, 200);
});

test("should support a custom rule w/ optional extra fields", async function () {
  const restore = capture();
  // Custom rule that denies requests when an optional extra field is `"alpha"`.
  const denyExtraAlpha: ArcjetRule<{ field?: string | null | undefined }> = {
    mode: "LIVE",
    priority: 1,
    async protect(_context, details) {
      const field = details.extra.field;

      if (field === "alpha") {
        return new ArcjetRuleResult({
          conclusion: "DENY",
          fingerprint: "",
          reason: new ArcjetReason(),
          ruleId: "",
          state: "RUN",
          ttl: 0,
        });
      }

      return new ArcjetRuleResult({
        conclusion: "ALLOW",
        fingerprint: "",
        reason: new ArcjetReason(),
        ruleId: "",
        state: "RUN",
        ttl: 0,
      });
    },
    type: "",
    validate() {},
    version: 0,
  };

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [[denyExtraAlpha]],
  });

  let { server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request, { field: "alpha" });
    },
    handler: arcjet.handler,
  });
  const responseAlpha = await fetch(url);
  await server.stop();

  ({ server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request, { field: "bravo" });
    },
    handler: arcjet.handler,
  }));
  const responseBravo = await fetch(url);
  await server.stop();

  ({ server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  }));
  const responseMissing = await fetch(url);
  await server.stop();

  restore();

  assert.equal(responseAlpha.status, 403);
  assert.equal(responseBravo.status, 200);
  assert.equal(responseMissing.status, 200);
});

test("should support a custom rule w/ required extra fields", async function () {
  const restore = capture();
  // Custom rule that denies requests when a required extra field is `"alpha"`.
  const denyExtraAlphaRequired: ArcjetRule<{ field: string }> = {
    mode: "LIVE",
    priority: 1,
    async protect(_context, details) {
      const field = details.extra.field;

      // A local error result would be overwritten by the server but a
      // local deny persists.
      if (!field || field === "alpha") {
        return new ArcjetRuleResult({
          conclusion: "DENY",
          fingerprint: "",
          reason: new ArcjetReason(),
          ruleId: "",
          state: "RUN",
          ttl: 0,
        });
      }

      return new ArcjetRuleResult({
        conclusion: "ALLOW",
        fingerprint: "",
        reason: new ArcjetReason(),
        ruleId: "",
        state: "RUN",
        ttl: 0,
      });
    },
    type: "",
    validate() {},
    version: 0,
  };

  const arcjet = arcjetBun({
    client: createLocalClient(),
    key: exampleKey,
    rules: [[denyExtraAlphaRequired]],
  });

  let { server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request, { field: "alpha" });
    },
    handler: arcjet.handler,
  });
  const responseAlpha = await fetch(url);
  await server.stop();

  ({ server, url } = createSimpleServer({
    async decide(request) {
      return arcjet.protect(request, { field: "bravo" });
    },
    handler: arcjet.handler,
  }));
  const responseBravo = await fetch(url);
  await server.stop();

  ({ server, url } = createSimpleServer({
    async decide(request) {
      // @ts-expect-error: type error is expected as this use is wrong.
      return arcjet.protect(request);
    },
    handler: arcjet.handler,
  }));
  const responseMissing = await fetch(url);
  await server.stop();

  restore();

  assert.equal(responseAlpha.status, 403);
  assert.equal(responseBravo.status, 200);
  assert.equal(responseMissing.status, 403);
});

/**
 * Configuration for {@linkcode createSimpleServer}.
 */
export interface SimpleServerOptions {
  /**
   * Hook after the decision is made.
   */
  after?(request: Request): Promise<undefined> | undefined;
  /**
   * Hook before the decision is made.
   */
  before?(request: Request): Promise<undefined> | undefined;
  /**
   * Make a decision.
   */
  decide(request: Request): Promise<ArcjetDecision>;
  /**
   * Arcjet Bun handler.
   */
  handler: ArcjetBun<any>["handler"];
}

/**
 * Capture and restore environment variables.
 *
 * @returns
 *   Restore function.
 */
export function capture() {
  const currentArcjetEnv = process.env.ARCJET_ENV;
  const currentArcjetLogLevel = process.env.ARCJET_LOG_LEVEL;

  process.env.ARCJET_ENV = "development";
  process.env.ARCJET_LOG_LEVEL = "error";

  return restore;

  /**
   * Restore environment variables.
   */
  function restore() {
    process.env.ARCJET_ENV = currentArcjetEnv;
    process.env.ARCJET_LOG_LEVEL = currentArcjetLogLevel;
  }
}

/**
 * Create an empty client to not hit the internet but always decide as allow
 * and never report.
 *
 * @returns
 *   Client.
 */
export function createLocalClient(): Client {
  return {
    async decide() {
      return new ArcjetAllowDecision({
        reason: new ArcjetReason(),
        results: [],
        ttl: 0,
      });
    },
    report() {},
  };
}

/**
 * Create a simple server.
 *
 * @param options
 *   Configuration (required).
 * @returns
 *   Simple server and its URL.
 */
export function createSimpleServer(options: SimpleServerOptions) {
  const { after, before, decide, handler } = options;

  const server = Bun.serve({
    fetch: handler(async function (request) {
      await before?.(request);
      const decision = await decide(request);
      await after?.(request);

      if (decision.isErrored()) {
        return new Response(
          `Internal Server Error: "${decision.reason.message}"`,
          { status: 500 },
        );
      }

      if (decision.isAllowed()) {
        return new Response("OK", { status: 200 });
      }

      if (decision.isDenied()) {
        return new Response("Forbidden", { status: 403 });
      }

      // Differentiate unexpected cases.
      return new Response("Not Implemented", { status: 501 });
    }),
    port: uniquePort++,
  });

  return { server, url: server.url };
}

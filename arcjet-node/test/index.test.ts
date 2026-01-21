import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import type { Client } from "@arcjet/protocol/client.js";
import arcjetNode, {
  type ArcjetRule,
  ArcjetAllowDecision,
  ArcjetDecision,
  ArcjetReason,
  ArcjetRuleResult,
  sensitiveInfo,
} from "../index.js";

const exampleKey = "ajkey_yourkey";
const oneMegabyte = 1024 * 1024;

let uniquePort = 3300;

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
      client: createLocalClient(),
      key: exampleKey,
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    });

    const { server, url } = await createSimpleServer({
      async decide(request) {
        return arcjet.protect(request);
      },
    });

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

      const { server, url } = await createSimpleServer({
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
        async decide(request) {
          return arcjet.protect(request);
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
        "Cannot read unreadable stream",
      ]);
    },
  );

  // TODO(GH-5516): this hangs indefinitely.
  // Fix bug, probably by calling `request.clone()`?
  // await t.test("should support reading body after `sensitiveInfo`", async function () {
  //   const restore = capture();
  //   let body = "";

  //   const arcjet = arcjetNode({
  //     client: createLocalClient(),
  //     key: exampleKey,
  //     rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  //   });

  //   const { server, url } = await createSimpleServer({
  //     async after(request) {
  //       return new Promise(function (resolve) {
  //         request.on("data", function (chunk) {
  //           body += chunk;
  //         });
  //         request.on("end", function () {
  //           resolve(undefined);
  //         });
  //       });
  //     },
  //     arcjet,
  //   });

  //   const response = await fetch(url, {
  //     body: "My email is alice@arcjet.com",
  //     headers: { "Content-Type": "text/plain" },
  //     method: "POST",
  //   });

  //   server.close();
  //   restore();

  //   assert.equal(response.status, 403);
  //   assert.equal(body, "My email is alice@arcjet.com");
  // });

  await t.test("should support `sensitiveInfo` on JSON", async function () {
    const restore = capture();

    const arcjet = arcjetNode({
      client: createLocalClient(),
      key: exampleKey,
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    });

    const { server, url } = await createSimpleServer({
      async decide(request) {
        return arcjet.protect(request);
      },
    });

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
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        async decide(request) {
          return arcjet.protect(request);
        },
      });

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
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        async decide(request) {
          return arcjet.protect(request);
        },
      });

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
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        async decide(request) {
          return arcjet.protect(request);
        },
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
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        async decide(request) {
          return arcjet.protect(request);
        },
      });
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
  //     client: createLocalClient(),
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

  await t.test("should support a custom rule", async function () {
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

    const arcjet = arcjetNode({
      client: createLocalClient(),
      key: exampleKey,
      rules: [[denySearchAlpha]],
    });

    const { server, url } = await createSimpleServer({
      async decide(request) {
        return arcjet.protect(request);
      },
    });

    const responseAlpha = await fetch(url + "?q=alpha");
    const responseBravo = await fetch(url + "?q=bravo");

    await server.close();
    restore();

    assert.equal(responseAlpha.status, 403);
    assert.equal(responseBravo.status, 200);
  });

  await t.test(
    "should support a custom rule w/ optional extra fields",
    async function () {
      const restore = capture();
      // Custom rule that denies requests when an optional extra field is `"alpha"`.
      const denyExtraAlpha: ArcjetRule<{ field?: string | null | undefined }> =
        {
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

      const arcjet = arcjetNode({
        client: createLocalClient(),
        key: exampleKey,
        rules: [[denyExtraAlpha]],
      });

      let { server, url } = await createSimpleServer({
        async decide(request) {
          return arcjet.protect(request, { field: "alpha" });
        },
      });
      const responseAlpha = await fetch(url);
      await server.close();

      ({ server, url } = await createSimpleServer({
        async decide(request) {
          return arcjet.protect(request, { field: "bravo" });
        },
      }));
      const responseBravo = await fetch(url);
      await server.close();

      ({ server, url } = await createSimpleServer({
        async decide(request) {
          return arcjet.protect(request);
        },
      }));
      const responseMissing = await fetch(url);
      await server.close();

      restore();

      assert.equal(responseAlpha.status, 403);
      assert.equal(responseBravo.status, 200);
      assert.equal(responseMissing.status, 200);
    },
  );

  await t.test(
    "should support a custom rule w/ required extra fields",
    async function () {
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

      const arcjet = arcjetNode({
        client: createLocalClient(),
        key: exampleKey,
        rules: [[denyExtraAlphaRequired]],
      });

      let { server, url } = await createSimpleServer({
        async decide(request) {
          return arcjet.protect(request, { field: "alpha" });
        },
      });
      const responseAlpha = await fetch(url);
      await server.close();

      ({ server, url } = await createSimpleServer({
        async decide(request) {
          return arcjet.protect(request, { field: "bravo" });
        },
      }));
      const responseBravo = await fetch(url);
      await server.close();

      ({ server, url } = await createSimpleServer({
        async decide(request) {
          // @ts-expect-error: type error is expected as this use is wrong.
          return arcjet.protect(request);
        },
      }));
      const responseMissing = await fetch(url);
      await server.close();

      restore();

      assert.equal(responseAlpha.status, 403);
      assert.equal(responseBravo.status, 200);
      assert.equal(responseMissing.status, 403);
    },
  );
});

/**
 * Configuration for {@linkcode createSimpleServer}.
 */
interface SimpleServerOptions {
  /**
   * Hook after the decision is made.
   */
  after?(request: http.IncomingMessage): Promise<undefined> | undefined;
  /**
   * Hook before the decision is made.
   */
  before?(request: http.IncomingMessage): Promise<undefined> | undefined;
  /**
   * Make a decision.
   */
  decide(request: http.IncomingMessage): Promise<ArcjetDecision>;
}

/**
 * Capture and restore environment variables.
 *
 * @returns
 *   Restore function.
 */
function capture() {
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
async function createSimpleServer(options: SimpleServerOptions) {
  const { after, before, decide } = options;
  const port = uniquePort++;

  const server = http.createServer(async function (request, response) {
    await before?.(request);
    const decision = await decide(request);
    await after?.(request);

    if (decision.isErrored()) {
      response.statusCode = 500;
      response.end(`Internal Server Error: "${decision.reason.message}"`);
      return;
    }

    if (decision.isAllowed()) {
      response.statusCode = 200;
      response.end("OK");
      return;
    }

    if (decision.isDenied()) {
      response.statusCode = 403;
      response.end("Forbidden");
      return;
    }

    // Differentiate unexpected cases.
    response.statusCode = 501;
    response.end("Not Implemented");
  });

  await new Promise(function (resolve) {
    server.listen({ port }, function () {
      resolve(undefined);
    });
  });

  return { server, url: "http://localhost:" + port };
}

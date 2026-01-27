import assert from "node:assert/strict";
import test from "node:test";
import Fastify, {
  type FastifyRequest,
  type FastifyServerOptions,
} from "fastify";
import { MemoryCache } from "@arcjet/cache";
import type { Client } from "@arcjet/protocol/client.js";
import arcjetFastify, {
  type ArcjetContext,
  type ArcjetRequestDetails,
  type ArcjetRule,
  ArcjetAllowDecision,
  ArcjetDecision,
  ArcjetReason,
  ArcjetRuleResult,
  createRemoteClient,
  detectBot,
  filter,
  sensitiveInfo,
  validateEmail,
} from "../index.js";

const exampleKey = "ajkey_yourkey";
const oneMegabyte = 1024 * 1024;

let uniquePort = 3200;

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
});

test("`createRemoteClient`", async function (t) {
  await t.test(
    "`createRemoteClient`: should create a client",
    async function () {
      const remoteClient = createRemoteClient({ timeout: 4 });

      assert.equal(typeof remoteClient.decide, "function");
      assert.equal(typeof remoteClient.report, "function");

      await assert.rejects(
        remoteClient.decide(
          {
            ...createArcjetContext(),
            log: { ...console, debug() {} },
          },
          {
            cookies: "",
            extra: {},
            headers: new Headers(),
            host: "example.com",
            ip: "1.1.1.1",
            method: "GET",
            path: "/",
            protocol: "http:",
            query: "",
          },
          [],
        ),
        /the operation timed out/,
      );
    },
  );
});

test("`arcjetFastify`", async function (t) {
  await t.test(
    "should warn about IP addresses missing in development",
    async function () {
      let parameters: unknown;
      const restore = capture();

      arcjetFastify({
        key: "",
        log: {
          ...console,
          warn(...rest) {
            parameters = rest;
          },
        },
        rules: [],
      });

      restore();

      assert.deepEqual(parameters, [
        "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
      ]);
    },
  );

  await t.test(
    "should not warn about IP addresses missing when not in development",
    async function () {
      let called = false;
      const restore = capture();
      process.env.ARCJET_ENV = "";

      arcjetFastify({
        key: "",
        log: {
          ...console,
          warn() {
            called = true;
          },
        },
        rules: [],
      });

      restore();

      assert.equal(called, false);
    },
  );

  await t.test("`.protect()`", async function (t) {
    await t.test(
      "should warn about IPs missing in non-development",
      async function () {
        let parameters: unknown;
        const restore = capture();
        process.env.ARCJET_ENV = "";

        const arcjet = arcjetFastify({
          characteristics: [],
          client: createLocalClient(),
          key: exampleKey,
          log: {
            ...console,
            debug() {},
            error() {},
            warn(...rest) {
              parameters = rest;
            },
          },
          rules: [detectBot({ deny: ["CURL"], mode: "LIVE" })],
        });

        // Not called when constructing.
        assert.deepEqual(parameters, undefined);

        const { server, url } = await createSimpleServer({
          decide: arcjet.protect,
        });

        await fetch(url, { headers: { "user-agent": "Test" } });

        await server.close();

        restore();

        // Called when calling `protect()`.
        assert.deepEqual(parameters, [
          'Client IP address is missing. If this is a dev environment set the ARCJET_ENV env var to "development"',
        ]);
      },
    );

    await t.test(
      "should not warn about IPs missing in development",
      async function () {
        let parameters: unknown;
        const restore = capture();

        const arcjet = arcjetFastify({
          characteristics: [],
          client: createLocalClient(),
          key: exampleKey,
          log: {
            ...console,
            debug() {},
            warn(...rest) {
              parameters = rest;
            },
          },
          rules: [detectBot({ deny: ["CURL"], mode: "LIVE" })],
        });

        // Called when constructing, so set to `undefined` again.
        parameters = undefined;

        const { server, url } = await createSimpleServer({
          decide: arcjet.protect,
        });

        await fetch(url, { headers: { "user-agent": "Test" } });

        await server.close();

        restore();

        // Not called when calling `protect()`.
        assert.deepEqual(parameters, undefined);
      },
    );

    await t.test("should protect a request", async function () {
      const restore = capture();

      let request: ArcjetRequestDetails | undefined;

      const arcjet = arcjetFastify({
        client: createLocalClient(),
        key: exampleKey,
        rules: [
          [
            {
              mode: "LIVE",
              priority: 1,
              async protect(_context, details) {
                request = details;
                return new ArcjetRuleResult({
                  conclusion: "ALLOW",
                  fingerprint: "",
                  reason: new ArcjetReason(),
                  ruleId: "",
                  state: "RUN",
                  ttl: 0,
                });
              },
              validate() {},
              version: 0,
              type: "",
            },
          ],
        ],
      });

      const { server, url } = await createSimpleServer({
        decide: arcjet.protect,
      });

      const response = await fetch(new URL("/a?b#c", url), {
        headers: { cookie: "session=a", "user-agent": "Test" },
      });

      await server.close();
      restore();

      assert.equal(response.status, 200);
      assert.ok(request);

      const cleanRequest = {
        ...request,
        headers: Object.fromEntries(request.headers.entries()),
      };

      assert.deepEqual(cleanRequest, {
        cookies: "session=a",
        email: undefined,
        extra: {},
        headers: {
          "accept-encoding": "gzip, deflate",
          "accept-language": "*",
          "sec-fetch-mode": "cors",
          "user-agent": "Test",
          accept: "*/*",
          connection: "keep-alive",
          host: "localhost:3202",
        },
        host: "localhost:3202",
        ip: "127.0.0.1",
        method: "GET",
        path: "/a",
        protocol: "http:",
        query: "?b",
      });
    });
  });

  await t.test("`.withRule()`", async function (t) {
    await t.test("should work", async function () {
      const restore = capture();

      const arcjetBase = arcjetFastify({
        client: createLocalClient(),
        characteristics: ['http.request.headers["user-agent"]'],
        key: exampleKey,
        rules: [
          filter({
            deny: ['http.request.headers["user-agent"] ~ "Chrome"'],
            mode: "LIVE",
          }),
        ],
      });

      const arcjet = arcjetBase.withRule(
        detectBot({ deny: ["CURL"], mode: "LIVE" }),
      );

      const { server, url } = await createSimpleServer({
        decide: arcjet.protect,
      });

      const responseChrome = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
        },
      });

      const responseCurl = await fetch(url, {
        headers: { "user-agent": "curl/7.64.1" },
      });

      const responseFirefox = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0",
        },
      });

      await server.close();
      restore();

      assert.equal(responseChrome.status, 403);
      assert.equal(responseCurl.status, 403);
      assert.equal(responseFirefox.status, 200);
    });
  });

  await t.test("should support `options.proxies`", async function () {
    const restore = capture();

    const ips: Array<unknown> = [];

    const arcjet = arcjetFastify({
      client: createLocalClient(),
      key: exampleKey,
      proxies: ["100.100.100.0/24"],
      rules: [
        [
          {
            mode: "LIVE",
            priority: 1,
            async protect(_context, details) {
              ips.push(details.ip);
              return new ArcjetRuleResult({
                conclusion: "ALLOW",
                fingerprint: "",
                reason: new ArcjetReason(),
                ruleId: "",
                state: "RUN",
                ttl: 0,
              });
            },
            validate() {},
            version: 0,
            type: "",
          },
        ],
      ],
    });

    const { server, url } = await createSimpleServer({
      decide: arcjet.protect,
    });

    await fetch(url, {
      headers: { "x-forwarded-for": "185.199.108.1, 101.100.100.0" },
    });

    await fetch(url, {
      headers: { "x-forwarded-for": "185.199.108.2, 100.100.100.0" },
    });

    await server.close();
    restore();

    assert.deepEqual(ips, [
      // The last in a list is used normally.
      "101.100.100.0",
      // If those are matched by `proxies` then earlier ones are used.
      "185.199.108.2",
    ]);
  });

  await t.test("should prefer `x-arcjet-ip` in development", async function () {
    const restore = capture();

    const ips: Array<unknown> = [];

    const arcjet = arcjetFastify({
      client: createLocalClient(),
      key: exampleKey,
      rules: [
        [
          {
            mode: "LIVE",
            priority: 1,
            async protect(_context, details) {
              ips.push(details.ip);
              return new ArcjetRuleResult({
                conclusion: "ALLOW",
                fingerprint: "",
                reason: new ArcjetReason(),
                ruleId: "",
                state: "RUN",
                ttl: 0,
              });
            },
            validate() {},
            version: 0,
            type: "",
          },
        ],
      ],
    });

    const { server, url } = await createSimpleServer({
      decide: arcjet.protect,
    });

    await fetch(url, {
      headers: {
        "x-arcjet-ip": "185.199.108.153",
        "x-client-ip": "101.100.100.0",
      },
    });

    await server.close();
    restore();

    assert.deepEqual(ips, ["185.199.108.153"]);
  });

  await t.test("should ignore `x-arcjet-ip` in production", async function () {
    const restore = capture();
    process.env.ARCJET_ENV = "";

    const ips: Array<unknown> = [];

    const arcjet = arcjetFastify({
      client: createLocalClient(),
      key: exampleKey,
      rules: [
        [
          {
            mode: "LIVE",
            priority: 1,
            async protect(_context, details) {
              ips.push(details.ip);
              return new ArcjetRuleResult({
                conclusion: "ALLOW",
                fingerprint: "",
                reason: new ArcjetReason(),
                ruleId: "",
                state: "RUN",
                ttl: 0,
              });
            },
            validate() {},
            version: 0,
            type: "",
          },
        ],
      ],
    });

    const { server, url } = await createSimpleServer({
      decide: arcjet.protect,
    });

    await fetch(url, {
      headers: {
        "x-arcjet-ip": "185.199.108.153",
        "x-client-ip": "101.100.100.0",
      },
    });

    await server.close();
    restore();

    assert.deepEqual(ips, ["101.100.100.0"]);
  });

  await t.test("should support `detectBot`", async function () {
    const restore = capture();

    const arcjet = arcjetFastify({
      client: createLocalClient(),
      characteristics: ['http.request.headers["user-agent"]'],
      key: exampleKey,
      rules: [detectBot({ deny: ["CURL"], mode: "LIVE" })],
    });

    const { server, url } = await createSimpleServer({
      decide: arcjet.protect,
    });

    const responseChrome = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
    });

    const responseCurl = await fetch(url, {
      headers: { "user-agent": "curl/7.64.1" },
    });

    await server.close();
    restore();

    assert.equal(responseChrome.status, 200);
    assert.equal(responseCurl.status, 403);
  });

  await t.test("should support `filter`", async function () {
    const restore = capture();

    const arcjet = arcjetFastify({
      client: createLocalClient(),
      characteristics: ['http.request.headers["user-agent"]'],
      key: exampleKey,
      rules: [
        filter({
          deny: ['http.request.headers["user-agent"] ~ "Chrome"'],
          mode: "LIVE",
        }),
      ],
    });

    const { server, url } = await createSimpleServer({
      decide: arcjet.protect,
    });

    const responseChrome = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
    });

    const responseFirefox = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0",
      },
    });

    await server.close();
    restore();

    assert.equal(responseChrome.status, 403);
    assert.equal(responseFirefox.status, 200);
  });

  await t.test("should support `sensitiveInfo`", async function () {
    const restore = capture();

    const arcjet = arcjetFastify({
      client: createLocalClient(),
      key: exampleKey,
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    });

    const { server, url } = await createSimpleServer({
      decide: arcjet.protect,
    });

    const response = await fetch(url, {
      body: "This is fine.",
      method: "POST",
    });

    await server.close();
    restore();

    assert.equal(response.status, 200);
  });

  await t.test(
    "should support reading body before `sensitiveInfo`",
    async function () {
      const restore = capture();
      let body: unknown;

      const arcjet = arcjetFastify({
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        async before(request) {
          body = request.body;
        },
        decide: arcjet.protect,
      });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
        method: "POST",
      });

      await server.close();
      restore();

      assert.equal(body, "My email is alice@arcjet.com");
      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should emit an error log when there is no body",
    async function () {
      const restore = capture();
      let parameters: Array<unknown> | undefined;

      const arcjet = arcjetFastify({
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
        decide: arcjet.protect,
      });

      const response = await fetch(url);

      await server.close();
      restore();

      assert.equal(response.status, 200);
      assert.deepEqual(parameters, [
        "failed to get request body: %s",
        "Cannot read body: body is missing",
      ]);
    },
  );

  // Note: no test for `` should emit an error log when the body is read before `sensitiveInfo` ``,
  // as Fastify uses a body parser.

  await t.test(
    "should support reading body after `sensitiveInfo`",
    async function () {
      const restore = capture();
      let body: unknown;

      const arcjet = arcjetFastify({
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        async after(request) {
          body = request.body;
        },
        decide: arcjet.protect,
      });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
        method: "POST",
      });

      await server.close();
      restore();

      assert.equal(response.status, 403);
      assert.equal(body, "My email is alice@arcjet.com");
    },
  );

  await t.test("should support `sensitiveInfo` on JSON", async function () {
    const restore = capture();

    const arcjet = arcjetFastify({
      client: createLocalClient(),
      key: exampleKey,
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    });

    const { server, url } = await createSimpleServer({
      decide: arcjet.protect,
    });

    const response = await fetch(url, {
      body: JSON.stringify({ message: "My email is alice@arcjet.com" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    await server.close();
    restore();

    assert.equal(response.status, 403);
  });

  // TODO:
  // This could be enabled with <https://github.com/fastify/fastify-multipart>,
  // but that requires `@arcjet/fastify` to do `request.file()` calls.
  // I am not sure if that should be the responsibility of `@arcjet/fastify`,
  // and if that would work for all the other cases where no file was sent.
  //
  // await t.test(
  //   "should support `sensitiveInfo` on form data",
  //   async function () {
  //     const restore = capture();

  //     const arcjet = arcjetFastify({
  //       client: createLocalClient(),
  //       key: exampleKey,
  //       rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
  //     });

  //     const { server, url } = await createSimpleServer({
  //       decide: arcjet.protect,
  //     });

  //     const formData = new FormData();
  //     formData.append("message", "My email is My email is alice@arcjet.com");

  //     const response = await fetch(url, { body: formData, method: "POST" });

  //     await server.close();
  //     restore();

  //     assert.equal(response.status, 403);
  //   },
  // );

  await t.test(
    "should support `sensitiveInfo` on plain text",
    async function () {
      const restore = capture();

      const arcjet = arcjetFastify({
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        decide: arcjet.protect,
      });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
        method: "POST",
      });

      await server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on streamed plain text",
    async function () {
      const restore = capture();

      const arcjet = arcjetFastify({
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        decide: arcjet.protect,
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

      await server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on a megabyte of data",
    async function () {
      const restore = capture();

      const arcjet = arcjetFastify({
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        decide: arcjet.protect,
      });
      const message = "My email is alice@arcjet.com";
      const body = "a".repeat(oneMegabyte - message.length - 1) + " " + message;

      const response = await fetch(url, { body, method: "POST" });

      await server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on 5 megabytes of data (if fastify is so configured)",
    async function () {
      const restore = capture();

      const arcjet = arcjetFastify({
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        decide: arcjet.protect,
        fastifyOptions: { bodyLimit: 5 * oneMegabyte + 1 },
      });
      const message = "My email is alice@arcjet.com";
      const body =
        "a".repeat(5 * oneMegabyte - message.length - 1) + " " + message;

      const response = await fetch(url, { body, method: "POST" });

      await server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` w/ `sensitiveInfoValue`",
    async function () {
      const restore = capture();

      const arcjet = arcjetFastify({
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ allow: [], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        async decide(request) {
          return arcjet.protect(request, {
            sensitiveInfoValue: "My email is alice@arcjet.com",
          });
        },
      });

      const response = await fetch(url);

      await server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test("should support `validateEmail`", async function () {
    const restore = capture();
    let email = "alice@arcjet";

    const arcjet = arcjetFastify({
      client: createLocalClient(),
      key: exampleKey,
      rules: [validateEmail({ allow: [], mode: "LIVE" })],
    });

    const { server, url } = await createSimpleServer({
      async decide(request) {
        return arcjet.protect(request, { email });
      },
    });

    const responseInvalid = await fetch(url);

    email = "alice@arcjet.com";

    const responseValid = await fetch(url);

    await server.close();
    restore();

    assert.equal(responseInvalid.status, 403);
    assert.equal(responseValid.status, 200);
  });

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

    const arcjet = arcjetFastify({
      client: createLocalClient(),
      key: exampleKey,
      rules: [[denySearchAlpha]],
    });

    const { server, url } = await createSimpleServer({
      decide: arcjet.protect,
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

      const arcjet = arcjetFastify({
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

      const arcjet = arcjetFastify({
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
export interface SimpleServerOptions {
  /**
   * Hook after the decision is made.
   */
  after?(request: FastifyRequest): Promise<undefined> | undefined;
  /**
   * Hook before the decision is made.
   */
  before?(request: FastifyRequest): Promise<undefined> | undefined;
  /**
   * Make a decision.
   */
  decide(request: FastifyRequest): Promise<ArcjetDecision>;
  /**
   * Configuration for Fastify.
   */
  fastifyOptions?: FastifyServerOptions | undefined;
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
 * Create an empty context.
 *
 * @returns
 *   Context.
 */
function createArcjetContext(): ArcjetContext {
  return {
    cache: new MemoryCache(),
    characteristics: [],
    fingerprint: "",
    async getBody() {
      throw new Error("Not implemented");
    },
    key: "",
    log: console,
    runtime: "",
  };
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
  const { after, before, decide, fastifyOptions } = options;
  const fastify = Fastify(fastifyOptions);
  const port = uniquePort++;

  // Listed on all routes to all methods (GET, POST, etc.).
  fastify.all("*", async function (request, reply) {
    await before?.(request);
    const decision = await decide(request);
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

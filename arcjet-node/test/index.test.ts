import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { MemoryCache } from "@arcjet/cache";
import type { Client } from "@arcjet/protocol/client.js";
import arcjetNode, {
  type ArcjetCacheEntry,
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
  fixedWindow,
  protectSignup,
  sensitiveInfo,
  shield,
  validateEmail,
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
});

test("`createRemoteClient`", async function (t) {
  await t.test("should create a client", async function () {
    const remoteClient = createRemoteClient({ timeout: 4 });

    assert.equal(typeof remoteClient.decide, "function");
    assert.equal(typeof remoteClient.report, "function");

    await assert.rejects(
      remoteClient.decide(
        { ...createArcjetContext(), log: { ...console, debug() {} } },
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
  });
});

test("`arcjetNode`", async function (t) {
  await t.test(
    "should warn about IP addresses missing in development",
    async function () {
      let parameters: unknown;
      const restore = capture();

      arcjetNode({
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

      arcjetNode({
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

        const arcjet = arcjetNode({
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

        const arcjet = arcjetNode({
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

      const arcjet = arcjetNode({
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
          host: "localhost:3302",
        },
        host: "localhost:3302",
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

      const arcjetBase = arcjetNode({
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

    await t.test(
      "returned ArcjetNode#protect should accept the correct properties",
      async function () {
        const restore = capture();

        const arcjetBase = arcjetNode({
          client: createLocalClient(),
          characteristics: ['http.request.headers["user-agent"]'],
          key: exampleKey,
          rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
        });

        const arcjetBasePlusShield = arcjetBase.withRule(
          shield({ mode: "LIVE" }),
        );

        const arcjetBasePlusShieldPlusCharacteristic =
          arcjetBasePlusShield.withRule(
            fixedWindow({
              window: 60,
              max: 100,
              mode: "LIVE",
              characteristics: ["customcharacteristic"],
            }),
          );

        const arcjetBasePlusProtectSignup = arcjetBase.withRule(
          protectSignup({
            bots: { allow: [], mode: "LIVE" },
            email: { allow: [], mode: "LIVE" },
            rateLimit: {
              interval: 60,
              max: 5,
              mode: "LIVE",
              characteristics: ["anothercustomcharacteristic"],
            },
          }),
        );

        const arcjetKitchenSink =
          arcjetBasePlusShieldPlusCharacteristic.withRule(
            protectSignup({
              bots: { allow: [], mode: "LIVE" },
              email: { allow: [], mode: "LIVE" },
              rateLimit: { interval: 60, max: 5, mode: "LIVE" },
            }),
          );

        const { server, url } = await createSimpleServer({
          async decide(request) {
            /* Validate properties are accepted as expected */
            await arcjetBase.protect(request);
            await arcjetBase.protect(request, {
              sensitiveInfoValue: "555-555-5555",
            });
            await arcjetBasePlusShield.protect(request);
            await arcjetBasePlusShield.protect(request, {
              sensitiveInfoValue: "555-555-5555",
            });
            await arcjetBasePlusShieldPlusCharacteristic.protect(request, {
              customcharacteristic: "customvalue",
            });
            await arcjetBasePlusShieldPlusCharacteristic.protect(request, {
              customcharacteristic: "customvalue",
              sensitiveInfoValue: "555-555-5555",
            });
            await arcjetBasePlusProtectSignup.protect(request, {
              anothercustomcharacteristic: "anothercustomvalue",
              email: "alice@arcjet.com",
            });
            await arcjetBasePlusProtectSignup.protect(request, {
              anothercustomcharacteristic: "anothercustomvalue",
              email: "alice@arcjet.com",
              sensitiveInfoValue: "555-555-5555",
            });
            await arcjetKitchenSink.protect(request, {
              customcharacteristic: "customvalue",
              email: "alice@arcjet.com",
            });
            return arcjetKitchenSink.protect(request, {
              customcharacteristic: "customvalue",
              email: "alice@arcjet.com",
              sensitiveInfoValue: "Not a phone number.",
            });
          },
        });

        const responseChrome = await fetch(url, {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
          },
        });

        await server.close();
        restore();

        assert.equal(responseChrome.status, 200);
      },
    );
  });

  await t.test("should support `options.proxies`", async function () {
    const restore = capture();

    const ips: Array<unknown> = [];

    const arcjet = arcjetNode({
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

    const arcjet = arcjetNode({
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

    const arcjet = arcjetNode({
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

    const arcjet = arcjetNode({
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

    const arcjet = arcjetNode({
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
    const warnings: Array<Array<unknown>> = [];

    // TODO: a warning message we assert on (see below) depends on a boolean in
    //       module scope. Here we force a fresh import to reset that.
    const { default: arcjetNodeIsolated }: { default: typeof arcjetNode } =
      await import(`../index.js?t=${Date.now()}`);

    const arcjet = arcjetNodeIsolated({
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

    const { server, url } = await createSimpleServer({
      decide: arcjet.protect,
    });

    const response = await fetch(url, {
      body: "This is fine.",
      method: "POST",
    });

    server.close();
    restore();

    assert.equal(response.status, 200);
    assert.deepEqual(warnings, [
      [
        "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
      ],
      // TODO: this message depends on a boolean in module scope which is not reset between tests.
      [
        "Automatically reading the request body is deprecated; please pass an explicit `sensitiveInfoValue` field. See <https://docs.arcjet.com/upgrading/sdk-migration>.",
      ],
    ]);
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
        decide: arcjet.protect,
      });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
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
      decide: arcjet.protect,
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
        decide: arcjet.protect,
      });

      const formData = new FormData();
      formData.append("message", "My email is My email is alice@arcjet.com");

      const response = await fetch(url, { body: formData, method: "POST" });

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
        decide: arcjet.protect,
      });

      const response = await fetch(url, {
        body: "My email is alice@arcjet.com",
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

      server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on a megabyte of data",
    async function () {
      const restore = capture();

      const arcjet = arcjetNode({
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

      server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  // TODO(GH-4562): this is hardcoded in `arcjet-node` currently to allow up to 1mb.
  // Make configurable and document.
  await t.test(
    "should not support `sensitiveInfo` on 5 megabytes of data",
    async function () {
      const restore = capture();
      let parameters: Array<unknown> | undefined;

      const arcjet = arcjetNode({
        client: createLocalClient(),
        key: exampleKey,
        log: {
          ...console,
          debug() {},
          warn() {},
          error(...rest) {
            parameters = rest;
          },
        },
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        decide: arcjet.protect,
      });
      const message = "My email is alice@arcjet.com";
      const body =
        "a".repeat(5 * oneMegabyte - message.length - 1) + " " + message;

      const response = await fetch(url, { body, method: "POST" });

      server.close();
      restore();

      assert.equal(response.status, 200);
      assert.deepEqual(parameters, [
        "failed to get request body: %s",
        "Cannot read stream whose expected length exceeds limit",
      ]);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on string data exposed through a `body-parser` like method",
    async function () {
      const restore = capture();

      const arcjet = arcjetNode({
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        async before(request) {
          return new Promise(function (resolve) {
            request.on("data", function (chunk) {
              // Consume.
            });
            request.on("end", function () {
              // @ts-expect-error: non-standard but common field.
              request.body = "My email is alice@arcjet.com";
              resolve(undefined);
            });
          });
        },
        decide: arcjet.protect,
      });

      const response = await fetch(url, { body: "fine", method: "POST" });

      server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on JSON data exposed through a `body-parser` like method",
    async function () {
      const restore = capture();

      const arcjet = arcjetNode({
        client: createLocalClient(),
        key: exampleKey,
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const { server, url } = await createSimpleServer({
        async before(request) {
          return new Promise(function (resolve) {
            request.on("data", function (chunk) {
              // Consume.
            });
            request.on("end", function () {
              // @ts-expect-error: non-standard but common field.
              request.body = { message: "My email is alice@arcjet.com" };
              resolve(undefined);
            });
          });
        },
        decide: arcjet.protect,
      });

      const response = await fetch(url, { body: "fine", method: "POST" });

      server.close();
      restore();

      assert.equal(response.status, 403);
    },
  );

  await t.test(
    "should support `sensitiveInfo` w/ `sensitiveInfoValue`",
    async function () {
      const restore = capture();

      const arcjet = arcjetNode({
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

    const arcjet = arcjetNode({
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

  await t.test("should support `protectSignup`", async function () {
    const restore = capture();
    let email = "alice";

    const arcjet = arcjetNode({
      characteristics: ['http.request.headers["user-agent"]', "ip.src"],
      client: createLocalClient(),
      key: exampleKey,
      rules: [
        protectSignup({
          bots: { allow: [], mode: "LIVE" },
          email: { allow: [], mode: "LIVE" },
          rateLimit: { interval: 60, max: 5, mode: "LIVE" },
        }),
      ],
    });

    const { server, url } = await createSimpleServer({
      async decide(request) {
        return arcjet.protect(request, { email });
      },
    });

    const responseEmailInvalid = await fetch(url);

    email = "alice@arcjet.com";

    const responseEmailValid = await fetch(url);

    const responseUserAgentBot = await fetch(url, {
      headers: {
        "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
      },
    });

    const responseUserAgentBrowser = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      },
    });

    // No tests for rate limiting as that happens remotely.

    await server.close();
    restore();

    assert.equal(responseEmailInvalid.status, 403);
    assert.equal(responseEmailValid.status, 200);
    assert.equal(responseUserAgentBot.status, 403);
    assert.equal(responseUserAgentBrowser.status, 200);
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

    const arcjet = arcjetNode({
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
 * Create an empty context.
 *
 * @returns
 *   Context.
 */
function createArcjetContext(): ArcjetContext {
  return {
    cache: new MemoryCache<ArcjetCacheEntry>(),
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

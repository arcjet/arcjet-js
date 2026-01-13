import assert from "node:assert/strict";
import test from "node:test";
import { MemoryCache } from "@arcjet/cache";
import arcjet, {
  type ArcjetContext,
  type ArcjetLogger,
  type ArcjetRule,
  ArcjetReason,
  createRemoteClient,
  detectBot,
  sensitiveInfo,
} from "../index.js";

test("@arcjet/react-router", async function (t) {
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
        {
          ...createArcjetContext(),
          log: { ...createArcjetLogger(), debug() {} },
        },
        { headers: new Headers() },
        [],
      ),
      /the operation timed out/,
    );
  });
});

test("`default`", async function (t) {
  await t.test("construction", async function (t) {
    await t.test("should create an integration", async function () {
      const integration = arcjet({
        key: "",
        rules: [],
      });

      assert.equal(typeof integration.protect, "function");
      assert.equal(typeof integration.withRule, "function");
    });

    await t.test(
      "should warn about IP addresses missing in development",
      async function () {
        let parameters: unknown;
        const arcjetEnv = process.env.ARCJET_ENV;
        const mode = process.env.MODE;
        const nodeEnv = process.env.NODE_ENV;
        process.env.ARCJET_ENV = "development";
        process.env.MODE = "";
        process.env.NODE_ENV = "";

        arcjet({
          key: "",
          log: {
            ...createArcjetLogger(),
            warn(...rest) {
              parameters = rest;
            },
          },
          rules: [],
        });

        process.env.ARCJET_ENV = arcjetEnv;
        process.env.MODE = mode;
        process.env.NODE_ENV = nodeEnv;

        assert.deepEqual(parameters, [
          "Arcjet will use `127.0.0.1` when missing public IP address in development mode",
        ]);
      },
    );

    await t.test(
      "should not warn about IP addresses missing when not in development",
      async function () {
        let called = false;
        const arcjetEnv = process.env.ARCJET_ENV;
        const mode = process.env.MODE;
        const nodeEnv = process.env.NODE_ENV;
        process.env.ARCJET_ENV = "";
        process.env.MODE = "";
        process.env.NODE_ENV = "";

        arcjet({
          key: "",
          log: {
            ...createArcjetLogger(),
            warn(...rest) {
              called = true;
            },
          },
          rules: [],
        });

        process.env.ARCJET_ENV = arcjetEnv;
        process.env.MODE = mode;
        process.env.NODE_ENV = nodeEnv;

        assert.equal(called, false);
      },
    );
  });

  await t.test("`protect()`", async function (t) {
    await t.test(
      "should warn about IPs missing in non-development",
      async function () {
        let parameters: unknown;
        const arcjetEnv = process.env.ARCJET_ENV;
        const mode = process.env.MODE;
        const nodeEnv = process.env.NODE_ENV;
        process.env.ARCJET_ENV = "";
        process.env.MODE = "";
        process.env.NODE_ENV = "";

        const integration = arcjet({
          client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
          key: "",
          log: {
            debug() {},
            error() {},
            info() {},
            warn(...rest) {
              parameters = rest;
            },
          },
          rules: [detectBot({ deny: ["CURL"], mode: "LIVE" })],
        });

        // Not called when constructing.
        assert.deepEqual(parameters, undefined);

        await integration.protect({
          request: new Request("https://example.com/"),
        });

        process.env.ARCJET_ENV = arcjetEnv;
        process.env.MODE = mode;
        process.env.NODE_ENV = nodeEnv;

        // Called when calling `protect()`.
        assert.deepEqual(parameters, [
          "Cannot find client IP address; if this is a development environment, set the `ARCJET_ENV` environment variable to `development`; in production, provide `context.ip` or an `x-client-ip` (or similar) header",
        ]);
      },
    );

    await t.test(
      "should not warn about IPs missing in development",
      async function () {
        let parameters: unknown;
        const arcjetEnv = process.env.ARCJET_ENV;
        const mode = process.env.MODE;
        const nodeEnv = process.env.NODE_ENV;
        process.env.ARCJET_ENV = "development";
        process.env.MODE = "";
        process.env.NODE_ENV = "";

        const integration = arcjet({
          client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
          key: "",
          log: {
            debug() {},
            error() {},
            info() {},
            warn(...rest) {
              parameters = rest;
            },
          },
          rules: [detectBot({ deny: ["CURL"], mode: "LIVE" })],
        });

        // Called when constructing, so set to `undefined` again.
        parameters = undefined;

        await integration.protect({
          request: new Request("https://example.com/"),
        });

        process.env.ARCJET_ENV = arcjetEnv;
        process.env.MODE = mode;
        process.env.NODE_ENV = nodeEnv;

        // Not called when calling `protect()`.
        assert.deepEqual(parameters, undefined);
      },
    );

    await t.test("should support `options.proxies`", async function () {
      let ip: unknown;
      const rule: ArcjetRule<{}> = {
        mode: "LIVE",
        priority: 0,
        async protect(_, request) {
          ip = request.ip;
          return {
            conclusion: "ALLOW",
            fingerprint: "",
            isDenied() {
              return false;
            },
            reason: new ArcjetReason(),
            ruleId: "",
            state: "RUN",
            ttl: 0,
          };
        },
        validate() {},
        version: 0,
        type: "",
      };

      const integration = arcjet({
        client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
        key: "",
        log: { ...createArcjetLogger(), debug() {}, info() {} },
        proxies: ["100.100.100.0/24"],
        rules: [[rule]],
      });

      await integration.protect({
        request: new Request("https://example.com/", {
          headers: { "x-forwarded-for": "185.199.108.153, 101.100.100.0" },
        }),
      });

      // The last in a list is used normally.
      assert.equal(ip, "101.100.100.0");

      await integration.protect({
        request: new Request("https://example.com/", {
          headers: { "x-forwarded-for": "185.199.108.153, 100.100.100.0" },
        }),
      });

      // If those are matched by `proxies` then earlier ones are used.
      assert.equal(ip, "185.199.108.153");
    });

    await t.test(
      "should prefer `x-arcjet-ip` in development",
      async function () {
        let ip: unknown;
        const arcjetEnv = process.env.ARCJET_ENV;
        const mode = process.env.MODE;
        const nodeEnv = process.env.NODE_ENV;
        process.env.ARCJET_ENV = "development";
        process.env.MODE = "";
        process.env.NODE_ENV = "";

        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 0,
          async protect(_, request) {
            ip = request.ip;
            return {
              conclusion: "ALLOW",
              fingerprint: "",
              isDenied() {
                return false;
              },
              reason: new ArcjetReason(),
              ruleId: "",
              state: "RUN",
              ttl: 0,
            };
          },
          validate() {},
          version: 0,
          type: "",
        };

        const integration = arcjet({
          client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
          key: "",
          log: { ...createArcjetLogger(), debug() {}, info() {} },
          rules: [[rule]],
        });

        await integration.protect({
          request: new Request("https://example.com/", {
            headers: {
              "x-arcjet-ip": "185.199.108.153",
              "x-client-ip": "101.100.100.0",
            },
          }),
        });

        process.env.ARCJET_ENV = arcjetEnv;
        process.env.MODE = mode;
        process.env.NODE_ENV = nodeEnv;
        assert.equal(ip, "185.199.108.153");
      },
    );

    await t.test(
      "should ignore `x-arcjet-ip` in production",
      async function () {
        let ip: unknown;
        const arcjetEnv = process.env.ARCJET_ENV;
        const mode = process.env.MODE;
        const nodeEnv = process.env.NODE_ENV;
        process.env.ARCJET_ENV = "production";
        process.env.MODE = "";
        process.env.NODE_ENV = "";

        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 0,
          async protect(_, request) {
            ip = request.ip;
            return {
              conclusion: "ALLOW",
              fingerprint: "",
              isDenied() {
                return false;
              },
              reason: new ArcjetReason(),
              ruleId: "",
              state: "RUN",
              ttl: 0,
            };
          },
          validate() {},
          version: 0,
          type: "",
        };

        const integration = arcjet({
          client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
          key: "",
          log: { ...createArcjetLogger(), debug() {}, info() {} },
          rules: [[rule]],
        });

        await integration.protect({
          request: new Request("https://example.com/", {
            headers: {
              "x-arcjet-ip": "185.199.108.153",
              "x-client-ip": "101.100.100.0",
            },
          }),
        });

        process.env.ARCJET_ENV = arcjetEnv;
        process.env.MODE = mode;
        process.env.NODE_ENV = nodeEnv;

        assert.equal(ip, "101.100.100.0");
      },
    );

    await t.test(
      "should prefer an IP from `details.context`",
      async function () {
        let ip: unknown;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 0,
          async protect(_, request) {
            ip = request.ip;
            return {
              conclusion: "ALLOW",
              fingerprint: "",
              isDenied() {
                return false;
              },
              reason: new ArcjetReason(),
              ruleId: "",
              state: "RUN",
              ttl: 0,
            };
          },
          validate() {},
          version: 0,
          type: "",
        };

        const integration = arcjet({
          client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
          key: "",
          log: { ...createArcjetLogger(), debug() {}, info() {} },
          rules: [[rule]],
        });

        await integration.protect({
          request: new Request("https://example.com/", {
            headers: { "x-client-ip": "185.199.108.153" },
          }),
        });

        // Baseline: uses IP from headers.
        assert.equal(ip, "185.199.108.153");

        await integration.protect({
          request: new Request("https://example.com/", {
            headers: { "x-client-ip": "185.199.108.153" },
          }),
          context: { ip: "185.199.109.153" },
        });

        // Prefers `context.ip`.
        assert.equal(ip, "185.199.109.153");
      },
    );

    await t.test("should attempt to connect", async function () {
      const integration = arcjet({
        client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
        key: "",
        log: {
          debug() {},
          error() {},
          info() {},
          warn() {},
        },
        rules: [],
      });

      const result = await integration.protect({
        request: new Request("https://example.com/", {
          headers: { "x-client-ip": "185.199.108.153" },
        }),
      });

      assert.ok(result.isErrored());
      assert.match(result.reason.message, /\[unavailable\]/);
    });

    await t.test("should work", async function () {
      const integration = arcjet({
        client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
        key: "",
        log: {
          debug() {},
          error() {},
          info() {},
          warn() {},
        },
        rules: [detectBot({ deny: ["CATEGORY:AI", "CURL"], mode: "LIVE" })],
      });

      const result = await integration.protect({
        request: new Request("https://example.com/", {
          headers: {
            "x-client-ip": "185.199.108.153",
            "user-agent": "curl/7.65.3",
          },
        }),
      });

      assert.ok(result.isDenied());
      assert.ok(result.reason.isBot());
      assert.deepEqual(result.reason.denied, ["CURL"]);

      const otherResult = await integration.protect({
        request: new Request("https://example.com/", {
          headers: {
            // Different IP to avoid caching.
            "x-client-ip": "185.199.109.153",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
        }),
      });

      // Error because this attempts to connect.
      assert.ok(otherResult.isErrored());
    });

    await t.test("should read from body", async function () {
      const integration = arcjet({
        client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
        key: "",
        log: {
          debug() {},
          error() {},
          info() {},
          warn() {},
        },
        rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
      });

      const request = new Request("https://example.com/", {
        body: "email test@example.com phone 011234567 ip 10.12.234.2",
        headers: { "x-client-ip": "185.199.108.153" },
        method: "POST",
      });
      const result = await integration.protect({ request });

      assert.ok(result.isDenied());
      assert.ok(result.reason.isSensitiveInfo());
      assert.deepEqual(result.reason.denied, [
        { start: 6, end: 22, identifiedType: "EMAIL" },
      ]);
    });

    await t.test(
      "should swallow errors thrown while reading body",
      async function () {
        let parameters: unknown;
        const integration = arcjet({
          client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
          key: "",
          log: {
            debug() {},
            error(...rest) {
              parameters = rest;
            },
            info() {},
            warn() {},
          },
          rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
        });

        const request = new Request("https://example.com/", {
          body: {
            [Symbol.asyncIterator]() {
              return {
                next() {
                  return Promise.reject(new Error("boom!"));
                },
              };
            },
          },
          duplex: "half",
          headers: { "x-client-ip": "185.199.108.153" },
          method: "POST",
        });
        const result = await integration.protect({ request });

        assert.deepEqual(parameters, [
          "failed to get request body: %s",
          "boom!",
        ]);
        assert.ok(result.isErrored());
        assert.match(result.reason.message, /\[unavailable\]/);
      },
    );
  });

  await t.test("`withRule()`", async function (t) {
    await t.test("should work", async function () {
      const baseIntegration = arcjet({
        client: createRemoteClient({ baseUrl: "https://localhost:63837" }),
        key: "",
        log: {
          debug() {},
          error() {},
          info() {},
          warn() {},
        },
        rules: [],
      });

      const integration = baseIntegration.withRule(
        detectBot({ deny: ["CATEGORY:AI", "CURL"], mode: "LIVE" }),
      );

      const request = new Request("https://example.com/");
      request.headers.set("user-agent", "curl/7.65.3");
      request.headers.set("x-client-ip", "185.199.108.153");
      const result = await integration.protect({ request });

      assert.ok(result.isDenied());
      assert.ok(result.reason.isBot());
      assert.deepEqual(result.reason.denied, ["CURL"]);
    });
  });
});

function createArcjetContext(): ArcjetContext {
  return {
    cache: new MemoryCache(),
    characteristics: [],
    fingerprint: "",
    async getBody() {
      throw new Error("Not implemented");
    },
    key: "",
    log: createArcjetLogger(),
    runtime: "",
  };
}

function createArcjetLogger(): ArcjetLogger {
  return {
    debug(...rest) {
      console.debug(...rest);
    },
    error(...rest) {
      console.error(...rest);
    },
    info(...rest) {
      console.info(...rest);
    },
    warn(...rest) {
      console.warn(...rest);
    },
  };
}

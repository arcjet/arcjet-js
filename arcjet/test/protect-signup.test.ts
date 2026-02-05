import assert from "node:assert/strict";
import test from "node:test";
import { MemoryCache } from "@arcjet/cache";
import type { Client } from "@arcjet/protocol/client.js";
import arcjet, {
  type ArcjetCacheEntry,
  type ArcjetContext,
  type ArcjetRequest,
  ArcjetAllowDecision,
  ArcjetReason,
  protectSignup,
} from "../index.js";

const exampleKey = "ajkey_yourkey";

test("`protectSignup`", async function (t) {
  await t.test("should throw w/o options", async function () {
    // TODO: better error message, not a type error but about `options`.
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      protectSignup();
    }, /Cannot read properties of undefined/);
  });

  await t.test(
    "should throw w/o `email`, `rateLimit` options",
    async function () {
      assert.throws(function () {
        // @ts-expect-error: test runtime behavior.
        protectSignup({ bots: { allow: [] } });
        // TODO: better error message, not about `slidingWindow` but about the `rateLimit` field.
      }, /`slidingWindow` options error: expected object/);
    },
  );

  await t.test(
    "should throw w/o `bots`, `rateLimit` options",
    async function () {
      assert.throws(function () {
        // @ts-expect-error: test runtime behavior.
        protectSignup({ email: { allow: [] } });
        // TODO: better error message, not about `slidingWindow` but about the `rateLimit` field.
      }, /`slidingWindow` options error: expected object/);
    },
  );

  await t.test("should throw w/o `bots`, `email` options", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      protectSignup({ rateLimit: { interval: 60, max: 5 } });
      // TODO: better error message, not about `detectBot` but about the `bots` field.
    }, /`detectBot` options error: expected object/);
  });

  await t.test("should throw w/o `bots` options", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      protectSignup({
        email: { allow: [] },
        rateLimit: { interval: 60, max: 5 },
      });
      // TODO: better error message, not about `detectBot` but about the `bots` field.
    }, /`detectBot` options error: expected object/);
  });

  await t.test("should throw w/o `email` options", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      protectSignup({
        bots: { allow: [] },
        rateLimit: { interval: 60, max: 5 },
      });
      // TODO: better error message, not about `validateEmail` but about the `email` field.
    }, /`validateEmail` options error: expected object/);
  });

  await t.test("should throw w/o `rateLimit` options", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      protectSignup({ bots: { allow: [] }, email: { allow: [] } });
      // TODO: better error message, not about `slidingWindow` but about the `rateLimit` field.
    }, /`slidingWindow` options error: expected object/);
  });

  await t.test(
    "should not throw w/ `bots`, `email`, and `rateLimit` options",
    async function () {
      assert.doesNotThrow(function () {
        protectSignup({
          bots: { allow: [] },
          email: { allow: [] },
          rateLimit: { interval: 60, max: 5 },
        });
      });
    },
  );

  // More specific tests for all fields in options are in `detect-bots.test.ts`,
  // `rate-limit.test.ts`, and `validate-email.test.ts`.
});

test("`arcjet` w/ `protectSignup()`", async function (t) {
  await t.test(
    "should log and yield an allow decision w/o `email`",
    async function () {
      let errorParameters: unknown;
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: {
          ...console,
          debug() {},
          error(...parameters) {
            errorParameters = parameters;
          },
        },
        rules: [
          protectSignup({
            bots: { allow: [], mode: "LIVE" },
            email: { allow: [], mode: "LIVE" },
            rateLimit: { interval: 60, max: 5, mode: "LIVE" },
          }),
        ],
      });

      const decision = await instance.protect(
        createContext(),
        // @ts-expect-error: this type error is expected.
        createRequest(),
      );

      // It’s an `allow` because it’s a configuration error.
      assert.equal(decision.conclusion, "ALLOW");
      assert.deepEqual(errorParameters, [
        "Failure running rule: %s due to %s",
        "EMAIL",
        "ValidateEmail requires `email` to be set.",
      ]);
    },
  );

  await t.test(
    "should yield a deny decision w/ an invalid `email`",
    async function () {
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [
          protectSignup({
            bots: { allow: [], mode: "LIVE" },
            email: { allow: [], mode: "LIVE" },
            rateLimit: { interval: 60, max: 5, mode: "LIVE" },
          }),
        ],
      });

      const decision = await instance.protect(createContext(), {
        ...createRequest(),
        email: "alice",
      });

      assert.equal(decision.conclusion, "DENY");
    },
  );

  await t.test(
    "should yield an allow decision w/ a valid `email`",
    async function () {
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [
          protectSignup({
            bots: { allow: [], mode: "LIVE" },
            email: { allow: [], mode: "LIVE" },
            rateLimit: { interval: 60, max: 5, mode: "LIVE" },
          }),
        ],
      });

      const decision = await instance.protect(createContext(), {
        ...createRequest(),
        email: "alice@arcjet.com",
      });

      assert.equal(decision.conclusion, "ALLOW");
    },
  );

  await t.test(
    "should yield a deny decision w/ a bot user agent",
    async function () {
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [
          protectSignup({
            bots: { allow: [], mode: "LIVE" },
            email: { allow: [], mode: "LIVE" },
            rateLimit: { interval: 60, max: 5, mode: "LIVE" },
          }),
        ],
      });

      const decision = await instance.protect(createContext(), {
        ...createRequest(),
        email: "alice@arcjet.com",
        headers: {
          "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
        },
      });

      assert.equal(decision.conclusion, "DENY");
    },
  );

  await t.test(
    "should yield an allow decision w/ a browser user agent",
    async function () {
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [
          protectSignup({
            bots: { allow: [], mode: "LIVE" },
            email: { allow: [], mode: "LIVE" },
            rateLimit: { interval: 60, max: 5, mode: "LIVE" },
          }),
        ],
      });

      const decision = await instance.protect(createContext(), {
        ...createRequest(),
        email: "alice@arcjet.com",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        },
      });

      assert.equal(decision.conclusion, "ALLOW");
    },
  );

  // No tests for rate limiting as that happens remotely.
});

/**
 * Create empty values for context.
 *
 * @returns
 *   Context.
 */
function createContext(): ArcjetContext {
  return {
    cache: new MemoryCache<ArcjetCacheEntry>(),
    characteristics: [],
    fingerprint: "a",
    getBody() {
      throw new Error("Not implemented");
    },
    key: "b",
    log: console,
    runtime: "c",
  };
}

/**
 * Create an empty client to not hit the internet but always decide as allow
 * and never report.
 *
 * @returns
 *   Client.
 */
function createLocalClient(): Client {
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
 * Create empty values for a request.
 *
 * @returns
 *   Details.
 */
function createRequest(): ArcjetRequest<{}> {
  return {
    cookies: "NEXT_LOCALE=en-US",
    extra: {},
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    },
    host: "localhost:3000",
    ip: "127.0.0.1",
    method: "GET",
    path: "/bot-protection/quick-start",
    protocol: "http:",
    query: "?q=alpha",
  };
}

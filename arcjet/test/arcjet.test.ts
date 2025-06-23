import assert from "node:assert/strict";
import { describe, test, mock } from "node:test";

import type { ArcjetRule, Arcjet } from "../index.js";
import arcjet, {
  detectBot,
  validateEmail,
  protectSignup,
  ArcjetAllowDecision,
  ArcjetDenyDecision,
  ArcjetErrorDecision,
  ArcjetChallengeDecision,
  ArcjetReason,
  ArcjetErrorReason,
  ArcjetRuleResult,
  ArcjetEmailReason,
  ArcjetBotReason,
  ArcjetRateLimitReason,
  fixedWindow,
  tokenBucket,
  slidingWindow,
  shield,
  sensitiveInfo,
  ArcjetSensitiveInfoReason,
  ArcjetShieldReason,
} from "../index.js";

// Type helpers from https://github.com/sindresorhus/type-fest but adjusted for
// our use.
//
// IsEqual:
// https://github.com/sindresorhus/type-fest/blob/e02f228f6391bb2b26c32a55dfe1e3aa2386d515/source/is-equal.d.ts
//
// Licensed: MIT License Copyright (c) Sindre Sorhus <sindresorhus@gmail.com>
// (https://sindresorhus.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright
// notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
type IsEqual<A, B> =
  (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
    ? true
    : false;

// Type testing utilities
type Assert<T extends true> = T;
type Props<P extends ArcjetRule[]> =
  P extends Array<ArcjetRule<infer Props>> ? Props : never;
type RuleProps<P extends ArcjetRule[], E> = IsEqual<Props<P>, E>;
type SDKProps<SDK, E> = IsEqual<SDK extends Arcjet<infer P> ? P : never, E>;

// In Node 18,
// instances of `Headers` contain symbols that may be different depending on if
// they have been iterated or not,
// here we turn them into a regular object for easier comparison.
// The rest of the request is just plain json.
function requestAsJson(value: unknown): object {
  assert(value);
  assert(typeof value === "object");
  assert("headers" in value);
  assert(value.headers);
  assert(value.headers instanceof Headers);
  return { ...value, headers: Object.fromEntries(value.headers) };
}

class ArcjetTestReason extends ArcjetReason {}

class TestCache {
  get = mock.fn<() => Promise<[unknown, number]>>(async () => [undefined, 0]);
  set = mock.fn();
}

function mockLogger() {
  return {
    time: mock.fn(),
    timeEnd: mock.fn(),
    debug: mock.fn(),
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
  };
}

describe("ArcjetDecision", () => {
  test("will default the `id` property if not specified", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    assert.match(decision.id, /^lreq_/);
  });

  test("the `id` property if to be specified to the constructor", () => {
    const decision = new ArcjetAllowDecision({
      id: "abc_123",
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    assert.equal(decision.id, "abc_123");
  });

  // TODO: This test doesn't make sense anymore
  test("an ERROR decision can be constructed with an Error object", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason(new Error("Foo bar baz")),
      results: [],
    });
    assert.ok(decision.reason instanceof ArcjetErrorReason);
    assert.equal(decision.reason.message, "Foo bar baz");
  });

  // TODO: This test doesn't make sense anymore
  test("an ERROR decision can be constructed with a string message", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Boom!"),
      results: [],
    });
    assert.ok(decision.reason instanceof ArcjetErrorReason);
    assert.equal(decision.reason.message, "Boom!");
  });

  // TODO: This test doesn't make sense anymore
  test("use an unknown error for an ERROR decision constructed with other types", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason(["not", "valid", "error"]),
      results: [],
    });
    assert.ok(decision.reason instanceof ArcjetErrorReason);
    assert.equal(decision.reason.message, "Unknown error occurred");
  });

  test("`isAllowed()` returns true when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    assert.equal(decision.isAllowed(), true);
  });

  test("`isAllowed()` returns true when type is ERROR (fail open)", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    assert.equal(decision.isAllowed(), true);
  });

  test("`isAllowed()` returns false when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    assert.equal(decision.isAllowed(), false);
  });

  test("`isDenied()` returns false when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    assert.equal(decision.isDenied(), false);
  });

  test("`isDenied()` returns false when type is ERROR (fail open)", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    assert.equal(decision.isDenied(), false);
  });

  test("`isDenied()` returns true when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    assert.equal(decision.isDenied(), true);
  });

  test("`isChallenged()` returns true when type is CHALLENGE", () => {
    const decision = new ArcjetChallengeDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    assert.equal(decision.isChallenged(), true);
  });

  test("`isErrored()` returns false when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    assert.equal(decision.isErrored(), false);
  });

  test("`isErrored()` returns false when type is ERROR", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    assert.equal(decision.isErrored(), true);
  });

  test("`isErrored()` returns false when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    assert.equal(decision.isErrored(), false);
  });

  test("`isRateLimit()` returns true when reason is RATE_LIMIT", () => {
    const reason = new ArcjetRateLimitReason({
      max: 0,
      remaining: 0,
      reset: 100,
      window: 100,
    });
    assert.equal(reason.isRateLimit(), true);
  });

  test("`isRateLimit()` returns true when reason is not RATE_LIMIT", () => {
    const reason = new ArcjetTestReason();
    assert.equal(reason.isRateLimit(), false);
  });

  test("`isBot()` returns true when reason is BOT", () => {
    const reason = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: false,
    });
    assert.equal(reason.isBot(), true);
  });

  test("isVerified() returns the correct value", () => {
    const reasonTrue = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: true,
      spoofed: false,
    });
    assert.equal(reasonTrue.isVerified(), true);
    const reasonFalse = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: false,
    });
    assert.equal(reasonFalse.isVerified(), false);
  });

  test("isSpoofed() returns the correct value", () => {
    const reasonTrue = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: true,
    });
    assert.equal(reasonTrue.isSpoofed(), true);
    const reasonFalse = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: false,
    });
    assert.equal(reasonFalse.isSpoofed(), false);
  });

  test("`isBot()` returns false when reason is not BOT", () => {
    const reason = new ArcjetTestReason();
    assert.equal(reason.isBot(), false);
  });
});

describe("Primitive > detectBot", () => {
  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      detectBot({
        // @ts-expect-error
        mode: "INVALID",
        allow: [],
      });
    }, /`detectBot` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("validates `allow` option is array if set", async () => {
    assert.throws(() => {
      const _ = detectBot({
        // @ts-expect-error
        allow: "abc",
      });
    }, /detectBot` options error: invalid type for `allow` - expected an array/);
  });

  test("validates `allow` option only contains strings", async () => {
    assert.throws(() => {
      const _ = detectBot({
        // @ts-expect-error
        allow: [/abc/],
      });
    }, /detectBot` options error: invalid type for `allow\[0]` - expected string/);
  });

  test("validates `deny` option is an array if set", async () => {
    assert.throws(() => {
      const _ = detectBot({
        // @ts-expect-error
        deny: "abc",
      });
    }, /detectBot` options error: invalid type for `deny` - expected an array/);
  });

  test("validates `deny` option only contains strings", async () => {
    assert.throws(() => {
      const _ = detectBot({
        // @ts-expect-error
        deny: [/abc/],
      });
    }, /detectBot` options error: invalid type for `deny\[0]` - expected string/);
  });

  test("validates `allow` and `deny` options are not specified together", async () => {
    assert.throws(() => {
      const _ = detectBot(
        // @ts-expect-error
        {
          allow: ["CURL"],
          deny: ["GOOGLE_ADSBOT"],
        },
      );
    }, /`detectBot` options error: `allow` and `deny` cannot be provided together/);
  });

  test("validates either `allow` or `deny` option is specified", async () => {
    assert.throws(() => {
      const _ = detectBot(
        // @ts-expect-error
        {},
      );
    }, /`detectBot` options error: either `allow` or `deny` must be specified/);
  });

  test("throws via `validate()` if headers is undefined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      headers: undefined,
    };

    const [rule] = detectBot({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "BOT");
    assert.throws(() => {
      const _ = rule.validate(context, details);
    });
  });

  test("throws via `validate()` if headers does not extend Headers", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      headers: {},
    };

    const [rule] = detectBot({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "BOT");
    assert.throws(() => {
      const _ = rule.validate(
        context,
        //@ts-expect-error
        details,
      );
    });
  });

  test("throws via `validate()` if user-agent header is missing", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = detectBot({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "BOT");
    assert.throws(() => {
      const _ = rule.validate(context, details);
    });
  });

  test("uses cache", async () => {
    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetBotReason({
          allowed: [],
          denied: ["CURL"],
          verified: false,
          spoofed: false,
        }),
      },
      10,
    ]);
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache,
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "BOT");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 1);
    assert.deepEqual(cache.get.mock.calls[0].arguments, [
      "84d7c3e132098fafcd8076e0d70154224336f5de91e23c1e538f203e5e46735f",
      "test-fingerprint",
    ]);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, ["CURL"]);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "CACHED");
    assert.equal(result.ttl, 10);
  });

  test("denies curl", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "BOT");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, ["CURL"]);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "RUN");
  });

  test("produces a dry run result in DRY_RUN mode", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot({
      mode: "DRY_RUN",
      allow: [],
    });
    assert.equal(rule.type, "BOT");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, ["CURL"]);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "DRY_RUN");
  });

  test("only denies CURL if configured", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const curlDetails = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };
    const googlebotDetails = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Googlebot/2.0"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot({
      mode: "LIVE",
      deny: ["CURL"],
    });
    assert.equal(rule.type, "BOT");
    const curlResult = await rule.protect(context, curlDetails);
    assert.equal(curlResult.conclusion, "DENY");
    assert.ok(curlResult.reason instanceof ArcjetBotReason);
    assert.deepEqual(curlResult.reason.allowed, []);
    assert.deepEqual(curlResult.reason.denied, ["CURL"]);
    assert.equal(curlResult.reason.spoofed, false);
    assert.equal(curlResult.reason.verified, false);
    assert.equal(curlResult.state, "RUN");
    const googlebotResults = await rule.protect(context, googlebotDetails);
    assert.equal(googlebotResults.conclusion, "ALLOW");
    assert.ok(googlebotResults.reason instanceof ArcjetBotReason);
    assert.deepEqual(googlebotResults.reason.allowed, ["GOOGLE_CRAWLER"]);
    assert.deepEqual(googlebotResults.reason.denied, []);
    assert.equal(googlebotResults.reason.spoofed, false);
    assert.equal(googlebotResults.reason.verified, false);
    assert.equal(googlebotResults.state, "RUN");
  });

  test("can be configured to allow curl", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot({
      mode: "LIVE",
      allow: ["CURL"],
    });
    assert.equal(rule.type, "BOT");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, ["CURL"]);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "RUN");
  });
});

describe("Primitive > tokenBucket", () => {
  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      tokenBucket({
        // @ts-expect-error
        mode: "INVALID",
        refillRate: 1,
        interval: 1,
        capacity: 1,
      });
    }, /`tokenBucket` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("validates `characteristics` items are strings if it is set", async () => {
    assert.throws(() => {
      tokenBucket({
        // @ts-expect-error
        characteristics: [/foobar/],
        refillRate: 1,
        interval: 1,
        capacity: 1,
      });
    }, /`tokenBucket` options error: invalid type for `characteristics\[0]` - expected string/);
  });

  test("validates `characteristics` option is an array if set", async () => {
    assert.throws(() => {
      tokenBucket({
        // @ts-expect-error
        characteristics: 12345,
        refillRate: 1,
        interval: 1,
        capacity: 1,
      });
    }, /`tokenBucket` options error: invalid type for `characteristics` - expected an array/);
  });

  test("validates `refillRate` option is required", async () => {
    assert.throws(() => {
      tokenBucket(
        // @ts-expect-error
        {
          interval: 1,
          capacity: 1,
        },
      );
    }, /`tokenBucket` options error: `refillRate` is required/);
  });

  test("validates `refillRate` option is a number", async () => {
    assert.throws(() => {
      tokenBucket({
        // @ts-expect-error
        refillRate: "abc",
        interval: 1,
        capacity: 1,
      });
    }, /`tokenBucket` options error: invalid type for `refillRate` - expected number/);
  });

  test("validates `interval` option is required", async () => {
    assert.throws(() => {
      tokenBucket(
        // @ts-expect-error
        {
          refillRate: 1,
          capacity: 1,
        },
      );
    }, /`tokenBucket` options error: `interval` is required/);
  });

  test("validates `interval` option is a number or string", async () => {
    assert.throws(() => {
      tokenBucket({
        refillRate: 1,
        // @ts-expect-error
        interval: /foobar/,
        capacity: 1,
      });
    }, /`tokenBucket` options error: invalid type for `interval` - expected one of string, number/);
  });

  test("validates `capacity` option is required", async () => {
    assert.throws(() => {
      tokenBucket(
        // @ts-expect-error
        {
          refillRate: 1,
          interval: 1,
        },
      );
    }, /`tokenBucket` options error: `capacity` is required/);
  });

  test("validates `capacity` option is a number", async () => {
    assert.throws(() => {
      tokenBucket({
        refillRate: 1,
        interval: 1,
        // @ts-expect-error
        capacity: "abc",
      });
    }, /`tokenBucket` options error: invalid type for `capacity` - expected number/);
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = tokenBucket({
      mode: "LIVE",
      characteristics: ["ip.src"],
      refillRate: 1,
      interval: 1,
      capacity: 1,
    });
    assert.equal(rule.type, "RATE_LIMIT");
    assert.equal(rule.mode, "LIVE");
  });

  test("can specify interval as a string duration", async () => {
    const options = {
      refillRate: 60,
      interval: "60s",
      capacity: 120,
    };

    const rules = tokenBucket(options);
    assert.equal(rules.length, 1);
    const rule = rules[0];
    assert.equal(rule.type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.refillRate, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.interval, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.capacity, 120);
  });

  test("can specify interval as an integer duration", async () => {
    const options = {
      refillRate: 60,
      interval: 60,
      capacity: 120,
    };

    const rules = tokenBucket(options);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].refillRate, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].interval, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].capacity, 120);
  });

  test("can specify user-defined characteristics which are reflected in required props", async () => {
    const rules = tokenBucket({
      characteristics: ["userId"],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });
    type Test = Assert<
      RuleProps<
        typeof rules,
        { requested: number; userId: string | number | boolean }
      >
    >;
  });

  test("well-known characteristics don't affect the required props", async () => {
    const rules = tokenBucket({
      characteristics: [
        "ip.src",
        "http.host",
        "http.method",
        "http.request.uri.path",
        `http.request.headers["abc"]`,
        `http.request.cookie["xyz"]`,
        `http.request.uri.args["foobar"]`,
      ],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });
    type Test = Assert<RuleProps<typeof rules, { requested: number }>>;
  });

  test("produces a rules based on configuration specified", async () => {
    const options = {
      characteristics: ["ip.src"],
      refillRate: 1,
      interval: 1,
      capacity: 1,
    };

    const rules = tokenBucket(options);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].type, "RATE_LIMIT");
    assert.equal(rules[0].mode, "DRY_RUN");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rules[0].characteristics, ["ip.src"]);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].algorithm, "TOKEN_BUCKET");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].refillRate, 1);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].interval, 1);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].capacity, 1);
  });

  test("does not default `characteristics` if not specified", async () => {
    const options = {
      refillRate: 1,
      interval: 1,
      capacity: 1,
    };

    const [rule] = tokenBucket(options);
    assert.equal(rule.type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.characteristics, undefined);
  });

  test("uses cache", async () => {
    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetRateLimitReason({
          max: 0,
          remaining: 0,
          // This will be updated by the rule based on TTL
          reset: 100,
          window: 1,
        }),
      },
      10,
    ]);
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache,
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
      requested: 1,
    };

    const [rule] = tokenBucket({
      refillRate: 1,
      interval: 1,
      capacity: 1,
    });
    assert.equal(rule.type, "RATE_LIMIT");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 1);
    assert.deepEqual(cache.get.mock.calls[0].arguments, [
      "da610f3767d3b939fe2769b489fba4a91da2ab7413184dbbbe6d12519abc1e7b",
      "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
    ]);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetRateLimitReason);
    assert.equal(result.reason.max, 0);
    assert.equal(result.reason.remaining, 0);
    // Updated by the rule based on TTL.
    assert.equal(result.reason.reset, 10);
    assert.equal(result.reason.window, 1);
    assert.equal(result.state, "CACHED");
    assert.equal(result.ttl, 10);
  });
});

describe("Primitive > fixedWindow", () => {
  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      fixedWindow({
        // @ts-expect-error
        mode: "INVALID",
        window: "1h",
        max: 1,
      });
    }, /`fixedWindow` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("validates `window` option is required", async () => {
    assert.throws(() => {
      fixedWindow(
        // @ts-expect-error
        {
          max: 1,
        },
      );
    }, /`fixedWindow` options error: `window` is required/);
  });

  test("validates `window` option is string or number", async () => {
    assert.throws(() => {
      fixedWindow({
        // @ts-expect-error
        window: /foobar/,
        max: 1,
      });
    }, /`fixedWindow` options error: invalid type for `window` - expected one of string, number/);
  });

  test("validates `max` option is required", async () => {
    assert.throws(() => {
      fixedWindow(
        // @ts-expect-error
        {
          window: 1,
        },
      );
    }, /`fixedWindow` options error: `max` is required/);
  });

  test("validates `max` option is number", async () => {
    assert.throws(() => {
      fixedWindow({
        window: 1,
        // @ts-expect-error
        max: "abc",
      });
    }, /`fixedWindow` options error: invalid type for `max` - expected number/);
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = fixedWindow({
      mode: "LIVE",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    });
    assert.equal(rule.type, "RATE_LIMIT");
    assert.equal(rule.mode, "LIVE");
  });

  test("can specify window as a string duration", async () => {
    const options = {
      window: "60s",
      max: 1,
    };

    const rules = fixedWindow(options);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].window, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].max, 1);
  });

  test("can specify window as an integer duration", async () => {
    const options = {
      window: 60,
      max: 1,
    };

    const rules = fixedWindow(options);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].window, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].max, 1);
  });

  test("can specify user-defined characteristics which are reflected in required props", async () => {
    const rules = fixedWindow({
      characteristics: ["userId"],
      window: "1h",
      max: 1,
    });
    type Test = Assert<
      RuleProps<typeof rules, { userId: string | number | boolean }>
    >;
  });

  test("well-known characteristics don't affect the required props", async () => {
    const rules = fixedWindow({
      characteristics: [
        "ip.src",
        "http.host",
        "http.method",
        "http.request.uri.path",
        `http.request.headers["abc"]`,
        `http.request.cookie["xyz"]`,
        `http.request.uri.args["foobar"]`,
      ],
      window: "1h",
      max: 1,
    });
    type Test = Assert<RuleProps<typeof rules, {}>>;
  });

  test("produces a rules based on configuration specified", async () => {
    const options = {
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    };

    const rules = fixedWindow(options);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].type, "RATE_LIMIT");
    assert.equal(rules[0].mode, "DRY_RUN");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rules[0].characteristics, ["ip.src"]);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].algorithm, "FIXED_WINDOW");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].window, 3600);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].max, 1);
  });

  test("does not default `characteristics` if not specified", async () => {
    const options = {
      window: "1h",
      max: 1,
    };

    const [rule] = fixedWindow(options);
    assert.equal(rule.type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.characteristics, undefined);
  });

  test("uses cache", async () => {
    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetRateLimitReason({
          max: 0,
          remaining: 0,
          // This will be updated by the rule based on TTL
          reset: 100,
          window: 1,
        }),
      },
      10,
    ]);
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache,
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = fixedWindow({
      max: 1,
      window: 1,
    });
    assert.equal(rule.type, "RATE_LIMIT");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 1);
    assert.deepEqual(cache.get.mock.calls[0].arguments, [
      "c60466a160b56b4cc129995377ef6fbbcacc67f90218920416ae8431a6fd499c",
      "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
    ]);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetRateLimitReason);
    assert.equal(result.reason.max, 0);
    assert.equal(result.reason.remaining, 0);
    // Updated by the rule based on TTL
    assert.equal(result.reason.reset, 10);
    assert.equal(result.reason.window, 1);
    assert.equal(result.state, "CACHED");
    assert.equal(result.ttl, 10);
  });
});

describe("Primitive > slidingWindow", () => {
  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      slidingWindow({
        // @ts-expect-error
        mode: "INVALID",
        interval: 3600,
        max: 1,
      });
    }, /`slidingWindow` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("validates `interval` option is required", async () => {
    assert.throws(() => {
      slidingWindow(
        // @ts-expect-error
        {
          max: 1,
        },
      );
    }, /`slidingWindow` options error: `interval` is required/);
  });

  test("validates `interval` option is string or number", async () => {
    assert.throws(() => {
      slidingWindow({
        // @ts-expect-error
        interval: /foobar/,
        max: 1,
      });
    }, /`slidingWindow` options error: invalid type for `interval` - expected one of string, number/);
  });

  test("validates `max` option is required", async () => {
    assert.throws(() => {
      slidingWindow(
        // @ts-expect-error
        {
          interval: 1,
        },
      );
    }, /`slidingWindow` options error: `max` is required/);
  });

  test("validates `max` option is number", async () => {
    assert.throws(() => {
      slidingWindow({
        interval: 1,
        // @ts-expect-error
        max: "abc",
      });
    }, /`slidingWindow` options error: invalid type for `max` - expected number/);
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = slidingWindow({
      mode: "LIVE",
      characteristics: ["ip.src"],
      interval: 3600,
      max: 1,
    });
    assert.equal(rule.type, "RATE_LIMIT");
    assert.equal(rule.mode, "LIVE");
  });

  test("can specify interval as a string duration", async () => {
    const options = {
      interval: "60s",
      max: 1,
    };

    const rules = slidingWindow(options);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].interval, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].max, 1);
  });

  test("can specify interval as an integer duration", async () => {
    const options = {
      interval: 60,
      max: 1,
    };

    const rules = slidingWindow(options);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].interval, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].max, 1);
  });

  test("can specify user-defined characteristics which are reflected in required props", async () => {
    const rules = slidingWindow({
      characteristics: ["userId"],
      interval: "1h",
      max: 1,
    });
    type Test = Assert<
      RuleProps<typeof rules, { userId: string | number | boolean }>
    >;
  });

  test("well-known characteristics don't affect the required props", async () => {
    const rules = slidingWindow({
      characteristics: [
        "ip.src",
        "http.host",
        "http.method",
        "http.request.uri.path",
        `http.request.headers["abc"]`,
        `http.request.cookie["xyz"]`,
        `http.request.uri.args["foobar"]`,
      ],
      interval: "1h",
      max: 1,
    });
    type Test = Assert<RuleProps<typeof rules, {}>>;
  });

  test("produces a rules based on configuration specified", async () => {
    const options = {
      characteristics: ["ip.src"],
      interval: 3600,
      max: 1,
    };

    const rules = slidingWindow(options);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].type, "RATE_LIMIT");
    assert.equal(rules[0].mode, "DRY_RUN");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rules[0].characteristics, ["ip.src"]);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].algorithm, "SLIDING_WINDOW");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].interval, 3600);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rules[0].max, 1);
  });

  test("does not default `characteristics` if not specified", async () => {
    const options = {
      interval: 3600,
      max: 1,
    };

    const [rule] = slidingWindow(options);
    assert.equal(rule.type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.characteristics, undefined);
  });

  test("uses cache", async () => {
    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetRateLimitReason({
          max: 0,
          remaining: 0,
          // This will be updated by the rule based on TTL
          reset: 100,
          window: 1,
        }),
      },
      10,
    ]);
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache,
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = slidingWindow({
      max: 1,
      interval: 1,
    });
    assert.equal(rule.type, "RATE_LIMIT");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 1);
    assert.deepEqual(cache.get.mock.calls[0].arguments, [
      "64653030723222b3227a642239fbfae3bc53369d858b5ed1a31a2bb0438dacb1",
      "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
    ]);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetRateLimitReason);
    assert.equal(result.reason.max, 0);
    assert.equal(result.reason.remaining, 0);
    // Updated by the rule based on TTL
    assert.equal(result.reason.reset, 10);
    assert.equal(result.reason.window, 1);
    assert.equal(result.state, "CACHED");
    assert.equal(result.ttl, 10);
  });
});

describe("Primitive > validateEmail", () => {
  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        mode: "INVALID",
      });
    }, /`validateEmail` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("validates `block` option is array if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        block: 1234,
      });
    }, /`validateEmail` options error: invalid type for `block` - expected an array/);
  });

  test("validates `deny` option is array if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        deny: 1234,
      });
    }, /`validateEmail` options error: invalid type for `deny` - expected an array/);
  });

  test("validates `allow` option is array if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        allow: 1234,
      });
    }, /`validateEmail` options error: invalid type for `allow` - expected an array/);
  });

  test("validates `block` option only contains specific values", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        block: ["FOOBAR"],
      });
    }, /`validateEmail` options error: invalid value for `block\[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'/);
  });

  test("validates `deny` option only contains specific values", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        deny: ["FOOBAR"],
      });
    }, /`validateEmail` options error: invalid value for `deny\[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'/);
  });

  test("validates `allow` option only contains specific values", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        allow: ["FOOBAR"],
      });
    }, /`validateEmail` options error: invalid value for `allow\[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'/);
  });

  test("validates `deny` and `block` cannot be set at the same time", async () => {
    assert.throws(() => {
      // @ts-expect-error
      validateEmail({
        deny: ["INVALID"],
        block: ["INVALID"],
      });
    }, /`validateEmail` options error: `deny` and `block` cannot be provided together, `block` is now deprecated so `deny` should be preferred./);
  });

  test("validates `allow` and `deny` cannot be set at the same time", async () => {
    assert.throws(() => {
      // @ts-expect-error
      validateEmail({
        allow: ["INVALID"],
        deny: ["INVALID"],
      });
    }, /`validateEmail` options error: `allow` and `deny` cannot be provided together/);
  });

  test("validates `block` and `deny` cannot be set at the same time", async () => {
    assert.throws(() => {
      // @ts-expect-error
      validateEmail({
        allow: ["INVALID"],
        block: ["INVALID"],
      });
    }, /`validateEmail` options error: `allow` and `block` cannot be provided together/);
  });

  test("validates `requireTopLevelDomain` option if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        requireTopLevelDomain: "abc",
      });
    }, /`validateEmail` options error: invalid type for `requireTopLevelDomain` - expected boolean/);
  });

  test("validates `allowDomainLiteral` option if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        allowDomainLiteral: "abc",
      });
    }, /`validateEmail` options error: invalid type for `allowDomainLiteral` - expected boolean/);
  });

  test("allows specifying EmailTypes to deny", async () => {
    const [rule] = validateEmail({
      deny: ["DISPOSABLE", "FREE", "NO_GRAVATAR", "NO_MX_RECORDS", "INVALID"],
    });
    assert.equal(rule.type, "EMAIL");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.deny, [
      "DISPOSABLE",
      "FREE",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
      "INVALID",
    ]);
  });

  test("allows specifying EmailTypes to block and maps these to deny", async () => {
    const [rule] = validateEmail({
      block: ["DISPOSABLE", "FREE", "NO_GRAVATAR", "NO_MX_RECORDS", "INVALID"],
    });
    assert.equal(rule.type, "EMAIL");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.deny, [
      "DISPOSABLE",
      "FREE",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
      "INVALID",
    ]);
  });

  test("allows specifying EmailTypes to allow", async () => {
    const [rule] = validateEmail({
      allow: ["DISPOSABLE", "FREE", "NO_GRAVATAR", "NO_MX_RECORDS", "INVALID"],
    });
    assert.equal(rule.type, "EMAIL");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.allow, [
      "DISPOSABLE",
      "FREE",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
      "INVALID",
    ]);
  });

  test("validates that email is defined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      email: "abc@example.com",
    };

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    assert.equal(rule.type, "EMAIL");
    assert.doesNotThrow(() => {
      const _ = rule.validate(context, details);
    });
  });

  test("throws via `validate()` if email is undefined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      email: undefined,
    };

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    assert.equal(rule.type, "EMAIL");
    assert.throws(() => {
      const _ = rule.validate(context, details);
    });
  });

  test("produces a dry run result in DRY_RUN mode", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "DRY_RUN", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "DRY_RUN");
  });

  test("allows a valid email", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@example.com",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, []);
    assert.equal(result.state, "RUN");
  });

  test("denies email with no domain segment", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  test("denies email with no TLD", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@localhost",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  test("denies email with no TLD even if some options are specified", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@localhost",
      extra: {},
    };

    const [rule] = validateEmail({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  test("denies email with empty name segment", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "@example.com",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  test("denies email with domain literal", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@[127.0.0.1]",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  test("can be configured to allow no TLD", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@localhost",
      extra: {},
    };

    const [rule] = validateEmail({
      requireTopLevelDomain: false,
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, []);
  });

  test("can be configured to allow domain literals", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@[127.0.0.1]",
      extra: {},
    };

    const [rule] = validateEmail({
      allowDomainLiteral: true,
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, []);
    assert.equal(result.state, "RUN");
  });

  // Email validation is dynamic so all TTL are zero
  test("does not use cache", async () => {
    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetEmailReason({
          emailTypes: ["INVALID"],
        }),
      },
      10,
    ]);
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache,
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
      email: "test@example.com",
    };

    const [rule] = validateEmail({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 0);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, []);
    assert.equal(result.state, "RUN");
  });
});

describe("Primitive > shield", () => {
  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      shield({
        // @ts-expect-error
        mode: "INVALID",
      });
    }, /`shield` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = shield({
      mode: "LIVE",
    });
    assert.equal(rule.type, "SHIELD");
    assert.equal(rule.mode, "LIVE");
  });

  test("sets mode as `DRY_RUN` if not specified", async () => {
    const [rule] = shield({});
    assert.equal(rule.type, "SHIELD");
    assert.equal(rule.mode, "DRY_RUN");
  });

  test("uses cache", async () => {
    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetShieldReason({
          shieldTriggered: true,
        }),
      },
      10,
    ]);
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache,
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = shield({
      mode: "LIVE",
    });
    assert.equal(rule.type, "SHIELD");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 1);
    assert.deepEqual(cache.get.mock.calls[0].arguments, [
      "1a506ff95a8c2017894fcb6cc3be55053b144bd15666631945a5c453c477bd16",
      "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
    ]);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetShieldReason);
    assert.equal(result.reason.shieldTriggered, true);
    assert.equal(result.state, "CACHED");
    assert.equal(result.ttl, 10);
  });

  test("does not run rule locally", async () => {
    const cache = new TestCache();
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache,
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = shield({
      mode: "LIVE",
    });
    assert.equal(rule.type, "SHIELD");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetShieldReason);
    assert.equal(result.reason.shieldTriggered, false);
    assert.equal(result.state, "NOT_RUN");
    assert.equal(result.ttl, 0);
  });
});

describe("Primitive > sensitiveInfo", () => {
  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error
        mode: "INVALID",
        allow: [],
      });
    }, /`sensitiveInfo` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("validates `allow` option is an array if set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error
        allow: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `allow` - expected an array/);
  });

  test("validates `allow` option only contains strings", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error
        allow: [/foo/],
      });
    }, /`sensitiveInfo` options error: invalid type for `allow\[0]` - expected string/);
  });

  test("validates `deny` option is an array if set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error
        deny: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `deny` - expected an array/);
  });

  test("validates `deny` option only contains strings", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error
        deny: [/foo/],
      });
    }, /`sensitiveInfo` options error: invalid type for `deny\[0]` - expected string/);
  });

  test("validates `contextWindowSize` option if set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        allow: [],
        // @ts-expect-error
        contextWindowSize: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `contextWindowSize` - expected number/);
  });

  test("validates `detect` option if set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        allow: [],
        // @ts-expect-error
        detect: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `detect` - expected function/);
  });

  test("validates `allow` and `deny` options are not specified together", async () => {
    assert.throws(() => {
      const _ = sensitiveInfo(
        // @ts-expect-error
        {
          allow: [],
          deny: [],
        },
      );
    }, /`sensitiveInfo` options error: `allow` and `deny` cannot be provided together/);
  });

  test("validates either `allow` or `deny` option is specified", async () => {
    assert.throws(() => {
      const _ = sensitiveInfo(
        // @ts-expect-error
        {},
      );
    }, /`sensitiveInfo` options error: either `allow` or `deny` must be specified/);
  });

  test("does not throw via `validate()`", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      email: undefined,
    };

    const [rule] = sensitiveInfo({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "SENSITIVE_INFO");
    assert.doesNotThrow(() => {
      const _ = rule.validate(context, details);
    });
  });

  test("allows specifying sensitive info entities to allow", async () => {
    const [rule] = sensitiveInfo({
      allow: ["EMAIL", "CREDIT_CARD_NUMBER"],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
  });

  test("produces a dry run result in DRY_RUN mode", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () =>
        Promise.resolve(
          "127.0.0.1 test@example.com 4242424242424242 +353 87 123 4567",
        ),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "DRY_RUN",
      allow: [],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, [
      {
        start: 0,
        end: 9,
        identifiedType: "IP_ADDRESS",
      },
      {
        start: 10,
        end: 26,
        identifiedType: "EMAIL",
      },
      {
        start: 27,
        end: 43,
        identifiedType: "CREDIT_CARD_NUMBER",
      },
      {
        start: 44,
        end: 60,
        identifiedType: "PHONE_NUMBER",
      },
    ]);
    assert.equal(result.state, "DRY_RUN");
  });

  test("it doesnt detect any entities in a non sensitive body", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve("none of this is sensitive"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.state, "RUN");
  });

  test("it identifies built-in entities", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () =>
        Promise.resolve(
          "127.0.0.1 test@example.com 4242424242424242 +353 87 123 4567",
        ),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, [
      {
        start: 0,
        end: 9,
        identifiedType: "IP_ADDRESS",
      },
      {
        start: 10,
        end: 26,
        identifiedType: "EMAIL",
      },
      {
        start: 27,
        end: 43,
        identifiedType: "CREDIT_CARD_NUMBER",
      },
      {
        start: 44,
        end: 60,
        identifiedType: "PHONE_NUMBER",
      },
    ]);
    assert.equal(result.state, "RUN");
  });

  test("it allows entities on the allow list", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () =>
        Promise.resolve(
          "127.0.0.1 test@example.com 4242424242424242 +353 87 123 4567",
        ),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: ["EMAIL", "PHONE_NUMBER"],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, [
      {
        start: 10,
        end: 26,
        identifiedType: "EMAIL",
      },
      {
        start: 44,
        end: 60,
        identifiedType: "PHONE_NUMBER",
      },
    ]);
    assert.deepEqual(result.reason.denied, [
      {
        start: 0,
        end: 9,
        identifiedType: "IP_ADDRESS",
      },
      {
        start: 27,
        end: 43,
        identifiedType: "CREDIT_CARD_NUMBER",
      },
    ]);
    assert.equal(result.state, "RUN");
  });

  test("it returns an allow decision when all identified types are allowed", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve("test@example.com +353 87 123 4567"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: ["EMAIL", "PHONE_NUMBER"],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, [
      {
        start: 0,
        end: 16,
        identifiedType: "EMAIL",
      },
      {
        start: 17,
        end: 33,
        identifiedType: "PHONE_NUMBER",
      },
    ]);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.state, "RUN");
  });

  test("it only denies listed entities when deny mode is set", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () =>
        Promise.resolve("127.0.0.1 test@example.com +353 87 123 4567"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      deny: ["CREDIT_CARD_NUMBER", "IP_ADDRESS"],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, [
      {
        start: 10,
        end: 26,
        identifiedType: "EMAIL",
      },
      {
        start: 27,
        end: 43,
        identifiedType: "PHONE_NUMBER",
      },
    ]);
    assert.deepEqual(result.reason.denied, [
      {
        start: 0,
        end: 9,
        identifiedType: "IP_ADDRESS",
      },
    ]);
    assert.equal(result.state, "RUN");
  });

  test("it returns a deny decision in deny mode when an entity is matched", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve("test@example.com +353 87 123 4567"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      deny: ["EMAIL"],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, [
      {
        start: 17,
        end: 33,
        identifiedType: "PHONE_NUMBER",
      },
    ]);
    assert.deepEqual(result.reason.denied, [
      {
        start: 0,
        end: 16,
        identifiedType: "EMAIL",
      },
    ]);
    assert.equal(result.state, "RUN");
  });

  test("it blocks entities identified by a custom function", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve("this is bad"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const customDetect = (tokens: string[]) => {
      return tokens.map((token) => {
        if (token === "bad") {
          return "CUSTOM";
        }
      });
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      deny: ["CUSTOM"],
      contextWindowSize: 1,
      detect: customDetect,
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, [
      {
        start: 8,
        end: 11,
        identifiedType: "CUSTOM",
      },
    ]);
    assert.equal(result.state, "RUN");
  });

  test("it throws when custom function returns non-string", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve("this is bad"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const customDetect = (tokens: string[]) => {
      return tokens.map((token) => {
        if (token === "bad") {
          return 12345;
        }
      });
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: [],
      contextWindowSize: 1,
      // @ts-expect-error
      detect: customDetect,
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    await assert.rejects(async () => {
      const _ = await rule.protect(context, details);
    }, new Error("invalid entity type"));
  });

  test("it allows custom entities identified by a function that would have otherwise been blocked", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve("my email is test@example.com"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const customDetect = (tokens: string[]) => {
      return tokens.map((token) => {
        if (token === "test@example.com") {
          return "custom";
        }
      });
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: ["custom"],
      detect: customDetect,
      contextWindowSize: 1,
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, [
      {
        start: 12,
        end: 28,
        identifiedType: "custom",
      },
    ]);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.state, "RUN");
  });

  test("it provides the right size context window", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve("my email is test@example.com"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const customDetect = (tokens: string[]) => {
      assert.equal(tokens.length, 3);
      return tokens.map(() => undefined);
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: [],
      detect: customDetect,
      contextWindowSize: 3,
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    await rule.protect(context, details);
  });

  test("it returns an error decision when body is not available", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache: new TestCache(),
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: [],
      contextWindowSize: 1,
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const decision = await rule.protect(context, details);
    assert.equal(decision.ttl, 0);
    assert.equal(decision.state, "NOT_RUN");
    assert.equal(decision.conclusion, "ERROR");
  });

  // Sensitive info detection is dynamic so all TTL are zero
  test("does not use cache", async () => {
    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetSensitiveInfoReason({
          allowed: [],
          denied: [],
        }),
      },
      10,
    ]);
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      cache,
      getBody: () => Promise.resolve("nothing to detect"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 0);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.state, "RUN");
  });
});

describe("Products > protectSignup", () => {
  test("allows configuration of rateLimit, bot, and email", () => {
    const rules = protectSignup({
      rateLimit: {
        mode: "DRY_RUN",
        characteristics: ["ip.src"],
        interval: 60 /* minutes */ * 60 /* seconds */,
        max: 1,
      },
      bots: {
        mode: "DRY_RUN",
        allow: [],
      },
      email: {
        allow: [],
        mode: "LIVE",
      },
    });
    assert.equal(rules.length, 3);
  });
});

describe("SDK", () => {
  function testRuleLocalAllowed() {
    return {
      version: 0,
      mode: "LIVE",
      type: "TEST_RULE_LOCAL_ALLOWED",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(
        async () =>
          new ArcjetRuleResult({
            ruleId: "test-rule-id",
            fingerprint: "test-fingerprint",
            ttl: 0,
            state: "RUN",
            conclusion: "ALLOW",
            reason: new ArcjetTestReason(),
          }),
      ),
    } as const;
  }
  function testRuleLocalDenied() {
    return {
      version: 0,
      mode: "LIVE",
      type: "TEST_RULE_LOCAL_DENIED",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(
        async () =>
          new ArcjetRuleResult({
            ruleId: "test-rule-id",
            fingerprint: "test-fingerprint",
            ttl: 5000,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetTestReason(),
          }),
      ),
    } as const;
  }
  function testRuleLocalCached() {
    const ruleId = "test-rule-id";
    const fingerprint =
      "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e";
    return {
      version: 0,
      mode: "LIVE",
      type: "TEST_RULE_LOCAL_CACHED",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(async (ctx) => {
        const [result, ttl] = await ctx.cache.get(ruleId, ctx.fingerprint);
        if (result) {
          return new ArcjetRuleResult({
            ruleId,
            fingerprint,
            ttl,
            state: "CACHED",
            conclusion: "DENY",
            reason: new ArcjetTestReason(),
          });
        } else {
          return new ArcjetRuleResult({
            ruleId,
            fingerprint,
            ttl: 0,
            state: "RUN",
            conclusion: "ALLOW",
            reason: new ArcjetTestReason(),
          });
        }
      }),
    } as const;
  }
  function testRuleLocalIncorrect() {
    return {
      version: 0,
      mode: "LIVE",
      type: "TEST_RULE_LOCAL_INCORRECT",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(async () => undefined),
    } as const;
  }
  function testRuleLocalNoValidate() {
    return {
      version: 0,
      mode: "LIVE",
      type: "TEST_RULE_LOCAL_INCORRECT",
      priority: 1,
      protect: mock.fn(),
    } as const;
  }
  function testRuleLocalNoProtect() {
    return {
      version: 0,
      mode: "LIVE",
      type: "TEST_RULE_LOCAL_INCORRECT",
      priority: 1,
      validate: mock.fn(),
    } as const;
  }

  function testRuleRemote(): ArcjetRule {
    return {
      version: 0,
      mode: "LIVE",
      type: "TEST_RULE_REMOTE",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(),
    };
  }

  function testRuleMultiple(): ArcjetRule[] {
    return [
      {
        version: 0,
        mode: "LIVE",
        type: "TEST_RULE_MULTIPLE",
        priority: 1,
        validate: mock.fn(),
        protect: mock.fn(),
      },
      {
        version: 0,
        mode: "LIVE",
        type: "TEST_RULE_MULTIPLE",
        priority: 1,
        validate: mock.fn(),
        protect: mock.fn(),
      },
      {
        version: 0,
        mode: "LIVE",
        type: "TEST_RULE_MULTIPLE",
        priority: 1,
        validate: mock.fn(),
        protect: mock.fn(),
      },
    ];
  }

  function testRuleInvalidType(): ArcjetRule {
    return {
      version: 0,
      mode: "LIVE",
      type: "TEST_RULE_INVALID_TYPE",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(),
    };
  }

  function testRuleLocalThrow() {
    return {
      version: 0,
      mode: "LIVE",
      type: "TEST_RULE_LOCAL_THROW",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(async () => {
        throw new Error("Local rule protect failed");
      }),
    } as const;
  }

  function testRuleLocalDryRun() {
    return {
      version: 0,
      mode: "DRY_RUN",
      type: "TEST_RULE_LOCAL_DRY_RUN",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(async () => {
        return new ArcjetRuleResult({
          ruleId: "test-rule-id",
          fingerprint: "test-fingerprint",
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetTestReason(),
        });
      }),
    } as const;
  }

  function testRuleProps(): [ArcjetRule<{ abc: number }>] {
    return [
      {
        version: 0,
        mode: "LIVE",
        type: "test",
        priority: 10000,
        validate: mock.fn(),
        protect: mock.fn(),
      },
    ];
  }

  test("creates a new Arcjet SDK with no rules", () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: mockLogger(),
    });
    assert.ok("protect" in aj);
    assert.equal(typeof aj.protect, "function");
  });

  test("can augment rules via `withRule` API", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: { "User-Agent": "curl/8.1.2" },
      "extra-test": "extra-test-value",
      userId: "abc123",
      requested: 1,
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
      log: mockLogger(),
    });
    type WithoutRuleTest = Assert<SDKProps<typeof aj, {}>>;

    const tokenBucketRule = tokenBucket({
      characteristics: ["userId"],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });

    const aj2 = aj.withRule(tokenBucketRule);
    type WithRuleTest = Assert<
      SDKProps<
        typeof aj2,
        { requested: number; userId: string | number | boolean }
      >
    >;

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj2.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const call = client.decide.mock.calls[0];
    assert.ok(call);
    assert.deepEqual(call.arguments.slice(2), [tokenBucketRule]);
  });

  test("can chain new rules via multiple `withRule` calls", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: { "User-Agent": "curl/8.1.2" },
      "extra-test": "extra-test-value",
      userId: "abc123",
      requested: 1,
      abc: 123,
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
      log: mockLogger(),
    });
    type WithoutRuleTest = Assert<SDKProps<typeof aj, {}>>;

    const tokenBucketRule = tokenBucket({
      characteristics: ["userId"],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });

    const aj2 = aj.withRule(tokenBucketRule);
    type WithRuleTestOne = Assert<
      SDKProps<
        typeof aj2,
        { requested: number; userId: string | number | boolean }
      >
    >;

    const testRule = testRuleProps();

    const aj3 = aj2.withRule(testRule);
    type WithRuleTestTwo = Assert<
      SDKProps<
        typeof aj3,
        { requested: number; userId: string | number | boolean; abc: number }
      >
    >;

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj3.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const call = client.decide.mock.calls[0];
    assert.ok(call);
    assert.deepEqual(call.arguments.slice(2), [
      [...tokenBucketRule, ...testRule],
    ]);
  });

  test("creates different augmented clients when `withRule` not chained", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: { "User-Agent": "curl/8.1.2" },
      "extra-test": "extra-test-value",
      userId: "abc123",
      requested: 1,
      abc: 123,
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
      log: mockLogger(),
    });
    type WithoutRuleTest = Assert<SDKProps<typeof aj, {}>>;

    const tokenBucketRule = tokenBucket({
      characteristics: ["userId"],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });

    const aj2 = aj.withRule(tokenBucketRule);
    type WithRuleTestOne = Assert<
      SDKProps<
        typeof aj2,
        { requested: number; userId: string | number | boolean }
      >
    >;

    const testRule = testRuleProps();

    const aj3 = aj.withRule(testRule);
    type WithRuleTestTwo = Assert<SDKProps<typeof aj3, { abc: number }>>;

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj3.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const call = client.decide.mock.calls[0];
    assert.ok(call);
    assert.deepEqual(call.arguments.slice(2), [testRule]);
  });

  test("creates a new Arcjet SDK with only local rules", () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalAllowed(), testRuleLocalDenied()]],
      client,
      log: mockLogger(),
    });
    assert.ok("protect" in aj);
    assert.equal(typeof aj.protect, "function");
  });

  test("creates a new Arcjet SDK with only remote rules", () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleRemote()]],
      client,
      log: mockLogger(),
    });
    assert.ok("protect" in aj);
    assert.equal(typeof aj.protect, "function");
  });

  test("creates a new Arcjet SDK with both local and remote rules", () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [
        [testRuleLocalAllowed(), testRuleLocalDenied(), testRuleRemote()],
      ],
      client,
      log: mockLogger(),
    });
    assert.ok("protect" in aj);
    assert.equal(typeof aj.protect, "function");
  });

  // TODO(#207): Remove this once we default the client in the main SDK
  test("throws if no client is specified", () => {
    assert.throws(() => {
      const aj = arcjet({
        key: "test-key",
        rules: [],
        log: mockLogger(),
      });
    });
  });

  test("throws if no log is specified", () => {
    assert.throws(() => {
      const client = {
        decide: mock.fn(async () => {
          return new ArcjetAllowDecision({
            ttl: 0,
            reason: new ArcjetTestReason(),
            results: [],
          });
        }),
        report: mock.fn(),
      };

      const aj = arcjet({
        key: "test-key",
        rules: [],
        client,
      });
    });
  });

  test("calls each local rule until a DENY decision is encountered", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const allowed = testRuleLocalAllowed();
    const denied = testRuleLocalDenied();

    const aj = arcjet({
      key: "test-key",
      rules: [[allowed, denied]],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);
    assert.equal(decision.conclusion, "DENY");

    assert.equal(allowed.validate.mock.callCount(), 1);
    assert.equal(allowed.protect.mock.callCount(), 1);
    assert.equal(denied.validate.mock.callCount(), 1);
    assert.equal(denied.protect.mock.callCount(), 1);
  });

  test("does not crash if a local rule does not return a result", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const rule = testRuleLocalIncorrect();

    const aj = arcjet({
      key: "test-key",
      rules: [
        [
          // @ts-expect-error because the rule is written wrong
          rule,
        ],
      ],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);
    // ALLOW because the remote rule was called and it returned ALLOW
    assert.equal(decision.conclusion, "ALLOW");

    assert.equal(rule.validate.mock.callCount(), 1);
    assert.equal(rule.protect.mock.callCount(), 1);
  });

  test("does not crash if a rule does not define `validate` function", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const rule = testRuleLocalNoValidate();

    const aj = arcjet({
      key: "test-key",
      rules: [
        [
          // @ts-expect-error because the rule is written wrong
          rule,
          testRuleLocalDenied(),
        ],
      ],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);
    // DENY because one local rule errored and the other denied
    assert.equal(decision.conclusion, "DENY");
    const anonymousResult = decision.results.find((d) => d.ruleId === "");
    assert.ok(anonymousResult);
    assert.equal(anonymousResult.reason.type, "ERROR");
    assert.equal(
      // @ts-expect-error: TODO(#4452): `message` should be accessible.
      anonymousResult.reason.message,
      "rule must have a `validate` function",
    );
  });

  test("does not crash if a rule does not define `protect` function", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const rule = testRuleLocalNoProtect();

    const aj = arcjet({
      key: "test-key",
      rules: [
        [
          // @ts-expect-error because the rule is written wrong
          rule,
          testRuleLocalDenied(),
        ],
      ],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);
    // DENY because one local rule errored and the other denied
    assert.equal(decision.conclusion, "DENY");
    const anonymousResult = decision.results.find((d) => d.ruleId === "");
    assert.ok(anonymousResult);
    assert.equal(anonymousResult.reason.type, "ERROR");
    assert.equal(
      // @ts-expect-error: TODO(#4452): `message` should be accessible.
      anonymousResult.reason.message,
      "rule must have a `protect` function",
    );
  });

  test("returns an ERROR decision if fingerprint cannot be generated", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {};

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);
    assert.equal(decision.conclusion, "ERROR");
  });

  test("returns an ERROR decision with no request object", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: mockLogger(),
    });

    // @ts-expect-error
    const decision = await aj.protect();
    assert.equal(decision.conclusion, "ERROR");
  });

  test("returns an ERROR decision when more than 10 rules are generated", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "100.100.100.100",
    };

    const rules: ArcjetRule[][] = [];
    // We only iterate 4 times because `testRuleMultiple` generates 3 rules
    for (let idx = 0; idx < 4; idx++) {
      rules.push(testRuleMultiple());
    }

    const aj = arcjet({
      key: "test-key",
      rules: rules,
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);
    assert.equal(decision.conclusion, "ERROR");
  });

  test("won't run a later local rule if a DENY decision is encountered", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const allowed = testRuleLocalAllowed();
    const denied = testRuleLocalDenied();

    const aj = arcjet({
      key: "test-key",
      rules: [[denied, allowed]],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);
    assert.equal(decision.conclusion, "DENY");

    assert.equal(denied.validate.mock.callCount(), 1);
    assert.equal(denied.protect.mock.callCount(), 1);
    assert.equal(allowed.validate.mock.callCount(), 0);
    assert.equal(allowed.protect.mock.callCount(), 0);
  });

  test("accepts plain object of headers", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
      getBody: () => Promise.resolve(undefined),
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: { "user-agent": "curl/8.1.2" },
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: mockLogger(),
    });

    const decision = await aj.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const args = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: undefined,
      email: undefined,
      extra: {
        "extra-test": "extra-test-value",
      },
      headers: request.headers,
      host: request.host,
      ip: request.ip,
      method: request.method,
      path: request.path,
      protocol: request.protocol,
      query: undefined,
    });
  });

  test("accepts plain object of `raw` headers", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
      getBody: () => Promise.resolve(undefined),
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: { "User-Agent": ["curl/8.1.2", "something"] },
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: mockLogger(),
    });

    const decision = await aj.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const args = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: undefined,
      email: undefined,
      extra: {
        "extra-test": "extra-test-value",
      },
      // Note that the headers are serialized.
      headers: { "user-agent": "curl/8.1.2, something" },
      host: request.host,
      ip: request.ip,
      method: request.method,
      path: request.path,
      protocol: request.protocol,
      query: undefined,
    });
  });

  test("converts extra keys with non-string values to string values", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
      getBody: () => Promise.resolve(undefined),
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: { "user-agent": "curl/8.1.2" },
      "extra-number": 123,
      "extra-false": false,
      "extra-true": true,
      "extra-unsupported": new Date(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: mockLogger(),
    });

    const decision = await aj.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const args = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: undefined,
      email: undefined,
      extra: {
        "extra-number": "123",
        "extra-false": "false",
        "extra-true": "true",
        "extra-unsupported": "<unsupported value>",
      },
      headers: request.headers,
      host: request.host,
      ip: request.ip,
      method: request.method,
      path: request.path,
      protocol: request.protocol,
      query: undefined,
    });
  });

  test("does not call `client.report()` if the local decision is ALLOW", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const allowed = testRuleLocalAllowed();

    const aj = arcjet({
      key: "test-key",
      rules: [[allowed]],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);
    assert.equal(client.report.mock.callCount(), 0);
    assert.equal(client.decide.mock.callCount(), 1);
    // TODO: Validate correct `ruleResults` are sent with `decide` when available
  });

  test("calls `client.decide()` if the local decision is ALLOW", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
      getBody: () => Promise.resolve(undefined),
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const rule = testRuleLocalAllowed();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
      log: mockLogger(),
    });

    const decision = await aj.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: undefined,
      email: undefined,
      extra: {
        "extra-test": "extra-test-value",
      },
      headers: { "user-agent": "curl/8.1.2" },
      host: request.host,
      ip: request.ip,
      method: request.method,
      path: request.path,
      protocol: request.protocol,
      query: undefined,
    });
    assert.deepEqual(args.at(2), [rule]);
  });

  test("calls `client.report()` if the local decision is DENY", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
      getBody: () => Promise.resolve(undefined),
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const rule = testRuleLocalDenied();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
      log: mockLogger(),
    });

    const _ = await aj.protect(context, request);
    assert.equal(client.report.mock.callCount(), 1);
    const args: unknown[] = client.report.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: undefined,
      email: undefined,
      extra: {
        "extra-test": "extra-test-value",
      },
      headers: { "user-agent": "curl/8.1.2" },
      host: request.host,
      ip: request.ip,
      method: request.method,
      path: request.path,
      protocol: request.protocol,
      query: undefined,
    });
    const two = args.at(2);
    assert.ok(two);
    assert.ok(typeof two === "object");
    assert.ok("conclusion" in two);
    assert.equal(two.conclusion, "DENY");
    assert.deepEqual(args.at(3), [rule]);
  });

  test("provides `waitUntil` in context to  `client.report()` if available", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const waitUntil = mock.fn();

    const SYMBOL_FOR_REQ_CONTEXT = Symbol.for("@vercel/request-context");
    // @ts-ignore
    globalThis[SYMBOL_FOR_REQ_CONTEXT] = {
      get() {
        return { waitUntil };
      },
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
      getBody: () => Promise.resolve(undefined),
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const rule = testRuleLocalDenied();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
      log: mockLogger(),
    });

    const _ = await aj.protect(context, request);
    assert.equal(client.report.mock.callCount(), 1);

    const args: unknown[] = client.report.mock.calls[0].arguments;
    const head = args.at(0);
    assert.ok(head);
    assert.ok(typeof head === "object");
    assert.ok("waitUntil" in head);
    assert.equal(head.waitUntil, waitUntil);
    // @ts-ignore
    delete globalThis[SYMBOL_FOR_REQ_CONTEXT];
  });

  test("does not call `client.decide()` if the local decision is DENY", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const denied = testRuleLocalDenied();

    const aj = arcjet({
      key: "test-key",
      rules: [[denied]],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 0);
  });

  test("calls `client.decide()` even with no rules", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
      getBody: () => Promise.resolve(undefined),
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
      log: mockLogger(),
    });

    const _ = await aj.protect(context, request);

    assert.equal(client.report.mock.callCount(), 0);
    assert.equal(client.decide.mock.callCount(), 1);

    const args: unknown[] = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: undefined,
      email: undefined,
      extra: {
        "extra-test": "extra-test-value",
      },
      headers: { "user-agent": "Mozilla/5.0" },
      host: request.host,
      ip: request.ip,
      method: request.method,
      path: request.path,
      protocol: request.protocol,
      query: undefined,
    });
  });

  test("caches a DENY decision locally and reports when a cached decision is used", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetDenyDecision({
          ttl: 10,
          reason: new ArcjetTestReason(),
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint:
                "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
              ttl: 10,
              state: "RUN",
              conclusion: "DENY",
              reason: new ArcjetTestReason(),
            }),
          ],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalCached()]],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);

    assert.equal(decision.isErrored(), false);

    assert.equal(client.decide.mock.callCount(), 1);
    assert.equal(client.report.mock.callCount(), 0);

    assert.equal(decision.conclusion, "DENY");

    const decision2 = await aj.protect(context, request);

    assert.equal(decision2.isErrored(), false);
    assert.equal(client.decide.mock.callCount(), 1);
    assert.equal(client.report.mock.callCount(), 1);

    assert.equal(decision2.conclusion, "DENY");
  });

  test("does not throw if unknown rule type is passed", () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    // Specifically should not throw `Unknown Rule type`.
    assert.doesNotThrow(() => {
      const aj = arcjet({
        key: "test-key",
        rules: [[testRuleInvalidType()]],
        client,
        log: mockLogger(),
      });
    });
  });

  test("does not call `client.report()` if a local rule throws", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalThrow()]],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);

    assert.equal(client.report.mock.callCount(), 0);
    assert.equal(client.decide.mock.callCount(), 1);
    // TODO: Validate correct `ruleResults` are sent with `decide` when available
  });

  test("correctly logs an error message if a local rule throws a string", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    function testRuleLocalThrowString(): ArcjetRule {
      return {
        version: 0,
        mode: "LIVE",
        type: "TEST_RULE_LOCAL_THROW_STRING",
        priority: 1,
        validate: mock.fn(),
        async protect(context, details) {
          throw "Local rule protect failed";
        },
      };
    }

    const log = mockLogger();

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalThrowString()]],
      client,
      log,
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);

    assert.equal(log.error.mock.callCount(), 1);
    assert.deepEqual(log.error.mock.calls[0].arguments, [
      "Failure running rule: %s due to %s",
      "TEST_RULE_LOCAL_THROW_STRING",
      "Local rule protect failed",
    ]);
  });

  test("correctly logs an error message if a local rule throws a non-error", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    function testRuleLocalThrowNull(): ArcjetRule {
      return {
        version: 0,
        mode: "LIVE",
        type: "TEST_RULE_LOCAL_THROW_NULL",
        priority: 1,
        validate: mock.fn(),
        async protect(context, details) {
          throw null;
        },
      };
    }

    const log = mockLogger();

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalThrowNull()]],
      client,
      log,
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);

    assert.equal(log.error.mock.callCount(), 1);
    assert.deepEqual(log.error.mock.calls[0].arguments, [
      "Failure running rule: %s due to %s",
      "TEST_RULE_LOCAL_THROW_NULL",
      "Unknown problem",
    ]);
  });

  test("does not return nor cache a deny decision if DENY decision in a dry run local rule", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalDryRun()]],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);

    assert.equal(decision.isDenied(), false);

    assert.equal(client.decide.mock.callCount(), 1);
    assert.equal(client.report.mock.callCount(), 0);

    const decision2 = await aj.protect(context, request);

    assert.equal(decision2.isDenied(), false);

    assert.equal(client.decide.mock.callCount(), 2);
    assert.equal(client.report.mock.callCount(), 0);
  });

  test("processes a single rule from a REMOTE ArcjetRule", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
      getBody: () => Promise.resolve(undefined),
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const rule = testRuleRemote();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
      log: mockLogger(),
    });

    const decision = await aj.protect(context, request);

    assert.equal(decision.isErrored(), false);

    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: undefined,
      email: undefined,
      extra: {
        "extra-test": "extra-test-value",
      },
      headers: { "user-agent": "Mozilla/5.0" },
      host: request.host,
      ip: request.ip,
      method: request.method,
      path: request.path,
      protocol: request.protocol,
      query: undefined,
    });
    assert.deepEqual(args.at(2), [rule]);
  });

  test("overrides `key` with custom context", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
      getBody: () => Promise.resolve(undefined),
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const rule = testRuleRemote();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
      log: mockLogger(),
    });

    const decision = await aj.protect(
      { ...context, key: "overridden-key" },
      request,
    );

    assert.equal(decision.isErrored(), false);

    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    const head = args.at(0);
    assert.ok(head);
    assert.ok(typeof head === "object");
    assert.ok("key" in head);
    assert.equal(head.key, "overridden-key");
  });

  test("reports and returns an ERROR decision if a `client.decide()` fails", async () => {
    const client = {
      decide: mock.fn(async () => {
        throw new Error("Decide function failed");
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
      getBody: () => Promise.resolve(undefined),
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
      log: mockLogger(),
    });

    const decision = await aj.protect(context, request);

    assert.equal(decision.isErrored(), true);

    assert.equal(client.decide.mock.callCount(), 1);
    assert.equal(client.report.mock.callCount(), 1);
    const args: unknown[] = client.report.mock.calls[0].arguments;
    const item = args.at(2);
    assert.ok(item);
    assert.ok(typeof item === "object");
    assert.ok("conclusion" in item);
    assert.equal(item.conclusion, "ERROR");
  });

  test("header characteristics are used to generate fingerprints", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      characteristics: ['http.request.headers["abcxyz"]'],
      rules: [],
      client,
      log: mockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["abcxyz", "test1234"]]),
    };

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);

    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    const head = args.at(0);
    assert.ok(head);
    assert.ok(typeof head === "object");
    assert.ok("fingerprint" in head);
    assert.equal(
      head.fingerprint,
      "fp::2::6f3a3854134fe3d20fe56387bdcb594f18b182683424757b88da75e8f13b92bd",
    );
  });

  test("global characteristics are propagated if they aren't separately specified in fixedWindow", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const globalCharacteristics = ["someGlobalCharacteristic"] as const;
    const aj = arcjet({
      key: "test-key",
      characteristics: globalCharacteristics,
      rules: [
        fixedWindow({
          mode: "LIVE",
          window: "1h",
          max: 60,
        }),
      ],
      client,
      log: mockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      someGlobalCharacteristic: "test",
    };

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);

    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    const list = args.at(2);
    assert.ok(Array.isArray(list));
    const item = list.at(0);
    assert.ok(item);
    assert.ok(typeof item === "object");
    assert.ok("characteristics" in item);
    assert.deepEqual(item.characteristics, globalCharacteristics);
  });

  test("local characteristics are prefered on fixedWindow over global characteristics", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const globalCharacteristics = ["someGlobalCharacteristic"] as const;
    const localCharacteristics = ["someLocalCharacteristic"] as const;
    const aj = arcjet({
      key: "test-key",
      characteristics: globalCharacteristics,
      rules: [
        fixedWindow({
          mode: "LIVE",
          window: "1h",
          max: 60,
          characteristics: localCharacteristics,
        }),
      ],
      client,
      log: mockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      someGlobalCharacteristic: "test",
      someLocalCharacteristic: "test",
    };

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);

    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    const list = args.at(2);
    assert.ok(Array.isArray(list));
    const item = list.at(0);
    assert.ok(item);
    assert.ok(typeof item === "object");
    assert.ok("characteristics" in item);
    assert.deepEqual(item.characteristics, localCharacteristics);
  });

  test("global characteristics are propagated if they aren't separately specified in slidingWindow", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const globalCharacteristics = ["someGlobalCharacteristic"] as const;
    const aj = arcjet({
      key: "test-key",
      characteristics: globalCharacteristics,
      rules: [
        slidingWindow({
          mode: "LIVE",
          interval: "1h",
          max: 60,
        }),
      ],
      client,
      log: mockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      someGlobalCharacteristic: "test",
    };

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);

    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    const list = args.at(2);
    assert.ok(Array.isArray(list));
    const item = list.at(0);
    assert.ok(item);
    assert.ok(typeof item === "object");
    assert.ok("characteristics" in item);
    assert.deepEqual(item.characteristics, globalCharacteristics);
  });

  test("local characteristics are prefered on slidingWindow over global characteristics", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const globalCharacteristics = ["someGlobalCharacteristic"] as const;
    const localCharacteristics = ["someLocalCharacteristic"] as const;

    const aj = arcjet({
      key: "test-key",
      characteristics: globalCharacteristics,
      rules: [
        slidingWindow({
          mode: "LIVE",
          interval: "1h",
          max: 60,
          characteristics: localCharacteristics,
        }),
      ],
      client,
      log: mockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      someGlobalCharacteristic: "test",
      someLocalCharacteristic: "test",
    };

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);

    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    const list = args.at(2);
    assert.ok(Array.isArray(list));
    const item = list.at(0);
    assert.ok(item);
    assert.ok(typeof item === "object");
    assert.ok("characteristics" in item);
    assert.deepEqual(item.characteristics, localCharacteristics);
  });

  test("global characteristics are propagated if they aren't separately specified in tokenBucket", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const globalCharacteristics = ["someGlobalCharacteristic"] as const;
    const aj = arcjet({
      key: "test-key",
      characteristics: globalCharacteristics,
      rules: [
        tokenBucket({
          mode: "LIVE",
          interval: "1h",
          refillRate: 1,
          capacity: 10,
        }),
      ],
      client,
      log: mockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      requested: 1,
      someGlobalCharacteristic: "test",
    };

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);

    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    const list = args.at(2);
    assert.ok(Array.isArray(list));
    const item = list.at(0);
    assert.ok(item);
    assert.ok(typeof item === "object");
    assert.ok("characteristics" in item);
    assert.deepEqual(item.characteristics, globalCharacteristics);
  });

  test("local characteristics are prefered on tokenBucket over global characteristics", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const globalCharacteristics = ["someGlobalCharacteristic"] as const;
    const localCharacteristics = ["someLocalCharacteristic"] as const;

    const aj = arcjet({
      key: "test-key",
      characteristics: globalCharacteristics,
      rules: [
        tokenBucket({
          mode: "LIVE",
          interval: "1h",
          refillRate: 1,
          capacity: 10,
          characteristics: localCharacteristics,
        }),
      ],
      client,
      log: mockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      requested: 1,
      someGlobalCharacteristic: "test",
      someLocalCharacteristic: "test",
    };

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const _ = await aj.protect(context, request);

    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    const list = args.at(2);
    assert.ok(Array.isArray(list));
    const item = list.at(0);
    assert.ok(item);
    assert.ok(typeof item === "object");
    assert.ok("characteristics" in item);
    assert.deepEqual(item.characteristics, localCharacteristics);
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import type { Client } from "@arcjet/protocol/client.js";
import arcjet, {
  type ArcjetContext,
  type ArcjetLogger,
  type ArcjetOptions,
  type ArcjetRule,
  type Arcjet,
  type Primitive,
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
type Props<P extends Primitive> =
  P extends Primitive<infer Props> ? Props : never;
type RuleProps<P extends Primitive, E> = IsEqual<Props<P>, E>;
type SDKProps<SDK, E> = IsEqual<SDK extends Arcjet<infer P> ? P : never, E>;

class ArcjetTestReason extends ArcjetReason {}

/**
 * Empty cache.
 */
class ExampleCache {
  async get(): Promise<[unknown, number]> {
    return [undefined, 0];
  }
  set() {}
}

/**
 * Arcjet logger that does nothing.
 */
const exampleLogger: ArcjetLogger = {
  debug() {},
  error() {},
  info() {},
  warn() {},
};

/**
 * Empty values for context.
 */
const exampleContext: ArcjetContext = {
  characteristics: [],
  cache: new ExampleCache(),
  fingerprint: "b",
  getBody() {
    return Promise.resolve(undefined);
  },
  key: "a",
  log: exampleLogger,
  runtime: "c",
};

/**
 * Empty values for options.
 */
const exampleOptions: ArcjetOptions<Array<Array<ArcjetRule>>, []> = {
  client: {
    async decide() {
      return new ArcjetAllowDecision({
        ttl: 0,
        reason: new ArcjetTestReason(),
        results: [],
      });
    },
    report() {},
  },
  key: "a",
  log: exampleLogger,
  rules: [],
};

/**
 * Empty values for details.
 */
const exampleDetails = {
  cookies: "",
  extra: {},
  headers: new Headers(),
  host: "example.com",
  ip: "172.100.1.1",
  method: "GET",
  path: "/",
  protocol: "http",
  query: "",
};

test("Arcjet*Decision", async (t) => {
  await t.test("id", async (t) => {
    await t.test("should generate an `id` field if not given", () => {
      const decision = new ArcjetAllowDecision({
        ttl: 0,
        reason: new ArcjetTestReason(),
        results: [],
      });

      assert.match(decision.id, /^lreq_/);
    });

    await t.test("should support a given `id` field", () => {
      const decision = new ArcjetAllowDecision({
        id: "abc_123",
        ttl: 0,
        reason: new ArcjetTestReason(),
        results: [],
      });
      assert.equal(decision.id, "abc_123");
    });
  });

  await t.test("error reason", async (t) => {
    // TODO: This test doesn't make sense anymore
    await t.test("should support an error given to an error reason", () => {
      const decision = new ArcjetErrorDecision({
        ttl: 0,
        reason: new ArcjetErrorReason(new Error("Foo bar baz")),
        results: [],
      });
      assert.ok(decision.reason instanceof ArcjetErrorReason);
      assert.equal(decision.reason.message, "Foo bar baz");
    });

    // TODO: This test doesn't make sense anymore
    await t.test("should support a string given to an error reason", () => {
      const decision = new ArcjetErrorDecision({
        ttl: 0,
        reason: new ArcjetErrorReason("Boom!"),
        results: [],
      });
      assert.ok(decision.reason instanceof ArcjetErrorReason);
      assert.equal(decision.reason.message, "Boom!");
    });

    // TODO: This test doesn't make sense anymore
    await t.test(
      "should support an unknown value given to an error reason",
      () => {
        const decision = new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason(["not", "valid", "error"]),
          results: [],
        });
        assert.ok(decision.reason instanceof ArcjetErrorReason);
        assert.equal(decision.reason.message, "Unknown error occurred");
      },
    );
  });

  await t.test("isAllowed", async (t) => {
    await t.test("should return `true` on an allow decision", () => {
      const decision = new ArcjetAllowDecision({
        ttl: 0,
        reason: new ArcjetTestReason(),
        results: [],
      });
      assert.equal(decision.isAllowed(), true);
    });

    await t.test("should return `true` on an error decision", () => {
      const decision = new ArcjetErrorDecision({
        ttl: 0,
        reason: new ArcjetErrorReason("Something"),
        results: [],
      });
      assert.equal(decision.isAllowed(), true);
    });

    await t.test("should return `false` on a deny decision", () => {
      const decision = new ArcjetDenyDecision({
        ttl: 0,
        reason: new ArcjetTestReason(),
        results: [],
      });
      assert.equal(decision.isAllowed(), false);
    });
  });

  await t.test("isDenied", async (t) => {
    await t.test("should return `false` on an allow decision", () => {
      const decision = new ArcjetAllowDecision({
        ttl: 0,
        reason: new ArcjetTestReason(),
        results: [],
      });
      assert.equal(decision.isDenied(), false);
    });

    await t.test("should return `false` on an error decision", () => {
      const decision = new ArcjetErrorDecision({
        ttl: 0,
        reason: new ArcjetErrorReason("Something"),
        results: [],
      });
      assert.equal(decision.isDenied(), false);
    });

    await t.test("should return `true` on a deny decision", () => {
      const decision = new ArcjetDenyDecision({
        ttl: 0,
        reason: new ArcjetTestReason(),
        results: [],
      });
      assert.equal(decision.isDenied(), true);
    });
  });

  await t.test("isChallenged", async (t) => {
    await t.test("should return `true` on a challenge decision", () => {
      const decision = new ArcjetChallengeDecision({
        ttl: 0,
        reason: new ArcjetTestReason(),
        results: [],
      });
      assert.equal(decision.isChallenged(), true);
    });
  });

  await t.test("isErrored", async (t) => {
    await t.test("should return `false` on an allow decision", () => {
      const decision = new ArcjetAllowDecision({
        ttl: 0,
        reason: new ArcjetTestReason(),
        results: [],
      });
      assert.equal(decision.isErrored(), false);
    });

    await t.test("should return `true` on an error decision", () => {
      const decision = new ArcjetErrorDecision({
        ttl: 0,
        reason: new ArcjetErrorReason("Something"),
        results: [],
      });
      assert.equal(decision.isErrored(), true);
    });

    await t.test("should return `false` on a deny decision", () => {
      const decision = new ArcjetDenyDecision({
        ttl: 0,
        reason: new ArcjetTestReason(),
        results: [],
      });
      assert.equal(decision.isErrored(), false);
    });
  });
});

test("Arcjet*Reason", async (t) => {
  await t.test("isRateLimit", async (t) => {
    await t.test("should return `true` on a rate limit reason", () => {
      const reason = new ArcjetRateLimitReason({
        max: 0,
        remaining: 0,
        reset: 100,
        window: 100,
      });
      assert.equal(reason.isRateLimit(), true);
    });

    await t.test("should return `false` on a test reason", () => {
      const reason = new ArcjetTestReason();
      assert.equal(reason.isRateLimit(), false);
    });
  });

  await t.test("isBot", async (t) => {
    await t.test("should return `true` on a bot reason", () => {
      const reason = new ArcjetBotReason({
        allowed: [],
        denied: [],
        verified: false,
        spoofed: false,
      });
      assert.equal(reason.isBot(), true);
    });

    await t.test("should return `false` on a test reason", () => {
      const reason = new ArcjetTestReason();
      assert.equal(reason.isBot(), false);
    });
  });

  await t.test("isVerified", async (t) => {
    await t.test("should return `true` if passed", () => {
      const reason = new ArcjetBotReason({
        allowed: [],
        denied: [],
        verified: true,
        spoofed: false,
      });
      assert.equal(reason.isVerified(), true);
    });

    await t.test("should return `false` if passed", () => {
      const reason = new ArcjetBotReason({
        allowed: [],
        denied: [],
        verified: false,
        spoofed: false,
      });
      assert.equal(reason.isVerified(), false);
    });
  });

  await t.test("isSpoofed", async (t) => {
    await t.test("should return `true` if passed", () => {
      const reason = new ArcjetBotReason({
        allowed: [],
        denied: [],
        verified: false,
        spoofed: true,
      });
      assert.equal(reason.isSpoofed(), true);
    });

    await t.test("should return `false` if passed", () => {
      const reason = new ArcjetBotReason({
        allowed: [],
        denied: [],
        verified: false,
        spoofed: false,
      });
      assert.equal(reason.isSpoofed(), false);
    });
  });
});

test("detectBot", async (t) => {
  await t.test("should fail if `mode` is invalid", async () => {
    assert.throws(() => {
      detectBot({
        // @ts-expect-error: test runtime behavior of unknown `mode`.
        mode: "INVALID",
        allow: [],
      });
    }, /`detectBot` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  await t.test("should fail if `allow` is invalid", async () => {
    assert.throws(() => {
      detectBot({
        // @ts-expect-error: test runtime behavior of invalid `allow` value.
        allow: "abc",
      });
    }, /detectBot` options error: invalid type for `allow` - expected an array/);
  });

  await t.test("should fail if items in `allow` are invalid", async () => {
    assert.throws(() => {
      detectBot({
        // @ts-expect-error: test runtime behavior of invalid `allow[]` value.
        allow: [/abc/],
      });
    }, /detectBot` options error: invalid type for `allow\[0]` - expected string/);
  });

  await t.test("should fail if `deny` is invalid", async () => {
    assert.throws(() => {
      detectBot({
        // @ts-expect-error: test runtime behavior of invalid `deny` value.
        deny: "abc",
      });
    }, /detectBot` options error: invalid type for `deny` - expected an array/);
  });

  await t.test("should fail if `deny` is invalid", async () => {
    assert.throws(() => {
      detectBot({
        // @ts-expect-error: test runtime behavior of invalid `deny[]` value.
        deny: [/abc/],
      });
    }, /detectBot` options error: invalid type for `deny\[0]` - expected string/);
  });

  await t.test("should fail if `allow` and `deny` are both given", async () => {
    assert.throws(() => {
      detectBot(
        // @ts-expect-error: test runtime behavior of invalid combination of both fields.
        { allow: ["CURL"], deny: ["GOOGLE_ADSBOT"] },
      );
    }, /`detectBot` options error: `allow` and `deny` cannot be provided together/);
  });

  await t.test(
    "should fail if neither `allow` nor `deny` are given",
    async () => {
      assert.throws(() => {
        detectBot(
          // @ts-expect-error: test runtime behavior of neither `allow` nor `deny`.
          {},
        );
      }, /`detectBot` options error: either `allow` or `deny` must be specified/);
    },
  );

  await t.test("should fail when calling `validate` w/o headers", () => {
    const [rule] = detectBot({ allow: [], mode: "LIVE" });

    assert.throws(() => {
      const _ = rule.validate(exampleContext, {
        ...exampleDetails,
        headers: undefined,
      });
    }, /bot detection requires `headers` to be set/);
  });

  await t.test("should fail when calling `validate` w/ invalid headers", () => {
    const [rule] = detectBot({ allow: [], mode: "LIVE" });

    assert.throws(() => {
      const _ = rule.validate(exampleContext, {
        ...exampleDetails,
        // @ts-expect-error: test runtime behavior of invalid `headers`.
        headers: {},
      });
    }, /bot detection requires `headers` to extend `Headers`/);
  });

  await t.test(
    "should fail when calling `validate` w/o `User-Agent` header",
    async () => {
      const [rule] = detectBot({ allow: [], mode: "LIVE" });

      assert.throws(() => {
        const _ = rule.validate(exampleContext, {
          ...exampleDetails,
          headers: new Headers(),
        });
      }, /bot detection requires user-agent header/);
    },
  );

  await t.test("should support `mode: DRY_RUN`", async () => {
    const [rule] = detectBot({ allow: [], mode: "DRY_RUN" });
    const result = await rule.protect(exampleContext, {
      ...exampleDetails,
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
    });
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, ["CURL"]);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "DRY_RUN");
  });

  await t.test("should deny a well-known bot w/ empty `allow`", async () => {
    const [rule] = detectBot({ allow: [], mode: "LIVE" });
    const result = await rule.protect(exampleContext, {
      ...exampleDetails,
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
    });
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, ["CURL"]);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "RUN");
  });

  await t.test(
    "should allow a well-known bot if listed in `allow`",
    async () => {
      const [rule] = detectBot({ allow: ["CURL"], mode: "LIVE" });
      const result = await rule.protect(exampleContext, {
        ...exampleDetails,
        headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      });
      assert.equal(result.conclusion, "ALLOW");
      assert.ok(result.reason instanceof ArcjetBotReason);
      assert.deepEqual(result.reason.allowed, ["CURL"]);
      assert.deepEqual(result.reason.denied, []);
      assert.equal(result.reason.spoofed, false);
      assert.equal(result.reason.verified, false);
      assert.equal(result.state, "RUN");
    },
  );

  await t.test(
    "should deny a well-known both if listed in `deny`",
    async () => {
      const [rule] = detectBot({ deny: ["CURL"], mode: "LIVE" });
      const result = await rule.protect(exampleContext, {
        ...exampleDetails,
        headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      });
      assert.equal(result.conclusion, "DENY");
      assert.ok(result.reason instanceof ArcjetBotReason);
      assert.deepEqual(result.reason.allowed, []);
      assert.deepEqual(result.reason.denied, ["CURL"]);
      assert.equal(result.reason.spoofed, false);
      assert.equal(result.reason.verified, false);
      assert.equal(result.state, "RUN");
    },
  );

  await t.test("should use the cache", async () => {
    let calls = 0;
    const [rule] = detectBot({ allow: [], mode: "LIVE" });
    const result = await rule.protect(
      {
        ...exampleContext,
        cache: {
          async get(namespace, key) {
            calls++;
            assert.equal(
              namespace,
              "84d7c3e132098fafcd8076e0d70154224336f5de91e23c1e538f203e5e46735f",
            );
            assert.equal(key, "b");
            return [
              {
                conclusion: "DENY",
                reason: new ArcjetBotReason({
                  allowed: [],
                  denied: ["CURL"],
                  spoofed: false,
                  verified: false,
                }),
              },
              10,
            ];
          },
          set() {},
        },
      },
      exampleDetails,
    );

    assert.equal(calls, 1);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, ["CURL"]);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "CACHED");
    assert.equal(result.ttl, 10);
  });
});

test("tokenBucket", async (t) => {
  await t.test("should fail if `mode` is invalid", async () => {
    assert.throws(() => {
      tokenBucket({
        capacity: 1,
        interval: 1,
        // @ts-expect-error: test runtime behavior of `mode`.
        mode: "INVALID",
        refillRate: 1,
      });
    }, /`tokenBucket` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  await t.test("should fail if `characteristics` is invalid", async () => {
    assert.throws(() => {
      tokenBucket({
        capacity: 1,
        // @ts-expect-error: test runtime behavior of `characteristics`.
        characteristics: 12345,
        interval: 1,
        refillRate: 1,
      });
    }, /`tokenBucket` options error: invalid type for `characteristics` - expected an array/);
  });

  await t.test(
    "should fail if items in `characteristics` are invalid",
    async () => {
      assert.throws(() => {
        tokenBucket({
          capacity: 1,
          // @ts-expect-error: test runtime behavior of `characteristics[]`.
          characteristics: [/foobar/],
          interval: 1,
          refillRate: 1,
        });
      }, /`tokenBucket` options error: invalid type for `characteristics\[0]` - expected string/);
    },
  );

  await t.test("should fail if `refillRate` is missing", async () => {
    assert.throws(() => {
      tokenBucket(
        // @ts-expect-error: test runtime behavior of `options`.
        { capacity: 1, interval: 1 },
      );
    }, /`tokenBucket` options error: `refillRate` is required/);
  });

  await t.test("should fail if `refillRate` is invalid", async () => {
    assert.throws(() => {
      tokenBucket({
        capacity: 1,
        interval: 1,
        // @ts-expect-error: test runtime behavior of invalid `refillRate`.
        refillRate: "abc",
      });
    }, /`tokenBucket` options error: invalid type for `refillRate` - expected number/);
  });

  await t.test("should fail if `interval` is missing", async () => {
    assert.throws(() => {
      tokenBucket(
        // @ts-expect-error: test runtime behavior of missing `interval`.
        { capacity: 1, refillRate: 1 },
      );
    }, /`tokenBucket` options error: `interval` is required/);
  });

  await t.test("should fail if `interval` is invalid", async () => {
    assert.throws(() => {
      tokenBucket({
        capacity: 1,
        // @ts-expect-error: test runtime behavior of invalid `interval`.
        interval: /foobar/,
        refillRate: 1,
      });
    }, /`tokenBucket` options error: invalid type for `interval` - expected one of string, number/);
  });

  await t.test("should fail if `capacity` is missing", async () => {
    assert.throws(() => {
      tokenBucket(
        // @ts-expect-error: test runtime behavior of missing `capacity`.
        { interval: 1, refillRate: 1 },
      );
    }, /`tokenBucket` options error: `capacity` is required/);
  });

  await t.test("should fail if `capacity` is invalid", async () => {
    assert.throws(() => {
      tokenBucket({
        // @ts-expect-error: test runtime behavior of invalid `capacity`.
        capacity: "abc",
        interval: 1,
        refillRate: 1,
      });
    }, /`tokenBucket` options error: invalid type for `capacity` - expected number/);
  });

  await t.test("should set `mode: LIVE` if passed", async () => {
    const [rule] = tokenBucket({
      capacity: 1,
      characteristics: ["ip.src"],
      interval: 1,
      mode: "LIVE",
      refillRate: 1,
    });
    assert.equal(rule.mode, "LIVE");
  });

  await t.test(
    "should support `string` duration notation for `interval`",
    async () => {
      const [rule] = tokenBucket({
        capacity: 120,
        interval: "60s",
        refillRate: 60,
      });

      // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
      assert.equal(rule.refillRate, 60);
      // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
      assert.equal(rule.interval, 60);
      // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
      assert.equal(rule.capacity, 120);
    },
  );

  await t.test("should support `number`s for `interval`", async () => {
    const [rule] = tokenBucket({
      capacity: 120,
      interval: 60,
      refillRate: 60,
    });

    assert.equal(rule.type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.refillRate, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.interval, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.capacity, 120);
  });

  await t.test("should support options", async () => {
    const [rule] = tokenBucket({
      capacity: 1,
      characteristics: ["ip.src"],
      interval: 1,
      refillRate: 1,
    });

    assert.equal(rule.type, "RATE_LIMIT");
    assert.equal(rule.mode, "DRY_RUN");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.characteristics, ["ip.src"]);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.algorithm, "TOKEN_BUCKET");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.refillRate, 1);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.interval, 1);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.capacity, 1);
  });

  await t.test(
    "should not default to some value if w/o `characteristics`",
    async () => {
      const [rule] = tokenBucket({ capacity: 1, interval: 1, refillRate: 1 });
      assert.equal(rule.type, "RATE_LIMIT");
      // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
      assert.equal(rule.characteristics, undefined);
    },
  );

  await t.test(
    "should reflect user-defined `characteristics` in required props",
    async () => {
      const rules = tokenBucket({
        capacity: 120,
        characteristics: ["userId"],
        interval: 60,
        refillRate: 60,
      });
      type Test = Assert<
        RuleProps<
          typeof rules,
          { requested: number; userId: string | number | boolean }
        >
      >;
    },
  );

  await t.test(
    "should ignore well-known `characteristics` in props",
    async () => {
      const rules = tokenBucket({
        capacity: 120,
        characteristics: [
          "ip.src",
          "http.host",
          "http.method",
          "http.request.uri.path",
          `http.request.headers["abc"]`,
          `http.request.cookie["xyz"]`,
          `http.request.uri.args["foobar"]`,
        ],
        interval: 60,
        refillRate: 60,
      });
      type Test = Assert<RuleProps<typeof rules, { requested: number }>>;
    },
  );

  await t.test("should use the cache", async () => {
    let calls = 0;
    const [rule] = tokenBucket({ capacity: 1, interval: 1, refillRate: 1 });
    const result = await rule.protect(
      {
        ...exampleContext,
        cache: {
          async get(namespace, key) {
            calls++;
            assert.equal(
              namespace,
              "da610f3767d3b939fe2769b489fba4a91da2ab7413184dbbbe6d12519abc1e7b",
            );
            assert.equal(
              key,
              "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
            );
            return [
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
            ];
          },
          set() {},
        },
      },
      { ...exampleDetails, requested: 1 },
    );

    assert.equal(calls, 1);
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

  await t.test("should pass global characteristics", async () => {
    let calls = 0;

    const client: Client = {
      async decide(context, details, rules) {
        assert.equal(calls, 0);
        calls++;

        assert.equal(rules.length, 1);
        const item = rules.at(0);
        assert.ok(item);
        assert.ok("characteristics" in item);
        assert.deepEqual(item.characteristics, ["someGlobalCharacteristic"]);

        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    const aj = arcjet({
      ...exampleOptions,
      characteristics: ["someGlobalCharacteristic"],
      rules: [
        tokenBucket({
          capacity: 10,
          interval: "1h",
          mode: "LIVE",
          refillRate: 1,
        }),
      ],
      client,
    });

    await aj.protect(exampleContext, {
      ...exampleDetails,
      requested: 1,
      someGlobalCharacteristic: "test",
    });
    assert.equal(calls, 1);
  });

  await t.test("should prefer local characteristics", async () => {
    let calls = 0;

    const client: Client = {
      async decide(context, details, rules) {
        assert.equal(calls, 0);
        calls++;

        assert.equal(rules.length, 1);
        const item = rules.at(0);
        assert.ok(item);
        assert.ok("characteristics" in item);
        assert.deepEqual(item.characteristics, ["someLocalCharacteristic"]);

        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    const aj = arcjet({
      ...exampleOptions,
      characteristics: ["someGlobalCharacteristic"],
      rules: [
        tokenBucket({
          capacity: 10,
          characteristics: ["someLocalCharacteristic"],
          interval: "1h",
          mode: "LIVE",
          refillRate: 1,
        }),
      ],
      client,
    });

    await aj.protect(exampleContext, {
      ...exampleDetails,
      requested: 1,
      someGlobalCharacteristic: "test",
      someLocalCharacteristic: "test",
    });
    assert.equal(calls, 1);
  });
});

test("fixedWindow", async (t) => {
  await t.test("should fail if `mode` is invalid", async () => {
    assert.throws(() => {
      fixedWindow({
        max: 1,
        // @ts-expect-error: test runtime behavior of invalid `mode`.
        mode: "INVALID",
        window: "1h",
      });
    }, /`fixedWindow` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  await t.test("should fail if `window` is missing", async () => {
    assert.throws(() => {
      fixedWindow(
        // @ts-expect-error: test runtime behavior of missing `window`.
        { max: 1 },
      );
    }, /`fixedWindow` options error: `window` is required/);
  });

  await t.test("should fail if `window` is invalid", async () => {
    assert.throws(() => {
      fixedWindow({
        max: 1,
        // @ts-expect-error: test runtime behavior of invalid `window`.
        window: /foobar/,
      });
    }, /`fixedWindow` options error: invalid type for `window` - expected one of string, number/);
  });

  await t.test("should fail if `max` is missing", async () => {
    assert.throws(() => {
      fixedWindow(
        // @ts-expect-error: test runtime behavior of missing `max`.
        { window: 1 },
      );
    }, /`fixedWindow` options error: `max` is required/);
  });

  await t.test("should fail if `max` is invalid", async () => {
    assert.throws(() => {
      fixedWindow({
        // @ts-expect-error: test runtime behavior of invalid `max`.
        max: "abc",
        window: 1,
      });
    }, /`fixedWindow` options error: invalid type for `max` - expected number/);
  });

  await t.test("should set `mode: LIVE` if passed", async () => {
    const [rule] = fixedWindow({
      characteristics: ["ip.src"],
      max: 1,
      mode: "LIVE",
      window: "1h",
    });
    assert.equal(rule.type, "RATE_LIMIT");
    assert.equal(rule.mode, "LIVE");
  });

  await t.test(
    "should support `string` duration notation for `window`",
    async () => {
      const [rule] = fixedWindow({ max: 1, window: "60s" });

      assert.equal(rule.type, "RATE_LIMIT");
      // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
      assert.equal(rule.window, 60);
      // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
      assert.equal(rule.max, 1);
    },
  );

  await t.test("should support `number`s for `window`", async () => {
    const [rule] = fixedWindow({ max: 1, window: 60 });

    assert.equal(rule.type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.window, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.max, 1);
  });

  await t.test("should support options", async () => {
    const [rule] = fixedWindow({
      characteristics: ["ip.src"],
      max: 1,
      window: "1h",
    });

    assert.equal(rule.type, "RATE_LIMIT");
    assert.equal(rule.mode, "DRY_RUN");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.characteristics, ["ip.src"]);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.algorithm, "FIXED_WINDOW");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.window, 3600);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.max, 1);
  });

  await t.test(
    "should not default to some value if w/o `characteristics`",
    async () => {
      const [rule] = fixedWindow({ max: 1, window: "1h" });
      assert.equal(rule.type, "RATE_LIMIT");
      // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
      assert.equal(rule.characteristics, undefined);
    },
  );

  await t.test(
    "should reflect user-defined `characteristics` in required props",
    async () => {
      const rules = fixedWindow({
        characteristics: ["userId"],
        max: 1,
        window: "1h",
      });

      type Test = Assert<
        RuleProps<typeof rules, { userId: string | number | boolean }>
      >;
    },
  );

  await t.test(
    "should ignore well-known `characteristics` in props",
    async () => {
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
        max: 1,
        window: "1h",
      });

      type Test = Assert<RuleProps<typeof rules, {}>>;
    },
  );

  await t.test("should use the cache", async () => {
    let calls = 0;
    const [rule] = fixedWindow({ max: 1, window: 1 });
    const result = await rule.protect(
      {
        ...exampleContext,
        cache: {
          async get(namespace, key) {
            calls++;
            assert.equal(
              namespace,
              "c60466a160b56b4cc129995377ef6fbbcacc67f90218920416ae8431a6fd499c",
            );
            assert.equal(
              key,
              "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
            );
            return [
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
            ];
          },
          set() {},
        },
      },
      exampleDetails,
    );

    assert.equal(calls, 1);
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

  await t.test("should pass global characteristics", async () => {
    let calls = 0;

    const client: Client = {
      async decide(context, details, rules) {
        assert.equal(calls, 0);
        calls++;

        assert.equal(rules.length, 1);
        const item = rules.at(0);
        assert.ok(item);
        assert.ok("characteristics" in item);
        assert.deepEqual(item.characteristics, ["someGlobalCharacteristic"]);

        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    const aj = arcjet({
      ...exampleOptions,
      characteristics: ["someGlobalCharacteristic"],
      rules: [fixedWindow({ max: 60, mode: "LIVE", window: "1h" })],
      client,
    });

    await aj.protect(exampleContext, {
      ...exampleDetails,
      someGlobalCharacteristic: "test",
    });
    assert.equal(calls, 1);
  });

  await t.test("should prefer local characteristics", async () => {
    let calls = 0;

    const client: Client = {
      async decide(context, details, rules) {
        assert.equal(calls, 0);
        calls++;

        assert.equal(rules.length, 1);
        const item = rules.at(0);
        assert.ok(item);
        assert.ok("characteristics" in item);
        assert.deepEqual(item.characteristics, ["someLocalCharacteristic"]);

        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    const aj = arcjet({
      ...exampleOptions,
      characteristics: ["someGlobalCharacteristic"],
      rules: [
        fixedWindow({
          characteristics: ["someLocalCharacteristic"],
          max: 60,
          mode: "LIVE",
          window: "1h",
        }),
      ],
      client,
    });

    await aj.protect(exampleContext, {
      ...exampleDetails,
      someGlobalCharacteristic: "test",
      someLocalCharacteristic: "test",
    });
    assert.equal(calls, 1);
  });
});

test("slidingWindow", async (t) => {
  await t.test("should fail if `mode` is invalid", async () => {
    assert.throws(() => {
      slidingWindow({
        interval: 3600,
        max: 1,
        // @ts-expect-error: test runtime behavior of invalid `mode`.
        mode: "INVALID",
      });
    }, /`slidingWindow` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  await t.test("should fail if `interval` is missing", async () => {
    assert.throws(() => {
      slidingWindow(
        // @ts-expect-error: test runtime behavior of missing `interval`.
        { max: 1 },
      );
    }, /`slidingWindow` options error: `interval` is required/);
  });

  await t.test("should fail if `interval` is invalid", async () => {
    assert.throws(() => {
      slidingWindow({
        // @ts-expect-error: test runtime behavior of invalid `interval`.
        interval: /foobar/,
        max: 1,
      });
    }, /`slidingWindow` options error: invalid type for `interval` - expected one of string, number/);
  });

  await t.test("should fail if `max` is missing", async () => {
    assert.throws(() => {
      slidingWindow(
        // @ts-expect-error: test runtime behavior of missing `max`.
        { interval: 1 },
      );
    }, /`slidingWindow` options error: `max` is required/);
  });

  await t.test("should fail if `max` is invalid", async () => {
    assert.throws(() => {
      slidingWindow({
        interval: 1,
        // @ts-expect-error: test runtime behavior of invalid `max`.
        max: "abc",
      });
    }, /`slidingWindow` options error: invalid type for `max` - expected number/);
  });

  await t.test("should set `mode: LIVE` if passed", async () => {
    const [rule] = slidingWindow({
      characteristics: ["ip.src"],
      interval: 3600,
      max: 1,
      mode: "LIVE",
    });
    assert.equal(rule.type, "RATE_LIMIT");
    assert.equal(rule.mode, "LIVE");
  });

  await t.test(
    "should support `string` duration notation for `interval`",
    async () => {
      const [rule] = slidingWindow({ interval: "60s", max: 1 });

      assert.equal(rule.type, "RATE_LIMIT");
      // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
      assert.equal(rule.interval, 60);
      // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
      assert.equal(rule.max, 1);
    },
  );

  await t.test("should support `number`s for `interval`", async () => {
    const [rule] = slidingWindow({ interval: 60, max: 1 });

    assert.equal(rule.type, "RATE_LIMIT");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.interval, 60);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.max, 1);
  });

  await t.test("should support options", async () => {
    const [rule] = slidingWindow({
      characteristics: ["ip.src"],
      interval: 3600,
      max: 1,
    });

    assert.equal(rule.type, "RATE_LIMIT");
    assert.equal(rule.mode, "DRY_RUN");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.characteristics, ["ip.src"]);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.algorithm, "SLIDING_WINDOW");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.interval, 3600);
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.equal(rule.max, 1);
  });

  await t.test(
    "should not default to some value if w/o `characteristics`",
    async () => {
      const [rule] = slidingWindow({ interval: 3600, max: 1 });
      assert.equal(rule.type, "RATE_LIMIT");
      // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
      assert.equal(rule.characteristics, undefined);
    },
  );

  await t.test(
    "should reflect user-defined `characteristics` in required props",
    async () => {
      const rules = slidingWindow({
        characteristics: ["userId"],
        interval: "1h",
        max: 1,
      });

      type Test = Assert<
        RuleProps<typeof rules, { userId: string | number | boolean }>
      >;
    },
  );

  await t.test(
    "should ignore well-known `characteristics` in props",
    async () => {
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
    },
  );

  await t.test("should use the cache", async () => {
    let calls = 0;
    const [rule] = slidingWindow({ interval: 1, max: 1 });
    const result = await rule.protect(
      {
        ...exampleContext,
        cache: {
          async get(namespace, key) {
            calls++;
            assert.equal(
              namespace,
              "64653030723222b3227a642239fbfae3bc53369d858b5ed1a31a2bb0438dacb1",
            );
            assert.equal(
              key,
              "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
            );
            return [
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
            ];
          },
          set() {},
        },
      },
      exampleDetails,
    );
    assert.equal(calls, 1);
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

  await t.test("should pass global characteristics", async () => {
    let calls = 0;

    const client: Client = {
      async decide(context, details, rules) {
        assert.equal(calls, 0);
        calls++;

        assert.equal(rules.length, 1);
        const item = rules.at(0);
        assert.ok(item);
        assert.ok("characteristics" in item);
        assert.deepEqual(item.characteristics, ["someGlobalCharacteristic"]);

        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    const aj = arcjet({
      ...exampleOptions,
      characteristics: ["someGlobalCharacteristic"],
      rules: [slidingWindow({ interval: "1h", max: 60, mode: "LIVE" })],
      client,
    });

    await aj.protect(exampleContext, {
      ...exampleDetails,
      someGlobalCharacteristic: "test",
    });
    assert.equal(calls, 1);
  });

  await t.test("should prefer local characteristics", async () => {
    let calls = 0;

    const client: Client = {
      async decide(context, details, rules) {
        assert.equal(calls, 0);
        calls++;

        assert.equal(rules.length, 1);
        const item = rules.at(0);
        assert.ok(item);
        assert.ok("characteristics" in item);
        assert.deepEqual(item.characteristics, ["someLocalCharacteristic"]);

        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    const aj = arcjet({
      ...exampleOptions,
      characteristics: ["someGlobalCharacteristic"],
      rules: [
        slidingWindow({
          characteristics: ["someLocalCharacteristic"],
          interval: "1h",
          max: 60,
          mode: "LIVE",
        }),
      ],
      client,
    });

    await aj.protect(exampleContext, {
      ...exampleDetails,
      someGlobalCharacteristic: "test",
      someLocalCharacteristic: "test",
    });
    assert.equal(calls, 1);
  });
});

test("validateEmail", async (t) => {
  await t.test("should fail if `mode` is invalid", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error: test runtime behavior of invalid `mode`.
        mode: "INVALID",
      });
    }, /`validateEmail` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  await t.test("should fail if `allow` is invalid", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error: test runtime behavior of invalid `allow`.
        allow: 1234,
      });
    }, /`validateEmail` options error: invalid type for `allow` - expected an array/);
  });

  await t.test("should fail if `block` is invalid", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error: test runtime behavior of invalid `block`.
        block: 1234,
      });
    }, /`validateEmail` options error: invalid type for `block` - expected an array/);
  });

  await t.test("should fail if `deny` is invalid", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error: test runtime behavior of invalid `deny`.
        deny: 1234,
      });
    }, /`validateEmail` options error: invalid type for `deny` - expected an array/);
  });

  await t.test("should fail if items in `allow` are invalid", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error: test runtime behavior of invalid `allow[]`.
        allow: ["FOOBAR"],
      });
    }, /`validateEmail` options error: invalid value for `allow\[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'/);
  });

  await t.test("should fail if items in `block` are invalid", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error: test runtime behavior of invalid `block`.
        block: ["FOOBAR"],
      });
    }, /`validateEmail` options error: invalid value for `block\[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'/);
  });

  await t.test("should fail if items in `deny` are invalid", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error: test runtime behavior of invalid `deny[]`.
        deny: ["FOOBAR"],
      });
    }, /`validateEmail` options error: invalid value for `deny\[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'/);
  });

  await t.test("should fail if `allow` and `deny` are both given", async () => {
    assert.throws(() => {
      validateEmail(
        // @ts-expect-error: test runtime behavior of invalid combination of both fields.
        { allow: ["INVALID"], deny: ["INVALID"] },
      );
    }, /`validateEmail` options error: `allow` and `deny` cannot be provided together/);
  });

  await t.test("should fail if `block` and `deny` are both given", async () => {
    assert.throws(() => {
      validateEmail(
        // @ts-expect-error: test runtime behavior of invalid combination of both fields.
        { block: ["INVALID"], deny: ["INVALID"] },
      );
    }, /`validateEmail` options error: `deny` and `block` cannot be provided together, `block` is now deprecated so `deny` should be preferred./);
  });

  await t.test(
    "should fail if `allow` and `block` are both given",
    async () => {
      assert.throws(() => {
        validateEmail(
          // @ts-expect-error: test runtime behavior of invalid combination of both fields.
          { allow: ["INVALID"], block: ["INVALID"] },
        );
      }, /`validateEmail` options error: `allow` and `block` cannot be provided together/);
    },
  );

  await t.test(
    "should fail if `requireTopLevelDomain` is invalid",
    async () => {
      assert.throws(() => {
        validateEmail({
          // @ts-expect-error: test runtime behavior of invalid `requireTopLevelDomain`.
          requireTopLevelDomain: "abc",
        });
      }, /`validateEmail` options error: invalid type for `requireTopLevelDomain` - expected boolean/);
    },
  );

  await t.test("should fail if `allowDomainLiteral` is invalid", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error: test runtime behavior of invalid `allowDomainLiteral`.
        allowDomainLiteral: "abc",
      });
    }, /`validateEmail` options error: invalid type for `allowDomainLiteral` - expected boolean/);
  });

  await t.test("should support known values in `deny`", async () => {
    const [rule] = validateEmail({
      deny: ["DISPOSABLE", "FREE", "INVALID", "NO_GRAVATAR", "NO_MX_RECORDS"],
    });
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.deny, [
      "DISPOSABLE",
      "FREE",
      "INVALID",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
    ]);
  });

  await t.test("should support known values in `block` as `deny`", async () => {
    const [rule] = validateEmail({
      block: ["DISPOSABLE", "FREE", "INVALID", "NO_GRAVATAR", "NO_MX_RECORDS"],
    });
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.deny, [
      "DISPOSABLE",
      "FREE",
      "INVALID",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
    ]);
  });

  await t.test("should support known values in `allow`", async () => {
    const [rule] = validateEmail({
      allow: ["DISPOSABLE", "FREE", "INVALID", "NO_GRAVATAR", "NO_MX_RECORDS"],
    });
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.allow, [
      "DISPOSABLE",
      "FREE",
      "INVALID",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
    ]);
  });

  await t.test("should fail when calling `validate` w/o `email` field", () => {
    const [rule] = validateEmail({ deny: [], mode: "LIVE" });

    assert.throws(() => {
      const _ = rule.validate(exampleContext, {
        ...exampleDetails,
        email: undefined,
      });
    });
  });

  await t.test("should pass when calling `validate` w/ `email` field", () => {
    const [rule] = validateEmail({ deny: [], mode: "LIVE" });

    assert.doesNotThrow(() => {
      const _ = rule.validate(exampleContext, {
        ...exampleDetails,
        email: "abc@example.com",
      });
    });
  });

  await t.test(
    "should support calling `protect` w/ `mode: DRY_RUN`",
    async () => {
      const [rule] = validateEmail({ allow: [], mode: "DRY_RUN" });

      const result = await rule.protect(exampleContext, {
        ...exampleDetails,
        email: "foobarbaz",
      });
      assert.equal(result.conclusion, "DENY");
      assert.ok(result.reason instanceof ArcjetEmailReason);
      assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
      assert.equal(result.state, "DRY_RUN");
    },
  );

  await t.test("should allow a valid email", async () => {
    const [rule] = validateEmail({ allow: [], mode: "LIVE" });
    const result = await rule.protect(exampleContext, {
      ...exampleDetails,
      email: "foobarbaz@example.com",
    });
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, []);
    assert.equal(result.state, "RUN");
  });

  await t.test("should deny an email w/o domain segment", async () => {
    const [rule] = validateEmail({ allow: [], mode: "LIVE" });
    const result = await rule.protect(exampleContext, {
      ...exampleDetails,
      email: "foobarbaz",
    });
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  await t.test("should deny an email w/o TLD", async () => {
    const [rule] = validateEmail({ allow: [], mode: "LIVE" });
    const result = await rule.protect(exampleContext, {
      ...exampleDetails,
      email: "foobarbaz@localhost",
    });
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  await t.test(
    "should allow an email w/o TLD w/ `requireTopLevelDomain: false`",
    async () => {
      const [rule] = validateEmail({
        allow: [],
        mode: "LIVE",
        requireTopLevelDomain: false,
      });
      assert.equal(rule.type, "EMAIL");
      const result = await rule.protect(exampleContext, {
        ...exampleDetails,
        email: "foobarbaz@localhost",
      });
      assert.equal(result.conclusion, "ALLOW");
      assert.ok(result.reason instanceof ArcjetEmailReason);
      assert.deepEqual(result.reason.emailTypes, []);
    },
  );

  await t.test("should deny an email w/ domain literal", async () => {
    const [rule] = validateEmail({ allow: [], mode: "LIVE" });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(exampleContext, {
      ...exampleDetails,
      email: "foobarbaz@[127.0.0.1]",
    });
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  await t.test(
    "should allow an email w/ domain literal w/ `allowDomainLiteral: true`",
    async () => {
      const [rule] = validateEmail({
        allowDomainLiteral: true,
        mode: "LIVE",
        allow: [],
      });
      assert.equal(rule.type, "EMAIL");
      const result = await rule.protect(exampleContext, {
        ...exampleDetails,
        email: "foobarbaz@[127.0.0.1]",
      });
      assert.equal(result.conclusion, "ALLOW");
      assert.ok(result.reason instanceof ArcjetEmailReason);
      assert.deepEqual(result.reason.emailTypes, []);
      assert.equal(result.state, "RUN");
    },
  );

  // Email validation is dynamic so all TTL are zero
  await t.test("should not use the cache", async () => {
    const [rule] = validateEmail({ allow: [], mode: "LIVE" });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(
      {
        ...exampleContext,
        cache: {
          get() {
            assert.fail();
          },
          set() {},
        },
      },
      { ...exampleDetails, email: "test@example.com" },
    );
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, []);
    assert.equal(result.state, "RUN");
  });
});

test("shield", async (t) => {
  await t.test("should fail if `mode` is invalid", async () => {
    assert.throws(() => {
      shield({
        // @ts-expect-error: test runtime behavior of invalid `mode`.
        mode: "INVALID",
      });
    }, /`shield` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  await t.test("should set `mode: DRY_RUN` w/o `mode`", async () => {
    // TODO(#4560): if `{}` is allowed then so could/should ``.
    const [rule] = shield({});
    assert.equal(rule.mode, "DRY_RUN");
  });

  await t.test("should set `mode: LIVE` if passed", async () => {
    const [rule] = shield({ mode: "LIVE" });
    assert.equal(rule.mode, "LIVE");
  });

  await t.test("should use the cache", async () => {
    let calls = 0;
    const [rule] = shield({ mode: "LIVE" });
    const result = await rule.protect(
      {
        ...exampleContext,
        cache: {
          async get(namespace, key) {
            calls++;
            assert.equal(
              namespace,
              "1a506ff95a8c2017894fcb6cc3be55053b144bd15666631945a5c453c477bd16",
            );
            assert.equal(
              key,
              "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
            );
            return [
              {
                conclusion: "DENY",
                reason: new ArcjetShieldReason({ shieldTriggered: true }),
              },
              10,
            ];
          },
          set() {},
        },
      },
      exampleDetails,
    );
    assert.equal(calls, 1);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetShieldReason);
    assert.equal(result.reason.shieldTriggered, true);
    assert.equal(result.state, "CACHED");
    assert.equal(result.ttl, 10);
  });

  await t.test("should not run locally", async () => {
    const [rule] = shield({ mode: "LIVE" });
    const result = await rule.protect(exampleContext, exampleDetails);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetShieldReason);
    assert.equal(result.reason.shieldTriggered, false);
    assert.equal(result.state, "NOT_RUN");
    assert.equal(result.ttl, 0);
  });
});

test("sensitiveInfo", async (t) => {
  await t.test("should fail if `mode` is invalid", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error: test runtime behavior of invalid `mode`.
        mode: "INVALID",
      });
    }, /`sensitiveInfo` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  await t.test("should fail if `allow` is invalid", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error: test runtime behavior of invalid `allow`.
        allow: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `allow` - expected an array/);
  });

  await t.test("should fail if items in `allow` are invalid", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error: test runtime behavior of invalid `allow[]`.
        allow: [/foo/],
      });
    }, /`sensitiveInfo` options error: invalid type for `allow\[0]` - expected string/);
  });

  await t.test("should fail if `deny` is invalid", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error: test runtime behavior of invalid `deny`.
        deny: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `deny` - expected an array/);
  });

  await t.test("should fail if items in `deny` are invalid", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error: test runtime behavior of invalid `deny[]`.
        deny: [/foo/],
      });
    }, /`sensitiveInfo` options error: invalid type for `deny\[0]` - expected string/);
  });

  await t.test("should fail if `contextWindowSize` is invalid", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error: test runtime behavior of invalid `contextWindowSize`.
        contextWindowSize: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `contextWindowSize` - expected number/);
  });

  await t.test("should fail if `detect` is invalid", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error: test runtime behavior of invalid `detect`.
        detect: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `detect` - expected function/);
  });

  await t.test("should fail if `allow` and `deny` are both given", async () => {
    assert.throws(() => {
      sensitiveInfo(
        // @ts-expect-error: test runtime behavior of invalid combination of both fields.
        { allow: [], deny: [] },
      );
    }, /`sensitiveInfo` options error: `allow` and `deny` cannot be provided together/);
  });

  await t.test(
    "should fail if neither `allow` nor `deny` are given",
    async () => {
      assert.throws(() => {
        sensitiveInfo(
          // @ts-expect-error: test runtime behavior of neither `allow` nor `deny`.
          {},
        );
      }, /`sensitiveInfo` options error: either `allow` or `deny` must be specified/);
    },
  );

  await t.test("should work w/ `allow`", async () => {
    const [rule] = sensitiveInfo({ allow: ["CREDIT_CARD_NUMBER", "EMAIL"] });
    assert.equal(rule.type, "SENSITIVE_INFO");
  });

  await t.test("should not fail when calling `validate`", () => {
    const [rule] = sensitiveInfo({ allow: [], mode: "LIVE" });
    assert.doesNotThrow(() => {
      const _ = rule.validate(exampleContext, exampleDetails);
    });
  });

  await t.test("should protect a body w/ normal info (live)", async () => {
    const [rule] = sensitiveInfo({ allow: [], mode: "LIVE" });
    const result = await rule.protect(
      {
        ...exampleContext,
        async getBody() {
          return "none of this is sensitive";
        },
      },
      exampleDetails,
    );
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.state, "RUN");
  });

  await t.test("should detect sensitive info (dry run)", async () => {
    const [rule] = sensitiveInfo({ allow: [], mode: "DRY_RUN" });
    const result = await rule.protect(
      {
        ...exampleContext,
        async getBody() {
          return "127.0.0.1 test@example.com 4242424242424242 +353 87 123 4567";
        },
      },
      exampleDetails,
    );
    // TODO(#4561): should be `ALLOW` in dry run mode.
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, [
      { end: 9, identifiedType: "IP_ADDRESS", start: 0 },
      { end: 26, identifiedType: "EMAIL", start: 10 },
      { end: 43, identifiedType: "CREDIT_CARD_NUMBER", start: 27 },
      { end: 60, identifiedType: "PHONE_NUMBER", start: 44 },
    ]);
    assert.equal(result.state, "DRY_RUN");
  });

  await t.test("should detect sensitive info (live)", async () => {
    const [rule] = sensitiveInfo({ allow: [], mode: "LIVE" });
    const result = await rule.protect(
      {
        ...exampleContext,
        async getBody() {
          return "127.0.0.1 test@example.com 4242424242424242 +353 87 123 4567";
        },
      },
      exampleDetails,
    );
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, [
      { end: 9, identifiedType: "IP_ADDRESS", start: 0 },
      { end: 26, identifiedType: "EMAIL", start: 10 },
      { end: 43, identifiedType: "CREDIT_CARD_NUMBER", start: 27 },
      { end: 60, identifiedType: "PHONE_NUMBER", start: 44 },
    ]);
    assert.equal(result.state, "RUN");
  });

  await t.test(
    "should detect sensitive info, some of which in `allow`",
    async () => {
      const [rule] = sensitiveInfo({
        allow: ["EMAIL", "PHONE_NUMBER"],
        mode: "LIVE",
      });
      const result = await rule.protect(
        {
          ...exampleContext,
          async getBody() {
            return "127.0.0.1 test@example.com 4242424242424242 +353 87 123 4567";
          },
        },
        exampleDetails,
      );
      assert.equal(result.conclusion, "DENY");
      assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
      assert.deepEqual(result.reason.allowed, [
        { end: 26, identifiedType: "EMAIL", start: 10 },
        { end: 60, identifiedType: "PHONE_NUMBER", start: 44 },
      ]);
      assert.deepEqual(result.reason.denied, [
        { end: 9, identifiedType: "IP_ADDRESS", start: 0 },
        { end: 43, identifiedType: "CREDIT_CARD_NUMBER", start: 27 },
      ]);
      assert.equal(result.state, "RUN");
    },
  );

  await t.test(
    "should detect sensitive info, all of which in `allow`",
    async () => {
      const [rule] = sensitiveInfo({
        allow: ["EMAIL", "PHONE_NUMBER"],
        mode: "LIVE",
      });
      const result = await rule.protect(
        {
          ...exampleContext,
          async getBody() {
            return "test@example.com +353 87 123 4567";
          },
        },
        exampleDetails,
      );
      assert.equal(result.conclusion, "ALLOW");
      assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
      assert.deepEqual(result.reason.allowed, [
        { end: 16, identifiedType: "EMAIL", start: 0 },
        { end: 33, identifiedType: "PHONE_NUMBER", start: 17 },
      ]);
      assert.deepEqual(result.reason.denied, []);
      assert.equal(result.state, "RUN");
    },
  );

  await t.test(
    "should detect sensitive info, some of which in `deny` (1)",
    async () => {
      const [rule] = sensitiveInfo({
        deny: ["CREDIT_CARD_NUMBER", "IP_ADDRESS"],
        mode: "LIVE",
      });
      const result = await rule.protect(
        {
          ...exampleContext,
          async getBody() {
            return "127.0.0.1 test@example.com +353 87 123 4567";
          },
        },
        exampleDetails,
      );
      assert.equal(result.conclusion, "DENY");
      assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
      assert.deepEqual(result.reason.allowed, [
        { end: 26, identifiedType: "EMAIL", start: 10 },
        { end: 43, identifiedType: "PHONE_NUMBER", start: 27 },
      ]);
      assert.deepEqual(result.reason.denied, [
        { end: 9, identifiedType: "IP_ADDRESS", start: 0 },
      ]);
      assert.equal(result.state, "RUN");
    },
  );

  await t.test(
    "should detect sensitive info, some of which is in `deny` (2)",
    async () => {
      const [rule] = sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" });
      const result = await rule.protect(
        {
          ...exampleContext,
          async getBody() {
            return "test@example.com +353 87 123 4567";
          },
        },
        exampleDetails,
      );
      assert.equal(result.conclusion, "DENY");
      assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
      assert.deepEqual(result.reason.allowed, [
        { end: 33, identifiedType: "PHONE_NUMBER", start: 17 },
      ]);
      assert.deepEqual(result.reason.denied, [
        { end: 16, identifiedType: "EMAIL", start: 0 },
      ]);
      assert.equal(result.state, "RUN");
    },
  );

  await t.test("should support a custom `detect` function", async () => {
    function detect(tokens: string[]) {
      return tokens.map((token) => {
        if (token === "bad") {
          return "CUSTOM";
        }
      });
    }

    const [rule] = sensitiveInfo({
      contextWindowSize: 1,
      deny: ["CUSTOM"],
      detect,
      mode: "LIVE",
    });
    const result = await rule.protect(
      {
        ...exampleContext,
        async getBody() {
          return "this is bad";
        },
      },
      exampleDetails,
    );
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, [
      { end: 11, identifiedType: "CUSTOM", start: 8 },
    ]);
    assert.equal(result.state, "RUN");
  });

  await t.test(
    "should fail id custom `detect` returns non-string",
    async () => {
      function detect(tokens: string[]) {
        return tokens.map((token) => {
          if (token === "bad") {
            return 12345;
          }
        });
      }

      const [rule] = sensitiveInfo({
        allow: [],
        contextWindowSize: 1,
        // @ts-expect-error: test runtime behavior of invalid `detect`.
        detect,
        mode: "LIVE",
      });
      await assert.rejects(async () => {
        await rule.protect(
          {
            ...exampleContext,
            async getBody() {
              return "this is bad";
            },
          },
          exampleDetails,
        );
      }, /invalid entity type/);
    },
  );

  await t.test(
    "should support a custom `detect` matching default values, and allowing them",
    async () => {
      function detect(tokens: string[]) {
        return tokens.map((token) => {
          if (token === "test@example.com") {
            return "custom";
          }
        });
      }

      const [rule] = sensitiveInfo({
        allow: ["custom"],
        contextWindowSize: 1,
        detect,
        mode: "LIVE",
      });
      const result = await rule.protect(
        {
          ...exampleContext,
          async getBody() {
            return "my email is test@example.com";
          },
        },
        exampleDetails,
      );
      assert.equal(result.conclusion, "ALLOW");
      assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
      assert.deepEqual(result.reason.allowed, [
        { end: 28, identifiedType: "custom", start: 12 },
      ]);
      assert.deepEqual(result.reason.denied, []);
      assert.equal(result.state, "RUN");
    },
  );

  await t.test(
    "should pass n-grams the size of `contextWindowSize`",
    async () => {
      let called = false;

      function detect(tokens: string[]) {
        called = true;
        assert.equal(tokens.length, 3);
        return tokens.map(() => undefined);
      }

      const [rule] = sensitiveInfo({
        allow: [],
        contextWindowSize: 3,
        detect,
        mode: "LIVE",
      });
      await rule.protect(
        {
          ...exampleContext,
          async getBody() {
            return "my email is test@example.com";
          },
        },
        exampleDetails,
      );

      assert.ok(called);
    },
  );

  await t.test("should error if w/o body (`undefined`)", async () => {
    const [rule] = sensitiveInfo({ allow: [], mode: "LIVE" });
    const decision = await rule.protect(
      {
        ...exampleContext,
        getBody() {
          return Promise.resolve(undefined);
        },
      },
      exampleDetails,
    );
    assert.equal(decision.ttl, 0);
    assert.equal(decision.state, "NOT_RUN");
    assert.equal(decision.conclusion, "ERROR");
  });

  await t.test("should allow if w/ empty body (`''`)", async () => {
    const [rule] = sensitiveInfo({ allow: [], mode: "LIVE" });
    const decision = await rule.protect(
      {
        ...exampleContext,
        getBody() {
          return Promise.resolve("");
        },
      },
      exampleDetails,
    );
    assert.equal(decision.ttl, 0);
    assert.equal(decision.state, "RUN");
    assert.equal(decision.conclusion, "ALLOW");
  });

  // Sensitive info detection is dynamic so all TTL are zero
  await t.test("should not use the cache", async () => {
    const [rule] = sensitiveInfo({ allow: [], mode: "LIVE" });
    const result = await rule.protect(
      {
        ...exampleContext,
        cache: {
          get() {
            assert.fail();
          },
          set() {},
        },
        async getBody() {
          return "nothing to detect";
        },
      },
      exampleDetails,
    );
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.state, "RUN");
  });
});

test("protectSignup", async (t) => {
  await t.test("should work", () => {
    const rules = protectSignup({
      bots: { allow: [], mode: "DRY_RUN" },
      email: { allow: [], mode: "LIVE" },
      rateLimit: {
        characteristics: ["ip.src"],
        interval: 60 /* minutes */ * 60 /* seconds */,
        max: 1,
        mode: "DRY_RUN",
      },
    });
    assert.equal(rules.length, 3);
  });
});

test("SDK", async (t) => {
  await t.test("should work w/o rules", () => {
    const aj = arcjet(exampleOptions);
    assert.equal(typeof aj.protect, "function");
  });

  await t.test("should add more rules w/ `withRule`", async () => {
    const rule = tokenBucket({
      characteristics: ["userId"],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });
    const client: Client = {
      async decide(context, details, rules) {
        assert.deepEqual(rules, rule);
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    const aj = arcjet({ ...exampleOptions, client });
    type WithoutRuleTest = Assert<SDKProps<typeof aj, {}>>;

    const ajOther = aj.withRule(rule);
    type WithRuleTest = Assert<
      SDKProps<
        typeof ajOther,
        { requested: number; userId: string | number | boolean }
      >
    >;

    await ajOther.protect(exampleContext, {
      ...exampleDetails,
      userId: "abc123",
      requested: 1,
    });
  });

  await t.test(
    "should add more rules w/ repeated `withRule` calls",
    async () => {
      let parameters: unknown;

      const client: Client = {
        async decide(a, b, ...rest) {
          parameters = rest;
          return new ArcjetAllowDecision({
            ttl: 0,
            reason: new ArcjetTestReason(),
            results: [],
          });
        },
        report() {
          assert.fail();
        },
      };

      const aj = arcjet({ ...exampleOptions, client });
      type WithoutRuleTest = Assert<SDKProps<typeof aj, {}>>;

      const rule = tokenBucket({
        characteristics: ["userId"],
        refillRate: 60,
        interval: 60,
        capacity: 120,
      });

      const ajOther = aj.withRule(rule);
      type WithRuleTestOne = Assert<
        SDKProps<
          typeof ajOther,
          { requested: number; userId: string | number | boolean }
        >
      >;

      // TODO(@wooorm-arcjet): the types do not relate to reality,
      // this rule has nothing to do with some field `abc`.
      const testRule: ArcjetRule<{ abc: number }> = {
        version: 0,
        mode: "LIVE",
        type: "example",
        priority: 10000,
        validate() {},
        protect() {
          assert.fail();
        },
      } as const;

      // Note that this extends from `ajOther`.
      const ajYetAnother = ajOther.withRule([testRule]);
      type WithRuleTestTwo = Assert<
        SDKProps<
          typeof ajYetAnother,
          { abc: number; requested: number; userId: string | number | boolean }
        >
      >;

      await ajYetAnother.protect(exampleContext, {
        ...exampleDetails,
        userId: "abc123",
        requested: 1,
        abc: 123,
      });
      assert.deepEqual(parameters, [[...rule, testRule]]);
    },
  );

  await t.test("should not add rules to the parent client", async () => {
    let parameters: unknown;

    const client: Client = {
      async decide(a, b, ...rest) {
        parameters = rest;
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    const aj = arcjet({ ...exampleOptions, client });
    type WithoutRuleTest = Assert<SDKProps<typeof aj, {}>>;

    const tokenBucketRule = tokenBucket({
      characteristics: ["userId"],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });

    const ajOther = aj.withRule(tokenBucketRule);
    type WithRuleTestOne = Assert<
      SDKProps<
        typeof ajOther,
        { requested: number; userId: string | number | boolean }
      >
    >;

    // TODO(@wooorm-arcjet): the types do not relate to reality,
    // this rule has nothing to do with some field `abc`.
    const testRule: ArcjetRule<{ abc: number }> = {
      version: 0,
      mode: "LIVE",
      type: "example",
      priority: 10000,
      validate() {},
      protect() {
        assert.fail();
      },
    } as const;

    // Note that this **does not** extend from `ajOther`.
    const ajYetAnother = aj.withRule([testRule]);
    type WithRuleTestTwo = Assert<
      SDKProps<typeof ajYetAnother, { abc: number }>
    >;

    await ajYetAnother.protect(exampleContext, {
      ...exampleDetails,
      userId: "abc123",
      requested: 1,
      abc: 123,
    });
    assert.deepEqual(parameters, [[testRule]]);
  });

  // TODO(#207): Remove this once we default the client in the main SDK
  await t.test("should fail if `client` is missing", () => {
    assert.throws(() => {
      arcjet({ ...exampleOptions, client: undefined });
    }, /Client is required/);
  });

  // TODO(@wooorm-arcjet): `log` sounds like something we can allow and provide by default.
  await t.test("should fail if `log` is missing", () => {
    assert.throws(() => {
      arcjet({ ...exampleOptions, log: undefined });
    }, /Log is required/);
  });

  await t.test("should support a rule that allows", async () => {
    let calls = 0;

    const client = {
      async decide() {
        assert.equal(calls, 2);
        calls++;
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    const aj = arcjet({
      ...exampleOptions,
      rules: [
        [
          {
            version: 0,
            mode: "LIVE",
            type: "example-allow",
            priority: 1,
            validate() {
              assert.equal(calls, 0);
              calls++;
            },
            async protect() {
              assert.equal(calls, 1);
              calls++;
              return new ArcjetRuleResult({
                conclusion: "ALLOW",
                fingerprint: "test-fingerprint",
                reason: new ArcjetTestReason(),
                ruleId: "test-rule-id",
                state: "RUN",
                ttl: 0,
              });
            },
          } as const,
        ],
      ],
      client,
    });

    const decision = await aj.protect(exampleContext, exampleDetails);
    assert.equal(decision.conclusion, "ALLOW");
    assert.equal(calls, 3);
  });

  await t.test(
    "should support a rule that allows and one that denies",
    async () => {
      let calls = 0;

      const aj = arcjet({
        ...exampleOptions,
        rules: [
          [
            {
              version: 0,
              mode: "LIVE",
              type: "example-allow",
              priority: 1,
              validate() {
                assert.equal(calls, 0);
                calls++;
              },
              async protect() {
                assert.equal(calls, 1);
                calls++;
                return new ArcjetRuleResult({
                  ruleId: "test-rule-id",
                  fingerprint: "test-fingerprint",
                  ttl: 0,
                  state: "RUN",
                  conclusion: "ALLOW",
                  reason: new ArcjetTestReason(),
                });
              },
            } as const,
          ],
          [
            {
              version: 0,
              mode: "LIVE",
              type: "example-deny",
              priority: 1,
              validate() {
                assert.equal(calls, 2);
                calls++;
              },
              async protect() {
                assert.equal(calls, 3);
                calls++;
                return new ArcjetRuleResult({
                  ruleId: "test-rule-id",
                  fingerprint: "test-fingerprint",
                  ttl: 5000,
                  state: "RUN",
                  conclusion: "DENY",
                  reason: new ArcjetTestReason(),
                });
              },
            } as const,
          ],
        ],
      });

      const decision = await aj.protect(exampleContext, exampleDetails);
      assert.equal(decision.conclusion, "DENY");
      assert.equal(calls, 4);
    },
  );

  await t.test(
    "should support a rule that allows, one that denies, and one that is never called",
    async () => {
      let calls = 0;

      const aj = arcjet({
        ...exampleOptions,
        rules: [
          [
            {
              version: 0,
              mode: "LIVE",
              type: "example-allow",
              priority: 1,
              validate() {
                assert.equal(calls, 0);
                calls++;
              },
              async protect() {
                assert.equal(calls, 1);
                calls++;
                return new ArcjetRuleResult({
                  ruleId: "test-rule-id",
                  fingerprint: "test-fingerprint",
                  ttl: 0,
                  state: "RUN",
                  conclusion: "ALLOW",
                  reason: new ArcjetTestReason(),
                });
              },
            } as const,
            {
              version: 0,
              mode: "LIVE",
              type: "example-deny",
              priority: 1,
              validate() {
                assert.equal(calls, 2);
                calls++;
              },
              async protect() {
                assert.equal(calls, 3);
                calls++;
                return new ArcjetRuleResult({
                  ruleId: "test-rule-id",
                  fingerprint: "test-fingerprint",
                  ttl: 5000,
                  state: "RUN",
                  conclusion: "DENY",
                  reason: new ArcjetTestReason(),
                });
              },
            } as const,
            {
              version: 0,
              mode: "LIVE",
              type: "example-never-called",
              priority: 1,
              validate() {
                assert.fail();
              },
              protect() {
                assert.fail();
              },
            } as const,
          ],
        ],
      });

      const decision = await aj.protect(exampleContext, exampleDetails);
      assert.equal(decision.conclusion, "DENY");
      assert.equal(calls, 4);
    },
  );

  await t.test(
    "should see a rule w/o result from `protect` as an `ALLOW`",
    async () => {
      let calls = 0;

      const aj = arcjet({
        ...exampleOptions,
        rules: [
          [
            {
              version: 0,
              mode: "LIVE",
              type: "example-no-result",
              priority: 1,
              validate() {},
              // @ts-expect-error: test runtime behavior of no return value.
              async protect() {
                assert.equal(calls, 0);
                calls++;
              },
            } as const,
          ],
        ],
      });

      const decision = await aj.protect(exampleContext, exampleDetails);
      assert.equal(decision.conclusion, "ALLOW");
      assert.equal(calls, 1);
    },
  );

  await t.test("should ignore a rule w/o `validate`", async () => {
    let calls = 0;

    const aj = arcjet({
      ...exampleOptions,
      rules: [
        [
          // @ts-expect-error: test runtime behavior of no `validate`.
          {
            version: 0,
            mode: "LIVE",
            type: "example-no-validate",
            priority: 1,
            protect() {
              assert.fail();
            },
          } as const,
          {
            version: 0,
            mode: "LIVE",
            type: "example-deny",
            priority: 1,
            validate() {
              assert.equal(calls, 0);
              calls++;
            },
            async protect() {
              assert.equal(calls, 1);
              calls++;
              return new ArcjetRuleResult({
                ruleId: "test-rule-id",
                fingerprint: "test-fingerprint",
                ttl: 5000,
                state: "RUN",
                conclusion: "DENY",
                reason: new ArcjetTestReason(),
              });
            },
          } as const,
        ],
      ],
    });

    const decision = await aj.protect(exampleContext, exampleDetails);
    assert.equal(calls, 2);
    assert.equal(decision.conclusion, "DENY");
    const result = decision.results.find((d) => d.ruleId === "");
    assert.ok(result);
    assert.equal(result.reason.type, "ERROR");
    assert.equal(
      // @ts-expect-error: TODO(#4452): `message` should be accessible.
      result.reason.message,
      "rule must have a `validate` function",
    );
  });

  await t.test("should ignore a rule w/o `protect`", async () => {
    let calls = 0;

    const aj = arcjet({
      ...exampleOptions,
      rules: [
        [
          // @ts-expect-error: test runtime behavior of missing `protect`.
          {
            version: 0,
            mode: "LIVE",
            type: "example-no-protect",
            priority: 1,
            validate() {
              assert.equal(calls, 0);
              calls++;
            },
          } as const,
          {
            version: 0,
            mode: "LIVE",
            type: "example-deny",
            priority: 1,
            validate() {
              assert.equal(calls, 1);
              calls++;
            },
            async protect() {
              assert.equal(calls, 2);
              calls++;
              return new ArcjetRuleResult({
                ruleId: "test-rule-id",
                fingerprint: "test-fingerprint",
                ttl: 5000,
                state: "RUN",
                conclusion: "DENY",
                reason: new ArcjetTestReason(),
              });
            },
          } as const,
        ],
      ],
    });

    const decision = await aj.protect(exampleContext, exampleDetails);
    assert.equal(calls, 3);
    assert.equal(decision.conclusion, "DENY");
    const result = decision.results.find((d) => d.ruleId === "");
    assert.ok(result);
    assert.equal(result.reason.type, "ERROR");
    assert.equal(
      // @ts-expect-error: TODO(#4452): `message` should be accessible.
      result.reason.message,
      "rule must have a `protect` function",
    );
  });

  await t.test(
    "should conclude an error if fingerprint cannot be generated (no request)",
    async () => {
      const aj = arcjet(exampleOptions);
      // @ts-expect-error: test runtime behavior of no request object.
      const decision = await aj.protect(exampleContext);
      assert.equal(decision.conclusion, "ERROR");
    },
  );

  await t.test(
    "should conclude an error if fingerprint cannot be generated (empty request)",
    async () => {
      const aj = arcjet(exampleOptions);
      // TODO(@wooorm-arcjet): if this so clearly throws, then why is an empty object allowed by the types?
      const decision = await aj.protect(exampleContext, {});
      assert.equal(decision.conclusion, "ERROR");
    },
  );

  await t.test("should allow `10` rules", async () => {
    const rules = Array.from(
      { length: 10 },
      (index): Array<ArcjetRule> => [
        {
          version: 0,
          mode: "LIVE",
          type: "example-" + index,
          priority: 1,
          validate() {},
          protect() {
            assert.fail();
          },
        },
      ],
    );

    const decision = await arcjet({ ...exampleOptions, rules }).protect(
      exampleContext,
      exampleDetails,
    );
    assert.equal(decision.conclusion, "ALLOW");
  });

  await t.test("should conclude error on `11` rules", async () => {
    const rules = Array.from(
      { length: 11 },
      (index): Array<ArcjetRule> => [
        {
          version: 0,
          mode: "LIVE",
          type: "example-" + index,
          priority: 1,
          validate() {},
          protect() {
            assert.fail();
          },
        },
      ],
    );

    await t.test(
      "should call `decide` if all rules decide `ALLOW`",
      async () => {
        let parameters: unknown;

        const client: Client = {
          async decide(a, b, ...rest) {
            parameters = rest;
            return new ArcjetErrorDecision({
              ttl: 0,
              reason: new ArcjetErrorReason("reason"),
              results: [],
            });
          },
          report() {
            assert.fail();
          },
        };

        const rule: ArcjetRule = {
          version: 0,
          mode: "LIVE",
          type: "example-allow",
          priority: 1,
          validate() {},
          async protect() {
            return new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetTestReason(),
            });
          },
        };

        await arcjet({
          ...exampleOptions,
          client,
          rules: [[rule]],
        }).protect(exampleContext, exampleDetails);

        assert.deepEqual(parameters, [[rule]]);
      },
    );

    await t.test(
      "should not call `decide` if a rule decides `DENY",
      async () => {
        // TODO(@wooorm-arcjet): investigate why typescript does not allow this object to be passed as a regular object
        // or even as an `as const` object.
        const rule: ArcjetRule = {
          version: 0,
          mode: "LIVE",
          type: "example-deny",
          priority: 1,
          validate() {},
          async protect() {
            return new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 5000,
              state: "RUN",
              conclusion: "DENY",
              reason: new ArcjetTestReason(),
            });
          },
        };

        let called = 0;

        await arcjet({
          ...exampleOptions,
          client: {
            async decide() {
              // Should not be called.
              called++;
              assert.fail();
            },
            report() {
              assert.equal(called, 0);
              called++;
            },
          },
          rules: [[rule]],
        }).protect(exampleContext, exampleDetails);

        assert.equal(called, 1);
      },
    );

    await t.test("should call `decide` w/o rules", async () => {
      let calls = 0;

      const client = {
        async decide() {
          assert.equal(calls, 0);
          calls++;
          return new ArcjetAllowDecision({
            ttl: 0,
            reason: new ArcjetTestReason(),
            results: [],
          });
        },
        report() {
          assert.fail();
        },
      };

      await arcjet({ ...exampleOptions, client }).protect(
        exampleContext,
        exampleDetails,
      );
      assert.equal(calls, 1);
    });

    await t.test(
      "should not call `report` if all rules decide `ALLOW`",
      async () => {
        let parameters: unknown;

        const client: Client = {
          async decide(a, b, ...rest) {
            parameters = rest;
            return new ArcjetErrorDecision({
              ttl: 0,
              reason: new ArcjetErrorReason("reason"),
              results: [],
            });
          },
          report() {
            assert.fail();
          },
        };

        const rule: ArcjetRule = {
          version: 0,
          mode: "LIVE",
          type: "example-allow",
          priority: 1,
          validate() {},
          async protect() {
            return new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetTestReason(),
            });
          },
        };

        await arcjet({ ...exampleOptions, client, rules: [[rule]] }).protect(
          exampleContext,
          exampleDetails,
        );

        assert.deepEqual(parameters, [[rule]]);
      },
    );

    await t.test("should call `report` if a rule decides `DENY`", async () => {
      let calls = 0;

      const client: Client = {
        async decide() {
          return new ArcjetErrorDecision({
            ttl: 0,
            reason: new ArcjetErrorReason("reason"),
            results: [],
          });
        },
        report(context, request, decision, rules) {
          assert.equal(calls, 0);
          calls++;
          assert.equal(decision.conclusion, "DENY");
          assert.equal(rules.length, 1);
        },
      };

      const rule: ArcjetRule = {
        version: 0,
        mode: "LIVE",
        type: "example-deny",
        priority: 1,
        validate() {},
        async protect() {
          return new ArcjetRuleResult({
            ruleId: "test-rule-id",
            fingerprint: "test-fingerprint",
            ttl: 5000,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetTestReason(),
          });
        },
      };

      await arcjet({
        ...exampleOptions,
        client,
        rules: [[rule]],
      }).protect(exampleContext, exampleDetails);

      assert.equal(calls, 1);
    });

    const decision = await arcjet({ ...exampleOptions, rules }).protect(
      exampleContext,
      exampleDetails,
    );
    assert.equal(decision.conclusion, "ERROR");
  });

  await t.test("should support headers as a regular object", async () => {
    let calls = 0;

    const client: Client = {
      async decide(context, details) {
        assert.equal(calls, 0);
        calls++;
        assert.ok(details.headers);
        assert.deepEqual(Object.fromEntries(details.headers), {
          "user-agent": "curl/8.1.2",
        });
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    await arcjet({ ...exampleOptions, client }).protect(exampleContext, {
      ...exampleDetails,
      headers: { "user-agent": "curl/8.1.2" },
    });
    assert.equal(calls, 1);
  });

  await t.test(
    "should support headers as a regular object (array values)",
    async () => {
      let calls = 0;

      const client: Client = {
        async decide(context, details) {
          assert.equal(calls, 0);
          calls++;

          assert.ok(details.headers);
          assert.deepEqual(Object.fromEntries(details.headers), {
            // Note: array is serialized.
            "user-agent": "curl/8.1.2, something",
          });

          return new ArcjetAllowDecision({
            ttl: 0,
            reason: new ArcjetTestReason(),
            results: [],
          });
        },
        report() {
          assert.fail();
        },
      };

      const aj = arcjet({ ...exampleOptions, client });
      await aj.protect(exampleContext, {
        ...exampleDetails,
        headers: { "User-Agent": ["curl/8.1.2", "something"] },
      });
      assert.equal(calls, 1);
    },
  );

  await t.test(
    "should generate fingerprints w/ header characteristics",
    async () => {
      let fingerprint: unknown;
      const client: Client = {
        async decide(context) {
          fingerprint = context.fingerprint;
          return new ArcjetAllowDecision({
            ttl: 0,
            reason: new ArcjetTestReason(),
            results: [],
          });
        },
        report() {
          assert.fail();
        },
      };

      await arcjet({
        ...exampleOptions,
        characteristics: ['http.request.headers["abcxyz"]'],
        client,
      }).protect(
        { getBody: exampleContext.getBody },
        { ...exampleDetails, headers: new Headers([["abcxyz", "test1234"]]) },
      );

      assert.equal(
        fingerprint,
        "fp::2::6f3a3854134fe3d20fe56387bdcb594f18b182683424757b88da75e8f13b92bd",
      );
    },
  );

  await t.test("should support extra details", async () => {
    let calls = 0;

    const client: Client = {
      async decide(context, details) {
        assert.equal(calls, 0);
        calls++;

        assert.deepEqual(details.extra, {
          "extra-number": "123",
          "extra-false": "false",
          "extra-true": "true",
          "extra-unsupported": "<unsupported value>",
        });

        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };

    const { extra, ...details } = exampleDetails;

    const aj = arcjet({ ...exampleOptions, client });
    await aj.protect(exampleContext, {
      ...details,
      // To do: should we drop values of `null`, `undefined`, etc?
      // Now they result in `<unsupported value>`.
      "extra-number": 123,
      "extra-false": false,
      "extra-true": true,
      "extra-unsupported": new Date(),
    });
    assert.equal(calls, 1);
  });

  await t.test(
    "should detect `@vercel/request-context` and provide it to `report`",
    async () => {
      let calls = 0;
      const client: Client = {
        async decide() {
          return new ArcjetErrorDecision({
            ttl: 0,
            reason: new ArcjetErrorReason("reason"),
            results: [],
          });
        },
        report(context) {
          assert.equal(calls, 0);
          calls++;
          assert.ok(context);
          assert.equal(context.waitUntil, waitUntil);
        },
      };
      const rule: ArcjetRule = {
        version: 0,
        mode: "LIVE",
        type: "example-deny",
        priority: 1,
        validate() {},
        async protect() {
          return new ArcjetRuleResult({
            ruleId: "test-rule-id",
            fingerprint: "test-fingerprint",
            ttl: 5000,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetTestReason(),
          });
        },
      };

      const SYMBOL_FOR_REQ_CONTEXT = Symbol.for("@vercel/request-context");

      // @ts-expect-error: TODO(@wooorm-arcjet): investigate if this can be typed.
      globalThis[SYMBOL_FOR_REQ_CONTEXT] = {
        get() {
          return { waitUntil };
        },
      };

      await arcjet({
        ...exampleOptions,
        client,
        rules: [[rule]],
      }).protect(exampleContext, exampleDetails);
      assert.equal(calls, 1);

      // @ts-expect-error: TODO(@wooorm-arcjet): investigate if this can be typed.
      delete globalThis[SYMBOL_FOR_REQ_CONTEXT];

      function waitUntil() {
        assert.fail();
      }
    },
  );

  await t.test(
    "should cache a `DENY` from `decide`, and `report` when a cached decision is used",
    async () => {
      let calls = 0;
      const ruleId = "test-rule-id";
      const fingerprint =
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e";
      const client: Client = {
        async decide() {
          assert.equal(calls, 1);
          calls++;
          return new ArcjetDenyDecision({
            ttl: 10,
            reason: new ArcjetTestReason(),
            results: [
              // The important part is that this result is cached.
              new ArcjetRuleResult({
                ruleId,
                fingerprint,
                ttl: 10,
                state: "RUN",
                conclusion: "DENY",
                reason: new ArcjetTestReason(),
              }),
            ],
          });
        },
        report() {
          assert.equal(calls, 3);
          calls++;
        },
      };
      const rule: ArcjetRule = {
        version: 0,
        mode: "LIVE",
        type: "example-cache",
        priority: 1,
        validate() {},
        async protect(context) {
          const [result, ttl] = await context.cache.get(
            ruleId,
            context.fingerprint,
          );

          if (result) {
            assert.equal(calls, 2);
            calls++;
            return new ArcjetRuleResult({
              ruleId,
              fingerprint,
              ttl,
              state: "CACHED",
              conclusion: "DENY",
              reason: new ArcjetTestReason(),
            });
          } else {
            assert.equal(calls, 0);
            calls++;
            return new ArcjetRuleResult({
              ruleId,
              fingerprint,
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetTestReason(),
            });
          }
        },
      };

      const aj = arcjet({ ...exampleOptions, client, rules: [[rule]] });
      const decision = await aj.protect(exampleContext, exampleDetails);
      assert.equal(decision.isErrored(), false);
      assert.equal(decision.conclusion, "DENY");
      assert.equal(calls, 2);

      const decision2 = await aj.protect(exampleContext, exampleDetails);
      assert.equal(decision2.isErrored(), false);
      assert.equal(decision2.conclusion, "DENY");
      assert.equal(calls, 4);
    },
  );

  await t.test("should not call `report` if `validate` throws", async () => {
    let calls = 0;
    const rule: ArcjetRule = {
      version: 0,
      mode: "LIVE",
      type: "example-throw",
      priority: 1,
      validate() {
        assert.equal(calls, 0);
        calls++;
        throw new Error("Some error");
      },
      protect() {
        // Make sure this is never called.
        calls++;
        assert.fail();
      },
    };
    const client: Client = {
      async decide(context, details, rules) {
        assert.equal(calls, 1);
        calls++;
        assert.deepEqual(rules, [rule]);
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        // Make sure this is never called.
        calls++;
        assert.fail();
      },
    };

    await arcjet({
      ...exampleOptions,
      rules: [[rule]],
      client,
    }).protect(exampleContext, exampleDetails);
    assert.equal(calls, 2);
  });

  await t.test("should handle `validate` throwing `string`", async () => {
    let calls = 0;
    // TODO(@wooorm-arcjet): investigate why typescript does not allow this object to be passed as a regular object
    // or even as an `as const` object.
    const rule = {
      version: 0,
      mode: "LIVE",
      type: "example-throw-string",
      priority: 1,
      validate() {},
      async protect() {
        assert.equal(calls, 0);
        calls++;
        throw "Local rule protect failed";
      },
    } as const;

    await arcjet({
      ...exampleOptions,
      rules: [[rule]],
      log: {
        ...exampleLogger,
        error(...parameters) {
          assert.equal(calls, 1);
          calls++;
          assert.deepEqual(parameters, [
            "Failure running rule: %s due to %s",
            "example-throw-string",
            "Local rule protect failed",
          ]);
        },
      },
    }).protect(exampleContext, exampleDetails);

    assert.equal(calls, 2);
  });

  await t.test("should handle `validate` throwing `null`", async () => {
    let calls = 0;

    // TODO(@wooorm-arcjet): investigate why typescript does not allow this object to be passed as a regular object
    // or even as an `as const` object.
    const rule = {
      version: 0,
      mode: "LIVE",
      type: "example-throw-null",
      priority: 1,
      validate() {},
      async protect() {
        assert.equal(calls, 0);
        calls++;
        throw null;
      },
    } as const;

    await arcjet({
      ...exampleOptions,
      rules: [[rule]],
      log: {
        ...exampleLogger,
        error(...parameters) {
          assert.equal(calls, 1);
          calls++;
          assert.deepEqual(parameters, [
            "Failure running rule: %s due to %s",
            "example-throw-null",
            "Unknown problem",
          ]);
        },
      },
    }).protect(exampleContext, exampleDetails);
    assert.equal(calls, 2);
  });

  await t.test(
    "should not deny a `DRY_RUN` result nor cache a deny decision",
    async () => {
      let calls = 0;

      const client = {
        async decide() {
          calls++;
          return new ArcjetAllowDecision({
            ttl: 0,
            reason: new ArcjetTestReason(),
            results: [],
          });
        },
        report() {
          assert.fail();
        },
      };

      const aj = arcjet({
        ...exampleOptions,
        rules: [
          [
            {
              version: 0,
              mode: "DRY_RUN",
              type: "example-deny-dry-run",
              priority: 1,
              validate() {},
              async protect() {
                return new ArcjetRuleResult({
                  ruleId: "test-rule-id",
                  fingerprint: "test-fingerprint",
                  ttl: 0,
                  state: "DRY_RUN",
                  conclusion: "DENY",
                  reason: new ArcjetTestReason(),
                });
              },
            } as const,
          ],
        ],
        client,
      });

      const decision = await aj.protect(exampleContext, exampleDetails);
      assert.equal(decision.isDenied(), false);
      assert.equal(calls, 1);

      const decision2 = await aj.protect(exampleContext, exampleDetails);
      assert.equal(decision2.isDenied(), false);
      assert.equal(calls, 2);
    },
  );

  await t.test("should pass a `key` through to `decide`", async () => {
    let calls = 0;
    const client: Client = {
      async decide(context) {
        assert.equal(calls, 0);
        calls++;
        assert.equal(context.key, "overridden-key");
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      },
      report() {
        assert.fail();
      },
    };
    const decision = await arcjet({
      ...exampleOptions,
      client,
      rules: [],
    }).protect({ ...exampleContext, key: "overridden-key" }, exampleDetails);
    assert.equal(decision.isErrored(), false);
    assert.equal(calls, 1);
  });

  await t.test("should handle an error being thrown by `decide`", async () => {
    let calls = 0;
    const client: Client = {
      async decide() {
        assert.equal(calls, 0);
        calls++;
        throw new Error("Decide function failed");
      },
      report(context, request, decision) {
        assert.equal(calls, 1);
        calls++;
        assert.equal(decision.conclusion, "ERROR");
      },
    };

    const decision = await arcjet({ ...exampleOptions, client }).protect(
      exampleContext,
      exampleDetails,
    );
    assert.equal(decision.isErrored(), true);
    assert.equal(calls, 2);
  });
});

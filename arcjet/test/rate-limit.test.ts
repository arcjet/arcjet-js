import assert from "node:assert/strict";
import { describe, test, mock } from "node:test";
import {
  type Primitive,
  ArcjetRateLimitReason,
  fixedWindow,
  slidingWindow,
  tokenBucket,
} from "../index.js";

type Assert<T extends true> = T;
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
type Props<T> = T extends Primitive<infer P> ? P : never;

class TestCache {
  get = mock.fn<() => Promise<[unknown, number]>>(async () => [undefined, 0]);
  set = mock.fn();
}

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
      IsEqual<
        Props<typeof rules>,
        { requested: number; userId: boolean | number | string }
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
    type Test = Assert<IsEqual<Props<typeof rules>, { requested: number }>>;
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
      log: createMockLogger(),
      characteristics: [],
      cache,
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
      IsEqual<Props<typeof rules>, { userId: boolean | number | string }>
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
    type Test = Assert<IsEqual<Props<typeof rules>, {}>>;
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
      log: createMockLogger(),
      characteristics: [],
      cache,
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
      IsEqual<Props<typeof rules>, { userId: boolean | number | string }>
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
    type Test = Assert<IsEqual<Props<typeof rules>, {}>>;
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
      log: createMockLogger(),
      characteristics: [],
      cache,
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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

function createMockLogger() {
  return {
    time: mock.fn(),
    timeEnd: mock.fn(),
    debug: mock.fn(),
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
  };
}

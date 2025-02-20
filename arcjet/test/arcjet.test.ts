import { describe, test, mock } from "node:test";
import { expect } from "expect";

import type { ArcjetRule, ArcjetLocalRule, Primitive, Arcjet } from "../index";
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
} from "../index";

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

// Instances of Headers contain symbols that may be different depending
// on if they have been iterated or not, so we need this equality tester
// to only match the items inside the Headers instance.
function areHeadersEqual(a: unknown, b: unknown): boolean | undefined {
  const isAHeaders = a instanceof Headers;
  const isBHeaders = b instanceof Headers;

  if (isAHeaders && isBHeaders) {
    const aKeys = Array.from(a.keys());
    const bKeys = Array.from(b.keys());
    return (
      aKeys.every((key) => b.has(key)) &&
      bKeys.every((key) => a.has(key)) &&
      Array.from(a.entries()).every(([key, value]) => {
        return b.get(key) === value;
      })
    );
  } else if (isAHeaders === isBHeaders) {
    return undefined;
  } else {
    return false;
  }
}

expect.addEqualityTesters([areHeadersEqual]);

function assertIsLocalRule(rule: ArcjetRule): asserts rule is ArcjetLocalRule {
  expect("validate" in rule && typeof rule.validate === "function").toEqual(
    true,
  );
  expect("protect" in rule && typeof rule.protect === "function").toEqual(true);
}

class ArcjetTestReason extends ArcjetReason {}

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
    expect(decision.id).toMatch(/^lreq_/);
  });

  test("the `id` property if to be specified to the constructor", () => {
    const decision = new ArcjetAllowDecision({
      id: "abc_123",
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.id).toEqual("abc_123");
  });

  // TODO: This test doesn't make sense anymore
  test("an ERROR decision can be constructed with an Error object", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason(new Error("Foo bar baz")),
      results: [],
    });
    expect(decision.reason).toBeInstanceOf(ArcjetErrorReason);
    expect(decision.reason).toMatchObject({
      message: "Foo bar baz",
    });
  });

  // TODO: This test doesn't make sense anymore
  test("an ERROR decision can be constructed with a string message", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Boom!"),
      results: [],
    });
    expect(decision.reason).toBeInstanceOf(ArcjetErrorReason);
    expect(decision.reason).toMatchObject({
      message: "Boom!",
    });
  });

  // TODO: This test doesn't make sense anymore
  test("use an unknown error for an ERROR decision constructed with other types", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason(["not", "valid", "error"]),
      results: [],
    });
    expect(decision.reason).toBeInstanceOf(ArcjetErrorReason);
    expect(decision.reason).toMatchObject({
      message: "Unknown error occurred",
    });
  });

  test("`isAllowed()` returns true when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isAllowed()).toEqual(true);
  });

  test("`isAllowed()` returns true when type is ERROR (fail open)", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    expect(decision.isAllowed()).toEqual(true);
  });

  test("`isAllowed()` returns false when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isAllowed()).toEqual(false);
  });

  test("`isDenied()` returns false when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isDenied()).toEqual(false);
  });

  test("`isDenied()` returns false when type is ERROR (fail open)", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    expect(decision.isDenied()).toEqual(false);
  });

  test("`isDenied()` returns true when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isDenied()).toEqual(true);
  });

  test("`isChallenged()` returns true when type is CHALLENGE", () => {
    const decision = new ArcjetChallengeDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isChallenged()).toEqual(true);
  });

  test("`isErrored()` returns false when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isErrored()).toEqual(false);
  });

  test("`isErrored()` returns false when type is ERROR", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    expect(decision.isErrored()).toEqual(true);
  });

  test("`isErrored()` returns false when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isErrored()).toEqual(false);
  });

  test("`isRateLimit()` returns true when reason is RATE_LIMIT", () => {
    const reason = new ArcjetRateLimitReason({
      max: 0,
      remaining: 0,
      reset: 100,
      window: 100,
    });
    expect(reason.isRateLimit()).toEqual(true);
  });

  test("`isRateLimit()` returns true when reason is not RATE_LIMIT", () => {
    const reason = new ArcjetTestReason();
    expect(reason.isRateLimit()).toEqual(false);
  });

  test("`isBot()` returns true when reason is BOT", () => {
    const reason = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: false,
    });
    expect(reason.isBot()).toEqual(true);
  });

  test("isVerified() returns the correct value", () => {
    const reasonTrue = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: true,
      spoofed: false,
    });
    expect(reasonTrue.isVerified()).toEqual(true);
    const reasonFalse = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: false,
    });
    expect(reasonFalse.isVerified()).toEqual(false);
  });

  test("isSpoofed() returns the correct value", () => {
    const reasonTrue = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: true,
    });
    expect(reasonTrue.isSpoofed()).toEqual(true);
    const reasonFalse = new ArcjetBotReason({
      allowed: [],
      denied: [],
      verified: false,
      spoofed: false,
    });
    expect(reasonFalse.isSpoofed()).toEqual(false);
  });

  test("`isBot()` returns false when reason is not BOT", () => {
    const reason = new ArcjetTestReason();
    expect(reason.isBot()).toEqual(false);
  });
});

describe("Primitive > detectBot", () => {
  test("validates `mode` option if it is set", async () => {
    expect(() => {
      detectBot({
        // @ts-expect-error
        mode: "INVALID",
        allow: [],
      });
    }).toThrow(
      "`detectBot` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'",
    );
  });

  test("validates `allow` option is array if set", async () => {
    expect(() => {
      const _ = detectBot({
        // @ts-expect-error
        allow: "abc",
      });
    }).toThrow(
      "detectBot` options error: invalid type for `allow` - expected an array",
    );
  });

  test("validates `allow` option only contains strings", async () => {
    expect(() => {
      const _ = detectBot({
        // @ts-expect-error
        allow: [/abc/],
      });
    }).toThrow(
      "detectBot` options error: invalid type for `allow[0]` - expected string",
    );
  });

  test("validates `deny` option is an array if set", async () => {
    expect(() => {
      const _ = detectBot({
        // @ts-expect-error
        deny: "abc",
      });
    }).toThrow(
      "detectBot` options error: invalid type for `deny` - expected an array",
    );
  });

  test("validates `deny` option only contains strings", async () => {
    expect(() => {
      const _ = detectBot({
        // @ts-expect-error
        deny: [/abc/],
      });
    }).toThrow(
      "detectBot` options error: invalid type for `deny[0]` - expected string",
    );
  });

  test("validates `allow` and `deny` options are not specified together", async () => {
    expect(() => {
      const _ = detectBot(
        // @ts-expect-error
        {
          allow: ["CURL"],
          deny: ["GOOGLE_ADSBOT"],
        },
      );
    }).toThrow(
      "`detectBot` options error: `allow` and `deny` cannot be provided together",
    );
  });

  test("validates either `allow` or `deny` option is specified", async () => {
    expect(() => {
      const _ = detectBot(
        // @ts-expect-error
        {},
      );
    }).toThrow(
      "`detectBot` options error: either `allow` or `deny` must be specified",
    );
  });

  test("validates `detect` option if set", async () => {
    expect(() => {
      detectBot({
        allow: [],
        // @ts-expect-error
        detect: "abc",
      });
    }).toThrow(
      "`detectBot` options error: invalid type for `detect` - expected function",
    );
  });

  test("throws via `validate()` if headers is undefined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      headers: undefined,
    };

    const [rule] = detectBot({ mode: "LIVE", allow: [] });
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).toThrow();
  });

  test("throws via `validate()` if headers does not extend Headers", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      headers: {},
    };

    const [rule] = detectBot({ mode: "LIVE", allow: [] });
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(
        context,
        //@ts-expect-error
        details,
      );
    }).toThrow();
  });

  test("throws via `validate()` if user-agent header is missing", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).toThrow();
  });

  test("denies curl", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        allowed: [],
        denied: ["CURL"],
        verified: false,
        spoofed: false,
      }),
    });
  });

  test("only denies CURL if configured", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const curlResult = await rule.protect(context, curlDetails);
    expect(curlResult).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        allowed: [],
        denied: ["CURL"],
        verified: false,
        spoofed: false,
      }),
    });
    const googlebotResults = await rule.protect(context, googlebotDetails);
    expect(googlebotResults).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetBotReason({
        allowed: ["GOOGLE_CRAWLER"],
        denied: [],
        verified: false,
        spoofed: false,
      }),
    });
  });

  test("can be configured to allow curl", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetBotReason({
        allowed: ["CURL"],
        denied: [],
        verified: false,
        spoofed: false,
      }),
    });
  });

  test("denies a custom entity", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "not-a-bot"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot({
      mode: "LIVE",
      deny: ["CUSTOM_BOT_A"],
      detect: () => {
        return ["CUSTOM_BOT_A" as const];
      },
    });
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        allowed: [],
        denied: ["CUSTOM_BOT_A"],
        verified: false,
        spoofed: false,
      }),
    });
  });

  test("can be configured to allow a custom entity", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "not-a-bot"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot({
      mode: "LIVE",
      allow: ["CUSTOM_BOT_A"],
      detect: () => {
        return ["CUSTOM_BOT_A" as const];
      },
    });
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetBotReason({
        allowed: ["CUSTOM_BOT_A"],
        denied: [],
        verified: false,
        spoofed: false,
      }),
    });
  });

  test("can be configured to deny a custom entity", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
      deny: ["CUSTOM_BOT_A"],
      detect: () => {
        return ["CUSTOM_BOT_A" as const];
      },
    });
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        allowed: [],
        denied: ["CUSTOM_BOT_A"],
        verified: false,
        spoofed: false,
      }),
    });
  });
});

describe("Primitive > tokenBucket", () => {
  test("validates `mode` option if it is set", async () => {
    expect(() => {
      tokenBucket({
        // @ts-expect-error
        mode: "INVALID",
        refillRate: 1,
        interval: 1,
        capacity: 1,
      });
    }).toThrow(
      "`tokenBucket` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'",
    );
  });

  test("validates `characteristics` items are strings if it is set", async () => {
    expect(() => {
      tokenBucket({
        // @ts-expect-error
        characteristics: [/foobar/],
        refillRate: 1,
        interval: 1,
        capacity: 1,
      });
    }).toThrow(
      "`tokenBucket` options error: invalid type for `characteristics[0]` - expected string",
    );
  });

  test("validates `characteristics` option is an array if set", async () => {
    expect(() => {
      tokenBucket({
        // @ts-expect-error
        characteristics: 12345,
        refillRate: 1,
        interval: 1,
        capacity: 1,
      });
    }).toThrow(
      "`tokenBucket` options error: invalid type for `characteristics` - expected an array",
    );
  });

  test("validates `refillRate` option is required", async () => {
    expect(() => {
      tokenBucket(
        // @ts-expect-error
        {
          interval: 1,
          capacity: 1,
        },
      );
    }).toThrow("`tokenBucket` options error: `refillRate` is required");
  });

  test("validates `refillRate` option is a number", async () => {
    expect(() => {
      tokenBucket({
        // @ts-expect-error
        refillRate: "abc",
        interval: 1,
        capacity: 1,
      });
    }).toThrow(
      "`tokenBucket` options error: invalid type for `refillRate` - expected number",
    );
  });

  test("validates `interval` option is required", async () => {
    expect(() => {
      tokenBucket(
        // @ts-expect-error
        {
          refillRate: 1,
          capacity: 1,
        },
      );
    }).toThrow("`tokenBucket` options error: `interval` is required");
  });

  test("validates `interval` option is a number or string", async () => {
    expect(() => {
      tokenBucket({
        refillRate: 1,
        // @ts-expect-error
        interval: /foobar/,
        capacity: 1,
      });
    }).toThrow(
      "`tokenBucket` options error: invalid type for `interval` - expected one of string, number",
    );
  });

  test("validates `capacity` option is required", async () => {
    expect(() => {
      tokenBucket(
        // @ts-expect-error
        {
          refillRate: 1,
          interval: 1,
        },
      );
    }).toThrow("`tokenBucket` options error: `capacity` is required");
  });

  test("validates `capacity` option is a number", async () => {
    expect(() => {
      tokenBucket({
        refillRate: 1,
        interval: 1,
        // @ts-expect-error
        capacity: "abc",
      });
    }).toThrow(
      "`tokenBucket` options error: invalid type for `capacity` - expected number",
    );
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = tokenBucket({
      mode: "LIVE",
      characteristics: ["ip.src"],
      refillRate: 1,
      interval: 1,
      capacity: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "LIVE");
  });

  test("can specify interval as a string duration", async () => {
    const options = {
      refillRate: 60,
      interval: "60s",
      capacity: 120,
    };

    const rules = tokenBucket(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("refillRate", 60);
    expect(rules[0]).toHaveProperty("interval", 60);
    expect(rules[0]).toHaveProperty("capacity", 120);
  });

  test("can specify interval as an integer duration", async () => {
    const options = {
      refillRate: 60,
      interval: 60,
      capacity: 120,
    };

    const rules = tokenBucket(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("refillRate", 60);
    expect(rules[0]).toHaveProperty("interval", 60);
    expect(rules[0]).toHaveProperty("capacity", 120);
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
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("mode", "DRY_RUN");
    expect(rules[0]).toHaveProperty("characteristics", ["ip.src"]);
    expect(rules[0]).toHaveProperty("algorithm", "TOKEN_BUCKET");
    expect(rules[0]).toHaveProperty("refillRate", 1);
    expect(rules[0]).toHaveProperty("interval", 1);
    expect(rules[0]).toHaveProperty("capacity", 1);
  });

  test("does not default `characteristics` if not specified", async () => {
    const options = {
      refillRate: 1,
      interval: 1,
      capacity: 1,
    };

    const [rule] = tokenBucket(options);
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("characteristics", undefined);
  });
});

describe("Primitive > fixedWindow", () => {
  test("validates `mode` option if it is set", async () => {
    expect(() => {
      fixedWindow({
        // @ts-expect-error
        mode: "INVALID",
        window: "1h",
        max: 1,
      });
    }).toThrow(
      "`fixedWindow` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'",
    );
  });

  test("validates `window` option is required", async () => {
    expect(() => {
      fixedWindow(
        // @ts-expect-error
        {
          max: 1,
        },
      );
    }).toThrow("`fixedWindow` options error: `window` is required");
  });

  test("validates `window` option is string or number", async () => {
    expect(() => {
      fixedWindow({
        // @ts-expect-error
        window: /foobar/,
        max: 1,
      });
    }).toThrow(
      "`fixedWindow` options error: invalid type for `window` - expected one of string, number",
    );
  });

  test("validates `max` option is required", async () => {
    expect(() => {
      fixedWindow(
        // @ts-expect-error
        {
          window: 1,
        },
      );
    }).toThrow("`fixedWindow` options error: `max` is required");
  });

  test("validates `max` option is number", async () => {
    expect(() => {
      fixedWindow({
        window: 1,
        // @ts-expect-error
        max: "abc",
      });
    }).toThrow(
      "`fixedWindow` options error: invalid type for `max` - expected number",
    );
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = fixedWindow({
      mode: "LIVE",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "LIVE");
  });

  test("can specify window as a string duration", async () => {
    const options = {
      window: "60s",
      max: 1,
    };

    const rules = fixedWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("window", 60);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("can specify window as an integer duration", async () => {
    const options = {
      window: 60,
      max: 1,
    };

    const rules = fixedWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("window", 60);
    expect(rules[0]).toHaveProperty("max", 1);
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
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("mode", "DRY_RUN");
    expect(rules[0]).toHaveProperty("characteristics", ["ip.src"]);
    expect(rules[0]).toHaveProperty("algorithm", "FIXED_WINDOW");
    expect(rules[0]).toHaveProperty("window", 3600);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("does not default `characteristics` if not specified", async () => {
    const options = {
      window: "1h",
      max: 1,
    };

    const [rule] = fixedWindow(options);
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("characteristics", undefined);
  });
});

describe("Primitive > slidingWindow", () => {
  test("validates `mode` option if it is set", async () => {
    expect(() => {
      slidingWindow({
        // @ts-expect-error
        mode: "INVALID",
        interval: 3600,
        max: 1,
      });
    }).toThrow(
      "`slidingWindow` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'",
    );
  });

  test("validates `interval` option is required", async () => {
    expect(() => {
      slidingWindow(
        // @ts-expect-error
        {
          max: 1,
        },
      );
    }).toThrow("`slidingWindow` options error: `interval` is required");
  });

  test("validates `interval` option is string or number", async () => {
    expect(() => {
      slidingWindow({
        // @ts-expect-error
        interval: /foobar/,
        max: 1,
      });
    }).toThrow(
      "`slidingWindow` options error: invalid type for `interval` - expected one of string, number",
    );
  });

  test("validates `max` option is required", async () => {
    expect(() => {
      slidingWindow(
        // @ts-expect-error
        {
          interval: 1,
        },
      );
    }).toThrow("`slidingWindow` options error: `max` is required");
  });

  test("validates `max` option is number", async () => {
    expect(() => {
      slidingWindow({
        interval: 1,
        // @ts-expect-error
        max: "abc",
      });
    }).toThrow(
      "`slidingWindow` options error: invalid type for `max` - expected number",
    );
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = slidingWindow({
      mode: "LIVE",
      characteristics: ["ip.src"],
      interval: 3600,
      max: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "LIVE");
  });

  test("can specify interval as a string duration", async () => {
    const options = {
      interval: "60s",
      max: 1,
    };

    const rules = slidingWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("interval", 60);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("can specify interval as an integer duration", async () => {
    const options = {
      interval: 60,
      max: 1,
    };

    const rules = slidingWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("interval", 60);
    expect(rules[0]).toHaveProperty("max", 1);
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
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("mode", "DRY_RUN");
    expect(rules[0]).toHaveProperty("characteristics", ["ip.src"]);
    expect(rules[0]).toHaveProperty("algorithm", "SLIDING_WINDOW");
    expect(rules[0]).toHaveProperty("interval", 3600);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("does not default `characteristics` if not specified", async () => {
    const options = {
      interval: 3600,
      max: 1,
    };

    const [rule] = slidingWindow(options);
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("characteristics", undefined);
  });
});

describe("Primitive > validateEmail", () => {
  test("validates `mode` option if it is set", async () => {
    expect(() => {
      validateEmail({
        // @ts-expect-error
        mode: "INVALID",
      });
    }).toThrow(
      "`validateEmail` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'",
    );
  });

  test("validates `block` option is array if it is set", async () => {
    expect(() => {
      validateEmail({
        // @ts-expect-error
        block: 1234,
      });
    }).toThrow(
      "`validateEmail` options error: invalid type for `block` - expected an array",
    );
  });

  test("validates `deny` option is array if it is set", async () => {
    expect(() => {
      validateEmail({
        // @ts-expect-error
        deny: 1234,
      });
    }).toThrow(
      "`validateEmail` options error: invalid type for `deny` - expected an array",
    );
  });

  test("validates `allow` option is array if it is set", async () => {
    expect(() => {
      validateEmail({
        // @ts-expect-error
        allow: 1234,
      });
    }).toThrow(
      "`validateEmail` options error: invalid type for `allow` - expected an array",
    );
  });

  test("validates `block` option only contains specific values", async () => {
    expect(() => {
      validateEmail({
        // @ts-expect-error
        block: ["FOOBAR"],
      });
    }).toThrow(
      "`validateEmail` options error: invalid value for `block[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'",
    );
  });

  test("validates `deny` option only contains specific values", async () => {
    expect(() => {
      validateEmail({
        // @ts-expect-error
        deny: ["FOOBAR"],
      });
    }).toThrow(
      "`validateEmail` options error: invalid value for `deny[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'",
    );
  });

  test("validates `allow` option only contains specific values", async () => {
    expect(() => {
      validateEmail({
        // @ts-expect-error
        allow: ["FOOBAR"],
      });
    }).toThrow(
      "`validateEmail` options error: invalid value for `allow[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'",
    );
  });

  test("validates `deny` and `block` cannot be set at the same time", async () => {
    expect(() => {
      // @ts-expect-error
      validateEmail({
        deny: ["INVALID"],
        block: ["INVALID"],
      });
    }).toThrow(
      "`validateEmail` options error: `deny` and `block` cannot be provided together, `block` is now deprecated so `deny` should be preferred.",
    );
  });

  test("validates `allow` and `deny` cannot be set at the same time", async () => {
    expect(() => {
      // @ts-expect-error
      validateEmail({
        allow: ["INVALID"],
        deny: ["INVALID"],
      });
    }).toThrow(
      "`validateEmail` options error: `allow` and `deny` cannot be provided together",
    );
  });

  test("validates `block` and `deny` cannot be set at the same time", async () => {
    expect(() => {
      // @ts-expect-error
      validateEmail({
        allow: ["INVALID"],
        block: ["INVALID"],
      });
    }).toThrow(
      "`validateEmail` options error: `allow` and `block` cannot be provided together",
    );
  });

  test("validates `requireTopLevelDomain` option if it is set", async () => {
    expect(() => {
      validateEmail({
        // @ts-expect-error
        requireTopLevelDomain: "abc",
      });
    }).toThrow(
      "`validateEmail` options error: invalid type for `requireTopLevelDomain` - expected boolean",
    );
  });

  test("validates `allowDomainLiteral` option if it is set", async () => {
    expect(() => {
      validateEmail({
        // @ts-expect-error
        allowDomainLiteral: "abc",
      });
    }).toThrow(
      "`validateEmail` options error: invalid type for `allowDomainLiteral` - expected boolean",
    );
  });

  test("allows specifying EmailTypes to deny", async () => {
    const [rule] = validateEmail({
      deny: ["DISPOSABLE", "FREE", "NO_GRAVATAR", "NO_MX_RECORDS", "INVALID"],
    });
    expect(rule.type).toEqual("EMAIL");
    expect(rule).toHaveProperty("deny", [
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
    expect(rule.type).toEqual("EMAIL");
    expect(rule).toHaveProperty("deny", [
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
    expect(rule.type).toEqual("EMAIL");
    expect(rule).toHaveProperty("allow", [
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
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      email: "abc@example.com",
    };

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).not.toThrow();
  });

  test("throws via `validate()` if email is undefined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      email: undefined,
    };

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).toThrow();
  });

  test("allows a valid email", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetEmailReason({
        emailTypes: [],
      }),
    });
  });

  test("denies email with no domain segment", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetEmailReason({
        emailTypes: ["INVALID"],
      }),
    });
  });

  test("denies email with no TLD", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetEmailReason({
        emailTypes: ["INVALID"],
      }),
    });
  });

  test("denies email with no TLD even if some options are specified", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
      deny: [],
    });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetEmailReason({
        emailTypes: ["INVALID"],
      }),
    });
  });

  test("denies email with empty name segment", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetEmailReason({
        emailTypes: ["INVALID"],
      }),
    });
  });

  test("denies email with domain literal", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetEmailReason({
        emailTypes: ["INVALID"],
      }),
    });
  });

  test("can be configured to allow no TLD", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
      deny: [],
    });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetEmailReason({
        emailTypes: [],
      }),
    });
  });

  test("can be configured to allow domain literals", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
      deny: [],
    });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetEmailReason({
        emailTypes: [],
      }),
    });
  });
});

describe("Primitive > shield", () => {
  test("validates `mode` option if it is set", async () => {
    expect(() => {
      shield({
        // @ts-expect-error
        mode: "INVALID",
      });
    }).toThrow(
      "`shield` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'",
    );
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = shield({
      mode: "LIVE",
    });
    expect(rule.type).toEqual("SHIELD");
    expect(rule).toHaveProperty("mode", "LIVE");
  });

  test("sets mode as `DRY_RUN` if not specified", async () => {
    const [rule] = shield({});
    expect(rule.type).toEqual("SHIELD");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });
});

describe("Primitive > sensitiveInfo", () => {
  test("validates `mode` option if it is set", async () => {
    expect(() => {
      sensitiveInfo({
        // @ts-expect-error
        mode: "INVALID",
        allow: [],
      });
    }).toThrow(
      "`sensitiveInfo` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'",
    );
  });

  test("validates `allow` option is an array if set", async () => {
    expect(() => {
      sensitiveInfo({
        // @ts-expect-error
        allow: "abc",
      });
    }).toThrow(
      "`sensitiveInfo` options error: invalid type for `allow` - expected an array",
    );
  });

  test("validates `allow` option only contains strings", async () => {
    expect(() => {
      sensitiveInfo({
        // @ts-expect-error
        allow: [/foo/],
      });
    }).toThrow(
      "`sensitiveInfo` options error: invalid type for `allow[0]` - expected string",
    );
  });

  test("validates `deny` option is an array if set", async () => {
    expect(() => {
      sensitiveInfo({
        // @ts-expect-error
        deny: "abc",
      });
    }).toThrow(
      "`sensitiveInfo` options error: invalid type for `deny` - expected an array",
    );
  });

  test("validates `deny` option only contains strings", async () => {
    expect(() => {
      sensitiveInfo({
        // @ts-expect-error
        deny: [/foo/],
      });
    }).toThrow(
      "`sensitiveInfo` options error: invalid type for `deny[0]` - expected string",
    );
  });

  test("validates `contextWindowSize` option if set", async () => {
    expect(() => {
      sensitiveInfo({
        allow: [],
        // @ts-expect-error
        contextWindowSize: "abc",
      });
    }).toThrow(
      "`sensitiveInfo` options error: invalid type for `contextWindowSize` - expected number",
    );
  });

  test("validates `detect` option if set", async () => {
    expect(() => {
      sensitiveInfo({
        allow: [],
        // @ts-expect-error
        detect: "abc",
      });
    }).toThrow(
      "`sensitiveInfo` options error: invalid type for `detect` - expected function",
    );
  });

  test("validates `allow` and `deny` options are not specified together", async () => {
    expect(() => {
      const _ = sensitiveInfo(
        // @ts-expect-error
        {
          allow: [],
          deny: [],
        },
      );
    }).toThrow(
      "`sensitiveInfo` options error: `allow` and `deny` cannot be provided together",
    );
  });

  test("validates either `allow` or `deny` option is specified", async () => {
    expect(() => {
      const _ = sensitiveInfo(
        // @ts-expect-error
        {},
      );
    }).toThrow(
      "`sensitiveInfo` options error: either `allow` or `deny` must be specified",
    );
  });

  test("does not throw via `validate()`", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
      getBody: () => Promise.resolve(undefined),
    };
    const details = {
      email: undefined,
    };

    const [rule] = sensitiveInfo({ mode: "LIVE", allow: [] });
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).not.toThrow();
  });

  test("allows specifying sensitive info entities to allow", async () => {
    const [rule] = sensitiveInfo({
      allow: ["EMAIL", "CREDIT_CARD_NUMBER"],
    });
    expect(rule.type).toEqual("SENSITIVE_INFO");
  });

  test("it doesnt detect any entities in a non sensitive body", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetSensitiveInfoReason({
        denied: [],
        allowed: [],
      }),
    });
  });

  test("it identifies built-in entities", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetSensitiveInfoReason({
        denied: [
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
        ],
        allowed: [],
      }),
    });
  });

  test("it allows entities on the allow list", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetSensitiveInfoReason({
        denied: [
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
        ],
        allowed: [
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
        ],
      }),
    });
  });

  test("it returns an allow decision when all identified types are allowed", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetSensitiveInfoReason({
        denied: [],
        allowed: [
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
        ],
      }),
    });
  });

  test("it only denies listed entities when deny mode is set", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetSensitiveInfoReason({
        denied: [
          {
            start: 0,
            end: 9,
            identifiedType: "IP_ADDRESS",
          },
        ],
        allowed: [
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
        ],
      }),
    });
  });

  test("it returns a deny decision in deny mode when an entity is matched", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetSensitiveInfoReason({
        denied: [
          {
            start: 0,
            end: 16,
            identifiedType: "EMAIL",
          },
        ],
        allowed: [
          {
            start: 17,
            end: 33,
            identifiedType: "PHONE_NUMBER",
          },
        ],
      }),
    });
  });

  test("it blocks entities identified by a custom function", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetSensitiveInfoReason({
        allowed: [],
        denied: [
          {
            start: 8,
            end: 11,
            identifiedType: "CUSTOM",
          },
        ],
      }),
    });
  });

  test("it throws when custom function returns non-string", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    expect(async () => {
      const _ = await rule.protect(context, details);
    }).rejects.toEqual(new Error("invalid entity type"));
  });

  test("it allows custom entities identified by a function that would have otherwise been blocked", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetSensitiveInfoReason({
        allowed: [
          {
            start: 12,
            end: 28,
            identifiedType: "custom",
          },
        ],
        denied: [],
      }),
    });
  });

  test("it provides the right size context window", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
      expect(tokens).toHaveLength(3);
      return tokens.map(() => undefined);
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: [],
      detect: customDetect,
      contextWindowSize: 3,
    });
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    await rule.protect(context, details);
  });

  test("it returns an error decision when body is not available", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: mockLogger(),
      characteristics: [],
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
    expect(rule.type).toEqual("SENSITIVE_INFO");
    assertIsLocalRule(rule);
    const decision = await rule.protect(context, details);
    expect(decision.ttl).toEqual(0);
    expect(decision.state).toEqual("NOT_RUN");
    expect(decision.conclusion).toEqual("ERROR");
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
    expect(rules.length).toEqual(3);
  });
});

describe("SDK", () => {
  function testRuleLocalAllowed() {
    return {
      mode: "LIVE",
      type: "TEST_RULE_LOCAL_ALLOWED",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(
        async () =>
          new ArcjetRuleResult({
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
      mode: "LIVE",
      type: "TEST_RULE_LOCAL_DENIED",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(
        async () =>
          new ArcjetRuleResult({
            ttl: 5000,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetTestReason(),
          }),
      ),
    } as const;
  }
  function testRuleLocalIncorrect() {
    return {
      mode: "LIVE",
      type: "TEST_RULE_LOCAL_INCORRECT",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(async () => undefined),
    } as const;
  }

  function testRuleRemote(): ArcjetRule {
    return {
      mode: "LIVE",
      type: "TEST_RULE_REMOTE",
      priority: 1,
    };
  }

  function testRuleMultiple(): ArcjetRule[] {
    return [
      { mode: "LIVE", type: "TEST_RULE_MULTIPLE", priority: 1 },
      { mode: "LIVE", type: "TEST_RULE_MULTIPLE", priority: 1 },
      { mode: "LIVE", type: "TEST_RULE_MULTIPLE", priority: 1 },
    ];
  }

  function testRuleInvalidType(): ArcjetRule {
    return {
      mode: "LIVE",
      type: "TEST_RULE_INVALID_TYPE",
      priority: 1,
    };
  }

  function testRuleLocalThrow() {
    return {
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
      mode: "DRY_RUN",
      type: "TEST_RULE_LOCAL_DRY_RUN",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(async () => {
        return new ArcjetRuleResult({
          ttl: 0,
          state: "RUN",
          conclusion: "DENY",
          reason: new ArcjetTestReason(),
        });
      }),
    } as const;
  }

  function testRuleProps(): Primitive<{ abc: number }> {
    return [{ mode: "LIVE", type: "test", priority: 10000 }];
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
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
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
    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.anything(),
      expect.anything(),
      [...tokenBucketRule],
    ]);
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
    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.anything(),
      expect.anything(),
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
    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.anything(),
      expect.anything(),
      [...testRule],
    ]);
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
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
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
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
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
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
  });

  // TODO(#207): Remove this once we default the client in the main SDK
  test("throws if no client is specified", () => {
    expect(() => {
      const aj = arcjet({
        key: "test-key",
        rules: [],
        log: mockLogger(),
      });
    }).toThrow();
  });

  test("throws if no log is specified", () => {
    expect(() => {
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
    }).toThrow();
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
    expect(decision.conclusion).toEqual("DENY");

    expect(allowed.validate.mock.callCount()).toEqual(1);
    expect(allowed.protect.mock.callCount()).toEqual(1);
    expect(denied.validate.mock.callCount()).toEqual(1);
    expect(denied.protect.mock.callCount()).toEqual(1);
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
      rules: [[rule]],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);
    // ALLOW because the remote rule was called and it returned ALLOW
    expect(decision.conclusion).toEqual("ALLOW");

    expect(rule.validate.mock.callCount()).toEqual(1);
    expect(rule.protect.mock.callCount()).toEqual(1);
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
    expect(decision.conclusion).toEqual("ERROR");
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
    expect(decision.conclusion).toEqual("ERROR");
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
    expect(decision.conclusion).toEqual("ERROR");
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
    expect(decision.conclusion).toEqual("DENY");

    expect(denied.validate.mock.callCount()).toEqual(1);
    expect(denied.protect.mock.callCount()).toEqual(1);
    expect(allowed.validate.mock.callCount()).toEqual(0);
    expect(allowed.protect.mock.callCount()).toEqual(0);
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
      headers: { "User-Agent": "curl/8.1.2" },
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: mockLogger(),
    });

    const decision = await aj.protect(context, request);
    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.objectContaining(context),
      expect.objectContaining({
        ip: request.ip,
        method: request.method,
        protocol: request.protocol,
        host: request.host,
        path: request.path,
        headers: new Headers(Object.entries(request.headers)),
        extra: {
          "extra-test": "extra-test-value",
        },
      }),
      [],
    ]);
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
    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.objectContaining(context),
      expect.objectContaining({
        ip: request.ip,
        method: request.method,
        protocol: request.protocol,
        host: request.host,
        path: request.path,
        headers: new Headers([
          ["user-agent", "curl/8.1.2"],
          ["user-agent", "something"],
        ]),
        extra: {
          "extra-test": "extra-test-value",
        },
      }),
      [],
    ]);
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
      headers: { "User-Agent": "curl/8.1.2" },
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
    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.objectContaining(context),
      expect.objectContaining({
        ip: request.ip,
        method: request.method,
        protocol: request.protocol,
        host: request.host,
        path: request.path,
        headers: new Headers(Object.entries(request.headers)),
        extra: {
          "extra-number": "123",
          "extra-false": "false",
          "extra-true": "true",
          "extra-unsupported": "<unsupported value>",
        },
      }),
      [],
    ]);
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
    expect(client.report.mock.callCount()).toEqual(0);
    expect(client.decide.mock.callCount()).toEqual(1);
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
    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.objectContaining(context),
      expect.objectContaining({
        ip: request.ip,
        method: request.method,
        protocol: request.protocol,
        host: request.host,
        path: request.path,
        headers: request.headers,
        extra: {
          "extra-test": "extra-test-value",
        },
      }),
      [rule],
    ]);
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
    expect(client.report.mock.callCount()).toEqual(1);
    expect(client.report.mock.calls[0].arguments).toEqual([
      expect.objectContaining(context),
      expect.objectContaining({
        ip: request.ip,
        method: request.method,
        protocol: request.protocol,
        host: request.host,
        path: request.path,
        headers: request.headers,
        extra: {
          "extra-test": "extra-test-value",
        },
      }),
      expect.objectContaining({
        conclusion: "DENY",
      }),
      [rule],
    ]);
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
    expect(client.report.mock.callCount()).toEqual(1);
    expect(client.report.mock.calls[0].arguments).toEqual([
      expect.objectContaining({
        waitUntil,
      }),
      expect.anything(),
      expect.anything(),
      [rule],
    ]);
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
    expect(client.decide.mock.callCount()).toEqual(0);
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

    expect(client.report.mock.callCount()).toEqual(0);
    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.objectContaining(context),
      expect.objectContaining({
        ip: request.ip,
        method: request.method,
        protocol: request.protocol,
        host: request.host,
        path: request.path,
        headers: request.headers,
        extra: {
          "extra-test": "extra-test-value",
        },
      }),
      [],
    ]);
  });

  test("caches a DENY decision locally and reports when a cached decision is used", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetDenyDecision({
          ttl: 5000,
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
      rules: [],
      client,
      log: mockLogger(),
    });

    const context = {
      getBody: () => Promise.resolve(undefined),
    };

    const decision = await aj.protect(context, request);

    expect(decision.isErrored()).toBe(false);

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.report.mock.callCount()).toEqual(0);

    expect(decision.conclusion).toEqual("DENY");

    const decision2 = await aj.protect(context, request);

    expect(decision2.isErrored()).toBe(false);
    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.report.mock.callCount()).toEqual(1);

    expect(decision2.conclusion).toEqual("DENY");
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

    expect(() => {
      const aj = arcjet({
        key: "test-key",
        rules: [[testRuleInvalidType()]],
        client,
        log: mockLogger(),
      });
    }).not.toThrow("Unknown Rule type");
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

    expect(client.report.mock.callCount()).toEqual(0);
    expect(client.decide.mock.callCount()).toEqual(1);
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

    function testRuleLocalThrowString(): ArcjetLocalRule {
      return {
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

    expect(log.error.mock.callCount()).toEqual(1);
    expect(log.error.mock.calls[0].arguments).toEqual([
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

    function testRuleLocalThrowNull(): ArcjetLocalRule {
      return {
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

    console.log(log.error.mock.calls);
    expect(log.error.mock.callCount()).toEqual(1);
    expect(log.error.mock.calls[0].arguments).toEqual([
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

    expect(decision.isDenied()).toBe(false);

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.report.mock.callCount()).toEqual(1);

    const decision2 = await aj.protect(context, request);

    expect(decision2.isDenied()).toBe(false);

    expect(client.decide.mock.callCount()).toEqual(2);
    expect(client.report.mock.callCount()).toEqual(2);
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

    expect(decision.isErrored()).toBe(false);

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.objectContaining(context),
      expect.objectContaining({
        ip: request.ip,
        method: request.method,
        protocol: request.protocol,
        host: request.host,
        path: request.path,
        headers: request.headers,
        extra: {
          "extra-test": "extra-test-value",
        },
      }),
      [rule],
    ]);
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

    expect(decision.isErrored()).toBe(false);

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.objectContaining({ ...context, key: "overridden-key" }),
      expect.objectContaining({
        ip: request.ip,
        method: request.method,
        protocol: request.protocol,
        host: request.host,
        path: request.path,
        headers: request.headers,
        extra: {
          "extra-test": "extra-test-value",
        },
      }),
      [rule],
    ]);
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

    expect(decision.isErrored()).toBe(true);

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.report.mock.callCount()).toEqual(1);
    expect(client.report.mock.calls[0].arguments).toEqual([
      expect.objectContaining(context),
      expect.objectContaining({
        ip: request.ip,
        method: request.method,
        protocol: request.protocol,
        host: request.host,
        path: request.path,
        headers: request.headers,
        extra: {
          "extra-test": "extra-test-value",
        },
      }),
      expect.objectContaining({
        conclusion: "ERROR",
      }),
      [],
    ]);
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

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.objectContaining({
        fingerprint:
          "fp::2::6f3a3854134fe3d20fe56387bdcb594f18b182683424757b88da75e8f13b92bd",
      }),
      expect.anything(),
      expect.anything(),
    ]);
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

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.anything(),
      expect.anything(),
      [
        expect.objectContaining({
          characteristics: globalCharacteristics,
        }),
      ],
    ]);
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

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.anything(),
      expect.anything(),
      [
        expect.objectContaining({
          characteristics: localCharacteristics,
        }),
      ],
    ]);
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

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.anything(),
      expect.anything(),
      [
        expect.objectContaining({
          characteristics: globalCharacteristics,
        }),
      ],
    ]);
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

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.anything(),
      expect.anything(),
      [
        expect.objectContaining({
          characteristics: localCharacteristics,
        }),
      ],
    ]);
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

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.anything(),
      expect.anything(),
      [
        expect.objectContaining({
          characteristics: globalCharacteristics,
        }),
      ],
    ]);
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

    expect(client.decide.mock.callCount()).toEqual(1);
    expect(client.decide.mock.calls[0].arguments).toEqual([
      expect.anything(),
      expect.anything(),
      [
        expect.objectContaining({
          characteristics: localCharacteristics,
        }),
      ],
    ]);
  });
});

/**
 * @jest-environment node
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

import arcjet, {
  ArcjetMode,
  detectBot,
  ArcjetRule,
  validateEmail,
  protectSignup,
  ArcjetBotType,
  ArcjetEmailType,
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
  ArcjetLocalRule,
  fixedWindow,
  tokenBucket,
  slidingWindow,
  Primitive,
  Arcjet,
  shield,
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

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

function assertIsLocalRule(rule: ArcjetRule): asserts rule is ArcjetLocalRule {
  expect("validate" in rule && typeof rule.validate === "function").toEqual(
    true,
  );
  expect("protect" in rule && typeof rule.protect === "function").toEqual(true);
}

class ArcjetTestReason extends ArcjetReason {}

const log = {
  time: jest.fn(),
  timeEnd: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

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
      botType: "AUTOMATED",
    });
    expect(reason.isBot()).toEqual(true);
  });

  test("`isBot()` returns true when reason is not BOT", () => {
    const reason = new ArcjetTestReason();
    expect(reason.isBot()).toEqual(false);
  });
});

describe("Primitive > detectBot", () => {
  test("provides a default rule with no options specified", async () => {
    const [rule] = detectBot();
    expect(rule.type).toEqual("BOT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
    expect(rule).toHaveProperty("block", ["AUTOMATED"]);
    expect(rule).toHaveProperty("add", []);
    expect(rule).toHaveProperty("remove", []);
  });

  test("sets mode as 'DRY_RUN' if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = detectBot({
      // @ts-expect-error
      mode: "INVALID",
    });
    expect(rule.type).toEqual("BOT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("allows specifying BotTypes to block", async () => {
    const options = {
      block: [
        ArcjetBotType.LIKELY_AUTOMATED,
        ArcjetBotType.LIKELY_NOT_A_BOT,
        ArcjetBotType.NOT_ANALYZED,
        ArcjetBotType.VERIFIED_BOT,
      ],
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    expect(rule).toHaveProperty("block", [
      "LIKELY_AUTOMATED",
      "LIKELY_NOT_A_BOT",
      "NOT_ANALYZED",
      "VERIFIED_BOT",
    ]);
  });

  test("allows specifying `add` patterns that map to BotTypes", async () => {
    const options = {
      patterns: {
        add: {
          safari: ArcjetBotType.LIKELY_AUTOMATED,
        },
      },
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    expect(rule).toHaveProperty("add", [["safari", "LIKELY_AUTOMATED"]]);
  });

  test("allows specifying `remove` patterns", async () => {
    const options = {
      patterns: {
        remove: ["^curl"],
      },
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    expect(rule).toHaveProperty("remove", ["^curl"]);
  });

  test("validates that headers is defined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log,
      characteristics: [],
    };
    const details = {
      headers: new Headers(),
    };

    const [rule] = detectBot();
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).not.toThrow();
  });

  test("throws via `validate()` if headers is undefined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log,
      characteristics: [],
    };
    const details = {
      headers: undefined,
    };

    const [rule] = detectBot();
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).toThrow();
  });

  test("does not analyze if no headers are specified", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log,
      characteristics: [],
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

    const [rule] = detectBot();
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetBotReason({
        botType: "NOT_ANALYZED",
      }),
    });
  });

  test("can be configured for VERIFIED_BOT", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        ArcjetBotType.AUTOMATED,
        ArcjetBotType.VERIFIED_BOT,
      ],
      patterns: {
        add: {
          safari: ArcjetBotType.VERIFIED_BOT,
        },
      },
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log,
      characteristics: [],
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([
        [
          "User-Agent",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        ],
      ]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("can be configured for LIKELY_NOT_A_BOT", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        ArcjetBotType.AUTOMATED,
        ArcjetBotType.LIKELY_NOT_A_BOT,
      ],
      patterns: {
        add: {
          safari: ArcjetBotType.LIKELY_NOT_A_BOT,
        },
      },
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log,
      characteristics: [],
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([
        [
          "User-Agent",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        ],
      ]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("can be configured for NOT_ANALYZED", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        ArcjetBotType.AUTOMATED,
        ArcjetBotType.NOT_ANALYZED,
      ],
      patterns: {
        add: {
          safari: ArcjetBotType.NOT_ANALYZED,
        },
      },
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log,
      characteristics: [],
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([
        [
          "User-Agent",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        ],
      ]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("can be configured for invalid bots", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log,
      characteristics: [],
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([
        [
          "User-Agent",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        ],
      ]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot({
      mode: ArcjetMode.LIVE,
      block: [
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        ArcjetBotType.AUTOMATED,
        // @ts-expect-error
        "SOMETHING_INVALID",
      ],
      patterns: {
        add: {
          // @ts-expect-error
          safari: "SOMETHING_INVALID",
        },
      },
    });
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("denies curl", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [
        ArcjetBotType.AUTOMATED,
        ArcjetBotType.LIKELY_AUTOMATED,
        ArcjetBotType.LIKELY_NOT_A_BOT,
      ],
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log,
      characteristics: [],
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

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("denies safari using an add pattern", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [
        ArcjetBotType.AUTOMATED,
        ArcjetBotType.LIKELY_AUTOMATED,
        ArcjetBotType.LIKELY_NOT_A_BOT,
      ],
      patterns: {
        add: {
          safari: ArcjetBotType.AUTOMATED,
        },
      },
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log,
      characteristics: [],
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([
        [
          "User-Agent",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        ],
      ]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("allows curl using a remove pattern", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [ArcjetBotType.AUTOMATED, ArcjetBotType.LIKELY_AUTOMATED],
      patterns: {
        remove: ["^curl"],
      },
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log,
      characteristics: [],
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

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetBotReason({
        botScore: 0,
        botType: "LIKELY_NOT_A_BOT",
      }),
    });
  });
});

describe("Primitive > tokenBucket", () => {
  test("provides no rules if no `options` specified", () => {
    const rules = tokenBucket();
    expect(rules).toHaveLength(0);
  });

  test("sets mode as `DRY_RUN` if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = tokenBucket({
      // @ts-expect-error
      mode: "INVALID",
      match: "/test",
      characteristics: ["ip.src"],
      refillRate: 1,
      interval: 1,
      capacity: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = tokenBucket({
      mode: "LIVE",
      match: "/test",
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

  test("produces a rules based on single `limit` specified", async () => {
    const options = {
      match: "/test",
      characteristics: ["ip.src"],
      refillRate: 1,
      interval: 1,
      capacity: 1,
    };

    const rules = tokenBucket(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("mode", "DRY_RUN");
    expect(rules[0]).toHaveProperty("match", "/test");
    expect(rules[0]).toHaveProperty("characteristics", ["ip.src"]);
    expect(rules[0]).toHaveProperty("algorithm", "TOKEN_BUCKET");
    expect(rules[0]).toHaveProperty("refillRate", 1);
    expect(rules[0]).toHaveProperty("interval", 1);
    expect(rules[0]).toHaveProperty("capacity", 1);
  });

  test("produces a multiple rules based on multiple `limit` specified", async () => {
    const options = [
      {
        match: "/test",
        characteristics: ["ip.src"],
        refillRate: 1,
        interval: 1,
        capacity: 1,
      },
      {
        match: "/test-double",
        characteristics: ["ip.src"],
        refillRate: 2,
        interval: 2,
        capacity: 2,
      },
    ];

    const rules = tokenBucket(...options);
    expect(rules).toHaveLength(2);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test",
        characteristics: ["ip.src"],
        algorithm: "TOKEN_BUCKET",
        refillRate: 1,
        interval: 1,
        capacity: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test-double",
        characteristics: ["ip.src"],
        algorithm: "TOKEN_BUCKET",
        refillRate: 2,
        interval: 2,
        capacity: 2,
      }),
    ]);
  });

  test("does not default `match` and `characteristics` if not specified in single `limit`", async () => {
    const options = {
      refillRate: 1,
      interval: 1,
      capacity: 1,
    };

    const [rule] = tokenBucket(options);
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("match", undefined);
    expect(rule).toHaveProperty("characteristics", undefined);
  });

  test("does not default `match` or `characteristics` if not specified in array `limit`", async () => {
    const options = [
      {
        refillRate: 1,
        interval: 1,
        capacity: 1,
      },
      {
        refillRate: 2,
        interval: 2,
        capacity: 2,
      },
    ];

    const rules = tokenBucket(...options);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "TOKEN_BUCKET",
        refillRate: 1,
        interval: 1,
        capacity: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        refillRate: 2,
        interval: 2,
        capacity: 2,
      }),
    ]);
  });
});

describe("Primitive > fixedWindow", () => {
  test("provides no rules if no `options` specified", () => {
    const rules = fixedWindow();
    expect(rules).toHaveLength(0);
  });

  test("sets mode as `DRY_RUN` if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = fixedWindow({
      // @ts-expect-error
      mode: "INVALID",
      match: "/test",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = fixedWindow({
      mode: "LIVE",
      match: "/test",
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

  test("produces a rules based on single `limit` specified", async () => {
    const options = {
      match: "/test",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    };

    const rules = fixedWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("mode", "DRY_RUN");
    expect(rules[0]).toHaveProperty("match", "/test");
    expect(rules[0]).toHaveProperty("characteristics", ["ip.src"]);
    expect(rules[0]).toHaveProperty("algorithm", "FIXED_WINDOW");
    expect(rules[0]).toHaveProperty("window", 3600);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("produces a multiple rules based on multiple `limit` specified", async () => {
    const options = [
      {
        match: "/test",
        characteristics: ["ip.src"],
        window: "1h",
        max: 1,
      },
      {
        match: "/test-double",
        characteristics: ["ip.src"],
        window: "2h",
        max: 2,
      },
    ];

    const rules = fixedWindow(...options);
    expect(rules).toHaveLength(2);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test",
        characteristics: ["ip.src"],
        algorithm: "FIXED_WINDOW",
        window: 3600,
        max: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test-double",
        characteristics: ["ip.src"],
        algorithm: "FIXED_WINDOW",
        window: 7200,
        max: 2,
      }),
    ]);
  });

  test("does not default `match` and `characteristics` if not specified in single `limit`", async () => {
    const options = {
      window: "1h",
      max: 1,
    };

    const [rule] = fixedWindow(options);
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("match", undefined);
    expect(rule).toHaveProperty("characteristics", undefined);
  });

  test("does not default `match` or `characteristics` if not specified in array `limit`", async () => {
    const options = [
      {
        window: "1h",
        max: 1,
      },
      {
        window: "2h",
        max: 2,
      },
    ];

    const rules = fixedWindow(...options);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "FIXED_WINDOW",
        window: 3600,
        max: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "FIXED_WINDOW",
        window: 7200,
        max: 2,
      }),
    ]);
  });
});

describe("Primitive > slidingWindow", () => {
  test("provides no rules if no `options` specified", () => {
    const rules = slidingWindow();
    expect(rules).toHaveLength(0);
  });

  test("sets mode as `DRY_RUN` if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = slidingWindow({
      // @ts-expect-error
      mode: "INVALID",
      match: "/test",
      characteristics: ["ip.src"],
      interval: 3600,
      max: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = slidingWindow({
      mode: "LIVE",
      match: "/test",
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

  test("produces a rules based on single `limit` specified", async () => {
    const options = {
      match: "/test",
      characteristics: ["ip.src"],
      interval: 3600,
      max: 1,
    };

    const rules = slidingWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("mode", "DRY_RUN");
    expect(rules[0]).toHaveProperty("match", "/test");
    expect(rules[0]).toHaveProperty("characteristics", ["ip.src"]);
    expect(rules[0]).toHaveProperty("algorithm", "SLIDING_WINDOW");
    expect(rules[0]).toHaveProperty("interval", 3600);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("produces a multiple rules based on multiple `limit` specified", async () => {
    const options = [
      {
        match: "/test",
        characteristics: ["ip.src"],
        interval: 3600,
        max: 1,
      },
      {
        match: "/test-double",
        characteristics: ["ip.src"],
        interval: 7200,
        max: 2,
      },
    ];

    const rules = slidingWindow(...options);
    expect(rules).toHaveLength(2);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test",
        characteristics: ["ip.src"],
        algorithm: "SLIDING_WINDOW",
        interval: 3600,
        max: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test-double",
        characteristics: ["ip.src"],
        algorithm: "SLIDING_WINDOW",
        interval: 7200,
        max: 2,
      }),
    ]);
  });

  test("does not default `match` and `characteristics` if not specified in single `limit`", async () => {
    const options = {
      interval: 3600,
      max: 1,
    };

    const [rule] = slidingWindow(options);
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("match", undefined);
    expect(rule).toHaveProperty("characteristics", undefined);
  });

  test("does not default `match` or `characteristics` if not specified in array `limit`", async () => {
    const options = [
      {
        interval: 3600,
        max: 1,
      },
      {
        interval: 7200,
        max: 2,
      },
    ];

    const rules = slidingWindow(...options);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "SLIDING_WINDOW",
        interval: 3600,
        max: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "SLIDING_WINDOW",
        interval: 7200,
        max: 2,
      }),
    ]);
  });
});

describe("Primitive > validateEmail", () => {
  test("provides a default rule with no options specified", async () => {
    const [rule] = validateEmail();
    expect(rule.type).toEqual("EMAIL");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
    expect(rule).toHaveProperty("block", []);
    expect(rule).toHaveProperty("requireTopLevelDomain", true);
    expect(rule).toHaveProperty("allowDomainLiteral", false);
    assertIsLocalRule(rule);
  });

  test("sets mode as 'DRY_RUN' if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = validateEmail({
      // @ts-expect-error
      mode: "INVALID",
    });
    expect(rule.type).toEqual("EMAIL");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("allows specifying EmailTypes to block", async () => {
    const options = {
      block: [
        ArcjetEmailType.DISPOSABLE,
        ArcjetEmailType.FREE,
        ArcjetEmailType.NO_GRAVATAR,
        ArcjetEmailType.NO_MX_RECORDS,
        ArcjetEmailType.INVALID,
      ],
    };

    const [rule] = validateEmail(options);
    expect(rule.type).toEqual("EMAIL");
    expect(rule).toHaveProperty("block", [
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
      log,
      characteristics: [],
    };
    const details = {
      email: "abc@example.com",
    };

    const [rule] = validateEmail();
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
      log,
      characteristics: [],
    };
    const details = {
      email: undefined,
    };

    const [rule] = validateEmail();
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
      log,
      characteristics: [],
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

    const [rule] = validateEmail();
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
      log,
      characteristics: [],
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

    const [rule] = validateEmail();
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
      log,
      characteristics: [],
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

    const [rule] = validateEmail();
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
      log,
      characteristics: [],
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
      block: [],
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
      log,
      characteristics: [],
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

    const [rule] = validateEmail();
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
      log,
      characteristics: [],
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

    const [rule] = validateEmail();
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
      log,
      characteristics: [],
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
      log,
      characteristics: [],
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
  test("provides a default rule with no options specified", async () => {
    const [rule] = shield();
    expect(rule.type).toEqual("SHIELD");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("sets mode as 'DRY_RUN' if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = shield({
      // @ts-expect-error
      mode: "INVALID",
    });
    expect(rule.type).toEqual("SHIELD");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = shield({
      mode: "LIVE",
    });
    expect(rule.type).toEqual("SHIELD");
    expect(rule).toHaveProperty("mode", "LIVE");
  });
});

describe("Products > protectSignup", () => {
  test("allows configuration of rateLimit, bot, and email", () => {
    const rules = protectSignup({
      rateLimit: {
        mode: ArcjetMode.DRY_RUN,
        match: "/test",
        characteristics: ["ip.src"],
        interval: 60 /* minutes */ * 60 /* seconds */,
        max: 1,
      },
      bots: {
        mode: ArcjetMode.DRY_RUN,
      },
      email: {
        mode: ArcjetMode.LIVE,
      },
    });
    expect(rules.length).toEqual(3);
  });

  test("allows configuration of multiple rate limit rules with an array of options", () => {
    const rules = protectSignup({
      rateLimit: [
        {
          mode: ArcjetMode.DRY_RUN,
          match: "/test",
          characteristics: ["ip.src"],
          interval: 60 /* minutes */ * 60 /* seconds */,
          max: 1,
        },
        {
          match: "/test",
          characteristics: ["ip.src"],
          interval: 2 /* hours */ * 60 /* minutes */ * 60 /* seconds */,
          max: 2,
        },
      ],
    });
    expect(rules.length).toEqual(4);
  });

  test("allows configuration of multiple bot rules with an array of options", () => {
    const rules = protectSignup({
      bots: [
        {
          mode: "DRY_RUN",
        },
        {
          mode: "LIVE",
        },
      ],
    });
    expect(rules.length).toEqual(3);
  });

  test("allows configuration of multiple email rules with an array of options", () => {
    const rules = protectSignup({
      email: [
        {
          mode: "DRY_RUN",
        },
        {
          mode: "LIVE",
        },
      ],
    });
    expect(rules.length).toEqual(3);
  });
});

describe("SDK", () => {
  function testRuleLocalAllowed(): ArcjetLocalRule {
    return {
      mode: ArcjetMode.LIVE,
      type: "TEST_RULE_LOCAL_ALLOWED",
      priority: 1,
      validate: jest.fn(),
      protect: jest.fn(
        async () =>
          new ArcjetRuleResult({
            ttl: 0,
            state: "RUN",
            conclusion: "ALLOW",
            reason: new ArcjetTestReason(),
          }),
      ),
    };
  }
  function testRuleLocalDenied(): ArcjetLocalRule {
    return {
      mode: ArcjetMode.LIVE,
      type: "TEST_RULE_LOCAL_DENIED",
      priority: 1,
      validate: jest.fn(),
      protect: jest.fn(
        async () =>
          new ArcjetRuleResult({
            ttl: 5000,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetTestReason(),
          }),
      ),
    };
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
      mode: ArcjetMode.LIVE,
      type: "TEST_RULE_INVALID_TYPE",
      priority: 1,
    };
  }

  function testRuleLocalThrow(): ArcjetLocalRule {
    return {
      mode: ArcjetMode.LIVE,
      type: "TEST_RULE_LOCAL_THROW",
      priority: 1,
      validate: jest.fn(),
      protect: jest.fn(async () => {
        throw new Error("Local rule protect failed");
      }),
    };
  }

  function testRuleLocalDryRun(): ArcjetLocalRule {
    return {
      mode: ArcjetMode.DRY_RUN,
      type: "TEST_RULE_LOCAL_DRY_RUN",
      priority: 1,
      validate: jest.fn(),
      protect: jest.fn(async () => {
        return new ArcjetRuleResult({
          ttl: 0,
          state: "RUN",
          conclusion: "DENY",
          reason: new ArcjetTestReason(),
        });
      }),
    };
  }

  function testRuleProps(): Primitive<{ abc: number }> {
    return [];
  }

  test("creates a new Arcjet SDK with no rules", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log,
    });
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
  });

  test("can augment rules via `withRule` API", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
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
      log,
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

    const _ = await aj2.protect({}, request);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [...tokenBucketRule],
    );
  });

  test("can chain new rules via multiple `withRule` calls", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
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
      log,
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

    const _ = await aj3.protect({}, request);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [...tokenBucketRule, ...testRule],
    );
  });

  test("creates different augmented clients when `withRule` not chained", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
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
      log,
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

    const _ = await aj3.protect({}, request);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [...testRule],
    );
  });

  test("creates a new Arcjet SDK with only local rules", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalAllowed(), testRuleLocalDenied()]],
      client,
      log,
    });
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
  });

  test("creates a new Arcjet SDK with only remote rules", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleRemote()]],
      client,
      log,
    });
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
  });

  test("creates a new Arcjet SDK with both local and remote rules", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [
        [testRuleLocalAllowed(), testRuleLocalDenied(), testRuleRemote()],
      ],
      client,
      log,
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
        log,
      });
    }).toThrow();
  });

  test("throws if no log is specified", () => {
    expect(() => {
      const client = {
        decide: jest.fn(async () => {
          return new ArcjetAllowDecision({
            ttl: 0,
            reason: new ArcjetTestReason(),
            results: [],
          });
        }),
        report: jest.fn(),
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
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
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
      log,
    });

    const decision = await aj.protect({}, request);
    expect(decision.conclusion).toEqual("DENY");

    expect(allowed.validate).toHaveBeenCalledTimes(1);
    expect(allowed.protect).toHaveBeenCalledTimes(1);
    expect(denied.validate).toHaveBeenCalledTimes(1);
    expect(denied.protect).toHaveBeenCalledTimes(1);
  });

  test("works with an empty request object", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const request = {};

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log,
    });

    const decision = await aj.protect({}, request);
    expect(decision.conclusion).toEqual("ALLOW");
  });

  test("does not crash with no request object", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log,
    });

    // @ts-expect-error
    const decision = await aj.protect();
    expect(decision.conclusion).toEqual("ALLOW");
  });

  test("returns an ERROR decision when more than 10 rules are generated", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const request = {};

    const rules: ArcjetRule[][] = [];
    // We only iterate 4 times because `testRuleMultiple` generates 3 rules
    for (let idx = 0; idx < 4; idx++) {
      rules.push(testRuleMultiple());
    }

    const aj = arcjet({
      key: "test-key",
      rules: rules,
      client,
      log,
    });

    const decision = await aj.protect({}, request);
    expect(decision.conclusion).toEqual("ERROR");
  });

  test("won't run a later local rule if a DENY decision is encountered", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
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
      log,
    });

    const decision = await aj.protect({}, request);
    expect(decision.conclusion).toEqual("DENY");

    expect(denied.validate).toHaveBeenCalledTimes(1);
    expect(denied.protect).toHaveBeenCalledTimes(1);
    expect(allowed.validate).toHaveBeenCalledTimes(0);
    expect(allowed.protect).toHaveBeenCalledTimes(0);
  });

  test("accepts plain object of headers", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
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
      log,
    });

    const decision = await aj.protect({}, request);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
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
    );
  });

  test("accepts plain object of `raw` headers", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
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
      log,
    });

    const decision = await aj.protect({}, request);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
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
    );
  });

  test("converts extra keys with non-string values to string values", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
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
      log,
    });

    const decision = await aj.protect({}, request);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
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
    );
  });

  test("does not call `client.report()` if the local decision is ALLOW", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: jest.fn(),
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
      log,
    });

    const _ = await aj.protect({}, request);
    expect(client.report).toHaveBeenCalledTimes(0);
    expect(client.decide).toHaveBeenCalledTimes(1);
    // TODO: Validate correct `ruleResults` are sent with `decide` when available
  });

  test("calls `client.decide()` if the local decision is ALLOW", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
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
      log,
    });

    const decision = await aj.protect({}, request);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
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
    );
  });

  test("calls `client.report()` if the local decision is DENY", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
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
      log,
    });

    const _ = await aj.protect({}, request);
    expect(client.report).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledWith(
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
    );
  });

  test("does not call `client.decide()` if the local decision is DENY", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: jest.fn(),
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
      log,
    });

    const _ = await aj.protect({}, request);
    expect(client.decide).toHaveBeenCalledTimes(0);
  });

  test("calls `client.decide()` even with no rules", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
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
      log,
    });

    const _ = await aj.protect({}, request);

    expect(client.report).toHaveBeenCalledTimes(0);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
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
    );
  });

  test("caches a DENY decision locally and reports when a cached decision is used", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetDenyDecision({
          ttl: 5000,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
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
      log,
    });

    const decision = await aj.protect({}, request);

    expect(decision.isErrored()).toBe(false);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledTimes(0);

    expect(decision.conclusion).toEqual("DENY");

    const decision2 = await aj.protect({}, request);

    expect(decision2.isErrored()).toBe(false);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledTimes(1);

    expect(decision2.conclusion).toEqual("DENY");
  });

  test("does not throw if unknown rule type is passed", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    expect(() => {
      const aj = arcjet({
        key: "test-key",
        rules: [[testRuleInvalidType()]],
        client,
        log,
      });
    }).not.toThrow("Unknown Rule type");
  });

  test("does not call `client.report()` if a local rule throws", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
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
      log,
    });

    const _ = await aj.protect({}, request);

    expect(client.report).toHaveBeenCalledTimes(0);
    expect(client.decide).toHaveBeenCalledTimes(1);
    // TODO: Validate correct `ruleResults` are sent with `decide` when available
  });

  test("correctly logs an error message if a local rule throws a string", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
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
        mode: ArcjetMode.LIVE,
        type: "TEST_RULE_LOCAL_THROW_STRING",
        priority: 1,
        validate: jest.fn(),
        async protect(context, details) {
          throw "Local rule protect failed";
        },
      };
    }

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalThrowString()]],
      client,
      log,
    });

    const _ = await aj.protect({}, request);

    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledWith(
      "Failure running rule: %s due to %s",
      "TEST_RULE_LOCAL_THROW_STRING",
      "Local rule protect failed",
    );
  });

  test("correctly logs an error message if a local rule throws a non-error", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
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
        mode: ArcjetMode.LIVE,
        type: "TEST_RULE_LOCAL_THROW_NULL",
        priority: 1,
        validate: jest.fn(),
        async protect(context, details) {
          throw null;
        },
      };
    }

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalThrowNull()]],
      client,
      log,
    });

    const _ = await aj.protect({}, request);

    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledWith(
      "Failure running rule: %s due to %s",
      "TEST_RULE_LOCAL_THROW_NULL",
      "Unknown problem",
    );
  });

  test("does not return nor cache a deny decision if DENY decision in a dry run local rule", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
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
      log,
    });

    const decision = await aj.protect({}, request);

    expect(decision.isDenied()).toBe(false);

    expect(client.decide).toBeCalledTimes(1);
    expect(client.report).toBeCalledTimes(1);

    const decision2 = await aj.protect({}, request);

    expect(decision2.isDenied()).toBe(false);

    expect(client.decide).toBeCalledTimes(2);
    expect(client.report).toBeCalledTimes(2);
  });

  test("processes a single rule from a REMOTE ArcjetRule", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
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
      log,
    });

    const decision = await aj.protect({}, request);

    expect(decision.isErrored()).toBe(false);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
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
    );
  });

  test("overrides `key` with custom context", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
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
      log,
    });

    const decision = await aj.protect({ key: "overridden-key" }, request);

    expect(decision.isErrored()).toBe(false);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
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
    );
  });

  test("reports and returns an ERROR decision if a `client.decide()` fails", async () => {
    const client = {
      decide: jest.fn(async () => {
        throw new Error("Decide function failed");
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
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
      log,
    });

    const decision = await aj.protect({}, request);

    expect(decision.isErrored()).toBe(true);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledWith(
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
    );
  });

  test("Additional characteristics are propegated to fixedWindow if they aren't seperately specified in fixedWindow", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const rateLimitRule = fixedWindow({
      mode: "LIVE",
      window: "1h",
      max: 60,
    });

    const globalCharacteristics = ["someAdditionalCharacteristic"];
    const aj = arcjet({
      key: "test-key",
      characteristics: globalCharacteristics,
      rules: [rateLimitRule],
      client,
      log,
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
    };

    const _ = await aj.protect({}, request);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [
        {
          characteristics: globalCharacteristics,
          ...rateLimitRule[0],
        },
      ],
    );
  });

  test("Additional characteristics aren't propegated to fixedWindow if they are seperately specified in fixedWindow", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const fixedWindowCharacteristics = ["someLocalCharacteristic"];
    const rateLimitRule = fixedWindow({
      mode: "LIVE",
      window: "1h",
      max: 60,
      characteristics: fixedWindowCharacteristics,
    });

    const aj = arcjet({
      key: "test-key",
      characteristics: ["someAdditionalCharacteristic"],
      rules: [rateLimitRule],
      client,
      log,
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
    };

    const _ = await aj.protect({}, request);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [
        {
          characteristics: fixedWindowCharacteristics,
          ...rateLimitRule[0],
        },
      ],
    );
  });

  test("Additional characteristics are propegated to slidingWindow if they aren't seperately specified in slidingWindow", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const rateLimitRule = slidingWindow({
      mode: "LIVE",
      interval: "1h",
      max: 60,
    });

    const globalCharacteristics = ["someAdditionalCharacteristic"];
    const aj = arcjet({
      key: "test-key",
      characteristics: globalCharacteristics,
      rules: [rateLimitRule],
      client,
      log,
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
    };

    const _ = await aj.protect({}, request);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [
        {
          characteristics: globalCharacteristics,
          ...rateLimitRule[0],
        },
      ],
    );
  });

  test("Additional characteristics aren't propegated to fixedWindow if they are seperately specified in fixedWindow", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const fixedWindowCharacteristics = ["someLocalCharacteristic"];
    const rateLimitRule = slidingWindow({
      mode: "LIVE",
      interval: "1h",
      max: 60,
      characteristics: fixedWindowCharacteristics,
    });

    const aj = arcjet({
      key: "test-key",
      characteristics: ["someAdditionalCharacteristic"],
      rules: [rateLimitRule],
      client,
      log,
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
    };

    const _ = await aj.protect({}, request);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [
        {
          characteristics: fixedWindowCharacteristics,
          ...rateLimitRule[0],
        },
      ],
    );
  });

  test("Additional characteristics are propegated to tokenBucket if they aren't seperately specified in tokenBucket", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const rateLimitRule = tokenBucket({
      mode: "LIVE",
      interval: "1h",
      refillRate: 1,
      capacity: 10,
    });

    const globalCharacteristics = ["someAdditionalCharacteristic"];
    const aj = arcjet({
      key: "test-key",
      characteristics: globalCharacteristics,
      rules: [rateLimitRule],
      client,
      log,
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      requested: 1,
    };

    const _ = await aj.protect({}, request);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [
        {
          characteristics: globalCharacteristics,
          ...rateLimitRule[0],
        },
      ],
    );
  });

  test("Additional characteristics aren't propegated to tokenBucket if they are seperately specified in tokenBucket", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const fixedWindowCharacteristics = ["someLocalCharacteristic"];
    const rateLimitRule = tokenBucket({
      mode: "LIVE",
      interval: "1h",
      refillRate: 1,
      capacity: 10,
      characteristics: fixedWindowCharacteristics,
    });

    const aj = arcjet({
      key: "test-key",
      characteristics: ["someAdditionalCharacteristic"],
      rules: [rateLimitRule],
      client,
      log,
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      requested: 1,
    };

    const _ = await aj.protect({}, request);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [
        {
          characteristics: fixedWindowCharacteristics,
          ...rateLimitRule[0],
        },
      ],
    );
  });
});

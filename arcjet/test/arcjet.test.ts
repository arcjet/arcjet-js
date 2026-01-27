import assert from "node:assert/strict";
import { describe, test, mock } from "node:test";
import arcjet, {
  type ArcjetRule,
  type Arcjet,
  type Primitive,
  ArcjetAllowDecision,
  ArcjetDenyDecision,
  ArcjetErrorDecision,
  ArcjetReason,
  ArcjetErrorReason,
  ArcjetRuleResult,
  fixedWindow,
  tokenBucket,
  slidingWindow,
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
type Props<T> = T extends Arcjet<infer P> ? P : never;

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
            reason: new ArcjetReason(),
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
            reason: new ArcjetReason(),
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
            reason: new ArcjetReason(),
          });
        } else {
          return new ArcjetRuleResult({
            ruleId,
            fingerprint,
            ttl: 0,
            state: "RUN",
            conclusion: "ALLOW",
            reason: new ArcjetReason(),
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
          reason: new ArcjetReason(),
        });
      }),
    } as const;
  }

  function testRuleProps(): Primitive<{ abc: number }> {
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: createMockLogger(),
    });
    assert.ok("protect" in aj);
    assert.equal(typeof aj.protect, "function");
  });

  test("can augment rules via `withRule` API", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: { "User-Agent": "curl/8.1.2" },
      "extra-test": "extra-test-value",
      userId: "abc123",
      requested: 1,
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
      log: createMockLogger(),
    });
    type WithoutRuleTest = Assert<IsEqual<Props<typeof aj>, {}>>;

    const tokenBucketRule = tokenBucket({
      characteristics: ["userId"],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });

    const aj2 = aj.withRule(tokenBucketRule);
    type WithRuleTest = Assert<
      IsEqual<
        Props<typeof aj2>,
        {
          requested: number;
          userId: Record<string, string> | boolean | number | string;
        }
      >
    >;

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: { "User-Agent": "curl/8.1.2" },
      "extra-test": "extra-test-value",
      userId: "abc123",
      requested: 1,
      abc: 123,
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
      log: createMockLogger(),
    });
    type WithoutRuleTest = Assert<IsEqual<Props<typeof aj>, {}>>;

    const tokenBucketRule = tokenBucket({
      characteristics: ["userId"],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });

    const aj2 = aj.withRule(tokenBucketRule);
    type WithRuleTestOne = Assert<
      IsEqual<
        Props<typeof aj2>,
        {
          requested: number;
          userId: Record<string, string> | boolean | number | string;
        }
      >
    >;

    const testRule = testRuleProps();

    const aj3 = aj2.withRule(testRule);
    type WithRuleTestTwo = Assert<
      IsEqual<
        Props<typeof aj3>,
        {
          requested: number;
          userId: Record<string, string> | boolean | number | string;
          abc: number;
        }
      >
    >;

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const key = "test-key";
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: { "User-Agent": "curl/8.1.2" },
      "extra-test": "extra-test-value",
      userId: "abc123",
      requested: 1,
      abc: 123,
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
      log: createMockLogger(),
    });
    type WithoutRuleTest = Assert<IsEqual<Props<typeof aj>, {}>>;

    const tokenBucketRule = tokenBucket({
      characteristics: ["userId"],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });

    const aj2 = aj.withRule(tokenBucketRule);
    type WithRuleTestOne = Assert<
      IsEqual<
        Props<typeof aj2>,
        {
          requested: number;
          userId: Record<string, string> | boolean | number | string;
        }
      >
    >;

    const testRule = testRuleProps();

    const aj3 = aj.withRule(testRule);
    type WithRuleTestTwo = Assert<IsEqual<Props<typeof aj3>, { abc: number }>>;

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalAllowed(), testRuleLocalDenied()]],
      client,
      log: createMockLogger(),
    });
    assert.ok("protect" in aj);
    assert.equal(typeof aj.protect, "function");
  });

  test("creates a new Arcjet SDK with only remote rules", () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleRemote()]],
      client,
      log: createMockLogger(),
    });
    assert.ok("protect" in aj);
    assert.equal(typeof aj.protect, "function");
  });

  test("creates a new Arcjet SDK with both local and remote rules", () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
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
      log: createMockLogger(),
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
        log: createMockLogger(),
      });
    });
  });

  test("throws if no log is specified", () => {
    assert.throws(() => {
      const client = {
        decide: mock.fn(async () => {
          return new ArcjetAllowDecision({
            ttl: 0,
            reason: new ArcjetReason(),
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };
    const allowed = testRuleLocalAllowed();
    const denied = testRuleLocalDenied();

    const aj = arcjet({
      key: "test-key",
      rules: [[allowed, denied]],
      client,
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
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
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
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
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
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
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      cookies: "",
      email: undefined,
      extra: {},
      headers: new Headers(),
      host: "localhost:3000",
      ip: undefined,
      method: "GET",
      path: "/",
      protocol: "http:",
      query: "",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
    };

    // @ts-expect-error: test runtime behavior for missing request details.
    const decision = await aj.protect(context, request);
    assert.equal(decision.conclusion, "ERROR");
  });

  test("returns an ERROR decision with no request object", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: createMockLogger(),
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      cookies: "",
      email: undefined,
      extra: {},
      headers: new Headers(),
      host: "localhost:3000",
      ip: "100.100.100.100",
      method: "GET",
      path: "/",
      protocol: "http:",
      query: "",
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
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
    };

    const decision = await aj.protect(context, request);
    assert.equal(decision.conclusion, "ERROR");
  });

  test("won't run a later local rule if a DENY decision is encountered", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };
    const allowed = testRuleLocalAllowed();
    const denied = testRuleLocalDenied();

    const aj = arcjet({
      key: "test-key",
      rules: [[denied, allowed]],
      client,
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
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
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: { "user-agent": "curl/8.1.2" },
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: createMockLogger(),
    });

    const decision = await aj.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const args = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: "",
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
      query: "",
    });
  });

  test("accepts plain object of `raw` headers", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
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
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: { "User-Agent": ["curl/8.1.2", "something"] },
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: createMockLogger(),
    });

    const decision = await aj.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const args = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: "",
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
      query: "",
    });
  });

  test("converts extra keys with non-string values to string values", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
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
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: { "user-agent": "curl/8.1.2" },
      "extra-number": 123,
      "extra-false": false,
      "extra-true": true,
      "extra-unsupported": new Date(),
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
      log: createMockLogger(),
    });

    const decision = await aj.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const args = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: "",
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
      query: "",
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };
    const allowed = testRuleLocalAllowed();

    const aj = arcjet({
      key: "test-key",
      rules: [[allowed]],
      client,
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };
    const rule = testRuleLocalAllowed();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
      log: createMockLogger(),
    });

    const decision = await aj.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: "",
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
      query: "",
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
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };
    const rule = testRuleLocalDenied();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
      log: createMockLogger(),
    });

    const _ = await aj.protect(context, request);
    assert.equal(client.report.mock.callCount(), 1);
    const args: unknown[] = client.report.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: "",
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
      query: "",
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
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };
    const rule = testRuleLocalDenied();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
      log: createMockLogger(),
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };
    const denied = testRuleLocalDenied();

    const aj = arcjet({
      key: "test-key",
      rules: [[denied]],
      client,
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
    };

    const _ = await aj.protect(context, request);
    assert.equal(client.decide.mock.callCount(), 0);
  });

  test("calls `client.decide()` even with no rules", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
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
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
      log: createMockLogger(),
    });

    const _ = await aj.protect(context, request);

    assert.equal(client.report.mock.callCount(), 0);
    assert.equal(client.decide.mock.callCount(), 1);

    const args: unknown[] = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: "",
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
      query: "",
    });
  });

  test("caches a DENY decision locally and reports when a cached decision is used", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetDenyDecision({
          ttl: 10,
          reason: new ArcjetReason(),
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint:
                "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
              ttl: 10,
              state: "RUN",
              conclusion: "DENY",
              reason: new ArcjetReason(),
            }),
          ],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalCached()]],
      client,
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
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
        log: createMockLogger(),
      });
    });
  });

  test("does not call `client.report()` if a local rule throws", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalThrow()]],
      client,
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
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

    const log = createMockLogger();

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalThrowString()]],
      client,
      log,
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
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

    const log = createMockLogger();

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalThrowNull()]],
      client,
      log,
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
          results: [],
        });
      }),
      report: mock.fn(),
    };

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalDryRun()]],
      client,
      log: createMockLogger(),
    });

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
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
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };

    const rule = testRuleRemote();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
      log: createMockLogger(),
    });

    const decision = await aj.protect(context, request);

    assert.equal(decision.isErrored(), false);

    assert.equal(client.decide.mock.callCount(), 1);
    const args: unknown[] = client.decide.mock.calls[0].arguments;
    assert.deepEqual(requestAsJson(args.at(1)), {
      cookies: "",
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
      query: "",
    });
    assert.deepEqual(args.at(2), [rule]);
  });

  test("overrides `key` with custom context", async () => {
    const client = {
      decide: mock.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
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
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };

    const rule = testRuleRemote();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
      log: createMockLogger(),
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
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
      cookies: "",
      query: "",
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
      log: createMockLogger(),
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
          reason: new ArcjetReason(),
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
      log: createMockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["abcxyz", "test1234"]]),
      cookies: "",
      query: "",
    };

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
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
      log: createMockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      someGlobalCharacteristic: "test",
      cookies: "",
      query: "",
    };

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
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
      log: createMockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      someGlobalCharacteristic: "test",
      someLocalCharacteristic: "test",
      cookies: "",
      query: "",
    };

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
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
      log: createMockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      someGlobalCharacteristic: "test",
      cookies: "",
      query: "",
    };

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
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
      log: createMockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      someGlobalCharacteristic: "test",
      someLocalCharacteristic: "test",
      cookies: "",
      query: "",
    };

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
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
      log: createMockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      requested: 1,
      someGlobalCharacteristic: "test",
      cookies: "",
      query: "",
    };

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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
          reason: new ArcjetReason(),
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
      log: createMockLogger(),
    });

    const request = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      requested: 1,
      someGlobalCharacteristic: "test",
      someLocalCharacteristic: "test",
      cookies: "",
      query: "",
    };

    const context = {
      getBody() {
        throw new Error("Not implemented");
      },
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

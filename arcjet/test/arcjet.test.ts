import assert from "node:assert/strict";
import test from "node:test";
import { MemoryCache } from "@arcjet/cache";
import { ArcjetHeaders } from "@arcjet/headers";
import type { Client } from "@arcjet/protocol/client.js";
import arcjet, {
  type ArcjetConclusion,
  type ArcjetContext,
  type ArcjetRequest,
  type ArcjetRule,
  ArcjetAllowDecision,
  ArcjetDenyDecision,
  ArcjetReason,
  ArcjetRuleResult,
} from "../index.js";

const exampleKey = "ajkey_yourkey";

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

// See: <https://github.com/vercel/otel/blob/bce5ea29/packages/otel/src/vercel-request-context/api.ts>
interface GlobalWithReader {
  [vercelRequestContext]?: Reader | undefined;
}

interface Reader {
  get(): RequestContext | undefined;
}

interface RequestContext {
  waitUntil(until: Promise<unknown> | (() => Promise<unknown>)): void;
}

const vercelRequestContext = Symbol.for("@vercel/request-context");

test("`arcjet`", async function (t) {
  await t.test("should throw w/o `log`", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      arcjet({});
    }, /Log is required/);
  });

  // TODO(#207): Remove this once we default the client in the main SDK
  await t.test("should throw w/o `client`", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      arcjet({ log: console });
    }, /Client is required/);
  });

  await t.test("should throw w/o `rules`", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      arcjet({ client: createLocalClient(), log: console });
    }, /Rules are required/);
  });

  // The `key` passed to `protect` is used.
  await t.test("should work w/o `key`", async function () {
    // @ts-expect-error: test runtime behavior.
    const instance = arcjet({
      client: createLocalClient(),
      log: console,
      rules: [],
    });
    assert.equal("protect" in instance, true);
    assert.equal("withRule" in instance, true);
  });

  await t.test("should work w/ `key`", async function () {
    const instance = arcjet({
      client: createLocalClient(),
      key: exampleKey,
      log: console,
      rules: [],
    });
    assert.equal("protect" in instance, true);
    assert.equal("withRule" in instance, true);
  });

  await t.test("`.protect()`", async function (t) {
    await t.test(
      "should yield an error decision w/o parameters",
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
          rules: [],
        });
        // @ts-expect-error: test runtime behavior.
        const decision = await instance.protect();

        assert.equal(decision.isErrored(), true);
        assert.equal(decision.reason.isError(), true);
        assert.equal(
          // @ts-expect-error: TODO(#4452): `message` should be accessible.
          decision.reason.message,
          "Failed to build fingerprint - unable to generate fingerprint: error generating identifier - requested `ip` characteristic but the `ip` value was empty",
        );
        assert.deepEqual(errorParameters, [
          {
            error:
              "unable to generate fingerprint: error generating identifier - requested `ip` characteristic but the `ip` value was empty",
          },
          "Failed to build fingerprint. Please verify your Characteristics.",
        ]);
      },
    );

    await t.test(
      "should yield an allow decision w/ just an `ip`",
      async function () {
        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [],
        });
        // @ts-expect-error: test runtime behavior.
        const decision = await instance.protect({}, { ip: "1.1.1.1" });

        assert.equal(decision.isAllowed(), true);
      },
    );

    await t.test(
      "should call `validate` and `protect` on rules",
      async function () {
        const calls: Array<string> = [];
        // TODO: should be possible to pass directly w/o type annotation.
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect() {
            calls.push("protect");
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
          validate() {
            calls.push("validate");
          },
          version: 0,
        };
        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.deepEqual(calls, ["validate", "protect"]);
        assert.equal(decision.conclusion, "ALLOW");
      },
    );

    await t.test(
      "should yield a deny decision if a rule denies",
      async function () {
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect() {
            return new ArcjetRuleResult({
              conclusion: "DENY",
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
        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "DENY");
      },
    );

    await t.test("should shortcircuit when a rule denies", async function () {
      const calls: Array<string> = [];
      const after: ArcjetRule<{}> = {
        mode: "LIVE",
        priority: 1,
        async protect() {
          calls.push("after:protect");
          return new ArcjetRuleResult({
            conclusion: "DENY",
            fingerprint: "",
            reason: new ArcjetReason(),
            ruleId: "",
            state: "RUN",
            ttl: 0,
          });
        },
        type: "",
        validate() {
          calls.push("after:validate");
        },
        version: 0,
      };
      const deny: ArcjetRule<{}> = {
        mode: "LIVE",
        priority: 1,
        async protect() {
          calls.push("deny:protect");
          return new ArcjetRuleResult({
            conclusion: "DENY",
            fingerprint: "",
            reason: new ArcjetReason(),
            ruleId: "",
            state: "RUN",
            ttl: 0,
          });
        },
        type: "",
        validate() {
          calls.push("deny:validate");
        },
        version: 0,
      };

      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [[deny, after]],
      });

      const _ = await instance.protect(createContext(), createRequest());

      // Neither `validate` nor `protect` called on `after` rule.
      assert.deepEqual(calls, ["deny:validate", "deny:protect"]);
    });

    await t.test(
      "should call rules from lower priority numbers to higher",
      async function () {
        const calls: Array<number> = [];
        const rules = [3, 1, 2, 7, 2].map(function (priority): ArcjetRule<{}> {
          return {
            mode: "LIVE",
            priority,
            async protect() {
              calls.push(priority);
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
        });

        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [rules],
        });

        const _ = await instance.protect(createContext(), createRequest());

        assert.deepEqual(calls, [1, 2, 2, 3, 7]);
      },
    );

    await t.test(
      "should log but otherwise ignore a rule w/o `validate`",
      async function () {
        let called = false;
        let errorParameters: unknown;
        // @ts-expect-error: test runtime behavior.
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect() {
            called = true;
            return new ArcjetRuleResult({
              conclusion: "DENY",
              fingerprint: "",
              reason: new ArcjetReason(),
              ruleId: "",
              state: "RUN",
              ttl: 0,
            });
          },
          type: "",
          version: 0,
        };
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
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.equal(called, false);
        assert.deepEqual(errorParameters, [
          "Failure running rule: %s due to %s",
          "",
          "rule must have a `validate` function",
        ]);
      },
    );

    await t.test(
      "should log but otherwise ignore a rule w/o `protect`",
      async function () {
        let called = false;
        let errorParameters: unknown;
        // @ts-expect-error: test runtime behavior.
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          type: "",
          validate() {
            called = true;
          },
          version: 0,
        };
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
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.equal(called, true);
        assert.deepEqual(errorParameters, [
          "Failure running rule: %s due to %s",
          "",
          "rule must have a `protect` function",
        ]);
      },
    );

    await t.test(
      "should ignore a rule whose `protect` does not yield a result",
      async function () {
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          // @ts-expect-error: test runtime behavior.
          protect() {},
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
      },
    );

    await t.test(
      "should log but otherwise ignore a rule whose `protect` rejects",
      async function () {
        let errorParameters: unknown;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect() {
            throw new Error("Boom");
          },
          type: "",
          validate() {},
          version: 0,
        };
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
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.deepEqual(errorParameters, [
          "Failure running rule: %s due to %s",
          "",
          "Boom",
        ]);
      },
    );

    await t.test(
      "should log but otherwise ignore a rule whose `protect` rejects a string",
      async function () {
        let errorParameters: unknown;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect() {
            throw "Boom";
          },
          type: "",
          validate() {},
          version: 0,
        };
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
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.deepEqual(errorParameters, [
          "Failure running rule: %s due to %s",
          "",
          "Boom",
        ]);
      },
    );

    await t.test(
      "should log but otherwise ignore a rule whose `protect` rejects a non-error non-string",
      async function () {
        let errorParameters: unknown;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect() {
            throw 1;
          },
          type: "",
          validate() {},
          version: 0,
        };
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
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.deepEqual(errorParameters, [
          "Failure running rule: %s due to %s",
          "",
          "Unknown problem",
        ]);
      },
    );

    await t.test("should work w/ 10 rules", async function () {
      let calls = 0;
      const rules = Array.from({ length: 10 }, function (): ArcjetRule<{}> {
        return {
          mode: "LIVE",
          priority: 1,
          async protect() {
            calls++;
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
      });
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [rules],
      });
      const decision = await instance.protect(createContext(), createRequest());

      assert.equal(decision.conclusion, "ALLOW");
      assert.equal(rules.length, 10);
      assert.equal(calls, 10);
    });

    await t.test(
      "should log and yield an error decision w/ 11 rules",
      async function () {
        let calls = 0;
        let errorParameters: unknown;
        const rules = Array.from({ length: 11 }, function (): ArcjetRule<{}> {
          return {
            mode: "LIVE",
            priority: 1,
            async protect() {
              calls++;
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
        });
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
          rules: [rules],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ERROR");
        assert.deepEqual(errorParameters, [
          "Failure running rules. Only 10 rules may be specified.",
        ]);
        assert.equal(rules.length, 11);
        assert.equal(calls, 0);
      },
    );

    await t.test(
      "should pass request fields to `validate` and `protect`",
      async function () {
        let protectDetails: unknown;
        let validateDetails: unknown;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(_context, details) {
            protectDetails = details;
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
          validate(_context, details) {
            validateDetails = details;
          },
          version: 0,
        };

        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });

        const _ = await instance.protect(createContext(), {
          cookies: "",
          email: "alice@arcjet.com",
          headers: {
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
          },
          host: "localhost:3000",
          ip: "127.0.0.1",
          method: "GET",
          // Unknown fields directly on the root.
          other: "field",
          path: "/bot-protection/quick-start",
          protocol: "http:",
          query: "",
        });

        assert.deepEqual(requestAsJson(validateDetails), {
          cookies: "",
          email: "alice@arcjet.com",
          // Unknown fields are moved onto `extra`.
          extra: { other: "field" },
          headers: {
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
          },
          host: "localhost:3000",
          ip: "127.0.0.1",
          method: "GET",
          path: "/bot-protection/quick-start",
          protocol: "http:",
          query: "",
        });
        assert.equal(protectDetails, validateDetails);
      },
    );

    await t.test(
      "should ignore non-string `email` request fields",
      async function () {
        let email: unknown;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(_context, details) {
            email = details.email;
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

        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });

        const _ = await instance.protect(createContext(), {
          ...createRequest(),
          email: 1,
        });

        assert.equal(email, undefined);
      },
    );

    await t.test(
      "should support `headers` as a plain object",
      async function () {
        let headers: unknown;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(_context, details) {
            assert.ok(details.headers instanceof ArcjetHeaders);
            headers = Object.fromEntries(details.headers);
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

        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });

        const _ = await instance.protect(createContext(), {
          ...createRequest(),
          headers: { "user-agent": "curl/8.1.2" },
        });

        assert.deepEqual(headers, { "user-agent": "curl/8.1.2" });
      },
    );

    await t.test("should support `headers` w/ array values", async function () {
      let headers: unknown;
      const rule: ArcjetRule<{}> = {
        mode: "LIVE",
        priority: 1,
        async protect(_context, details) {
          assert.ok(details.headers instanceof ArcjetHeaders);
          headers = Object.fromEntries(details.headers);
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

      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [[rule]],
      });

      const _ = await instance.protect(createContext(), {
        ...createRequest(),
        headers: { "user-agent": ["curl/8.1.2", "something"] },
      });

      assert.deepEqual(headers, { "user-agent": "curl/8.1.2, something" });
    });

    await t.test(
      "should support `headers` as a `Headers` instance",
      async function () {
        let headers: unknown;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(_context, details) {
            assert.ok(details.headers instanceof ArcjetHeaders);
            headers = Object.fromEntries(details.headers);
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

        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });

        const _ = await instance.protect(createContext(), {
          ...createRequest(),
          headers: new Headers({ "user-agent": "curl/8.1.2" }),
        });

        assert.deepEqual(headers, { "user-agent": "curl/8.1.2" });
      },
    );

    await t.test(
      "should support unknown fields w/ different types",
      async function () {
        let extra: unknown;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(_context, details) {
            extra = details.extra;
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

        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });

        const _ = await instance.protect(createContext(), {
          ...createRequest(),
          array: [],
          bigint: 1n,
          booleanFalse: false,
          booleanTrue: true,
          date: new Date(),
          null: null,
          number: 1,
          object: {},
          string: "a",
          symbol: Symbol(""),
          undefined: undefined,
        });

        assert.deepEqual(extra, {
          array: "<unsupported value>",
          bigint: "<unsupported value>",
          booleanFalse: "false",
          booleanTrue: "true",
          date: "<unsupported value>",
          null: "<unsupported value>",
          number: "1",
          object: "<unsupported value>",
          string: "a",
          symbol: "<unsupported value>",
          undefined: "<unsupported value>",
        });
      },
    );

    await t.test("should cache a deny result w/ `ttl`", async function () {
      const fingerprint = "a";
      const ruleId = "b";
      let decideCalls = 0;
      let reportCalls = 0;
      let cacheHits = 0;
      const rule: ArcjetRule<{}> = {
        mode: "LIVE",
        priority: 1,
        async protect(context) {
          const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
          if (cached) {
            cacheHits++;
            // TODO: arcjet always uses this type to set things in the cache, so it should not be `unknown`.
            const entry = cached as {
              conclusion: ArcjetConclusion;
              reason: ArcjetReason;
            };
            return new ArcjetRuleResult({
              conclusion: entry.conclusion,
              fingerprint,
              reason: entry.reason,
              ruleId,
              state: "CACHED",
              ttl,
            });
          }
          return new ArcjetRuleResult({
            conclusion: "DENY",
            fingerprint,
            reason: new ArcjetReason(),
            ruleId,
            state: "RUN",
            ttl: 10,
          });
        },
        type: "",
        validate() {},
        version: 0,
      };
      const instance = arcjet({
        client: {
          async decide() {
            decideCalls++;
            return new ArcjetAllowDecision({
              reason: new ArcjetReason(),
              results: [],
              ttl: 0,
            });
          },
          report() {
            reportCalls++;
          },
        },
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [[rule]],
      });
      const decision = await instance.protect(createContext(), createRequest());

      assert.equal(decision.conclusion, "DENY");
      assert.equal(cacheHits, 0);
      assert.equal(decideCalls, 0);
      assert.equal(reportCalls, 1);

      const otherDecision = await instance.protect(
        createContext(),
        createRequest(),
      );
      assert.equal(otherDecision.conclusion, "DENY");
      assert.equal(cacheHits, 1);
      assert.equal(decideCalls, 0);
      assert.equal(reportCalls, 2);
    });

    await t.test(
      "should not cache an allow result w/ `ttl`",
      async function () {
        const fingerprint = "a";
        const ruleId = "b";
        let decideCalls = 0;
        let reportCalls = 0;
        let cacheHits = 0;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(context) {
            const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
            if (cached) {
              cacheHits++;
              // TODO: arcjet always uses this type to set things in the cache, so it should not be `unknown`.
              const entry = cached as {
                conclusion: ArcjetConclusion;
                reason: ArcjetReason;
              };
              return new ArcjetRuleResult({
                conclusion: entry.conclusion,
                fingerprint,
                reason: entry.reason,
                ruleId,
                state: "CACHED",
                ttl,
              });
            }
            return new ArcjetRuleResult({
              conclusion: "ALLOW",
              fingerprint,
              reason: new ArcjetReason(),
              ruleId,
              state: "RUN",
              ttl: 10,
            });
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              decideCalls++;
              return new ArcjetAllowDecision({
                reason: new ArcjetReason(),
                results: [],
                ttl: 0,
              });
            },
            report() {
              reportCalls++;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 1);
        assert.equal(reportCalls, 0);

        const otherDecision = await instance.protect(
          createContext(),
          createRequest(),
        );
        assert.equal(otherDecision.conclusion, "ALLOW");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 2);
        assert.equal(reportCalls, 0);
      },
    );

    await t.test("should not cache a deny result w/o `ttl`", async function () {
      const fingerprint = "a";
      const ruleId = "b";
      let decideCalls = 0;
      let reportCalls = 0;
      let cacheHits = 0;
      const rule: ArcjetRule<{}> = {
        mode: "LIVE",
        priority: 1,
        async protect(context) {
          const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
          if (cached) {
            cacheHits++;
            // TODO: arcjet always uses this type to set things in the cache, so it should not be `unknown`.
            const entry = cached as {
              conclusion: ArcjetConclusion;
              reason: ArcjetReason;
            };
            return new ArcjetRuleResult({
              conclusion: entry.conclusion,
              fingerprint,
              reason: entry.reason,
              ruleId,
              state: "CACHED",
              ttl,
            });
          }
          return new ArcjetRuleResult({
            conclusion: "DENY",
            fingerprint,
            reason: new ArcjetReason(),
            ruleId,
            state: "RUN",
            ttl: 0,
          });
        },
        type: "",
        validate() {},
        version: 0,
      };
      const instance = arcjet({
        client: {
          async decide() {
            decideCalls++;
            return new ArcjetAllowDecision({
              reason: new ArcjetReason(),
              results: [],
              ttl: 0,
            });
          },
          report() {
            reportCalls++;
          },
        },
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [[rule]],
      });
      const decision = await instance.protect(createContext(), createRequest());

      assert.equal(decision.conclusion, "DENY");
      assert.equal(cacheHits, 0);
      assert.equal(decideCalls, 0);
      assert.equal(reportCalls, 1);

      const otherDecision = await instance.protect(
        createContext(),
        createRequest(),
      );
      assert.equal(otherDecision.conclusion, "DENY");
      assert.equal(cacheHits, 0);
      assert.equal(decideCalls, 0);
      assert.equal(reportCalls, 2);
    });

    await t.test(
      "should log and not cache a dry run deny result w/ `ttl`",
      async function () {
        const fingerprint = "a";
        const ruleId = "b";
        let decideCalls = 0;
        let reportCalls = 0;
        let cacheHits = 0;
        let warnParameters: unknown;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(context) {
            const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
            if (cached) {
              cacheHits++;
              // TODO: arcjet always uses this type to set things in the cache, so it should not be `unknown`.
              const entry = cached as {
                conclusion: ArcjetConclusion;
                reason: ArcjetReason;
              };
              return new ArcjetRuleResult({
                conclusion: entry.conclusion,
                fingerprint,
                reason: entry.reason,
                ruleId,
                state: "CACHED",
                ttl,
              });
            }
            return new ArcjetRuleResult({
              conclusion: "DENY",
              fingerprint,
              reason: new ArcjetReason(),
              ruleId,
              state: "DRY_RUN",
              ttl: 10,
            });
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              decideCalls++;
              return new ArcjetAllowDecision({
                reason: new ArcjetReason(),
                results: [],
                ttl: 0,
              });
            },
            report() {
              reportCalls++;
            },
          },
          key: exampleKey,
          log: {
            ...console,
            debug() {},
            warn(...parameters) {
              warnParameters = parameters;
            },
          },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 1);
        assert.equal(reportCalls, 0);
        assert.deepEqual(warnParameters, [
          'Dry run mode is enabled for "%s" rule. Overriding decision. Decision was: DENY',
          "",
        ]);
        warnParameters = undefined;

        const otherDecision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(otherDecision.conclusion, "ALLOW");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 2);
        assert.equal(reportCalls, 0);
        assert.deepEqual(warnParameters, [
          'Dry run mode is enabled for "%s" rule. Overriding decision. Decision was: DENY',
          "",
        ]);
      },
    );

    await t.test("should call `client.decide` normally", async function () {
      let decideCalled = false;
      let reportCalled = false;
      const instance = arcjet({
        client: {
          async decide() {
            decideCalled = true;
            return new ArcjetAllowDecision({
              reason: new ArcjetReason(),
              results: [],
              ttl: 0,
            });
          },
          report() {
            reportCalled = true;
          },
        },
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [],
      });
      const decision = await instance.protect(createContext(), createRequest());

      assert.equal(decision.conclusion, "ALLOW");
      assert.equal(decideCalled, true);
      assert.equal(reportCalled, false);
    });

    await t.test(
      "should call `client.decide` if a `protect` rejects",
      async function () {
        let decideCalled = false;
        let errorParameters: unknown;
        let reportCalled = false;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect() {
            throw new Error("Boom");
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              decideCalled = true;
              return new ArcjetAllowDecision({
                reason: new ArcjetReason(),
                results: [],
                ttl: 0,
              });
            },
            report() {
              reportCalled = true;
            },
          },
          key: exampleKey,
          log: {
            ...console,
            debug() {},
            error(...parameters) {
              errorParameters = parameters;
            },
          },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.equal(decideCalled, true);
        assert.equal(reportCalled, false);
        assert.deepEqual(errorParameters, [
          "Failure running rule: %s due to %s",
          "",
          "Boom",
        ]);
      },
    );

    await t.test("should call `client.decide` w/ rules", async function () {
      let decideRules: unknown;
      const rule: ArcjetRule<{}> = {
        mode: "LIVE",
        priority: 1,
        async protect() {
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
      const instance = arcjet({
        client: {
          async decide(_context, _details, rules) {
            decideRules = rules;
            return new ArcjetAllowDecision({
              reason: new ArcjetReason(),
              results: [],
              ttl: 0,
            });
          },
          report() {},
        },
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [[rule]],
      });
      const decision = await instance.protect(createContext(), createRequest());

      assert.equal(decision.conclusion, "ALLOW");
      assert.deepEqual(decideRules, [rule]);
    });

    await t.test(
      "should call `client.decide` w/ `key` passed to `protect`, not `key` passed to `arcjet`",
      async function () {
        let decideKey: unknown;
        const instance = arcjet({
          client: {
            async decide(context) {
              decideKey = context.key;
              return new ArcjetAllowDecision({
                reason: new ArcjetReason(),
                results: [],
                ttl: 0,
              });
            },
            report() {},
          },
          key: "a",
          log: { ...console, debug() {} },
          rules: [],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.equal(decideKey, "b");
      },
    );

    await t.test(
      "should call `client.decide` w/ `waitUntil` at the `@vercel/request-context` symbol",
      async function () {
        const global = globalThis as GlobalWithReader;
        const currentVercelRequestContext = global[vercelRequestContext];
        let decideWaitUntil: unknown;
        let reportCalled = false;
        const instance = arcjet({
          client: {
            async decide(context) {
              decideWaitUntil = context.waitUntil;
              return new ArcjetAllowDecision({
                reason: new ArcjetReason(),
                results: [],
                ttl: 0,
              });
            },
            report() {
              reportCalled = true;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [],
        });

        global[vercelRequestContext] = {
          get() {
            return { waitUntil };
          },
        };

        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        global[vercelRequestContext] = currentVercelRequestContext;

        assert.equal(decideWaitUntil, waitUntil);
        assert.equal(decision.conclusion, "ALLOW");
        assert.equal(reportCalled, false);

        function waitUntil() {
          throw new Error("unreachable");
        }
      },
    );

    await t.test(
      "should call `client.report` if a local rule yields a deny decision",
      async function () {
        let decideCalled = false;
        let reportCalled = false;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect() {
            return new ArcjetRuleResult({
              conclusion: "DENY",
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
        const instance = arcjet({
          client: {
            async decide() {
              decideCalled = true;
              return new ArcjetAllowDecision({
                reason: new ArcjetReason(),
                results: [],
                ttl: 0,
              });
            },
            report() {
              reportCalled = true;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "DENY");
        assert.equal(decideCalled, false);
        assert.equal(reportCalled, true);
      },
    );

    await t.test(
      "should call `client.report` w/ rules and results",
      async function () {
        let reportDecisionResults: unknown;
        let reportResults: unknown;
        const ruleResult = new ArcjetRuleResult({
          conclusion: "DENY",
          fingerprint: "a",
          reason: new ArcjetReason(),
          ruleId: "b",
          state: "RUN",
          ttl: 0,
        });
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect() {
            return ruleResult;
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              return new ArcjetAllowDecision({
                reason: new ArcjetReason(),
                results: [],
                ttl: 0,
              });
            },
            report(_context, _details, decision, rules) {
              reportDecisionResults = decision.results;
              reportResults = rules;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "DENY");
        assert.deepEqual(reportDecisionResults, [ruleResult]);
        assert.deepEqual(reportResults, [rule]);
      },
    );

    await t.test(
      "should call `client.report` w/ `waitUntil` at the `@vercel/request-context` symbol",
      async function () {
        const global = globalThis as GlobalWithReader;
        const currentVercelRequestContext = global[vercelRequestContext];
        let reportWaitUntil: unknown;
        let decideCalled = false;
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect() {
            return new ArcjetRuleResult({
              conclusion: "DENY",
              fingerprint: "a",
              reason: new ArcjetReason(),
              ruleId: "b",
              state: "RUN",
              ttl: 0,
            });
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              decideCalled = true;
              return new ArcjetAllowDecision({
                reason: new ArcjetReason(),
                results: [],
                ttl: 0,
              });
            },
            report(context) {
              reportWaitUntil = context.waitUntil;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });

        global[vercelRequestContext] = {
          get() {
            return { waitUntil };
          },
        };

        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        global[vercelRequestContext] = currentVercelRequestContext;

        assert.equal(decideCalled, false);
        assert.equal(decision.conclusion, "DENY");
        assert.equal(reportWaitUntil, waitUntil);

        function waitUntil() {
          throw new Error("unreachable");
        }
      },
    );

    await t.test(
      "should log and call `client.report` if `client.decide` throws",
      async function () {
        let infoParameters: unknown;
        let reportCalled = false;
        const instance = arcjet({
          client: {
            async decide() {
              throw new Error("Boom");
            },
            report() {
              reportCalled = true;
            },
          },
          key: exampleKey,
          log: {
            ...console,
            debug() {},
            info(...parameters) {
              infoParameters = parameters;
            },
          },
          rules: [],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ERROR");
        assert.equal(reportCalled, true);
        assert.deepEqual(infoParameters, [
          "Encountered problem getting remote decision: %s",
          "Boom",
        ]);
      },
    );

    await t.test(
      "should cache a deny result on a deny decision both w/ `ttl`",
      async function () {
        const fingerprint = "a";
        const ruleId = "b";
        let decideCalls = 0;
        let reportCalls = 0;
        let cacheHits = 0;
        // There still needs to be a rule to get things from the cache.
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(context) {
            const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
            if (cached) {
              cacheHits++;
              // TODO: arcjet always uses this type to set things in the cache, so it should not be `unknown`.
              const entry = cached as {
                conclusion: ArcjetConclusion;
                reason: ArcjetReason;
              };
              return new ArcjetRuleResult({
                conclusion: entry.conclusion,
                fingerprint,
                reason: entry.reason,
                ruleId,
                state: "CACHED",
                ttl,
              });
            }
            return new ArcjetRuleResult({
              conclusion: "ALLOW",
              fingerprint,
              reason: new ArcjetReason(),
              ruleId,
              state: "RUN",
              ttl: 0,
            });
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              decideCalls++;
              return new ArcjetDenyDecision({
                reason: new ArcjetReason(),
                results: [
                  new ArcjetRuleResult({
                    conclusion: "DENY",
                    fingerprint,
                    reason: new ArcjetReason(),
                    ruleId,
                    state: "RUN",
                    ttl: 10,
                  }),
                ],
                ttl: 10,
              });
            },
            report() {
              reportCalls++;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "DENY");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 1);
        assert.equal(reportCalls, 0);

        const otherDecision = await instance.protect(
          createContext(),
          createRequest(),
        );
        assert.equal(otherDecision.conclusion, "DENY");
        assert.equal(cacheHits, 1);
        assert.equal(decideCalls, 1);
        assert.equal(reportCalls, 1);
      },
    );

    await t.test(
      "should not cache an allow result on a deny decision both w/ `ttl`",
      async function () {
        const fingerprint = "a";
        const ruleId = "b";
        let decideCalls = 0;
        let reportCalls = 0;
        let cacheHits = 0;
        // There still needs to be a rule to get things from the cache.
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(context) {
            const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
            if (cached) {
              cacheHits++;
              // TODO: arcjet always uses this type to set things in the cache, so it should not be `unknown`.
              const entry = cached as {
                conclusion: ArcjetConclusion;
                reason: ArcjetReason;
              };
              return new ArcjetRuleResult({
                conclusion: entry.conclusion,
                fingerprint,
                reason: entry.reason,
                ruleId,
                state: "CACHED",
                ttl,
              });
            }
            return new ArcjetRuleResult({
              conclusion: "ALLOW",
              fingerprint,
              reason: new ArcjetReason(),
              ruleId,
              state: "RUN",
              ttl: 0,
            });
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              decideCalls++;
              return new ArcjetDenyDecision({
                reason: new ArcjetReason(),
                results: [
                  new ArcjetRuleResult({
                    conclusion: "ALLOW",
                    fingerprint,
                    reason: new ArcjetReason(),
                    ruleId,
                    state: "RUN",
                    ttl: 10,
                  }),
                ],
                ttl: 10,
              });
            },
            report() {
              reportCalls++;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "DENY");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 1);
        assert.equal(reportCalls, 0);

        const otherDecision = await instance.protect(
          createContext(),
          createRequest(),
        );
        assert.equal(otherDecision.conclusion, "DENY");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 2);
        assert.equal(reportCalls, 0);
      },
    );

    await t.test(
      "should not cache a deny result on an allow decision both w/ `ttl`",
      async function () {
        const fingerprint = "a";
        const ruleId = "b";
        let decideCalls = 0;
        let reportCalls = 0;
        let cacheHits = 0;
        // There still needs to be a rule to get things from the cache.
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(context) {
            const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
            if (cached) {
              cacheHits++;
              // TODO: arcjet always uses this type to set things in the cache, so it should not be `unknown`.
              const entry = cached as {
                conclusion: ArcjetConclusion;
                reason: ArcjetReason;
              };
              return new ArcjetRuleResult({
                conclusion: entry.conclusion,
                fingerprint,
                reason: entry.reason,
                ruleId,
                state: "CACHED",
                ttl,
              });
            }
            return new ArcjetRuleResult({
              conclusion: "ALLOW",
              fingerprint,
              reason: new ArcjetReason(),
              ruleId,
              state: "RUN",
              ttl: 0,
            });
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              decideCalls++;
              return new ArcjetAllowDecision({
                reason: new ArcjetReason(),
                results: [
                  new ArcjetRuleResult({
                    conclusion: "DENY",
                    fingerprint,
                    reason: new ArcjetReason(),
                    ruleId,
                    state: "RUN",
                    ttl: 10,
                  }),
                ],
                ttl: 10,
              });
            },
            report() {
              reportCalls++;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 1);
        assert.equal(reportCalls, 0);

        const otherDecision = await instance.protect(
          createContext(),
          createRequest(),
        );
        assert.equal(otherDecision.conclusion, "ALLOW");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 2);
        assert.equal(reportCalls, 0);
      },
    );

    await t.test(
      "should not cache a deny result on an allow decision both w/ `ttl`",
      async function () {
        const fingerprint = "a";
        const ruleId = "b";
        let decideCalls = 0;
        let reportCalls = 0;
        let cacheHits = 0;
        // There still needs to be a rule to get things from the cache.
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(context) {
            const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
            if (cached) {
              cacheHits++;
              // TODO: arcjet always uses this type to set things in the cache, so it should not be `unknown`.
              const entry = cached as {
                conclusion: ArcjetConclusion;
                reason: ArcjetReason;
              };
              return new ArcjetRuleResult({
                conclusion: entry.conclusion,
                fingerprint,
                reason: entry.reason,
                ruleId,
                state: "CACHED",
                ttl,
              });
            }
            return new ArcjetRuleResult({
              conclusion: "ALLOW",
              fingerprint,
              reason: new ArcjetReason(),
              ruleId,
              state: "RUN",
              ttl: 0,
            });
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              decideCalls++;
              return new ArcjetAllowDecision({
                reason: new ArcjetReason(),
                results: [
                  new ArcjetRuleResult({
                    conclusion: "DENY",
                    fingerprint,
                    reason: new ArcjetReason(),
                    ruleId,
                    state: "RUN",
                    ttl: 10,
                  }),
                ],
                ttl: 10,
              });
            },
            report() {
              reportCalls++;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "ALLOW");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 1);
        assert.equal(reportCalls, 0);

        const otherDecision = await instance.protect(
          createContext(),
          createRequest(),
        );
        assert.equal(otherDecision.conclusion, "ALLOW");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 2);
        assert.equal(reportCalls, 0);
      },
    );

    await t.test(
      "should not cache a deny result w/o `ttl` on a deny decision w/ `ttl`",
      async function () {
        const fingerprint = "a";
        const ruleId = "b";
        let decideCalls = 0;
        let reportCalls = 0;
        let cacheHits = 0;
        // There still needs to be a rule to get things from the cache.
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(context) {
            const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
            if (cached) {
              cacheHits++;
              // TODO: arcjet always uses this type to set things in the cache, so it should not be `unknown`.
              const entry = cached as {
                conclusion: ArcjetConclusion;
                reason: ArcjetReason;
              };
              return new ArcjetRuleResult({
                conclusion: entry.conclusion,
                fingerprint,
                reason: entry.reason,
                ruleId,
                state: "CACHED",
                ttl,
              });
            }
            return new ArcjetRuleResult({
              conclusion: "ALLOW",
              fingerprint,
              reason: new ArcjetReason(),
              ruleId,
              state: "RUN",
              ttl: 0,
            });
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              decideCalls++;
              return new ArcjetDenyDecision({
                reason: new ArcjetReason(),
                results: [
                  new ArcjetRuleResult({
                    conclusion: "DENY",
                    fingerprint,
                    reason: new ArcjetReason(),
                    ruleId,
                    state: "RUN",
                    ttl: 0,
                  }),
                ],
                ttl: 10,
              });
            },
            report() {
              reportCalls++;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "DENY");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 1);
        assert.equal(reportCalls, 0);

        const otherDecision = await instance.protect(
          createContext(),
          createRequest(),
        );
        assert.equal(otherDecision.conclusion, "DENY");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 2);
        assert.equal(reportCalls, 0);
      },
    );

    await t.test(
      "should not cache a deny result w/ `ttl` on a deny decision w/o `ttl`",
      async function () {
        const fingerprint = "a";
        const ruleId = "b";
        let decideCalls = 0;
        let reportCalls = 0;
        let cacheHits = 0;
        // There still needs to be a rule to get things from the cache.
        const rule: ArcjetRule<{}> = {
          mode: "LIVE",
          priority: 1,
          async protect(context) {
            const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
            if (cached) {
              cacheHits++;
              // TODO: arcjet always uses this type to set things in the cache, so it should not be `unknown`.
              const entry = cached as {
                conclusion: ArcjetConclusion;
                reason: ArcjetReason;
              };
              return new ArcjetRuleResult({
                conclusion: entry.conclusion,
                fingerprint,
                reason: entry.reason,
                ruleId,
                state: "CACHED",
                ttl,
              });
            }
            return new ArcjetRuleResult({
              conclusion: "ALLOW",
              fingerprint,
              reason: new ArcjetReason(),
              ruleId,
              state: "RUN",
              ttl: 0,
            });
          },
          type: "",
          validate() {},
          version: 0,
        };
        const instance = arcjet({
          client: {
            async decide() {
              decideCalls++;
              return new ArcjetDenyDecision({
                reason: new ArcjetReason(),
                results: [
                  new ArcjetRuleResult({
                    conclusion: "DENY",
                    fingerprint,
                    reason: new ArcjetReason(),
                    ruleId,
                    state: "RUN",
                    ttl: 10,
                  }),
                ],
                ttl: 0,
              });
            },
            report() {
              reportCalls++;
            },
          },
          key: exampleKey,
          log: { ...console, debug() {} },
          rules: [[rule]],
        });
        const decision = await instance.protect(
          createContext(),
          createRequest(),
        );

        assert.equal(decision.conclusion, "DENY");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 1);
        assert.equal(reportCalls, 0);

        const otherDecision = await instance.protect(
          createContext(),
          createRequest(),
        );
        assert.equal(otherDecision.conclusion, "DENY");
        assert.equal(cacheHits, 0);
        assert.equal(decideCalls, 2);
        assert.equal(reportCalls, 0);
      },
    );
  });

  await t.test("`.withRule()`", async function (t) {
    await t.test("should work", async function () {
      let calls = 0;
      const rule: ArcjetRule<{}> = {
        mode: "LIVE",
        priority: 1,
        async protect() {
          calls++;
          return new ArcjetRuleResult({
            conclusion: "DENY",
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
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [],
      });
      const decision = await instance.protect(createContext(), createRequest());
      assert.equal(calls, 0);

      const otherInstance = instance.withRule([rule]);
      const otherDecision = await otherInstance.protect(
        createContext(),
        createRequest(),
      );
      assert.equal(calls, 1);
      assert.equal(decision.conclusion, "ALLOW");
      assert.equal(otherDecision.conclusion, "DENY");
    });
  });
});

/**
 * Create empty values for context.
 *
 * @returns
 *   Context.
 */
function createContext(): ArcjetContext {
  return {
    cache: new MemoryCache(),
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
 * Create empty values for details.
 *
 * @returns
 *   Details.
 */
function createRequest(): ArcjetRequest<{}> {
  return {
    cookies: "NEXT_LOCALE=en-US",
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

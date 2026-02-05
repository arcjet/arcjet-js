import assert from "node:assert/strict";
import test from "node:test";
import { MemoryCache } from "@arcjet/cache";
import type { Client } from "@arcjet/protocol/client.js";
import arcjet, {
  type ArcjetContext,
  type ArcjetRequest,
  type ArcjetRule,
  type Arcjet,
  ArcjetAllowDecision,
  ArcjetReason,
  ArcjetRuleResult,
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

const exampleKey = "ajkey_yourkey";

// Adding rules (on construction or `withRule`) is complex because these rules
// can request particular properties.
// Additionally, `characteristics` (on construction) required particular
// properties.
// In Arcjet core (this package) all these fields are at the root of the
// object passed to `protect`, they are then put onto `extra` before
// passing them to rules.
// These values are also turned into `string`, which means that rules
// *request* a particular type that a user must pass but *receive* `string`s.
// These nuances are tested here, separately.
test("Properties", async function (t) {
  await t.test("should infer no properties w/o rules", async function () {
    const instance = arcjet({
      client: createLocalClient(),
      key: exampleKey,
      log: { ...console, debug() {} },
      rules: [],
    });
    const decision = await instance.protect(createContext(), createRequest());
    type PropertiesWithoutRules = Assert<IsEqual<Props<typeof instance>, {}>>;
    assert.equal(decision.conclusion, "ALLOW");
  });

  await t.test(
    "should infer no properties w/ a rule defined w/o properties",
    async function () {
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
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [[rule]],
      });
      const decision = await instance.protect(createContext(), createRequest());
      type PropertiesWithoutProperties = Assert<
        IsEqual<Props<typeof instance>, {}>
      >;
      assert.equal(decision.conclusion, "ALLOW");

      const withRuleInstance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [],
      }).withRule([rule]);
      const withRuleDecision = await withRuleInstance.protect(
        createContext(),
        createRequest(),
      );
      type WithRulePropertiesWithoutProperties = Assert<
        IsEqual<Props<typeof withRuleInstance>, {}>
      >;
      assert.equal(withRuleDecision.conclusion, "ALLOW");
    },
  );

  await t.test(
    "should infer properties w/ a rule defined w/ properties",
    async function () {
      let errorParameters: unknown;
      const rule: ArcjetRule<{ a: string; b: number; c: boolean }> = {
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
        validate(_context, details) {
          if (!details || typeof details !== "object") {
            throw new Error("Expected `details` object");
          }
          if (
            !("extra" in details) ||
            !details.extra ||
            typeof details.extra !== "object"
          ) {
            throw new Error("Expected `details.extra` object");
          }
          if (!("a" in details.extra) || typeof details.extra.a !== "string") {
            throw new Error("Expected `details.extra.a` string");
          }
          // Extra fields are always turned into strings.
          if (!("b" in details.extra) || typeof details.extra.b !== "string") {
            throw new Error("Expected `details.extra.b` number");
          }
          if (!("c" in details.extra) || typeof details.extra.c !== "string") {
            throw new Error("Expected `details.extra.c` boolean");
          }
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

      type PropertiesWithProperties = Assert<
        IsEqual<Props<typeof instance>, { a: string; b: number; c: boolean }>
      >;

      const decisionNok = await instance.protect(
        createContext(),
        // @ts-expect-error: this type error is expected.
        createRequest(),
      );
      assert.equal(decisionNok.conclusion, "ALLOW");
      assert.deepEqual(errorParameters, [
        "Failure running rule: %s due to %s",
        "",
        "Expected `details.extra.a` string",
      ]);
      errorParameters = undefined;

      const decisionOk = await instance.protect(createContext(), {
        ...createRequest(),
        a: "",
        b: 0,
        c: true,
      });
      assert.equal(decisionOk.conclusion, "ALLOW");
      assert.equal(errorParameters, undefined);

      const withRuleInstance = arcjet({
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
      }).withRule([rule]);
      const withRuleDecision = await withRuleInstance.protect(
        createContext(),
        // @ts-expect-error: this type error is expected.
        createRequest(),
      );
      type WithRulePropertiesWithoutProperties = Assert<
        IsEqual<
          Props<typeof withRuleInstance>,
          { a: string; b: number; c: boolean }
        >
      >;
      assert.equal(withRuleDecision.conclusion, "ALLOW");
      assert.deepEqual(errorParameters, [
        "Failure running rule: %s due to %s",
        "",
        "Expected `details.extra.a` string",
      ]);
    },
  );

  await t.test(
    "should infer properties w/ a rule defined w/ optional properties",
    async function () {
      let errorParameters: unknown;
      const rule: ArcjetRule<{ a?: number | null | undefined }> = {
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
        validate(_context, details) {
          if (!details || typeof details !== "object") {
            throw new Error("Expected `details` object");
          }
          if (
            !("extra" in details) ||
            !details.extra ||
            typeof details.extra !== "object"
          ) {
            throw new Error("Expected `details.extra` object");
          }
          if (
            "a" in details.extra &&
            typeof details.extra.a === "string" &&
            Number.isNaN(parseInt(details.extra.a))
          ) {
            throw new Error("Expected optional `details.extra.a` number");
          }
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

      type PropertiesWithProperties = Assert<
        IsEqual<Props<typeof instance>, { a?: number | null | undefined }>
      >;

      const decisionOk = await instance.protect(
        createContext(),
        createRequest(),
      );
      assert.equal(decisionOk.conclusion, "ALLOW");
      assert.equal(errorParameters, undefined);

      const decisionNok = await instance.protect(
        createContext(),
        // @ts-expect-error: this type error is expected.
        { ...createRequest(), a: "a" },
      );
      assert.equal(decisionNok.conclusion, "ALLOW");
      assert.deepEqual(errorParameters, [
        "Failure running rule: %s due to %s",
        "",
        "Expected optional `details.extra.a` number",
      ]);
      errorParameters = undefined;

      const decisionAlsoOk = await instance.protect(createContext(), {
        ...createRequest(),
        a: 2,
      });
      assert.equal(decisionAlsoOk.conclusion, "ALLOW");
      assert.equal(errorParameters, undefined);

      const withRuleInstance = arcjet({
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
      }).withRule([rule]);
      const withRuleDecision = await withRuleInstance.protect(
        createContext(),
        // @ts-expect-error: this type error is expected.
        { ...createRequest(), a: "b" },
      );
      type WithRulePropertiesWithoutProperties = Assert<
        IsEqual<
          Props<typeof withRuleInstance>,
          { a?: number | null | undefined }
        >
      >;
      assert.equal(withRuleDecision.conclusion, "ALLOW");
      assert.deepEqual(errorParameters, [
        "Failure running rule: %s due to %s",
        "",
        "Expected optional `details.extra.a` number",
      ]);
    },
  );

  await t.test(
    "should infer properties w/ `characteristics`",
    async function () {
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
        characteristics: [
          "http.host",
          "http.method",
          'http.request.cookie["session-id"]',
          'http.request.headers["user-agent"]',
          'http.request.uri.args["search"]',
          "http.request.uri.path",
          "ip.src",
          "x",
          "y.z",
        ],
        client: createLocalClient(),
        key: exampleKey,
        log: { ...console, debug() {} },
        rules: [[rule]],
      });

      type PropertiesWithCharacteristics = Assert<
        IsEqual<
          Props<typeof instance>,
          // TODO: would be nice if the type is actually one record?
          Record<"x", string | number | boolean> &
            Record<"y.z", string | number | boolean>
        >
      >;

      const decisionNok = await instance.protect(
        createContext(),
        // @ts-expect-error: this type error is expected.
        createRequest(),
      );
      // TODO: should there be an error if `characteristics` are missing?
      assert.equal(decisionNok.conclusion, "ALLOW");

      const decisionOk = await instance.protect(createContext(), {
        ...createRequest(),
        x: 1,
        "y.z": true,
      });
      assert.equal(decisionOk.conclusion, "ALLOW");
    },
  );

  await t.test("should infer properties w/ `withRule`", async function () {
    const noPropertiesRule: ArcjetRule<{}> = {
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
    const optionalPropertiesRule: ArcjetRule<{
      a?: number | null | undefined;
    }> = {
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
      validate(_context, details) {
        if (!details || typeof details !== "object") {
          throw new Error("Expected `details` object");
        }
        if (
          !("extra" in details) ||
          !details.extra ||
          typeof details.extra !== "object"
        ) {
          throw new Error("Expected `details.extra` object");
        }
        if (
          "a" in details.extra &&
          typeof details.extra.a === "string" &&
          Number.isNaN(parseInt(details.extra.a))
        ) {
          throw new Error("Expected optional `details.extra.a` number");
        }
      },
      version: 0,
    };
    const propertiesRule: ArcjetRule<{ b: string }> = {
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
      validate(_context, details) {
        if (!details || typeof details !== "object") {
          throw new Error("Expected `details` object");
        }
        if (
          !("extra" in details) ||
          !details.extra ||
          typeof details.extra !== "object"
        ) {
          throw new Error("Expected `details.extra` object");
        }
        if (!("a" in details.extra) || typeof details.extra.a !== "string") {
          throw new Error("Expected `details.extra.a` string");
        }
      },
      version: 0,
    };
    const instance = arcjet({
      characteristics: ["http.host", "x"],
      client: createLocalClient(),
      key: exampleKey,
      log: { ...console, debug() {} },
      rules: [],
    })
      .withRule([noPropertiesRule])
      .withRule([optionalPropertiesRule])
      .withRule([propertiesRule]);

    type Properties = Assert<
      IsEqual<
        Props<typeof instance>,
        Record<"x", string | number | boolean> & {
          a?: number | null | undefined;
        } & { b: string }
      >
    >;

    const decisionNok = await instance.protect(
      createContext(),
      // @ts-expect-error: this type error is expected.
      createRequest(),
    );
    // TODO: should there be an error if `characteristics` are missing?
    assert.equal(decisionNok.conclusion, "ALLOW");

    const decisionOk = await instance.protect(createContext(), {
      ...createRequest(),
      x: 1,
      b: "",
    });
    assert.equal(decisionOk.conclusion, "ALLOW");
  });
});

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

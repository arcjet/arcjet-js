import assert from "node:assert/strict";
import test from "node:test";
import { MemoryCache } from "@arcjet/cache";
import type { Client } from "@arcjet/protocol/client.js";
import arcjet, {
  type ArcjetContext,
  type ArcjetLogger,
  type ArcjetRequest,
  type ArcjetRule,
  ArcjetRuleResult,
  ArcjetAllowDecision,
  ArcjetReason,
} from "../index.js";

const key = "ajkey_placeholder";

test("arcjet rule", async function (t) {
  await t.test("should support a custom rule", async function () {
    // TODO: should not need explicit type annotation.
    const denySearchAlpha: ArcjetRule<{}> = {
      mode: "LIVE",
      priority: 1,
      async protect(_context, details) {
        const parameters = new URLSearchParams(details.query);
        const q = parameters.get("q");

        if (q === "alpha") {
          return new ArcjetRuleResult({
            conclusion: "DENY",
            fingerprint: "",
            reason: new ArcjetReason(),
            ruleId: "",
            state: "RUN",
            ttl: 0,
          });
        }

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

    const client = arcjet({
      client: createLocalClient(),
      log: createLog(),
      key,
      rules: [[denySearchAlpha]],
    });

    const resultAlpha = await client.protect(createContext(), {
      ...createRequest(),
      query: "?q=alpha",
    });
    assert.equal(resultAlpha.isDenied(), true);

    const resultBravo = await client.protect(createContext(), {
      ...createRequest(),
      query: "?q=beta",
    });
    assert.equal(resultBravo.isDenied(), false);
  });

  await t.test(
    "should support a custom rule w/ optional extra fields",
    async function () {
      // Custom rule that denies requests when an optional extra field is `"alpha"`.
      const denyExtraAlpha: ArcjetRule<{ field?: string | null | undefined }> =
        {
          mode: "LIVE",
          priority: 1,
          async protect(_context, details) {
            const field = details.extra.field;

            if (field === "alpha") {
              return new ArcjetRuleResult({
                conclusion: "DENY",
                fingerprint: "",
                reason: new ArcjetReason(),
                ruleId: "",
                state: "RUN",
                ttl: 0,
              });
            }

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

      const client = arcjet({
        client: createLocalClient(),
        log: createLog(),
        key,
        rules: [[denyExtraAlpha]],
      });

      const resultAlpha = await client.protect(createContext(), {
        ...createRequest(),
        field: "alpha",
      });
      assert.equal(resultAlpha.isDenied(), true);

      const resultBravo = await client.protect(createContext(), {
        ...createRequest(),
        field: "bravo",
      });
      assert.equal(resultBravo.isDenied(), false);

      const resultMissing = await client.protect(
        createContext(),
        createRequest(),
      );
      assert.equal(resultMissing.isDenied(), false);
    },
  );

  await t.test(
    "should support a custom rule w/ required extra fields",
    async function () {
      // Custom rule that denies requests when a required extra field is `"alpha"`.
      const denyExtraAlphaRequired: ArcjetRule<{ field: string }> = {
        mode: "LIVE",
        priority: 1,
        async protect(_context, details) {
          const field = details.extra.field;

          // A local error result would be overwritten by the server but a
          // local deny persists.
          if (!field || field === "alpha") {
            return new ArcjetRuleResult({
              conclusion: "DENY",
              fingerprint: "",
              reason: new ArcjetReason(),
              ruleId: "",
              state: "RUN",
              ttl: 0,
            });
          }

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

      const client = arcjet({
        client: createLocalClient(),
        log: createLog(),
        key,
        rules: [[denyExtraAlphaRequired]],
      });

      const resultAlpha = await client.protect(createContext(), {
        ...createRequest(),
        field: "alpha",
      });
      assert.equal(resultAlpha.isDenied(), true);

      const resultBravo = await client.protect(createContext(), {
        ...createRequest(),
        field: "bravo",
      });
      assert.equal(resultBravo.isDenied(), false);

      const resultMissing = await client.protect(
        createContext(),
        // @ts-expect-error: type error is expected as this use is wrong.
        createRequest(),
      );
      assert.equal(resultMissing.isDenied(), true);
    },
  );
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
    fingerprint: "",
    getBody() {
      throw new Error("Not implemented");
    },
    key,
    log: createLog(),
    runtime: "",
  };
}

/**
 * Create empty values for log.
 *
 * @returns
 *   Log.
 */
function createLog(): ArcjetLogger {
  return {
    ...console,
    debug() {},
    info() {},
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
    headers: new Headers({
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    }),
    host: "localhost:3000",
    ip: "127.0.0.1",
    method: "GET",
    path: "/bot-protection/quick-start",
    protocol: "http:",
    query: "?q=alpha",
  };
}

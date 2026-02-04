import assert from "node:assert/strict";
import test from "node:test";
import { MemoryCache } from "@arcjet/cache";
import {
  type ArcjetCacheEntry,
  type ArcjetContext,
  type ArcjetRequestDetails,
  validateEmail,
} from "../index.js";

test("`validateEmail`", async function (t) {
  await t.test("should throw for invalid `mode`", async function () {
    assert.throws(function () {
      validateEmail({
        // @ts-expect-error: test runtime behavior.
        mode: "INVALID",
      });
    }, /`validateEmail` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  await t.test(
    "should throw if neither `allow` nor `deny` are passed",
    async function () {
      assert.throws(function () {
        // @ts-expect-error: test runtime behavior.
        validateEmail({});
      }, /`validateEmail` options error: either `allow` or `deny` must be specified/);
    },
  );

  await t.test("should throw if `allow` is not an array", async function () {
    assert.throws(function () {
      validateEmail({
        // @ts-expect-error: test runtime behavior.
        allow: "x",
      });
    }, /`validateEmail` options error: invalid type for `allow` - expected an array/);
  });

  await t.test("should throw if `deny` is not an array", async function () {
    assert.throws(function () {
      validateEmail({
        // @ts-expect-error: test runtime behavior.
        deny: "x",
      });
    }, /`validateEmail` options error: invalid type for `deny` - expected an array/);
  });

  await t.test(
    "should throw if `allow` contains unknown values",
    async function () {
      assert.throws(function () {
        validateEmail({
          // @ts-expect-error: test runtime behavior.
          allow: ["x"],
        });
      }, /`validateEmail` options error: invalid value for `allow\[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'/);
    },
  );

  await t.test(
    "should throw if `deny` contains unknown values",
    async function () {
      assert.throws(function () {
        validateEmail({
          // @ts-expect-error: test runtime behavior.
          deny: ["x"],
        });
      }, /`validateEmail` options error: invalid value for `deny\[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'/);
    },
  );

  await t.test(
    "should throw if `allow` and `deny` are both passed",
    async function () {
      assert.throws(function () {
        // @ts-expect-error: test runtime behavior.
        validateEmail({ allow: [], deny: [] });
      }, /`validateEmail` options error: `allow` and `deny` cannot be provided together/);
    },
  );

  await t.test(
    "should throw if `allowDomainLiteral` is not a boolean",
    async function () {
      assert.throws(function () {
        validateEmail({
          // @ts-expect-error: test runtime behavior.
          allowDomainLiteral: "x",
          deny: [],
        });
      }, /`validateEmail` options error: invalid type for `allowDomainLiteral` - expected boolean/);
    },
  );

  await t.test(
    "should throw if `requireTopLevelDomain` is not a boolean",
    async function () {
      assert.throws(function () {
        validateEmail({
          deny: [],
          // @ts-expect-error: test runtime behavior.
          requireTopLevelDomain: "x",
        });
      }, /`validateEmail` options error: invalid type for `requireTopLevelDomain` - expected boolean/);
    },
  );

  await t.test("should support known types in `allow`", async function () {
    const [rule] = validateEmail({
      allow: ["DISPOSABLE", "FREE", "NO_GRAVATAR", "NO_MX_RECORDS", "INVALID"],
    });

    assert.equal(rule.type, "EMAIL");
    assert.deepEqual(rule.allow, [
      "DISPOSABLE",
      "FREE",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
      "INVALID",
    ]);
  });

  await t.test("should support known types in `deny`", async function () {
    const [rule] = validateEmail({
      deny: ["DISPOSABLE", "FREE", "NO_GRAVATAR", "NO_MX_RECORDS", "INVALID"],
    });

    assert.equal(rule.type, "EMAIL");
    assert.deepEqual(rule.deny, [
      "DISPOSABLE",
      "FREE",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
      "INVALID",
    ]);
  });

  await t.test("`.validate()`", async function (t) {
    await t.test("should pass if an email is given", function () {
      const [rule] = validateEmail({ deny: [], mode: "LIVE" });
      const result = rule.validate(createContext(), {
        ...createRequest(),
        email: "alice@arcjet.com",
      });

      assert.deepEqual(result, undefined);
    });

    await t.test("should pass if an invalid email is given", function () {
      const [rule] = validateEmail({ deny: [], mode: "LIVE" });
      const result = rule.validate(createContext(), {
        ...createRequest(),
        email: "alice",
      });

      assert.deepEqual(result, undefined);
    });

    await t.test("should throw if no email is given", function () {
      const [rule] = validateEmail({ deny: [], mode: "LIVE" });

      assert.throws(function () {
        const _ = rule.validate(createContext(), {
          ...createRequest(),
          email: undefined,
        });
      }, /ValidateEmail requires `email` to be set/);
    });
  });

  await t.test("`.protect()`", async function (t) {
    await t.test("`allow`", async function (t) {
      await t.test("should allow a valid email", async function () {
        const [rule] = validateEmail({ allow: [] });
        const result = await rule.protect(createContext(), {
          ...createRequest(),
          email: "alice@arcjet.com",
        });

        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test(
        "should deny an invalid email (`allow: []`)",
        async function () {
          const [rule] = validateEmail({ allow: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice",
          });

          assert.equal(result.conclusion, "DENY");
        },
      );

      // This sounds like a bug.
      // Invalid emails are always denied as it is nonsensical to allow them.
      // Passing `allow: ["INVALID"]` is equivalent to `allow: []`.
      await t.test(
        'should deny an invalid email (`allow: ["INVALID"]`)',
        async function () {
          const [rule] = validateEmail({ allow: ["INVALID"] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice",
          });

          assert.equal(result.conclusion, "DENY");
        },
      );

      await t.test(
        "should deny an invalid email (no domain)",
        async function () {
          const [rule] = validateEmail({ allow: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@",
          });

          assert.equal(result.conclusion, "DENY");
        },
      );

      await t.test("should deny an invalid email (no name)", async function () {
        const [rule] = validateEmail({ allow: [] });
        const result = await rule.protect(createContext(), {
          ...createRequest(),
          email: "@arcjet.com",
        });

        assert.equal(result.conclusion, "DENY");
      });

      await t.test(
        "should allow a valid email (one character name)",
        async function () {
          const [rule] = validateEmail({ allow: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "a@arcjet.com",
          });

          assert.equal(result.conclusion, "ALLOW");
        },
      );

      await t.test(
        "should allow a valid email (one character domain parts)",
        async function () {
          const [rule] = validateEmail({ allow: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "a@b.c",
          });

          assert.equal(result.conclusion, "ALLOW");
        },
      );

      await t.test(
        "should allow a valid email (many domain parts)",
        async function () {
          const [rule] = validateEmail({ allow: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@exa.mple.arc.jet.com",
          });

          assert.equal(result.conclusion, "ALLOW");
        },
      );

      await t.test(
        "should deny a domain literal by default",
        async function () {
          const [rule] = validateEmail({ allow: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@[127.0.0.1]",
          });

          assert.equal(result.conclusion, "DENY");
        },
      );

      await t.test(
        "should allow a domain literal w/ `allowDomainLiteral: true`",
        async function () {
          const [rule] = validateEmail({ allowDomainLiteral: true, allow: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@[127.0.0.1]",
          });

          assert.equal(result.conclusion, "ALLOW");
        },
      );

      await t.test(
        "should deny a domain literal w/ `allowDomainLiteral: false`",
        async function () {
          const [rule] = validateEmail({
            allowDomainLiteral: false,
            allow: [],
          });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@[127.0.0.1]",
          });

          assert.equal(result.conclusion, "DENY");
        },
      );

      await t.test(
        "should deny a domain with one part (no dots) by default",
        async function () {
          const [rule] = validateEmail({ allow: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@arcjet",
          });

          assert.equal(result.conclusion, "DENY");
        },
      );

      await t.test(
        "should deny a domain with one part w/ `requireTopLevelDomain: true`",
        async function () {
          const [rule] = validateEmail({
            allow: [],
            requireTopLevelDomain: true,
          });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@arcjet",
          });

          assert.equal(result.conclusion, "DENY");
        },
      );

      await t.test(
        "should allow a domain with one part w/ `requireTopLevelDomain: false`",
        async function () {
          const [rule] = validateEmail({
            allow: [],
            requireTopLevelDomain: false,
          });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@arcjet",
          });

          assert.equal(result.conclusion, "ALLOW");
        },
      );

      // Locally it’s validity that is checked and a few free email domains.
      // The checks other than validity are passed into WebAssembly.
      // See the functions for `"arcjet:js-req/email-validator-overrides"` in `analyze/index.ts`.
      // More expansive checks for free domains, and the other checks (disposable, gravatar, mx records) are done remotely.
      await t.test("should deny a free email (`allow: []`)", async function () {
        const [rule] = validateEmail({ allow: [] });
        const result = await rule.protect(createContext(), {
          ...createRequest(),
          email: "alice@gmail.com",
        });

        assert.equal(result.conclusion, "DENY");
      });

      await t.test(
        'should allow a free email (`allow: ["FREE"]`)',
        async function () {
          const [rule] = validateEmail({ allow: ["FREE"] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@gmail.com",
          });

          assert.equal(result.conclusion, "ALLOW");
        },
      );

      await t.test(
        'should produce `state: "DRY_RUN"` if mode is not given',
        async function () {
          const [rule] = validateEmail({ allow: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice",
          });

          assert.equal(result.state, "DRY_RUN");
        },
      );

      await t.test(
        'should produce `state: "DRY_RUN"` for `mode: "DRY_RUN"`',
        async function () {
          const [rule] = validateEmail({ allow: [], mode: "DRY_RUN" });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice",
          });

          assert.equal(result.state, "DRY_RUN");
        },
      );

      await t.test(
        'should produce `state: "RUN"` for `mode: "LIVE"`',
        async function () {
          const [rule] = validateEmail({ allow: [], mode: "LIVE" });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice",
          });

          assert.equal(result.state, "RUN");
        },
      );

      await t.test(
        "should produce `ttl: 0` results for a valid email",
        async function () {
          const [rule] = validateEmail({ allow: [], mode: "LIVE" });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@arcjet.com",
          });

          assert.equal(result.ttl, 0);
        },
      );

      await t.test(
        "should produce `ttl: 0` results for an invalid email",
        async function () {
          const [rule] = validateEmail({ allow: [], mode: "LIVE" });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice",
          });

          assert.equal(result.ttl, 0);
        },
      );
    });

    await t.test("`deny`", async function (t) {
      await t.test(
        "should allow a valid email (`deny: []`)",
        async function () {
          const [rule] = validateEmail({ deny: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@arcjet.com",
          });

          assert.equal(result.conclusion, "ALLOW");
        },
      );

      // This sounds like a bug.
      // Invalid emails are always denied as it is nonsensical to allow them.
      // Passing `deny: []` is equivalent to `deny: ["INVALID"]`.
      await t.test(
        "should deny an invalid email (`deny: []`)",
        async function () {
          const [rule] = validateEmail({ deny: [] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice",
          });

          assert.equal(result.conclusion, "DENY");
        },
      );

      await t.test(
        'should deny an invalid email (`deny: ["INVALID"]`)',
        async function () {
          const [rule] = validateEmail({ deny: ["INVALID"] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice",
          });

          assert.equal(result.conclusion, "DENY");
        },
      );

      await t.test("should allow a free email (`deny: []`)", async function () {
        const [rule] = validateEmail({ deny: [] });
        const result = await rule.protect(createContext(), {
          ...createRequest(),
          email: "alice@gmail.com",
        });

        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test(
        'should deny a free email (`deny: ["FREE"]`)',
        async function () {
          const [rule] = validateEmail({ deny: ["FREE"] });
          const result = await rule.protect(createContext(), {
            ...createRequest(),
            email: "alice@gmail.com",
          });

          assert.equal(result.conclusion, "DENY");
        },
      );
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
 * Create empty values for details.
 *
 * @returns
 *   Details.
 */
function createRequest(): ArcjetRequestDetails {
  return {
    cookies: "NEXT_LOCALE=en-US",
    extra: {},
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

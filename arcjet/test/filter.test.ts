import assert from "node:assert/strict";
import test from "node:test";
import arcjet, {
  type ArcjetContext,
  type ArcjetRequestDetails,
  ArcjetAllowDecision,
  ArcjetErrorReason,
  ArcjetReason,
  filter,
} from "../index.js";
import { MemoryCache } from "@arcjet/cache";
import { ArcjetIpDetails } from "@arcjet/protocol";

test("filter", async function (t) {
  await t.test("should fail if `mode` is invalid", async function () {
    assert.throws(function () {
      filter({
        // @ts-expect-error: test runtime behavior of unknown `mode`.
        mode: "INVALID",
        allow: [],
      });
    }, /`filter` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  await t.test("should fail if `allow` is not an array", async function () {
    assert.throws(function () {
      filter({
        // @ts-expect-error: test runtime behavior of invalid `allow` value.
        allow: "a",
      });
    }, /invalid type for `allow` - expected an array/);
  });

  await t.test("should fail `allow[]` is invalid", async function () {
    assert.throws(function () {
      filter({
        // @ts-expect-error: test runtime behavior of invalid `allow[]` value.
        allow: [1],
      });
    }, /invalid type for `allow\[0]` - expected string or object/);
  });

  await t.test(
    "should fail `allow[].displayName` is invalid",
    async function () {
      assert.throws(function () {
        filter({
          // @ts-expect-error: test runtime behavior of invalid `allow[]` value.
          allow: [{ expression: "a", displayName: 1 }],
        });
      }, /invalid type for `allow\[0].displayName` - expected string/);
    },
  );

  await t.test(
    "should fail `allow[].expression` is invalid",
    async function () {
      assert.throws(function () {
        filter({
          // @ts-expect-error: test runtime behavior of invalid `allow[]` value.
          allow: [{ expression: 1 }],
        });
      }, /invalid type for `allow\[0].expression` - expected string/);
    },
  );

  await t.test("should fail if `deny` is not an array", async function () {
    assert.throws(function () {
      filter({
        // @ts-expect-error: test runtime behavior of invalid `deny` value.
        deny: "a",
      });
    }, /invalid type for `deny` - expected an array/);
  });

  await t.test("should fail `deny[]` is invalid", async function () {
    assert.throws(function () {
      filter({
        // @ts-expect-error: test runtime behavior of invalid `deny[]` value.
        deny: [1],
      });
    }, /invalid type for `deny\[0]` - expected string or object/);
  });

  await t.test(
    "should fail `deny[].displayName` is invalid",
    async function () {
      assert.throws(function () {
        filter({
          // @ts-expect-error: test runtime behavior of invalid `deny[]` value.
          deny: [{ expression: "a", displayName: 1 }],
        });
      }, /invalid type for `deny\[0].displayName` - expected string/);
    },
  );

  await t.test("should fail `deny[].expression` is invalid", async function () {
    assert.throws(function () {
      filter({
        // @ts-expect-error: test runtime behavior of invalid `deny[]` value.
        deny: [{ expression: 1 }],
      });
    }, /invalid type for `deny\[0].expression` - expected string/);
  });

  await t.test(
    "should fail if `allow` and `deny` are both given",
    async function () {
      assert.throws(function () {
        filter(
          // @ts-expect-error: test runtime behavior of invalid combination of both fields.
          { allow: [], deny: [] },
        );
      }, /`filter` options error: `allow` and `deny` cannot be provided together/);
    },
  );

  await t.test(
    "should fail if neither `allow` nor `deny` are given",
    async function () {
      assert.throws(function () {
        filter(
          // @ts-expect-error: test runtime behavior of neither `allow` nor `deny`.
          {},
        );
      }, /`filter` options error: either `allow` or `deny` must be specified/);
    },
  );
});

test("filter: `validate`", async function (t) {
  await t.test("should fail when calling `validate` w/o `ip`", function () {
    const [rule] = filter({ allow: [] });
    assert.throws(function () {
      const _ = rule.validate(createContext(), {
        ...createRequest(),
        ip: undefined,
      });
    }, /Request filtering requires `ip` to be set/);
  });

  await t.test("should pass when calling `validate` w/ `ip`", function () {
    const [rule] = filter({ allow: [] });
    const _ = rule.validate(createContext(), {
      ...createRequest(),
      ip: "127.0.0.1",
    });
  });
});

test("filter: `protect`", async function (t) {
  await t.test("should allow if an `allow` matches", async function () {
    const [rule] = filter({
      allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
    });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ALLOW");
  });

  await t.test("should deny if no `allow` matches", async function () {
    const [rule] = filter({
      allow: ['http.request.headers["user-agent"] ~ "Firefox"'],
    });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "DENY");
  });

  await t.test("should deny w/ empty `allow`", async function () {
    const [rule] = filter({ allow: [] });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "DENY");
  });

  await t.test("should deny if a `deny` matches", async function () {
    const [rule] = filter({
      deny: ['http.request.headers["user-agent"] ~ "Chrome"'],
    });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "DENY");
  });

  await t.test("should allow if no `deny` matches", async function () {
    const [rule] = filter({
      deny: ['http.request.headers["user-agent"] ~ "Firefox"'],
    });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ALLOW");
  });

  await t.test("should allow w/ empty `deny`", async function () {
    const [rule] = filter({ deny: [] });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ALLOW");
  });

  await t.test("should error", async function () {
    const [rule] = filter({ deny: ['http.blob ~ "Chrome"'] });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ERROR");
    assert(result.reason instanceof ArcjetErrorReason);
    assert.equal(
      result.reason.message,
      'Error: Filter parsing error (1:1):\nhttp.blob ~ "Chrome"\n^^^^^^^^^ unknown identifier\n',
    );
  });

  await t.test("should cache", async function () {
    const context = createContext();
    const [rule] = filter({
      deny: ['http.request.headers["user-agent"] ~ "Chrome"'],
      mode: "LIVE",
    });
    const first = await rule.protect(context, createRequest());
    assert.equal(first.conclusion, "DENY");
    assert.equal(first.state, "RUN");

    const second = await rule.protect(context, createRequest());
    assert.equal(second.conclusion, "DENY");
    assert.equal(second.state, "CACHED");
  });

  await t.test("should support an object filter", async function () {
    const [rule] = filter({
      allow: [
        {
          displayName: "Chrome user",
          expression: 'http.request.headers["user-agent"] ~ "Chrome"',
        },
      ],
    });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ALLOW");
  });
});

test("expressions", async function (t) {
  await t.test("fields", async function (t) {
    await t.test("`http.host`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({ allow: ['http.host == "localhost:3000"'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({ allow: ['http.host == "localhost:8000"'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });

    await t.test("`http.request.cookie`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({
          allow: ['http.request.cookie["NEXT_LOCALE"] ~ "en-"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({
          allow: ['http.request.cookie["NEXT_LOCALE"] ~ "de-"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });

    await t.test("`http.request.headers`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({
          allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({
          allow: ['http.request.headers["user-agent"] ~ "Firefox"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });

    await t.test("`http.request.method`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({ allow: ['http.request.method == "GET"'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({ allow: ['http.request.method == "POST"'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });

    await t.test("`http.request.uri.args`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({
          allow: ['http.request.uri.args["q"] == "alpha"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({
          allow: ['http.request.uri.args["q"] == "bravo"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });

    await t.test("`http.request.uri.path`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({
          allow: ['http.request.uri.path ~ "/quick-start"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({
          allow: ['http.request.uri.path ~ "/concepts"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });

    await t.test("`src.ip`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({ allow: ["src.ip == 127.0.0.1"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({ allow: ["src.ip == 192.168.1.1"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });
  });

  await t.test("functions", async function (t) {
    await t.test("`len`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({ allow: ["len(http.request.method) == 3"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({ allow: ["len(http.request.method) == 4"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });

    await t.test("`lower`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({
          allow: ['lower(http.request.method) == "get"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({
          allow: ['lower(http.request.method) == "post"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });

    await t.test("`upper`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({
          allow: ['upper(http.host) == "LOCALHOST:3000"'],
        });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({ allow: ['upper(http.host) == "EXAMPLE.COM"'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });
  });

  await t.test("errors", async function (t) {
    await t.test("unknown fields", async function () {
      const [rule] = filter({ allow: ["http.request.blob == 1"] });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ERROR");
      assert(result.reason instanceof ArcjetErrorReason);
      assert.equal(
        result.reason.message,
        "Error: Filter parsing error (1:1):\nhttp.request.blob == 1\n^^^^^^^^^^^^^^^^^ unknown identifier\n",
      );
    });

    await t.test("unknown functions", async function () {
      const [rule] = filter({ allow: ["blob(http.request) == 1"] });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ERROR");
      assert(result.reason instanceof ArcjetErrorReason);
      assert.equal(
        result.reason.message,
        "Error: Filter parsing error (1:1):\nblob(http.request) == 1\n^^^^ unknown identifier\n",
      );
    });

    await t.test("incorrect comparison", async function () {
      const [rule] = filter({ allow: ["http.host == 1"] });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ERROR");
      assert(result.reason instanceof ArcjetErrorReason);
      assert.equal(
        result.reason.message,
        "Error: Filter parsing error (1:14):\nhttp.host == 1\n             ^ expected 2 characters, but found 1\n",
      );
    });
  });
});

test("remote fields", async function (t) {
  await t.test("local only", async function () {
    const [rule] = filter({ allow: ['http.host == "localhost:3000"'] });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ALLOW");
  });

  await t.test("should fail on rules w/ remote values", async function () {
    assert.rejects(async function () {
      const [rule] = filter({ allow: ["not vpn"] });
      await rule.protect(createContext(), createRequest());
    }, /Unexpected remote filter without `client`/);
  });

  await t.test("remote fields w/ `client`", async function () {
    const client = {
      async decide() {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetReason(),
          results: [],
          ip: new ArcjetIpDetails({
            latitude: 39.90008,
            longitude: -79.71643,
            accuracyRadius: 2,
            timezone: "America/New_York",
            postalCode: "15472",
            city: "Uniontown",
            region: "Pennsylvania",
            country: "US",
            countryName: "United States",
            continent: "NA",
            continentName: "North America",
            asn: "54113",
            asnName: "Fastly, Inc.",
            asnDomain: "fastly.com",
            service: undefined,
            isHosting: false,
            isProxy: false,
            // For testing purposes.
            isVpn: true,
            isTor: false,
            isRelay: false,
          }),
        });
      },
      report() {},
    };

    const notVpn = arcjet({
      client,
      key: "test-key",
      log: console,
      rules: [filter({ allow: ["not vpn"], mode: "LIVE" })],
    });

    const resultNotVpn = await notVpn.protect(createContext(), {
      ...createRequest(),
    });

    assert.equal(resultNotVpn.conclusion, "DENY");

    const vpn = arcjet({
      client,
      key: "test-key",
      log: console,
      rules: [filter({ allow: ["vpn"], mode: "LIVE" })],
    });

    const resultVpn = await vpn.protect(createContext(), {
      ...createRequest(),
    });

    assert.equal(resultVpn.conclusion, "ALLOW");
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
      return Promise.resolve(undefined);
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

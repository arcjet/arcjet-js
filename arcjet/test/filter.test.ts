import assert from "node:assert/strict";
import test from "node:test";
import { MemoryCache } from "@arcjet/cache";
import { ArcjetDenyDecision, ArcjetReason } from "@arcjet/protocol";
import arcjet, {
  type ArcjetCacheEntry,
  type ArcjetContext,
  type ArcjetRequestDetails,
  ArcjetAllowDecision,
  ArcjetErrorReason,
  filter,
} from "../index.js";

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

  await t.test(
    "should fail if `allow` is an unsupported value",
    async function () {
      assert.throws(function () {
        filter({
          // @ts-expect-error: test runtime behavior of invalid `allow` value.
          allow: 1,
        });
      }, /`filter` options error: invalid type for `allow` - expected an array/);
    },
  );

  await t.test("should fail w/ empty `allow`", async function () {
    assert.throws(function () {
      filter({ allow: [] });
    }, /`filter` options error: one or more expressions must be passed in `allow` or `deny`/);
  });

  await t.test("should fail if `allow[]` is invalid", async function () {
    assert.throws(function () {
      filter({
        // @ts-expect-error: test runtime behavior of invalid `allow[]` value.
        allow: [1],
      });
    }, /invalid type for `allow\[0]` - expected string/);
  });

  await t.test(
    "should fail if `deny` is an unsupported value",
    async function () {
      assert.throws(function () {
        filter({
          // @ts-expect-error: test runtime behavior of invalid `deny` value.
          deny: 1,
        });
      }, /`filter` options error: invalid type for `deny` - expected an array/);
    },
  );

  await t.test("should fail w/ empty `deny`", async function () {
    assert.throws(function () {
      filter({ deny: [] });
    }, /`filter` options error: one or more expressions must be passed in `allow` or `deny`/);
  });

  await t.test("should fail if `deny[]` is invalid", async function () {
    assert.throws(function () {
      filter({
        // @ts-expect-error: test runtime behavior of invalid `deny[]` value.
        deny: [1],
      });
    }, /invalid type for `deny\[0]` - expected string/);
  });

  await t.test(
    "should fail if `allow` and `deny` are both empty",
    async function () {
      assert.throws(function () {
        filter(
          // @ts-expect-error: test runtime behavior of invalid combination of both fields.
          { allow: [], deny: [] },
        );
      }, /`filter` options error: one or more expressions must be passed in `allow` or `deny`/);
    },
  );

  await t.test(
    "should fail if `allow` and `deny` are both non-empty",
    async function () {
      assert.throws(function () {
        filter(
          // @ts-expect-error: test runtime behavior of invalid combination of both fields.
          {
            allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
            deny: ['http.request.headers["user-agent"] ~ "Firefox"'],
          },
        );
      }, /`filter` options error: expressions must be passed in either `allow` or `deny` instead of both/);
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
      }, /`filter` options error: one or more expressions must be passed in `allow` or `deny`/);
    },
  );
});

test("filter: `validate`", async function (t) {
  await t.test("should not fail when calling `validate` w/o `ip`", function () {
    const [rule] = filter({
      allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
    });

    const _ = rule.validate(createContext(), {
      ...createRequest(),
      ip: undefined,
    });
  });

  await t.test("should pass when calling `validate` w/ `ip`", function () {
    const [rule] = filter({
      allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
    });
    const _ = rule.validate(createContext(), {
      ...createRequest(),
      ip: "127.0.0.1",
    });
  });

  await t.test("should work w/ local filter fields", function () {
    const [rule] = filter({ allow: ['local["username"] eq "alice"'] });
    const _1 = rule.validate(createContext(), {
      ...createRequest(),
      extra: { filterLocal: JSON.stringify({ username: "alice" }) },
    });

    // This won’t match but is still valid.
    const _2 = rule.validate(createContext(), {
      ...createRequest(),
      extra: { filterLocal: JSON.stringify({ username: "bob" }) },
    });

    // Not an object in JSON.
    assert.throws(function () {
      const _ = rule.validate(createContext(), {
        ...createRequest(),
        extra: { filterLocal: '"a"' },
      });
    }, /invalid value for `filterLocal` - expected plain object/);

    // Not a plain object in JSON.
    assert.throws(function () {
      const _ = rule.validate(createContext(), {
        ...createRequest(),
        extra: { filterLocal: "[]" },
      });
    }, /invalid value for `filterLocal` - expected plain object/);

    // Non-string values.
    assert.throws(function () {
      const _ = rule.validate(createContext(), {
        ...createRequest(),
        extra: { filterLocal: '{"username":1}' },
      });
    }, /invalid type for `filterLocal.username` - expected string/);
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

  await t.test("should error", async function () {
    const [rule] = filter({ deny: ['http.blob ~ "Chrome"'] });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ERROR");
    assert(result.reason instanceof ArcjetErrorReason);
    assert.equal(
      result.reason.message,
      'Filter parsing error (1:1):\nhttp.blob ~ "Chrome"\n^^^^^^^^^ unknown identifier\n',
    );
  });

  await t.test("should not cache (as a rule)", async function () {
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
    assert.equal(second.state, "RUN");
  });

  await t.test(
    "should cache (when passed in `rules` to `arcjet`)",
    async function () {
      const context = createContext();
      const aj = arcjet({
        client: {
          async decide() {
            return new ArcjetDenyDecision({
              reason: new ArcjetReason(),
              results: [],
              ttl: 0,
            });
          },
          report() {},
        },
        key: "",
        log: { ...context.log, debug() {} },
        rules: [
          filter({
            deny: ['http.request.headers["user-agent"] ~ "Chrome"'],
            mode: "LIVE",
          }),
        ],
      });

      const first = await aj.protect(context, { ...createRequest() });
      const firstResult = first.results[0];
      assert.equal(firstResult.conclusion, "DENY");
      assert.equal(firstResult.state, "RUN");

      const second = await aj.protect(context, { ...createRequest() });
      const secondResult = second.results[0];
      assert.equal(secondResult.conclusion, "DENY");
      assert.equal(secondResult.state, "CACHED");
    },
  );
});

test("expressions", async function (t) {
  await t.test("fields", async function (t) {
    await t.test("`local`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({ allow: ['local["username"] eq "alice"'] });
        const result = await rule.protect(createContext(), {
          ...createRequest(),
          extra: { filterLocal: JSON.stringify({ username: "alice" }) },
        });
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({ allow: ['local["username"] eq "alice"'] });
        const result = await rule.protect(createContext(), {
          ...createRequest(),
          extra: { filterLocal: JSON.stringify({ username: "bob" }) },
        });
        assert.equal(result.conclusion, "DENY");
      });

      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['local["username"] eq "alice"'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'local["username"] eq "alice"',
        ]);
      });
    });

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

    await t.test("`ip.src`", async function (t) {
      await t.test("match", async function () {
        const [rule] = filter({ allow: ["ip.src == 127.0.0.1"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
      });

      await t.test("mismatch", async function () {
        const [rule] = filter({ allow: ["ip.src == 192.168.1.1"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "DENY");
      });
    });

    await t.test("`ip.src.accuracy_radius`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.accuracy_radius == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.accuracy_radius == ""',
        ]);
      });
    });

    await t.test("`ip.src.asnum.country`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.asnum.country == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.asnum.country == ""',
        ]);
      });
    });

    await t.test("`ip.src.asnum.domain`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.asnum.domain == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.asnum.domain == ""',
        ]);
      });
    });

    await t.test("`ip.src.asnum.name`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.asnum.name == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.asnum.name == ""',
        ]);
      });
    });

    await t.test("`ip.src.asnum.type`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.asnum.type == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.asnum.type == ""',
        ]);
      });
    });

    await t.test("`ip.src.asnum`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.asnum == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.asnum == ""',
        ]);
      });
    });

    await t.test("`ip.src.city`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.city == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.city == ""',
        ]);
      });
    });

    await t.test("`ip.src.continent.name`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.continent.name == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.continent.name == ""',
        ]);
      });
    });

    await t.test("`ip.src.continent`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.continent == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.continent == ""',
        ]);
      });
    });

    await t.test("`ip.src.country.name`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.country.name == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.country.name == ""',
        ]);
      });
    });

    await t.test("`ip.src.country`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.country == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.country == ""',
        ]);
      });
    });

    await t.test("`ip.src.crawler.name`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.crawler.name == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.crawler.name == ""',
        ]);
      });
    });

    await t.test("`ip.src.crawler`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ["ip.src.crawler"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          "ip.src.crawler",
        ]);
      });
    });

    await t.test("`ip.src.hosting`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ["ip.src.hosting"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          "ip.src.hosting",
        ]);
      });
    });

    await t.test("`ip.src.lat`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.lat == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.lat == ""',
        ]);
      });
    });

    await t.test("`ip.src.lon`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.lon == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.lon == ""',
        ]);
      });
    });

    await t.test("`ip.src.mobile`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ["ip.src.mobile"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          "ip.src.mobile",
        ]);
      });
    });

    await t.test("`ip.src.postal_code`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.postal_code == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.postal_code == ""',
        ]);
      });
    });

    await t.test("`ip.src.proxy`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ["ip.src.proxy"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          "ip.src.proxy",
        ]);
      });
    });

    await t.test("`ip.src.region`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.region == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.region == ""',
        ]);
      });
    });

    await t.test("`ip.src.relay`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ["ip.src.relay"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          "ip.src.relay",
        ]);
      });
    });

    await t.test("`ip.src.service`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.service == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.service == ""',
        ]);
      });
    });

    await t.test("`ip.src.timezone.name`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ['ip.src.timezone.name == ""'] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, [
          'ip.src.timezone.name == ""',
        ]);
      });
    });

    await t.test("`ip.src.tor`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ["ip.src.tor"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, ["ip.src.tor"]);
      });
    });

    await t.test("`ip.src.vpn`", async function (t) {
      await t.test("undetermined", async function () {
        const [rule] = filter({ allow: ["ip.src.vpn"] });
        const result = await rule.protect(createContext(), createRequest());
        assert.equal(result.conclusion, "ALLOW");
        assert(result.reason.isFilter());
        assert.deepEqual(result.reason.matchedExpressions, []);
        assert.deepEqual(result.reason.undeterminedExpressions, ["ip.src.vpn"]);
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
        "Filter parsing error (1:1):\nhttp.request.blob == 1\n^^^^^^^^^^^^^^^^^ unknown identifier\n",
      );
    });

    await t.test("unknown functions", async function () {
      const [rule] = filter({ allow: ["blob(http.request) == 1"] });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ERROR");
      assert(result.reason instanceof ArcjetErrorReason);
      assert.equal(
        result.reason.message,
        "Filter parsing error (1:1):\nblob(http.request) == 1\n^^^^ unknown identifier\n",
      );
    });

    await t.test("incorrect comparison", async function () {
      const [rule] = filter({ allow: ["http.host == 1"] });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ERROR");
      assert(result.reason instanceof ArcjetErrorReason);
      assert.equal(
        result.reason.message,
        "Filter parsing error (1:14):\nhttp.host == 1\n             ^ expected 2 characters, but found 1\n",
      );
    });
  });
});

test("matrix", async function (t) {
  await t.test("allow list (empty)", async function () {
    assert.throws(function () {
      filter({ allow: [] });
    }, /one or more expressions must be passed in `allow` or `deny`/);
  });

  await t.test("allow list (regular field: match)", async function () {
    const [rule] = filter({
      allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
    });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ALLOW");
    const reason = result.reason;
    assert(reason.isFilter());
    assert.deepEqual(reason.matchedExpressions, [
      'http.request.headers["user-agent"] ~ "Chrome"',
    ]);
    assert.deepEqual(reason.undeterminedExpressions, []);
  });

  await t.test("allow list (regular field: no match)", async function () {
    const [rule] = filter({
      allow: ['http.request.headers["user-agent"] ~ "Firefox"'],
    });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "DENY");
    const reason = result.reason;
    assert(reason.isFilter());
    assert.deepEqual(reason.matchedExpressions, []);
    assert.deepEqual(reason.undeterminedExpressions, []);
  });

  await t.test("allow list (optional field: unknown)", async function () {
    const [rule] = filter({ allow: ["ip.src.vpn"] });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ALLOW");
    const reason = result.reason;
    assert(reason.isFilter());
    assert.deepEqual(reason.matchedExpressions, []);
    assert.deepEqual(reason.undeterminedExpressions, ["ip.src.vpn"]);
  });

  await t.test(
    "allow list (regular field: match, optional field: unknown)",
    async function () {
      const [rule] = filter({
        allow: ['http.request.headers["user-agent"] ~ "Chrome"', "ip.src.vpn"],
      });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ALLOW");
      const reason = result.reason;
      assert(reason.isFilter());
      assert.deepEqual(reason.matchedExpressions, [
        'http.request.headers["user-agent"] ~ "Chrome"',
      ]);
      assert.deepEqual(reason.undeterminedExpressions, ["ip.src.vpn"]);
    },
  );

  await t.test(
    "allow list (regular field: no match, optional field: unknown)",
    async function () {
      const [rule] = filter({
        allow: ['http.request.headers["user-agent"] ~ "Firefox"', "ip.src.vpn"],
      });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ALLOW");
      const reason = result.reason;
      assert(reason.isFilter());
      assert.deepEqual(reason.matchedExpressions, []);
      assert.deepEqual(reason.undeterminedExpressions, ["ip.src.vpn"]);
    },
  );

  await t.test(
    "allow list (optional field: unknown, regular field: match)",
    async function () {
      const [rule] = filter({
        allow: ["ip.src.vpn", 'http.request.headers["user-agent"] ~ "Chrome"'],
      });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ALLOW");
      const reason = result.reason;
      assert(reason.isFilter());
      assert.deepEqual(reason.matchedExpressions, [
        'http.request.headers["user-agent"] ~ "Chrome"',
      ]);
      assert.deepEqual(reason.undeterminedExpressions, ["ip.src.vpn"]);
    },
  );

  await t.test(
    "allow list (optional field: unknown, regular field: no match)",
    async function () {
      const [rule] = filter({
        allow: ["ip.src.vpn", 'http.request.headers["user-agent"] ~ "Firefox"'],
      });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ALLOW");
      const reason = result.reason;
      assert(reason.isFilter());
      assert.deepEqual(reason.matchedExpressions, []);
      assert.deepEqual(reason.undeterminedExpressions, ["ip.src.vpn"]);
    },
  );

  await t.test("deny list (empty)", async function () {
    assert.throws(function () {
      filter({ deny: [] });
    }, /one or more expressions must be passed in `allow` or `deny`/);
  });

  await t.test("deny list (regular field: match)", async function () {
    const [rule] = filter({
      deny: ['http.request.headers["user-agent"] ~ "Chrome"'],
    });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "DENY");
    const reason = result.reason;
    assert(reason.isFilter());
    assert.deepEqual(reason.matchedExpressions, [
      'http.request.headers["user-agent"] ~ "Chrome"',
    ]);
    assert.deepEqual(reason.undeterminedExpressions, []);
  });

  await t.test("deny list (regular field: no match)", async function () {
    const [rule] = filter({
      deny: ['http.request.headers["user-agent"] ~ "Firefox"'],
    });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ALLOW");
    const reason = result.reason;
    assert(reason.isFilter());
    assert.deepEqual(reason.matchedExpressions, []);
    assert.deepEqual(reason.undeterminedExpressions, []);
  });

  await t.test("deny list (optional field: unknown)", async function () {
    const [rule] = filter({ deny: ["ip.src.vpn"] });
    const result = await rule.protect(createContext(), createRequest());
    assert.equal(result.conclusion, "ALLOW");
    const reason = result.reason;
    assert(reason.isFilter());
    assert.deepEqual(reason.matchedExpressions, []);
    assert.deepEqual(reason.undeterminedExpressions, ["ip.src.vpn"]);
  });

  await t.test(
    "deny list (regular field: match, optional field: unknown)",
    async function () {
      const [rule] = filter({
        deny: ['http.request.headers["user-agent"] ~ "Chrome"', "ip.src.vpn"],
      });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "DENY");
      const reason = result.reason;
      assert(reason.isFilter());
      assert.deepEqual(reason.matchedExpressions, [
        'http.request.headers["user-agent"] ~ "Chrome"',
      ]);
      assert.deepEqual(reason.undeterminedExpressions, ["ip.src.vpn"]);
    },
  );

  await t.test(
    "deny list (regular field: no match, optional field: unknown)",
    async function () {
      const [rule] = filter({
        deny: ['http.request.headers["user-agent"] ~ "Firefox"', "ip.src.vpn"],
      });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ALLOW");
      const reason = result.reason;
      assert(reason.isFilter());
      assert.deepEqual(reason.matchedExpressions, []);
      assert.deepEqual(reason.undeterminedExpressions, ["ip.src.vpn"]);
    },
  );

  await t.test(
    "deny list (optional field: unknown, regular field: match)",
    async function () {
      const [rule] = filter({
        deny: ["ip.src.vpn", 'http.request.headers["user-agent"] ~ "Chrome"'],
      });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "DENY");
      const reason = result.reason;
      assert(reason.isFilter());
      assert.deepEqual(reason.matchedExpressions, [
        'http.request.headers["user-agent"] ~ "Chrome"',
      ]);
      assert.deepEqual(reason.undeterminedExpressions, ["ip.src.vpn"]);
    },
  );

  await t.test(
    "deny list (optional field: unknown, regular field: no match)",
    async function () {
      const [rule] = filter({
        deny: ["ip.src.vpn", 'http.request.headers["user-agent"] ~ "Firefox"'],
      });
      const result = await rule.protect(createContext(), createRequest());
      assert.equal(result.conclusion, "ALLOW");
      const reason = result.reason;
      assert(reason.isFilter());
      assert.deepEqual(reason.matchedExpressions, []);
      assert.deepEqual(reason.undeterminedExpressions, ["ip.src.vpn"]);
    },
  );

  await t.test("should support `filterLocal`", async function () {
    const [rule] = filter({
      allow: ['local["username"] eq "alice"'],
      mode: "LIVE",
    });
    const resultOk = await rule.protect(createContext(), {
      ...createRequest(),
      extra: { filterLocal: JSON.stringify({ username: "alice" }) },
    });
    assert.equal(resultOk.conclusion, "ALLOW");
    const resultNok = await rule.protect(createContext(), {
      ...createRequest(),
      extra: { filterLocal: JSON.stringify({ username: "bob" }) },
    });
    assert.equal(resultNok.conclusion, "DENY");
  });

  await t.test("should not pass `filterLocal` to `decide`", async function () {
    const key = "";
    const log = { ...console, debug() {} };
    let extra: unknown;

    const arcjetClient = arcjet({
      key,
      rules: [
        filter({ allow: ['local["username"] eq "alice"'], mode: "LIVE" }),
      ],
      client: {
        async decide(_context, details) {
          extra = details.extra;
          return new ArcjetAllowDecision({
            reason: new ArcjetReason(),
            results: [],
            ttl: 0,
          });
        },
        report() {
          throw new Error("Should not be reached");
        },
      },
      log,
    });

    const { extra: _extra, ...protectRequest } = createRequest();

    await arcjetClient.protect(createContext(), {
      ...protectRequest,
      filterLocal: { username: "alice" },
    });

    assert.deepEqual(extra, { filterLocal: "<redacted>" });
  });

  await t.test("should not pass `filterLocal` to `report`", async function () {
    const key = "";
    const log = { ...console, debug() {} };
    let extra: unknown;

    const arcjetClient = arcjet({
      key,
      rules: [filter({ deny: ['local["username"] eq "alice"'], mode: "LIVE" })],
      client: {
        async decide() {
          throw new Error("Should not be reached");
        },
        report(_context, details) {
          extra = details.extra;
        },
      },
      log,
    });

    const { extra: _extra, ...protectRequest } = createRequest();

    await arcjetClient.protect(createContext(), {
      ...protectRequest,
      filterLocal: { username: "alice" },
    });

    assert.deepEqual(extra, { filterLocal: "<redacted>" });
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

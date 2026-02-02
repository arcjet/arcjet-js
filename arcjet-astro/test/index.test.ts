import assert from "node:assert/strict";
import test from "node:test";
import arcjet, {
  createRemoteClient,
  detectBot,
  filter,
  fixedWindow,
  protectSignup,
  sensitiveInfo,
  shield,
  slidingWindow,
  tokenBucket,
  validateEmail,
} from "../index.js";

test("@arcjet/astro (api)", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "createRemoteClient",
      "default",
      "detectBot",
      "filter",
      "fixedWindow",
      "protectSignup",
      "sensitiveInfo",
      "shield",
      "slidingWindow",
      "tokenBucket",
      "validateEmail",
    ]);
  });
});

test("createRemoteClient", async function (t) {
  await t.test("should work w/o options", async function () {
    const client = createRemoteClient();

    assert.deepEqual(client, { baseUrl: undefined, timeout: undefined });

    arcjet({ client, rules: [] });
  });

  await t.test("should work w/ `baseUrl`, w/o `timeout`", async function () {
    const client = createRemoteClient({ baseUrl: "https://example.com" });

    assert.deepEqual(client, {
      baseUrl: "https://example.com",
      timeout: undefined,
    });

    arcjet({ client, rules: [] });
  });

  await t.test("should work w/o `baseUrl`, w/ `timeout`", async function () {
    const client = createRemoteClient({ timeout: 2000 });

    assert.deepEqual(client, { baseUrl: undefined, timeout: 2000 });

    arcjet({ client, rules: [] });
  });

  await t.test("should work w/ `baseUrl`, `timeout`", async function () {
    const client = createRemoteClient({
      baseUrl: "https://example.com",
      timeout: 2000,
    });

    assert.deepEqual(client, { baseUrl: "https://example.com", timeout: 2000 });

    arcjet({ client, rules: [] });
  });

  await t.test("should fail w/ invalid `baseUrl`", async function () {
    const client = createRemoteClient({
      // @ts-expect-error: test runtime behavior.
      baseUrl: 2000,
    });

    assert.throws(function () {
      arcjet({ client, rules: [] });
    }, /baseUrl/);
  });

  await t.test("should fail w/ invalid `timeout`", async function () {
    const client = createRemoteClient({
      // @ts-expect-error: test runtime behavior.
      timeout: "INVALID",
    });

    assert.throws(function () {
      arcjet({ client, rules: [] });
    }, /timeout/);
  });
});

test("detectBot", async function (t) {
  await t.test("should fail w/o options", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = detectBot();

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_union/);
  });

  await t.test("should fail w/o `allow` or `deny`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = detectBot({});

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_union/);
  });

  await t.test("should fail w/ `allow` and `deny`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = detectBot({ allow: ["CURL"], deny: ["CATEGORY:AI"] });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Unrecognized key\(s\) in object: 'deny'/);
  });

  await t.test("should work w/ `allow`", async function () {
    const rule = detectBot({ allow: ["CURL"] });

    assert.equal(rule.type, "bot");
    assert.deepEqual(rule.options, { allow: ["CURL"] });

    arcjet({ rules: [rule] });
  });

  await t.test("should work w/ `deny`", async function () {
    const rule = detectBot({ deny: ["CURL"] });

    assert.equal(rule.type, "bot");
    assert.deepEqual(rule.options, { deny: ["CURL"] });

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `mode`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = detectBot({ allow: ["CURL"], mode: "INVALID" });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Invalid enum value. Expected 'LIVE' \| 'DRY_RUN', received 'INVALID'/);
  });

  await t.test("should work w/ valid `mode`", async function () {
    const rule = detectBot({ allow: ["CURL"], mode: "LIVE" });

    assert.equal(rule.type, "bot");
    assert.deepEqual(rule.options, { allow: ["CURL"], mode: "LIVE" });

    arcjet({ rules: [rule] });
  });
});

test("filter", async function (t) {
  await t.test("should fail w/o options", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = filter();

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_union/);
  });

  await t.test("should fail w/o `allow` or `deny`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = filter({});

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_union/);
  });

  await t.test("should fail w/ `allow` and `deny`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = filter({
      allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
      deny: ['http.request.headers["user-agent"] ~ "Firefox"'],
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Unrecognized key\(s\) in object: 'deny'/);
  });

  await t.test("should work w/ `allow`", async function () {
    const rule = filter({
      allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
    });

    assert.equal(rule.type, "filter");
    assert.deepEqual(rule.options, {
      allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
    });

    arcjet({ rules: [rule] });
  });

  await t.test("should work w/ `deny`", async function () {
    const rule = filter({
      deny: ['http.request.headers["user-agent"] ~ "Firefox"'],
    });

    assert.equal(rule.type, "filter");
    assert.deepEqual(rule.options, {
      deny: ['http.request.headers["user-agent"] ~ "Firefox"'],
    });

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `mode`", async function () {
    const rule = filter({
      allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
      // @ts-expect-error: test runtime behavior.
      mode: "INVALID",
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /'LIVE' \| 'DRY_RUN'/);
  });

  await t.test("should work w/ valid `mode`", async function () {
    const rule = filter({
      allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
      mode: "LIVE",
    });

    assert.equal(rule.type, "filter");
    assert.deepEqual(rule.options, {
      allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
      mode: "LIVE",
    });

    arcjet({ rules: [rule] });
  });
});

test("fixedWindow", async function (t) {
  await t.test("should fail w/o options", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = fixedWindow();

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_type/);
  });

  await t.test("should fail w/o `max`, `window`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = fixedWindow({});

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_union/);
  });

  await t.test("should fail w/ `max`, w/o `window`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = fixedWindow({ max: 60 });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_union/);
  });

  await t.test("should fail w/o `max`, w/ `window`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = fixedWindow({ window: "30m" });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Required/);
  });

  await t.test("should work w/ `max`, `window`", async function () {
    const rule = fixedWindow({ max: 60, window: "30m" });

    assert.equal(rule.type, "fixedWindow");
    assert.deepEqual(rule.options, { max: 60, window: "30m" });

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `mode`", async function () {
    const rule = fixedWindow({
      max: 60,
      // @ts-expect-error: test runtime behavior.
      mode: "INVALID",
      window: "30m",
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /'LIVE' \| 'DRY_RUN'/);
  });

  await t.test("should work w/ valid `mode`", async function () {
    const rule = fixedWindow({
      max: 60,
      mode: "LIVE",
      window: "30m",
    });

    assert.equal(rule.type, "fixedWindow");
    assert.deepEqual(rule.options, {
      max: 60,
      mode: "LIVE",
      window: "30m",
    });

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `characteristics`", async function () {
    const rule = fixedWindow({
      // @ts-expect-error: test runtime behavior.
      characteristics: "INVALID",
      max: 60,
      window: "30m",
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Expected array, received string/);
  });

  await t.test("should work w/ valid `characteristics`", async function () {
    const rule = fixedWindow({
      characteristics: ["ip.src"],
      max: 60,
      window: "30m",
    });

    assert.equal(rule.type, "fixedWindow");
    assert.deepEqual(rule.options, {
      characteristics: ["ip.src"],
      max: 60,
      window: "30m",
    });

    arcjet({ rules: [rule] });
  });
});

test("protectSignup", async function (t) {
  await t.test("should fail w/o options", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = protectSignup();

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Required/);
  });

  await t.test(
    "should fail w/o `bots`, `email`, `rateLimit`",
    async function () {
      // @ts-expect-error: test runtime behavior.
      const rule = protectSignup({});

      assert.throws(function () {
        arcjet({ rules: [rule] });
      });
    },
  );

  await t.test(
    "should work w/ `bots`, `email`, `rateLimit`",
    async function () {
      const rule = protectSignup({
        bots: { allow: ["CURL"] },
        email: { allow: ["FREE", "NO_GRAVATAR"] },
        rateLimit: { interval: "30m", max: 60 },
      });

      assert.equal(rule.type, "protectSignup");
      assert.deepEqual(rule.options, {
        bots: { allow: ["CURL"] },
        email: { allow: ["FREE", "NO_GRAVATAR"] },
        rateLimit: { interval: "30m", max: 60 },
      });

      arcjet({ rules: [rule] });
    },
  );
});

test("sensitiveInfo", async function (t) {
  await t.test("should fail w/o options", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = sensitiveInfo();

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_union/);
  });

  await t.test("should fail w/o `allow` or `deny`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = sensitiveInfo({});

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_union/);
  });

  await t.test("should fail w/ `allow` and `deny`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = sensitiveInfo({ allow: ["EMAIL"], deny: ["PHONE_NUMBER"] });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Unrecognized key\(s\) in object: 'deny'/);
  });

  await t.test("should work w/ `allow`", async function () {
    const rule = sensitiveInfo({ allow: ["EMAIL"] });

    assert.equal(rule.type, "sensitiveInfo");
    assert.deepEqual(rule.options, { allow: ["EMAIL"] });

    arcjet({ rules: [rule] });
  });

  await t.test("should work w/ `deny`", async function () {
    const rule = sensitiveInfo({ deny: ["PHONE_NUMBER"] });

    assert.equal(rule.type, "sensitiveInfo");
    assert.deepEqual(rule.options, { deny: ["PHONE_NUMBER"] });

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `mode`", async function () {
    const rule = sensitiveInfo({
      allow: ["EMAIL"],
      // @ts-expect-error: test runtime behavior.
      mode: "INVALID",
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /'LIVE' \| 'DRY_RUN'/);
  });

  await t.test("should work w/ valid `mode`", async function () {
    const rule = sensitiveInfo({ allow: ["EMAIL"], mode: "LIVE" });

    assert.equal(rule.type, "sensitiveInfo");
    assert.deepEqual(rule.options, { allow: ["EMAIL"], mode: "LIVE" });

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `contextWindowSize`", async function () {
    const rule = sensitiveInfo({
      allow: ["EMAIL"],
      // @ts-expect-error: test runtime behavior.
      contextWindowSize: "INVALID",
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Expected number, received string/);
  });

  await t.test("should work w/ valid `contextWindowSize`", async function () {
    const rule = sensitiveInfo({ allow: ["EMAIL"], contextWindowSize: 3 });

    assert.equal(rule.type, "sensitiveInfo");
    assert.deepEqual(rule.options, { allow: ["EMAIL"], contextWindowSize: 3 });

    arcjet({ rules: [rule] });
  });

  await t.test(
    "should type error w/ custom entity in `allow`",
    async function () {
      const rule = sensitiveInfo({
        // @ts-expect-error: test type behavior.
        allow: ["custom-entity"],
      });

      arcjet({ rules: [rule] });
    },
  );

  await t.test(
    "should type error w/ custom entity in `deny`",
    async function () {
      const rule = sensitiveInfo({
        // @ts-expect-error: test type behavior.
        deny: ["custom-entity"],
      });

      arcjet({ rules: [rule] });
    },
  );

  await t.test("should type error w/ `detect`", async function () {
    const rule = sensitiveInfo({
      allow: [],
      // @ts-expect-error: test type behavior.
      detect() {
        return ["custom"];
      },
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Unrecognized key\(s\) in object: 'detect'/);
  });
});

test("shield", async function (t) {
  await t.test("should fail w/o options", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = shield();

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Required/);
  });

  await t.test("should work w/ empty options", async function () {
    const rule = shield({});

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `mode`", async function () {
    const rule = shield({
      // @ts-expect-error: test runtime behavior.
      mode: "INVALID",
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /'LIVE' \| 'DRY_RUN'/);
  });

  await t.test("should work w/ valid `mode`", async function () {
    const rule = shield({ mode: "LIVE" });

    assert.equal(rule.type, "shield");
    assert.deepEqual(rule.options, { mode: "LIVE" });

    arcjet({ rules: [rule] });
  });
});

test("slidingWindow", async function (t) {
  await t.test("should fail w/o options", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = slidingWindow();

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Required/);
  });

  await t.test("should fail w/o `interval`, `max`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = slidingWindow({});

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_union/);
  });

  await t.test("should fail w/o `interval`, w/ `max`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = slidingWindow({ max: 60 });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /invalid_union/);
  });

  await t.test("should fail w/ `interval`, w/o `max`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = slidingWindow({ interval: "30m" });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Required/);
  });

  await t.test("should work w/ `interval`, `max`", async function () {
    const rule = slidingWindow({ interval: "30m", max: 60 });

    assert.equal(rule.type, "slidingWindow");
    assert.deepEqual(rule.options, { interval: "30m", max: 60 });

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `mode`", async function () {
    const rule = slidingWindow({
      interval: "30m",
      max: 60,
      // @ts-expect-error: test runtime behavior.
      mode: "INVALID",
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /'LIVE' \| 'DRY_RUN'/);
  });

  await t.test("should work w/ valid `mode`", async function () {
    const rule = slidingWindow({
      interval: "30m",
      max: 60,
      mode: "LIVE",
    });

    assert.equal(rule.type, "slidingWindow");
    assert.deepEqual(rule.options, {
      interval: "30m",
      max: 60,
      mode: "LIVE",
    });

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `characteristics`", async function () {
    const rule = slidingWindow({
      // @ts-expect-error: test runtime behavior.
      characteristics: "INVALID",
      interval: "30m",
      max: 60,
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Expected array, received string/);
  });

  await t.test("should work w/ valid `characteristics`", async function () {
    const rule = slidingWindow({
      characteristics: ["ip.src"],
      interval: "30m",
      max: 60,
    });

    assert.equal(rule.type, "slidingWindow");
    assert.deepEqual(rule.options, {
      characteristics: ["ip.src"],
      interval: "30m",
      max: 60,
    });

    arcjet({ rules: [rule] });
  });
});

test("tokenBucket", async function (t) {
  await t.test("should fail w/o options", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = tokenBucket();

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Required/);
  });

  await t.test(
    "should fail w/o `capacity`, `interval`, `refillRate`",
    async function () {
      // @ts-expect-error: test runtime behavior.
      const rule = tokenBucket({});

      assert.throws(function () {
        arcjet({ rules: [rule] });
      });
    },
  );

  await t.test(
    "should work w/ `capacity`, `interval`, `refillRate`",
    async function () {
      const rule = tokenBucket({
        capacity: 50,
        interval: "1m",
        refillRate: 10,
      });

      assert.equal(rule.type, "tokenBucket");
      assert.deepEqual(rule.options, {
        capacity: 50,
        interval: "1m",
        refillRate: 10,
      });

      arcjet({ rules: [rule] });
    },
  );

  await t.test("should fail w/ invalid `mode`", async function () {
    const rule = tokenBucket({
      capacity: 50,
      interval: "1m",
      // @ts-expect-error: test runtime behavior.
      mode: "INVALID",
      refillRate: 10,
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /'LIVE' \| 'DRY_RUN'/);
  });

  await t.test("should work w/ valid `mode`", async function () {
    const rule = tokenBucket({
      capacity: 50,
      interval: "1m",
      mode: "LIVE",
      refillRate: 10,
    });

    assert.equal(rule.type, "tokenBucket");
    assert.deepEqual(rule.options, {
      capacity: 50,
      interval: "1m",
      mode: "LIVE",
      refillRate: 10,
    });

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `characteristics`", async function () {
    const rule = tokenBucket({
      capacity: 50,
      // @ts-expect-error: test runtime behavior.
      characteristics: "INVALID",
      interval: "1m",
      refillRate: 10,
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Expected array, received string/);
  });

  await t.test("should work w/ valid `characteristics`", async function () {
    const rule = tokenBucket({
      capacity: 50,
      characteristics: ["ip.src"],
      interval: "1m",
      refillRate: 10,
    });

    assert.equal(rule.type, "tokenBucket");
    assert.deepEqual(rule.options, {
      capacity: 50,
      characteristics: ["ip.src"],
      interval: "1m",
      refillRate: 10,
    });

    arcjet({ rules: [rule] });
  });
});

test("validateEmail", async function (t) {
  await t.test("should fail w/o options", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = validateEmail();

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Invalid input/);
  });

  await t.test("should fail w/o `allow` or `deny`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = validateEmail({});

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Invalid input/);
  });

  await t.test("should fail w/ `allow` and `deny`", async function () {
    // @ts-expect-error: test runtime behavior.
    const rule = validateEmail({
      allow: ["FREE", "NO_GRAVATAR"],
      deny: ["INVALID"],
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /Unrecognized key\(s\) in object: 'deny'/);
  });

  await t.test("should work w/ `allow`", async function () {
    const rule = validateEmail({ allow: ["FREE", "NO_GRAVATAR"] });

    assert.equal(rule.type, "email");
    assert.deepEqual(rule.options, { allow: ["FREE", "NO_GRAVATAR"] });

    arcjet({ rules: [rule] });
  });

  await t.test("should work w/ `deny`", async function () {
    const rule = validateEmail({ deny: ["INVALID"] });

    assert.equal(rule.type, "email");
    assert.deepEqual(rule.options, { deny: ["INVALID"] });

    arcjet({ rules: [rule] });
  });

  await t.test("should fail w/ invalid `mode`", async function () {
    const rule = validateEmail({
      allow: ["FREE", "NO_GRAVATAR"],
      // @ts-expect-error: test runtime behavior.
      mode: "INVALID",
    });

    assert.throws(function () {
      arcjet({ rules: [rule] });
    }, /'LIVE' \| 'DRY_RUN'/);
  });

  await t.test("should work w/ valid `mode`", async function () {
    const rule = validateEmail({
      allow: ["FREE", "NO_GRAVATAR"],
      mode: "LIVE",
    });

    assert.equal(rule.type, "email");
    assert.deepEqual(rule.options, {
      allow: ["FREE", "NO_GRAVATAR"],
      mode: "LIVE",
    });

    arcjet({ rules: [rule] });
  });

  await t.test(
    "should fail w/ invalid `allowDomainLiteral`",
    async function () {
      const rule = validateEmail({
        // @ts-expect-error: test runtime behavior.
        allowDomainLiteral: "INVALID",
        allow: ["FREE", "NO_GRAVATAR"],
      });

      assert.throws(function () {
        arcjet({ rules: [rule] });
      }, /Expected boolean, received string/);
    },
  );

  await t.test("should work w/ valid `allowDomainLiteral`", async function () {
    const rule = validateEmail({
      allowDomainLiteral: true,
      allow: ["FREE", "NO_GRAVATAR"],
    });

    assert.equal(rule.type, "email");
    assert.deepEqual(rule.options, {
      allowDomainLiteral: true,
      allow: ["FREE", "NO_GRAVATAR"],
    });

    arcjet({ rules: [rule] });
  });

  await t.test(
    "should fail w/ invalid `requireTopLevelDomain`",
    async function () {
      const rule = validateEmail({
        allow: ["FREE", "NO_GRAVATAR"],
        // @ts-expect-error: test runtime behavior.
        requireTopLevelDomain: "INVALID",
      });

      assert.throws(function () {
        arcjet({ rules: [rule] });
      }, /Expected boolean, received string/);
    },
  );

  await t.test(
    "should work w/ valid `requireTopLevelDomain`",
    async function () {
      const rule = validateEmail({
        allow: ["FREE", "NO_GRAVATAR"],
        requireTopLevelDomain: true,
      });

      assert.equal(rule.type, "email");
      assert.deepEqual(rule.options, {
        allow: ["FREE", "NO_GRAVATAR"],
        requireTopLevelDomain: true,
      });

      arcjet({ rules: [rule] });
    },
  );
});

test("@arcjet/astro", async function (t) {
  await t.test(
    "should create an integration that injects the configured rules",
    async function () {
      const rule = filter({
        allow: ['http.request.headers["user-agent"] ~ "Chrome"'],
        // Note: `mode` should be possible to omit.
        mode: "LIVE",
      });

      const client = arcjet({ rules: [rule] });

      const done = client.hooks["astro:config:done"];

      assert(done);

      let called = false;

      // @ts-expect-error: `config` and `setAdapter` are not used in our integration.
      await done({
        buildOutput: "server",
        injectTypes(injectedType) {
          assert.equal(injectedType.filename, "client.d.ts");
          assert.match(injectedType.content, /filter\(/);
          assert.match(
            injectedType.content,
            /http\.request\.headers\[\\"user-agent\\"] ~ \\"Chrome\\"/,
          );
          called = true;
          return new URL("about:blank");
        },
        logger: createLogger(),
      });

      assert.equal(called, true);

      // Create an interface that matches Astro loggers but does nothing.
      function createLogger() {
        return {
          fork() {
            return createLogger();
          },
          label: "",
          options: {
            dest: {
              write() {
                return true;
              },
            },
            level: "info" as const,
          },
          info() {},
          error() {},
          debug() {},
          warn() {},
        };
      }
    },
  );
});

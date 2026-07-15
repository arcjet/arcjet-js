import assert from "node:assert/strict";
import { describe, test, mock } from "node:test";

import { MemoryCache } from "@arcjet/cache";

import arcjet, {
  type ArcjetCacheEntry,
  ArcjetAllowDecision,
  ArcjetReason,
  ArcjetSensitiveInfoReason,
  sensitiveInfo,
} from "../dist/index.js";

class TestCache {
  get = mock.fn<() => Promise<[ArcjetCacheEntry | undefined, number]>>(async () => [undefined, 0]);
  set = mock.fn();
}

describe("Primitive > sensitiveInfo", () => {
  test("should throw w/o `options`", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      sensitiveInfo();
    }, /`sensitiveInfo` options error: expected object/);
  });

  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error
        mode: "INVALID",
        allow: [],
      });
    }, /`sensitiveInfo` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("validates `allow` option is an array if set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error
        allow: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `allow` - expected an array/);
  });

  test("validates `allow` option only contains strings", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error
        allow: [/foo/],
      });
    }, /`sensitiveInfo` options error: invalid type for `allow\[0]` - expected string/);
  });

  test("validates `deny` option is an array if set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error
        deny: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `deny` - expected an array/);
  });

  test("validates `deny` option only contains strings", async () => {
    assert.throws(() => {
      sensitiveInfo({
        // @ts-expect-error
        deny: [/foo/],
      });
    }, /`sensitiveInfo` options error: invalid type for `deny\[0]` - expected string/);
  });

  test("validates `contextWindowSize` option if set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        allow: [],
        // @ts-expect-error
        contextWindowSize: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `contextWindowSize` - expected number/);
  });

  test("validates `detect` option if set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        allow: [],
        // @ts-expect-error
        detect: "abc",
      });
    }, /`sensitiveInfo` options error: invalid type for `detect` - expected function/);
  });

  test("validates `allow` and `deny` options are not specified together", async () => {
    assert.throws(() => {
      const _ = sensitiveInfo(
        // @ts-expect-error
        {
          allow: [],
          deny: [],
        },
      );
    }, /`sensitiveInfo` options error: `allow` and `deny` cannot be provided together/);
  });

  test("validates either `allow` or `deny` option is specified", async () => {
    assert.throws(() => {
      const _ = sensitiveInfo(
        // @ts-expect-error
        {},
      );
    }, /`sensitiveInfo` options error: either `allow` or `deny` must be specified/);
  });

  test("allows the four native types without a backend", () => {
    assert.doesNotThrow(() =>
      sensitiveInfo({
        deny: ["EMAIL", "PHONE_NUMBER", "IP_ADDRESS", "CREDIT_CARD_NUMBER"],
      }),
    );
  });

  test("throws when a backend-only type is listed without a backend or detect", () => {
    assert.throws(
      () => sensitiveInfo({ deny: ["GIVEN_NAME"] }),
      /options error: the "GIVEN_NAME" type is only detected when a `backend`/,
    );
    assert.throws(
      () => sensitiveInfo({ allow: ["SSN"] }),
      /options error: the "SSN" type is only detected when a `backend`/,
    );
  });

  test("lists every unsupported type in the error, without duplicates", () => {
    assert.throws(
      () => sensitiveInfo({ deny: ["GIVEN_NAME", "SURNAME", "GIVEN_NAME"] }),
      /the "GIVEN_NAME", "SURNAME" types are only detected/,
    );
  });

  test("does not throw for backend-only types when a backend is configured", () => {
    assert.doesNotThrow(() =>
      sensitiveInfo({
        deny: ["GIVEN_NAME", "SSN"],
        backend: {
          detect() {
            return Promise.resolve({ allowed: [], denied: [] });
          },
        },
      }),
    );
  });

  test("does not throw for backend-only types when a custom detect is provided", () => {
    assert.doesNotThrow(() =>
      sensitiveInfo({
        deny: ["GIVEN_NAME"],
        detect: () => [],
      }),
    );
  });

  test("ignores unknown custom entity strings (pre-existing behavior)", () => {
    assert.doesNotThrow(() =>
      // A custom string that is not a built-in type is left alone — the
      // backend-support check only covers known backend-only types.
      sensitiveInfo<"MY_CUSTOM_THING">({ deny: ["MY_CUSTOM_THING"] }),
    );
  });

  test("does not throw via `validate()`", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const details = {
      cookies: "",
      email: undefined,
      extra: {},
      headers: new Headers(),
      host: "localhost:3000",
      ip: "127.0.0.1",
      method: "GET",
      path: "/",
      protocol: "http:",
      query: "",
    };

    const [rule] = sensitiveInfo({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "SENSITIVE_INFO");
    assert.doesNotThrow(() => {
      const _ = rule.validate(context, details);
    });
  });

  test("throws if `extra` is not an object in `validate()`", function () {
    const context = {
      cache: new MemoryCache<ArcjetCacheEntry>(),
      characteristics: [],
      fingerprint: "",
      async getBody() {
        throw new Error("Not implemented");
      },
      key: "",
      log: createMockLogger(),
      runtime: "",
    };
    const details = {
      cookies: "",
      email: undefined,
      extra: 1,
      headers: new Headers(),
      host: "localhost:3000",
      ip: "127.0.0.1",
      method: "GET",
      path: "/",
      protocol: "http:",
      query: "",
    };
    const [rule] = sensitiveInfo({ mode: "LIVE", allow: [] });

    assert.throws(function () {
      const _ = rule.validate(context, details);
    }, /`details` options error: invalid value for `extra` - expected plain object/);
  });

  test("allows specifying sensitive info entities to allow", async () => {
    const [rule] = sensitiveInfo({
      allow: ["EMAIL", "CREDIT_CARD_NUMBER"],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
  });

  test("produces a dry run result in DRY_RUN mode", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () =>
        Promise.resolve("127.0.0.1 test@example.com 4242424242424242 +353 87 123 4567"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "DRY_RUN",
      allow: [],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, [
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
    ]);
    assert.equal(result.state, "DRY_RUN");
  });

  test("it doesnt detect any entities in a non sensitive body", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () => Promise.resolve("none of this is sensitive"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.state, "RUN");
  });

  test("it identifies built-in entities", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () =>
        Promise.resolve("127.0.0.1 test@example.com 4242424242424242 +353 87 123 4567"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, [
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
    ]);
    assert.equal(result.state, "RUN");
  });

  test("it allows entities on the allow list", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () =>
        Promise.resolve("127.0.0.1 test@example.com 4242424242424242 +353 87 123 4567"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, [
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
    ]);
    assert.deepEqual(result.reason.denied, [
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
    ]);
    assert.equal(result.state, "RUN");
  });

  test("it returns an allow decision when all identified types are allowed", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () => Promise.resolve("test@example.com +353 87 123 4567"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, [
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
    ]);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.state, "RUN");
  });

  test("it only denies listed entities when deny mode is set", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () => Promise.resolve("127.0.0.1 test@example.com +353 87 123 4567"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, [
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
    ]);
    assert.deepEqual(result.reason.denied, [
      {
        start: 0,
        end: 9,
        identifiedType: "IP_ADDRESS",
      },
    ]);
    assert.equal(result.state, "RUN");
  });

  test("it returns a deny decision in deny mode when an entity is matched", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () => Promise.resolve("test@example.com +353 87 123 4567"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, [
      {
        start: 17,
        end: 33,
        identifiedType: "PHONE_NUMBER",
      },
    ]);
    assert.deepEqual(result.reason.denied, [
      {
        start: 0,
        end: 16,
        identifiedType: "EMAIL",
      },
    ]);
    assert.equal(result.state, "RUN");
  });

  test("it blocks entities identified by a custom function", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () => Promise.resolve("this is bad"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      deny: ["CUSTOM"],
      contextWindowSize: 1,
      detect(tokens: string[]) {
        return tokens.map((token) => {
          if (token === "bad") {
            return "CUSTOM";
          }
        });
      },
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, [
      {
        start: 8,
        end: 11,
        identifiedType: "CUSTOM",
      },
    ]);
    assert.equal(result.state, "RUN");
  });

  test("it throws when custom function returns non-string", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () => Promise.resolve("this is bad"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
      // @ts-expect-error
      detect(tokens: string[]) {
        return tokens.map((token) => {
          if (token === "bad") {
            return 12345;
          }
        });
      },
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    await assert.rejects(async () => {
      const _ = await rule.protect(context, details);
    }, new Error("invalid entity type"));
  });

  test("it allows custom entities identified by a function that would have otherwise been blocked", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () => Promise.resolve("my email is test@example.com"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: {},
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: ["custom"],
      detect(tokens: string[]) {
        return tokens.map((token) => {
          if (token === "test@example.com") {
            return "custom";
          }
        });
      },
      contextWindowSize: 1,
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, [
      {
        start: 12,
        end: 28,
        identifiedType: "custom",
      },
    ]);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.state, "RUN");
  });

  test("it provides the right size context window", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () => Promise.resolve("my email is test@example.com"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
      detect(tokens: string[]) {
        assert.equal(tokens.length, 3);
        return tokens.map(() => undefined);
      },
      contextWindowSize: 3,
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    await rule.protect(context, details);
  });

  test("it returns an error decision when body is not available", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
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
    assert.equal(rule.type, "SENSITIVE_INFO");
    const decision = await rule.protect(context, details);
    assert.equal(decision.ttl, 0);
    assert.equal(decision.state, "NOT_RUN");
    assert.equal(decision.conclusion, "ERROR");
  });

  // Sensitive info detection is dynamic so all TTL are zero
  test("does not use cache", async () => {
    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetSensitiveInfoReason({
          allowed: [],
          denied: [],
        }),
      },
      10,
    ]);
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache,
      getBody: () => Promise.resolve("nothing to detect"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "SENSITIVE_INFO");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 0);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.state, "RUN");
  });

  test("should support `sensitiveInfoValue`", async function () {
    let getBodyCalled = false;
    const context = {
      cache: new MemoryCache<ArcjetCacheEntry>(),
      characteristics: [],
      fingerprint: "",
      async getBody() {
        getBodyCalled = true;
        return "";
      },
      key: "",
      log: console,
      runtime: "",
    };
    const details = {
      cookies: "",
      extra: {},
      headers: new Headers(),
      host: "example.com",
      ip: "1.1.1.1",
      method: "GET",
      path: "/",
      protocol: "http:",
      query: "",
    };

    const [rule] = sensitiveInfo({ allow: [], mode: "LIVE" });
    const resultOk = await rule.protect(context, {
      ...details,
      extra: { sensitiveInfoValue: "Nothing to detect" },
    });
    assert.equal(getBodyCalled, false);
    assert.equal(resultOk.conclusion, "ALLOW");
    const resultNok = await rule.protect(context, {
      ...details,
      extra: { sensitiveInfoValue: "Hi alice@arcjet.com." },
    });
    assert.equal(getBodyCalled, false);
    assert.equal(resultNok.conclusion, "DENY");
  });

  test("should not pass `sensitiveInfoValue` to `decide`", async function () {
    const key = "";
    const log = { ...console, debug() {} };
    let extra: unknown;

    const arcjetClient = arcjet({
      key,
      rules: [sensitiveInfo({ allow: [], mode: "LIVE" })],
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

    await arcjetClient.protect(
      {
        cache: new MemoryCache<ArcjetCacheEntry>(),
        characteristics: [],
        fingerprint: "",
        async getBody() {
          return "";
        },
        key,
        log,
        runtime: "",
      },
      {
        cookies: "",
        headers: new Headers(),
        host: "example.com",
        ip: "1.1.1.1",
        method: "GET",
        path: "/",
        protocol: "http:",
        query: "",
        sensitiveInfoValue: "Is this sent to the server?",
      },
    );

    assert.deepEqual(extra, { sensitiveInfoValue: "<redacted>" });
  });

  test("should not pass `sensitiveInfoValue` to `report`", async function () {
    const key = "";
    const log = { ...console, debug() {} };
    let extra: unknown;

    const arcjetClient = arcjet({
      key,
      rules: [sensitiveInfo({ allow: [], mode: "LIVE" })],
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

    await arcjetClient.protect(
      {
        cache: new MemoryCache<ArcjetCacheEntry>(),
        characteristics: [],
        fingerprint: "",
        async getBody() {
          return "";
        },
        key,
        log,
        runtime: "",
      },
      {
        cookies: "",
        headers: new Headers(),
        host: "example.com",
        ip: "1.1.1.1",
        method: "GET",
        path: "/",
        protocol: "http:",
        query: "",
        sensitiveInfoValue: "Is alice@arcjet.com sent to the server?",
      },
    );

    assert.deepEqual(extra, { sensitiveInfoValue: "<redacted>" });
  });

  test("validates the `backend` option if set", async () => {
    assert.throws(() => {
      sensitiveInfo({
        deny: [],
        // @ts-expect-error: test runtime behavior.
        backend: "nope",
      });
    }, /`sensitiveInfo` options error: invalid type for `backend` - expected an object with a `detect` function/);
  });

  test("uses a custom `backend` to drive the result", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache<ArcjetCacheEntry>(),
      getBody: () => Promise.resolve("unused"),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      extra: { sensitiveInfoValue: "Hi Alex" },
    };

    let seenValue: string | undefined;
    const backend = {
      detect: mock.fn(async (_context: unknown, value: string) => {
        seenValue = value;
        return {
          allowed: [],
          denied: [
            {
              start: 3,
              end: 7,
              identifiedType: { tag: "custom" as const, val: "GIVEN_NAME" },
            },
          ],
        };
      }),
    };

    const [rule] = sensitiveInfo({
      mode: "LIVE",
      deny: ["GIVEN_NAME"],
      backend,
    });

    const result = await rule.protect(context, details);

    // The custom backend was used instead of the default WebAssembly engine.
    assert.equal(backend.detect.mock.callCount(), 1);
    assert.equal(seenValue, "Hi Alex");

    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetSensitiveInfoReason);
    // The custom entity is reported with its plain string type.
    assert.deepEqual(result.reason.denied, [{ start: 3, end: 7, identifiedType: "GIVEN_NAME" }]);
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

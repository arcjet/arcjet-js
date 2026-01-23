import assert from "node:assert/strict";
import { describe, test, mock } from "node:test";
import { MemoryCache } from "@arcjet/cache";
import { ArcjetBotReason, detectBot } from "../index.js";

describe("Primitive > detectBot", () => {
  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      detectBot({
        // @ts-expect-error
        mode: "INVALID",
        allow: [],
      });
    }, /`detectBot` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("validates `allow` option is array if set", async () => {
    assert.throws(() => {
      const _ = detectBot({
        // @ts-expect-error
        allow: "abc",
      });
    }, /detectBot` options error: invalid type for `allow` - expected an array/);
  });

  test("validates `allow` option only contains strings", async () => {
    assert.throws(() => {
      const _ = detectBot({
        // @ts-expect-error
        allow: [/abc/],
      });
    }, /detectBot` options error: invalid type for `allow\[0]` - expected string/);
  });

  test("validates `deny` option is an array if set", async () => {
    assert.throws(() => {
      const _ = detectBot({
        // @ts-expect-error
        deny: "abc",
      });
    }, /detectBot` options error: invalid type for `deny` - expected an array/);
  });

  test("validates `deny` option only contains strings", async () => {
    assert.throws(() => {
      const _ = detectBot({
        // @ts-expect-error
        deny: [/abc/],
      });
    }, /detectBot` options error: invalid type for `deny\[0]` - expected string/);
  });

  test("validates `allow` and `deny` options are not specified together", async () => {
    assert.throws(() => {
      const _ = detectBot(
        // @ts-expect-error
        {
          allow: ["CURL"],
          deny: ["GOOGLE_ADSBOT"],
        },
      );
    }, /`detectBot` options error: `allow` and `deny` cannot be provided together/);
  });

  test("validates either `allow` or `deny` option is specified", async () => {
    assert.throws(() => {
      const _ = detectBot(
        // @ts-expect-error
        {},
      );
    }, /`detectBot` options error: either `allow` or `deny` must be specified/);
  });

  test("throws via `validate()` if headers is undefined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache(),
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const details = {
      headers: undefined,
    };

    const [rule] = detectBot({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "BOT");
    assert.throws(() => {
      const _ = rule.validate(context, details);
    });
  });

  test("throws via `validate()` if headers does not extend Headers", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache(),
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const details = {
      cookies: "",
      extra: {},
      headers: {},
      host: "localhost:3000",
      ip: "127.0.0.1",
      method: "GET",
      path: "/",
      protocol: "http:",
      query: "",
    };

    const [rule] = detectBot({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "BOT");
    assert.throws(() => {
      const _ = rule.validate(context, details);
    }, /invalid value for `headers` - expected headers object with method/);
  });

  test("throws via `validate()` if user-agent header is missing", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache(),
      getBody() {
        throw new Error("Not implemented");
      },
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

    const [rule] = detectBot({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "BOT");
    assert.throws(() => {
      const _ = rule.validate(context, details);
    });
  });

  test("uses cache", async () => {
    class TestCache {
      get = mock.fn<() => Promise<[unknown, number]>>(async () => [
        undefined,
        0,
      ]);
      set = mock.fn();
    }

    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetBotReason({
          allowed: [],
          denied: ["CURL"],
          verified: false,
          spoofed: false,
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
      getBody() {
        throw new Error("Not implemented");
      },
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

    const [rule] = detectBot({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "BOT");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 1);
    assert.deepEqual(cache.get.mock.calls[0].arguments, [
      "84d7c3e132098fafcd8076e0d70154224336f5de91e23c1e538f203e5e46735f",
      "test-fingerprint",
    ]);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, ["CURL"]);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "CACHED");
    assert.equal(result.ttl, 10);
  });

  test("denies curl", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache(),
      getBody() {
        throw new Error("Not implemented");
      },
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

    const [rule] = detectBot({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "BOT");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, ["CURL"]);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "RUN");
  });

  test("produces a dry run result in DRY_RUN mode", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache(),
      getBody() {
        throw new Error("Not implemented");
      },
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

    const [rule] = detectBot({
      mode: "DRY_RUN",
      allow: [],
    });
    assert.equal(rule.type, "BOT");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, []);
    assert.deepEqual(result.reason.denied, ["CURL"]);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "DRY_RUN");
  });

  test("only denies CURL if configured", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache(),
      getBody() {
        throw new Error("Not implemented");
      },
    };
    const curlDetails = {
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
    const googlebotDetails = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Googlebot/2.0"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
    };

    const [rule] = detectBot({
      mode: "LIVE",
      deny: ["CURL"],
    });
    assert.equal(rule.type, "BOT");
    const curlResult = await rule.protect(context, curlDetails);
    assert.equal(curlResult.conclusion, "DENY");
    assert.ok(curlResult.reason instanceof ArcjetBotReason);
    assert.deepEqual(curlResult.reason.allowed, []);
    assert.deepEqual(curlResult.reason.denied, ["CURL"]);
    assert.equal(curlResult.reason.spoofed, false);
    assert.equal(curlResult.reason.verified, false);
    assert.equal(curlResult.state, "RUN");
    const googlebotResults = await rule.protect(context, googlebotDetails);
    assert.equal(googlebotResults.conclusion, "ALLOW");
    assert.ok(googlebotResults.reason instanceof ArcjetBotReason);
    assert.deepEqual(googlebotResults.reason.allowed, ["GOOGLE_CRAWLER"]);
    assert.deepEqual(googlebotResults.reason.denied, []);
    assert.equal(googlebotResults.reason.spoofed, false);
    assert.equal(googlebotResults.reason.verified, false);
    assert.equal(googlebotResults.state, "RUN");
  });

  test("can be configured to allow curl", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      runtime: "test",
      log: createMockLogger(),
      characteristics: [],
      cache: new MemoryCache(),
      getBody() {
        throw new Error("Not implemented");
      },
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

    const [rule] = detectBot({
      mode: "LIVE",
      allow: ["CURL"],
    });
    assert.equal(rule.type, "BOT");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetBotReason);
    assert.deepEqual(result.reason.allowed, ["CURL"]);
    assert.deepEqual(result.reason.denied, []);
    assert.equal(result.reason.spoofed, false);
    assert.equal(result.reason.verified, false);
    assert.equal(result.state, "RUN");
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

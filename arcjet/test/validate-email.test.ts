import assert from "node:assert/strict";
import { describe, test, mock } from "node:test";
import { MemoryCache } from "@arcjet/cache";
import { ArcjetEmailReason, validateEmail } from "../index.js";

class TestCache {
  get = mock.fn<() => Promise<[unknown, number]>>(async () => [undefined, 0]);
  set = mock.fn();
}

describe("Primitive > validateEmail", () => {
  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        mode: "INVALID",
      });
    }, /`validateEmail` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("validates `deny` option is array if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        deny: 1234,
      });
    }, /`validateEmail` options error: invalid type for `deny` - expected an array/);
  });

  test("validates `allow` option is array if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        allow: 1234,
      });
    }, /`validateEmail` options error: invalid type for `allow` - expected an array/);
  });

  test("validates `deny` option only contains specific values", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        deny: ["FOOBAR"],
      });
    }, /`validateEmail` options error: invalid value for `deny\[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'/);
  });

  test("validates `allow` option only contains specific values", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        allow: ["FOOBAR"],
      });
    }, /`validateEmail` options error: invalid value for `allow\[0]` - expected one of 'DISPOSABLE', 'FREE', 'NO_MX_RECORDS', 'NO_GRAVATAR', 'INVALID'/);
  });

  test("validates `allow` and `deny` cannot be set at the same time", async () => {
    assert.throws(() => {
      // @ts-expect-error
      validateEmail({
        allow: ["INVALID"],
        deny: ["INVALID"],
      });
    }, /`validateEmail` options error: `allow` and `deny` cannot be provided together/);
  });

  test("validates `requireTopLevelDomain` option if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        requireTopLevelDomain: "abc",
      });
    }, /`validateEmail` options error: invalid type for `requireTopLevelDomain` - expected boolean/);
  });

  test("validates `allowDomainLiteral` option if it is set", async () => {
    assert.throws(() => {
      validateEmail({
        // @ts-expect-error
        allowDomainLiteral: "abc",
      });
    }, /`validateEmail` options error: invalid type for `allowDomainLiteral` - expected boolean/);
  });

  test("allows specifying EmailTypes to deny", async () => {
    const [rule] = validateEmail({
      deny: ["DISPOSABLE", "FREE", "NO_GRAVATAR", "NO_MX_RECORDS", "INVALID"],
    });
    assert.equal(rule.type, "EMAIL");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.deny, [
      "DISPOSABLE",
      "FREE",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
      "INVALID",
    ]);
  });

  test("allows specifying EmailTypes to allow", async () => {
    const [rule] = validateEmail({
      allow: ["DISPOSABLE", "FREE", "NO_GRAVATAR", "NO_MX_RECORDS", "INVALID"],
    });
    assert.equal(rule.type, "EMAIL");
    // @ts-expect-error: TODO(#4452): fix types to allow access of properties.
    assert.deepEqual(rule.allow, [
      "DISPOSABLE",
      "FREE",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
      "INVALID",
    ]);
  });

  test("validates that email is defined", () => {
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
      email: "abc@example.com",
      extra: {},
      headers: new Headers(),
      host: "localhost:3000",
      ip: "127.0.0.1",
      method: "GET",
      path: "/",
      protocol: "http:",
      query: "",
    };

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    assert.equal(rule.type, "EMAIL");
    assert.doesNotThrow(() => {
      const _ = rule.validate(context, details);
    });
  });

  test("throws via `validate()` if email is undefined", () => {
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
      email: undefined,
    };

    const [rule] = validateEmail({ mode: "LIVE", deny: [] });
    assert.equal(rule.type, "EMAIL");
    assert.throws(() => {
      const _ = rule.validate(context, details);
    });
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "DRY_RUN", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "DRY_RUN");
  });

  test("allows a valid email", async () => {
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@example.com",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, []);
    assert.equal(result.state, "RUN");
  });

  test("denies email with no domain segment", async () => {
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  test("denies email with no TLD", async () => {
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@localhost",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  test("denies email with no TLD even if some options are specified", async () => {
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@localhost",
      extra: {},
    };

    const [rule] = validateEmail({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  test("denies email with empty name segment", async () => {
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "@example.com",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  test("denies email with domain literal", async () => {
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@[127.0.0.1]",
      extra: {},
    };

    const [rule] = validateEmail({ mode: "LIVE", allow: [] });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, ["INVALID"]);
    assert.equal(result.state, "RUN");
  });

  test("can be configured to allow no TLD", async () => {
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@localhost",
      extra: {},
    };

    const [rule] = validateEmail({
      requireTopLevelDomain: false,
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, []);
  });

  test("can be configured to allow domain literals", async () => {
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      cookies: "",
      query: "",
      email: "foobarbaz@[127.0.0.1]",
      extra: {},
    };

    const [rule] = validateEmail({
      allowDomainLiteral: true,
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, []);
    assert.equal(result.state, "RUN");
  });

  // Email validation is dynamic so all TTL are zero
  test("does not use cache", async () => {
    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetEmailReason({
          emailTypes: ["INVALID"],
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
      protocol: "http:",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      cookies: "",
      query: "",
      extra: {
        "extra-test": "extra-test-value",
      },
      email: "test@example.com",
    };

    const [rule] = validateEmail({
      mode: "LIVE",
      allow: [],
    });
    assert.equal(rule.type, "EMAIL");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 0);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetEmailReason);
    assert.deepEqual(result.reason.emailTypes, []);
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

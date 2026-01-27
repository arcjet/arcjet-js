import assert from "node:assert/strict";
import { describe, test, mock } from "node:test";
import { ArcjetShieldReason, shield } from "../index.js";

class TestCache {
  get = mock.fn<() => Promise<[unknown, number]>>(async () => [undefined, 0]);
  set = mock.fn();
}

describe("Primitive > shield", () => {
  test("validates `mode` option if it is set", async () => {
    assert.throws(() => {
      shield({
        // @ts-expect-error
        mode: "INVALID",
      });
    }, /`shield` options error: invalid value for `mode` - expected one of 'LIVE', 'DRY_RUN'/);
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = shield({
      mode: "LIVE",
    });
    assert.equal(rule.type, "SHIELD");
    assert.equal(rule.mode, "LIVE");
  });

  test("sets mode as `DRY_RUN` if not specified", async () => {
    const [rule] = shield({});
    assert.equal(rule.type, "SHIELD");
    assert.equal(rule.mode, "DRY_RUN");
  });

  test("uses cache", async () => {
    const cache = new TestCache();
    mock.method(cache, "get", async () => [
      {
        conclusion: "DENY",
        reason: new ArcjetShieldReason({
          shieldTriggered: true,
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
    };

    const [rule] = shield({
      mode: "LIVE",
    });
    assert.equal(rule.type, "SHIELD");
    const result = await rule.protect(context, details);
    assert.equal(cache.get.mock.callCount(), 1);
    assert.deepEqual(cache.get.mock.calls[0].arguments, [
      "1a506ff95a8c2017894fcb6cc3be55053b144bd15666631945a5c453c477bd16",
      "fp::2::516289fae7993d35ffb6e76883e09b475bbc7a622a378f3b430f35e8c657687e",
    ]);
    assert.equal(result.conclusion, "DENY");
    assert.ok(result.reason instanceof ArcjetShieldReason);
    assert.equal(result.reason.shieldTriggered, true);
    assert.equal(result.state, "CACHED");
    assert.equal(result.ttl, 10);
  });

  test("does not run rule locally", async () => {
    const cache = new TestCache();
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
    };

    const [rule] = shield({
      mode: "LIVE",
    });
    assert.equal(rule.type, "SHIELD");
    const result = await rule.protect(context, details);
    assert.equal(result.conclusion, "ALLOW");
    assert.ok(result.reason instanceof ArcjetShieldReason);
    assert.equal(result.reason.shieldTriggered, false);
    assert.equal(result.state, "NOT_RUN");
    assert.equal(result.ttl, 0);
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

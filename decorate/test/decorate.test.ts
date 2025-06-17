import assert from "node:assert/strict";
import { describe, test, mock } from "node:test";
import { setRateLimitHeaders } from "../index";
import {
  ArcjetAllowDecision,
  ArcjetRateLimitReason,
  ArcjetReason,
  ArcjetRuleResult,
} from "@arcjet/protocol";
import { OutgoingMessage } from "http";

function noop() {}

describe("setRateLimitHeaders", () => {
  describe("Header object", () => {
    test("empty results do not set headers", () => {
      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("no rate limit results do not set headers", () => {
      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetReason(),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("does not error if headers is missing `has` function", () => {
      const headers = {
        get: mock.fn((name: string) => null),
        set: mock.fn((name: string, value: string) => null),
      };

      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.get.mock.callCount(), 0);
      assert.equal(headers.set.mock.callCount(), 0);
    });

    test("does not error if headers is missing `get` function", () => {
      const headers = {
        has: mock.fn((name: string) => false),
        set: mock.fn((name: string, value: string) => null),
      };

      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has.mock.callCount(), 0);
      assert.equal(headers.set.mock.callCount(), 0);
    });

    test("does not error if headers is missing `set` function", () => {
      const headers = {
        has: mock.fn((name: string) => false),
        get: mock.fn((name: string) => null),
      };

      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has.mock.callCount(), 0);
      assert.equal(headers.get.mock.callCount(), 0);
    });

    test("duplicate rate limit policies do not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `max` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                // @ts-expect-error
                max: { abc: "xyz" },
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `window` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                // @ts-expect-error
                window: { abc: "xyz" },
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `remaining` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                // @ts-expect-error
                remaining: { abc: "xyz" },
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `reset` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                // @ts-expect-error
                reset: { abc: "xyz" },
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("adds rate limit headers when only top-level reason exists", () => {
      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            remaining: 0,
            reset: 100,
            window: 100,
          }),
        }),
      );
      assert.equal(headers.has("RateLimit"), true);
      assert.equal(headers.get("RateLimit"), "limit=1, remaining=0, reset=100");
      assert.equal(headers.has("RateLimit-Policy"), true);
      assert.equal(headers.get("RateLimit-Policy"), "1;w=100");
    });

    test("invalid rate limit reason `max` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            // @ts-expect-error
            max: { abc: "xyz" },
            remaining: 0,
            reset: 100,
            window: 100,
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit reason `window` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            remaining: 0,
            reset: 100,
            // @ts-expect-error
            window: { abc: "xyz" },
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit reason `remaining` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            // @ts-expect-error
            remaining: { abc: "xyz" },
            reset: 100,
            window: 100,
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit reason `reset` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            remaining: 0,
            // @ts-expect-error
            reset: { abc: "xyz" },
            window: 100,
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), false);
      assert.equal(headers.has("RateLimit-Policy"), false);
    });

    test("adds rate limit headers when result exists", () => {
      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has("RateLimit"), true);
      assert.equal(headers.get("RateLimit"), "limit=1, remaining=0, reset=100");
      assert.equal(headers.has("RateLimit-Policy"), true);
      assert.equal(headers.get("RateLimit-Policy"), "1;w=100");
    });

    test("selects nearest limit and sets multiple policies when multiple rate limit headers results exist", () => {
      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has("RateLimit"), true);
      assert.equal(headers.get("RateLimit"), "limit=1, remaining=0, reset=100");
      assert.equal(headers.has("RateLimit-Policy"), true);
      assert.equal(headers.get("RateLimit-Policy"), "1;w=100, 100;w=1000");
    });

    test("selects nearest limit in any order", () => {
      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has("RateLimit"), true);
      assert.equal(headers.get("RateLimit"), "limit=1, remaining=0, reset=100");
      assert.equal(headers.has("RateLimit-Policy"), true);
      assert.equal(headers.get("RateLimit-Policy"), "1;w=100, 100;w=1000");
    });

    test("selects nearest reset if remaining are equal", () => {
      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has("RateLimit"), true);
      assert.equal(
        headers.get("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(headers.has("RateLimit-Policy"), true);
      assert.equal(headers.get("RateLimit-Policy"), "100;w=100, 1000;w=1000");
    });

    test("selects nearest reset in any order", () => {
      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has("RateLimit"), true);
      assert.equal(
        headers.get("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(headers.has("RateLimit-Policy"), true);
      assert.equal(headers.get("RateLimit-Policy"), "100;w=100, 1000;w=1000");
    });

    test("selects lowest max if reset are equal", () => {
      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 100,
                window: 1000,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has("RateLimit"), true);
      assert.equal(
        headers.get("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(headers.has("RateLimit-Policy"), true);
      assert.equal(headers.get("RateLimit-Policy"), "100;w=100, 1000;w=1000");
    });

    test("selects lowest max in any order", () => {
      const headers = new Headers();
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 100,
                window: 1000,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(headers.has("RateLimit"), true);
      assert.equal(
        headers.get("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(headers.has("RateLimit-Policy"), true);
      assert.equal(headers.get("RateLimit-Policy"), "100;w=100, 1000;w=1000");
    });

    test("warns but adds the rate limit header if RateLimit already exists", () => {
      const warnLogSpy = mock.method(console, "warn", noop);

      const headers = new Headers();
      headers.set("RateLimit", "abcXYZ");
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(warnLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), true);
      assert.equal(headers.get("RateLimit"), "limit=1, remaining=0, reset=100");
      assert.equal(headers.has("RateLimit-Policy"), true);
      assert.equal(headers.get("RateLimit-Policy"), "1;w=100");
    });

    test("warns but adds the rate limit header if RateLimit-Policy already exists", () => {
      const warnLogSpy = mock.method(console, "warn", noop);

      const headers = new Headers();
      headers.set("RateLimit-Policy", "abcXYZ");
      setRateLimitHeaders(
        headers,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(warnLogSpy.mock.callCount(), 1);
      assert.equal(headers.has("RateLimit"), true);
      assert.equal(headers.get("RateLimit"), "limit=1, remaining=0, reset=100");
      assert.equal(headers.has("RateLimit-Policy"), true);
      assert.equal(headers.get("RateLimit-Policy"), "1;w=100");
    });
  });

  describe("Response object", () => {
    test("empty results do not set headers", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("no rate limit results do not set headers", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetReason(),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("does not error if headers is undefined", () => {
      const resp = {};
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.deepEqual(resp, {});
    });

    test("does not error if headers is not Headers-like", () => {
      const resp = { headers: {} };
      setRateLimitHeaders(
        // @ts-expect-error
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.deepEqual(resp, { headers: {} });
    });

    test("duplicate rate limit policies do not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `max` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                // @ts-expect-error
                max: { abc: "xyz" },
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `window` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                // @ts-expect-error
                window: { abc: "xyz" },
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `remaining` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                // @ts-expect-error
                remaining: { abc: "xyz" },
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `reset` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                // @ts-expect-error
                reset: { abc: "xyz" },
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("adds rate limit headers when only top-level reason exists", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            remaining: 0,
            reset: 100,
            window: 100,
          }),
        }),
      );
      assert.equal(resp.headers.has("RateLimit"), true);
      assert.equal(
        resp.headers.get("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.headers.has("RateLimit-Policy"), true);
      assert.equal(resp.headers.get("RateLimit-Policy"), "1;w=100");
    });

    test("invalid rate limit reason `max` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            // @ts-expect-error
            max: { abc: "xyz" },
            remaining: 0,
            reset: 100,
            window: 100,
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit reason `window` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            remaining: 0,
            reset: 100,
            // @ts-expect-error
            window: { abc: "xyz" },
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit reason `remaining` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            // @ts-expect-error
            remaining: { abc: "xyz" },
            reset: 100,
            window: 100,
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("invalid rate limit reason `reset` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            remaining: 0,
            // @ts-expect-error
            reset: { abc: "xyz" },
            window: 100,
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), false);
      assert.equal(resp.headers.has("RateLimit-Policy"), false);
    });

    test("adds rate limit headers when result exists", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.headers.has("RateLimit"), true);
      assert.equal(
        resp.headers.get("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.headers.has("RateLimit-Policy"), true);
      assert.equal(resp.headers.get("RateLimit-Policy"), "1;w=100");
    });

    test("selects nearest limit and sets multiple policies when multiple rate limit headers results exist", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.headers.has("RateLimit"), true);
      assert.equal(
        resp.headers.get("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.headers.has("RateLimit-Policy"), true);
      assert.equal(resp.headers.get("RateLimit-Policy"), "1;w=100, 100;w=1000");
    });

    test("selects nearest limit in any order", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.headers.has("RateLimit"), true);
      assert.equal(
        resp.headers.get("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.headers.has("RateLimit-Policy"), true);
      assert.equal(resp.headers.get("RateLimit-Policy"), "1;w=100, 100;w=1000");
    });

    test("selects nearest reset if remaining are equal", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.headers.has("RateLimit"), true);
      assert.equal(
        resp.headers.get("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(resp.headers.has("RateLimit-Policy"), true);
      assert.equal(
        resp.headers.get("RateLimit-Policy"),
        "100;w=100, 1000;w=1000",
      );
    });

    test("selects nearest reset in any order", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.headers.has("RateLimit"), true);
      assert.equal(
        resp.headers.get("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(resp.headers.has("RateLimit-Policy"), true);
      assert.equal(
        resp.headers.get("RateLimit-Policy"),
        "100;w=100, 1000;w=1000",
      );
    });

    test("selects lowest max if reset are equal", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 100,
                window: 1000,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.headers.has("RateLimit"), true);
      assert.equal(
        resp.headers.get("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(resp.headers.has("RateLimit-Policy"), true);
      assert.equal(
        resp.headers.get("RateLimit-Policy"),
        "100;w=100, 1000;w=1000",
      );
    });

    test("selects lowest max in any order", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 100,
                window: 1000,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.headers.has("RateLimit"), true);
      assert.equal(
        resp.headers.get("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(resp.headers.has("RateLimit-Policy"), true);
      assert.equal(
        resp.headers.get("RateLimit-Policy"),
        "100;w=100, 1000;w=1000",
      );
    });

    test("warns but adds the rate limit header if RateLimit already exists", () => {
      const warnLogSpy = mock.method(console, "warn", noop);

      const resp = new Response();
      resp.headers.set("RateLimit", "abcXYZ");
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(warnLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), true);
      assert.equal(
        resp.headers.get("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.headers.has("RateLimit-Policy"), true);
      assert.equal(resp.headers.get("RateLimit-Policy"), "1;w=100");
    });

    test("warns but adds the rate limit header if RateLimit-Policy already exists", () => {
      const warnLogSpy = mock.method(console, "warn", noop);

      const resp = new Response();
      resp.headers.set("RateLimit-Policy", "abcXYZ");
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(warnLogSpy.mock.callCount(), 1);
      assert.equal(resp.headers.has("RateLimit"), true);
      assert.equal(
        resp.headers.get("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.headers.has("RateLimit-Policy"), true);
      assert.equal(resp.headers.get("RateLimit-Policy"), "1;w=100");
    });
  });

  describe("OutgoingMessage object", () => {
    test("empty results do not set headers", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("no rate limit results do not set headers", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetReason(),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("does not error if headers have been sent", () => {
      const resp = {
        headersSent: true,
        hasHeader(name: string) {
          return false;
        },
        getHeader(name: string) {
          return undefined;
        },
        setHeader(name: string, value: string | number | readonly string[]) {},
      };
      const errorLogSpy = mock.method(console, "error", noop);

      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(errorLogSpy.mock.callCount(), 1);
    });

    test("does not error if missing hasHeader", () => {
      const resp = {
        headersSent: false,
        getHeader(name: string) {
          return undefined;
        },
        setHeader(name: string, value: string | number | readonly string[]) {},
      };

      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.deepEqual(resp, { ...resp });
    });

    test("does not error if missing getHeader", () => {
      const resp = {
        headersSent: false,
        hasHeader(name: string) {
          return false;
        },
        setHeader(name: string, value: string | number | readonly string[]) {},
      };

      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.deepEqual(resp, { ...resp });
    });

    test("does not error if missing setHeader", () => {
      const resp = {
        headersSent: false,
        hasHeader(name: string) {
          return false;
        },
        getHeader(name: string) {
          return undefined;
        },
      };

      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.deepEqual(resp, { ...resp });
    });

    test("duplicate rate limit policies do not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `max` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                // @ts-expect-error
                max: { abc: "xyz" },
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `window` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                // @ts-expect-error
                window: { abc: "xyz" },
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `remaining` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                // @ts-expect-error
                remaining: { abc: "xyz" },
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("invalid rate limit result `reset` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                // @ts-expect-error
                reset: { abc: "xyz" },
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("adds rate limit headers when only top-level reason exists", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            remaining: 0,
            reset: 100,
            window: 100,
          }),
        }),
      );
      assert.equal(resp.hasHeader("RateLimit"), true);
      assert.equal(
        resp.getHeader("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.hasHeader("RateLimit-Policy"), true);
      assert.equal(resp.getHeader("RateLimit-Policy"), "1;w=100");
    });

    test("invalid rate limit reason `max` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            // @ts-expect-error
            max: { abc: "xyz" },
            remaining: 0,
            reset: 100,
            window: 100,
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("invalid rate limit reason `window` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            remaining: 0,
            reset: 100,
            // @ts-expect-error
            window: { abc: "xyz" },
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("invalid rate limit reason `remaining` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            // @ts-expect-error
            remaining: { abc: "xyz" },
            reset: 100,
            window: 100,
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("invalid rate limit reason `reset` does not set headers", () => {
      const errorLogSpy = mock.method(console, "error", noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [],
          ttl: 0,
          reason: new ArcjetRateLimitReason({
            max: 1,
            remaining: 0,
            // @ts-expect-error
            reset: { abc: "xyz" },
            window: 100,
          }),
        }),
      );

      assert.equal(errorLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), false);
      assert.equal(resp.hasHeader("RateLimit-Policy"), false);
    });

    test("adds rate limit headers when result exists", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.hasHeader("RateLimit"), true);
      assert.equal(
        resp.getHeader("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.hasHeader("RateLimit-Policy"), true);
      assert.equal(resp.getHeader("RateLimit-Policy"), "1;w=100");
    });

    test("selects nearest limit and sets multiple policies when multiple rate limit headers results exist", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.hasHeader("RateLimit"), true);
      assert.equal(
        resp.getHeader("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.hasHeader("RateLimit-Policy"), true);
      assert.equal(resp.getHeader("RateLimit-Policy"), "1;w=100, 100;w=1000");
    });

    test("selects nearest limit in any order", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.hasHeader("RateLimit"), true);
      assert.equal(
        resp.getHeader("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.hasHeader("RateLimit-Policy"), true);
      assert.equal(resp.getHeader("RateLimit-Policy"), "1;w=100, 100;w=1000");
    });

    test("selects nearest reset if remaining are equal", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.hasHeader("RateLimit"), true);
      assert.equal(
        resp.getHeader("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(resp.hasHeader("RateLimit-Policy"), true);
      assert.equal(
        resp.getHeader("RateLimit-Policy"),
        "100;w=100, 1000;w=1000",
      );
    });

    test("selects nearest reset in any order", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 1000,
                window: 1000,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.hasHeader("RateLimit"), true);
      assert.equal(
        resp.getHeader("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(resp.hasHeader("RateLimit-Policy"), true);
      assert.equal(
        resp.getHeader("RateLimit-Policy"),
        "100;w=100, 1000;w=1000",
      );
    });

    test("selects lowest max if reset are equal", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 100,
                window: 1000,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.hasHeader("RateLimit"), true);
      assert.equal(
        resp.getHeader("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(resp.hasHeader("RateLimit-Policy"), true);
      assert.equal(
        resp.getHeader("RateLimit-Policy"),
        "100;w=100, 1000;w=1000",
      );
    });

    test("selects lowest max in any order", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1000,
                remaining: 99,
                reset: 100,
                window: 1000,
              }),
            }),
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 100,
                remaining: 99,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(resp.hasHeader("RateLimit"), true);
      assert.equal(
        resp.getHeader("RateLimit"),
        "limit=100, remaining=99, reset=100",
      );
      assert.equal(resp.hasHeader("RateLimit-Policy"), true);
      assert.equal(
        resp.getHeader("RateLimit-Policy"),
        "100;w=100, 1000;w=1000",
      );
    });

    test("warns but adds the rate limit header if RateLimit already exists", () => {
      const warnLogSpy = mock.method(console, "warn", noop);

      const resp = new OutgoingMessage();
      resp.setHeader("RateLimit", "abcXYZ");
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(warnLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), true);
      assert.equal(
        resp.getHeader("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.hasHeader("RateLimit-Policy"), true);
      assert.equal(resp.getHeader("RateLimit-Policy"), "1;w=100");
    });

    test("warns but adds the rate limit header if RateLimit-Policy already exists", () => {
      const warnLogSpy = mock.method(console, "warn", noop);

      const resp = new OutgoingMessage();
      resp.setHeader("RateLimit-Policy", "abcXYZ");
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
              ruleId: "test-rule-id",
              fingerprint: "test-fingerprint",
              ttl: 0,
              state: "RUN",
              conclusion: "ALLOW",
              reason: new ArcjetRateLimitReason({
                max: 1,
                remaining: 0,
                reset: 100,
                window: 100,
              }),
            }),
          ],
          ttl: 0,
          reason: new ArcjetReason(),
        }),
      );
      assert.equal(warnLogSpy.mock.callCount(), 1);
      assert.equal(resp.hasHeader("RateLimit"), true);
      assert.equal(
        resp.getHeader("RateLimit"),
        "limit=1, remaining=0, reset=100",
      );
      assert.equal(resp.hasHeader("RateLimit-Policy"), true);
      assert.equal(resp.getHeader("RateLimit-Policy"), "1;w=100");
    });
  });
});

/**
 * @jest-environment node
 */
import { describe, expect, test, afterEach, jest } from "@jest/globals";
import { setRateLimitHeaders } from "../index";
import {
  ArcjetAllowDecision,
  ArcjetRateLimitReason,
  ArcjetReason,
  ArcjetRuleResult,
} from "@arcjet/protocol";
import logger from "@arcjet/logger";
import { OutgoingMessage } from "http";

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

function noop() {}

describe("setRateLimitHeaders", () => {
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
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
    });

    test("no rate limit results do not set headers", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
    });

    test("does not error if headers is undefined", () => {
      const resp = {};
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp).toEqual({});
    });

    test("does not error if headers is not Headers-like", () => {
      const resp = { headers: {} };
      setRateLimitHeaders(
        // @ts-expect-error
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp).toEqual({ headers: {} });
    });

    test("duplicate rate limit policies do not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit result `max` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit result `window` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit result `remaining` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit result `reset` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
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
      expect(resp.headers.has("RateLimit")).toEqual(true);
      expect(resp.headers.get("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.headers.has("RateLimit-Policy")).toEqual(true);
      expect(resp.headers.get("RateLimit-Policy")).toEqual("1;w=100");
    });

    test("invalid rate limit reason `max` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit reason `window` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit reason `remaining` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit reason `reset` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(false);
      expect(resp.headers.has("RateLimit-Policy")).toEqual(false);
    });

    test("adds rate limit headers when result exists", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp.headers.has("RateLimit")).toEqual(true);
      expect(resp.headers.get("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.headers.has("RateLimit-Policy")).toEqual(true);
      expect(resp.headers.get("RateLimit-Policy")).toEqual("1;w=100");
    });

    test("selects nearest limit and sets multiple policies when multiple rate limit headers results exist", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp.headers.has("RateLimit")).toEqual(true);
      expect(resp.headers.get("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.headers.has("RateLimit-Policy")).toEqual(true);
      expect(resp.headers.get("RateLimit-Policy")).toEqual(
        "1;w=100, 100;w=1000",
      );
    });

    test("selects nearest limit in any order", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp.headers.has("RateLimit")).toEqual(true);
      expect(resp.headers.get("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.headers.has("RateLimit-Policy")).toEqual(true);
      expect(resp.headers.get("RateLimit-Policy")).toEqual(
        "1;w=100, 100;w=1000",
      );
    });

    test("selects nearest reset if remaining are equal", () => {
      const resp = new Response();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp.headers.has("RateLimit")).toEqual(true);
      expect(resp.headers.get("RateLimit")).toEqual(
        "limit=100, remaining=99, reset=100",
      );
      expect(resp.headers.has("RateLimit-Policy")).toEqual(true);
      expect(resp.headers.get("RateLimit-Policy")).toEqual(
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
      expect(resp.headers.has("RateLimit")).toEqual(true);
      expect(resp.headers.get("RateLimit")).toEqual(
        "limit=100, remaining=99, reset=100",
      );
      expect(resp.headers.has("RateLimit-Policy")).toEqual(true);
      expect(resp.headers.get("RateLimit-Policy")).toEqual(
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
      expect(resp.headers.has("RateLimit")).toEqual(true);
      expect(resp.headers.get("RateLimit")).toEqual(
        "limit=100, remaining=99, reset=100",
      );
      expect(resp.headers.has("RateLimit-Policy")).toEqual(true);
      expect(resp.headers.get("RateLimit-Policy")).toEqual(
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
      expect(resp.headers.has("RateLimit")).toEqual(true);
      expect(resp.headers.get("RateLimit")).toEqual(
        "limit=100, remaining=99, reset=100",
      );
      expect(resp.headers.has("RateLimit-Policy")).toEqual(true);
      expect(resp.headers.get("RateLimit-Policy")).toEqual(
        "100;w=100, 1000;w=1000",
      );
    });

    test("warns but adds the rate limit header if RateLimit already exists", () => {
      const warnLogSpy = jest.spyOn(logger, "warn").mockImplementation(noop);

      const resp = new Response();
      resp.headers.set("RateLimit", "abcXYZ");
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(warnLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(true);
      expect(resp.headers.get("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.headers.has("RateLimit-Policy")).toEqual(true);
      expect(resp.headers.get("RateLimit-Policy")).toEqual("1;w=100");
    });

    test("warns but adds the rate limit header if RateLimit-Policy already exists", () => {
      const warnLogSpy = jest.spyOn(logger, "warn").mockImplementation(noop);

      const resp = new Response();
      resp.headers.set("RateLimit-Policy", "abcXYZ");
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(warnLogSpy).toHaveBeenCalled();
      expect(resp.headers.has("RateLimit")).toEqual(true);
      expect(resp.headers.get("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.headers.has("RateLimit-Policy")).toEqual(true);
      expect(resp.headers.get("RateLimit-Policy")).toEqual("1;w=100");
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
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
    });

    test("no rate limit results do not set headers", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
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
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(errorLogSpy).toHaveBeenCalled();
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
      expect(resp).toEqual({ ...resp });
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
      expect(resp).toEqual({ ...resp });
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
      expect(resp).toEqual({ ...resp });
    });

    test("duplicate rate limit policies do not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit result `max` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit result `window` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit result `remaining` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit result `reset` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
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
      expect(resp.hasHeader("RateLimit")).toEqual(true);
      expect(resp.getHeader("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(true);
      expect(resp.getHeader("RateLimit-Policy")).toEqual("1;w=100");
    });

    test("invalid rate limit reason `max` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit reason `window` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit reason `remaining` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
    });

    test("invalid rate limit reason `reset` does not set headers", () => {
      const errorLogSpy = jest.spyOn(logger, "error").mockImplementation(noop);

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

      expect(errorLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(false);
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(false);
    });

    test("adds rate limit headers when result exists", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp.hasHeader("RateLimit")).toEqual(true);
      expect(resp.getHeader("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(true);
      expect(resp.getHeader("RateLimit-Policy")).toEqual("1;w=100");
    });

    test("selects nearest limit and sets multiple policies when multiple rate limit headers results exist", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp.hasHeader("RateLimit")).toEqual(true);
      expect(resp.getHeader("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(true);
      expect(resp.getHeader("RateLimit-Policy")).toEqual("1;w=100, 100;w=1000");
    });

    test("selects nearest limit in any order", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp.hasHeader("RateLimit")).toEqual(true);
      expect(resp.getHeader("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(true);
      expect(resp.getHeader("RateLimit-Policy")).toEqual("1;w=100, 100;w=1000");
    });

    test("selects nearest reset if remaining are equal", () => {
      const resp = new OutgoingMessage();
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(resp.hasHeader("RateLimit")).toEqual(true);
      expect(resp.getHeader("RateLimit")).toEqual(
        "limit=100, remaining=99, reset=100",
      );
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(true);
      expect(resp.getHeader("RateLimit-Policy")).toEqual(
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
      expect(resp.hasHeader("RateLimit")).toEqual(true);
      expect(resp.getHeader("RateLimit")).toEqual(
        "limit=100, remaining=99, reset=100",
      );
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(true);
      expect(resp.getHeader("RateLimit-Policy")).toEqual(
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
      expect(resp.hasHeader("RateLimit")).toEqual(true);
      expect(resp.getHeader("RateLimit")).toEqual(
        "limit=100, remaining=99, reset=100",
      );
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(true);
      expect(resp.getHeader("RateLimit-Policy")).toEqual(
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
      expect(resp.hasHeader("RateLimit")).toEqual(true);
      expect(resp.getHeader("RateLimit")).toEqual(
        "limit=100, remaining=99, reset=100",
      );
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(true);
      expect(resp.getHeader("RateLimit-Policy")).toEqual(
        "100;w=100, 1000;w=1000",
      );
    });

    test("warns but adds the rate limit header if RateLimit already exists", () => {
      const warnLogSpy = jest.spyOn(logger, "warn").mockImplementation(noop);

      const resp = new OutgoingMessage();
      resp.setHeader("RateLimit", "abcXYZ");
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(warnLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(true);
      expect(resp.getHeader("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(true);
      expect(resp.getHeader("RateLimit-Policy")).toEqual("1;w=100");
    });

    test("warns but adds the rate limit header if RateLimit-Policy already exists", () => {
      const warnLogSpy = jest.spyOn(logger, "warn").mockImplementation(noop);

      const resp = new OutgoingMessage();
      resp.setHeader("RateLimit-Policy", "abcXYZ");
      setRateLimitHeaders(
        resp,
        new ArcjetAllowDecision({
          results: [
            new ArcjetRuleResult({
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
      expect(warnLogSpy).toHaveBeenCalled();
      expect(resp.hasHeader("RateLimit")).toEqual(true);
      expect(resp.getHeader("RateLimit")).toEqual(
        "limit=1, remaining=0, reset=100",
      );
      expect(resp.hasHeader("RateLimit-Policy")).toEqual(true);
      expect(resp.getHeader("RateLimit-Policy")).toEqual("1;w=100");
    });
  });
});

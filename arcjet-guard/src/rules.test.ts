import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  experimental_moderateContent,
  localDetectSensitiveInfo,
  defineCustomRule,
} from "./rules.ts";
import { symbolArcjetInternal } from "./symbol.ts";
import type { Decision, InternalResult, SensitiveInfoBackend } from "./types.ts";

describe("tokenBucket", () => {
  test("returns a callable with type discriminant", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });

    assert.equal(rule.type, "TOKEN_BUCKET");
    assert.equal(typeof rule, "function");
  });

  test("preserves config", () => {
    const config = { refillRate: 10, intervalSeconds: 60, maxTokens: 100 };
    const rule = tokenBucket(config);

    assert.equal(rule.config.refillRate, 10);
    assert.equal(rule.config.intervalSeconds, 60);
    assert.equal(rule.config.maxTokens, 100);
  });

  test("bucket is optional", () => {
    const rule = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });

    assert.equal(rule.config.bucket, undefined);
  });

  test("bucket is preserved when set", () => {
    const rule = tokenBucket({
      bucket: "user-tokens",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });

    assert.equal(rule.config.bucket, "user-tokens");
  });

  test("produces RuleWithInput with correct type and fields", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = rule({ key: "user_1", requested: 5 });

    assert.equal(input.type, "TOKEN_BUCKET");
    assert.equal(input.input.key, "user_1");
    assert.equal(input.input.requested, 5);
    assert.equal(input.config.refillRate, 10);
  });

  test("produces unique inputId per call", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const a = rule({ key: "alice" });
    const b = rule({ key: "bob" });

    assert.notEqual(a[symbolArcjetInternal].inputId, b[symbolArcjetInternal].inputId);
  });

  test("shares configId across inputs", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const a = rule({ key: "alice" });
    const b = rule({ key: "bob" });

    assert.equal(a[symbolArcjetInternal].configId, b[symbolArcjetInternal].configId);
  });

  test("has configId on the rule itself", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = rule({ key: "user_1" });

    assert.equal(rule[symbolArcjetInternal].configId, input[symbolArcjetInternal].configId);
  });

  test("different factory instances have different configIds", () => {
    const a = tokenBucket({ bucket: "test", refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
    const b = tokenBucket({ bucket: "test", refillRate: 10, intervalSeconds: 60, maxTokens: 100 });

    assert.notEqual(a[symbolArcjetInternal].configId, b[symbolArcjetInternal].configId);
  });
});

describe("fixedWindow", () => {
  test("returns a callable with type discriminant", () => {
    const rule = fixedWindow({ bucket: "test", maxRequests: 100, windowSeconds: 3600 });

    assert.equal(rule.type, "FIXED_WINDOW");
    assert.equal(typeof rule, "function");
  });

  test("preserves config", () => {
    const rule = fixedWindow({ bucket: "test", maxRequests: 100, windowSeconds: 3600 });

    assert.equal(rule.config.maxRequests, 100);
    assert.equal(rule.config.windowSeconds, 3600);
  });

  test("bucket is optional", () => {
    const rule = fixedWindow({ maxRequests: 100, windowSeconds: 3600 });

    assert.equal(rule.config.bucket, undefined);
  });

  test("bucket is preserved when set", () => {
    const rule = fixedWindow({ bucket: "page-views", maxRequests: 100, windowSeconds: 3600 });

    assert.equal(rule.config.bucket, "page-views");
  });

  test("produces RuleWithInput with correct type and fields", () => {
    const rule = fixedWindow({ bucket: "test", maxRequests: 100, windowSeconds: 3600 });
    const input = rule({ key: "user_1" });

    assert.equal(input.type, "FIXED_WINDOW");
    assert.equal(input.input.key, "user_1");
    assert.equal(input.config.maxRequests, 100);
  });

  test("shares configId across inputs", () => {
    const rule = fixedWindow({ bucket: "test", maxRequests: 100, windowSeconds: 3600 });
    const a = rule({ key: "alice" });
    const b = rule({ key: "bob" });

    assert.equal(a[symbolArcjetInternal].configId, b[symbolArcjetInternal].configId);
  });
});

describe("slidingWindow", () => {
  test("returns a callable with type discriminant", () => {
    const rule = slidingWindow({ bucket: "test", maxRequests: 500, intervalSeconds: 60 });

    assert.equal(rule.type, "SLIDING_WINDOW");
    assert.equal(typeof rule, "function");
  });

  test("preserves config", () => {
    const rule = slidingWindow({ bucket: "test", maxRequests: 500, intervalSeconds: 60 });

    assert.equal(rule.config.maxRequests, 500);
    assert.equal(rule.config.intervalSeconds, 60);
  });

  test("bucket is optional", () => {
    const rule = slidingWindow({ maxRequests: 500, intervalSeconds: 60 });

    assert.equal(rule.config.bucket, undefined);
  });

  test("bucket is preserved when set", () => {
    const rule = slidingWindow({ bucket: "event-writes", maxRequests: 500, intervalSeconds: 60 });

    assert.equal(rule.config.bucket, "event-writes");
  });

  test("produces RuleWithInput with correct type and fields", () => {
    const rule = slidingWindow({ bucket: "test", maxRequests: 500, intervalSeconds: 60 });
    const input = rule({ key: "user_1" });

    assert.equal(input.type, "SLIDING_WINDOW");
    assert.equal(input.input.key, "user_1");
    assert.equal(input.config.maxRequests, 500);
  });
});

describe("detectPromptInjection", () => {
  test("returns a callable with type discriminant", () => {
    const rule = detectPromptInjection();

    assert.equal(rule.type, "PROMPT_INJECTION");
    assert.equal(typeof rule, "function");
  });

  test("default config is empty", () => {
    const rule = detectPromptInjection();

    assert.deepEqual(rule.config, {});
  });

  test("normalizes a bare string to the input object", () => {
    const rule = detectPromptInjection();
    const input = rule("some text");

    assert.equal(input.type, "PROMPT_INJECTION");
    assert.equal(input.input.inputText, "some text");
  });

  test("attaches call-time metadata to the input", () => {
    const rule = detectPromptInjection();
    const input = rule({
      inputText: "some text",
      metadata: { source: "tool_result" },
    });

    assert.equal(input.input.inputText, "some text");
    assert.deepEqual(input.input.metadata, { source: "tool_result" });
  });

  test("preserves mode in config", () => {
    const rule = detectPromptInjection({ mode: "DRY_RUN" });
    const input = rule("text");

    assert.equal(input.config.mode, "DRY_RUN");
  });
});

describe("experimental_moderateContent", () => {
  test("returns a callable with type discriminant", () => {
    const rule = experimental_moderateContent();

    assert.equal(rule.type, "MODERATE_CONTENT");
    assert.equal(typeof rule, "function");
  });

  test("default config is empty", () => {
    const rule = experimental_moderateContent();

    assert.deepEqual(rule.config, {});
  });

  test("normalizes a bare string to the input object", () => {
    const rule = experimental_moderateContent();
    const input = rule("some text");

    assert.equal(input.type, "MODERATE_CONTENT");
    assert.equal(input.input.inputText, "some text");
  });

  test("preserves mode in config", () => {
    const rule = experimental_moderateContent({ mode: "DRY_RUN" });
    const input = rule("text");

    assert.equal(input.config.mode, "DRY_RUN");
  });

  test("attaches call-time metadata to the input", () => {
    const rule = experimental_moderateContent();
    const input = rule({
      inputText: "text",
      metadata: { expectedResponse: "pass" },
    });

    assert.deepEqual(input.input.metadata, { expectedResponse: "pass" });
  });

  test("a bare string input carries no metadata", () => {
    const rule = experimental_moderateContent();
    const input = rule("text");

    assert.equal("metadata" in input.input, false);
  });
});

describe("localDetectSensitiveInfo", () => {
  test("returns a callable with type discriminant", () => {
    const rule = localDetectSensitiveInfo();

    assert.equal(rule.type, "SENSITIVE_INFO");
    assert.equal(typeof rule, "function");
  });

  test("preserves allow config", () => {
    const rule = localDetectSensitiveInfo({ allow: ["EMAIL"] });

    assert.deepEqual(rule.config.allow, ["EMAIL"]);
    assert.equal(rule.config.deny, undefined);
  });

  test("preserves deny config", () => {
    const rule = localDetectSensitiveInfo({ deny: ["PHONE_NUMBER"] });

    assert.deepEqual(rule.config.deny, ["PHONE_NUMBER"]);
    assert.equal(rule.config.allow, undefined);
  });

  test("normalizes a bare string to the input object", () => {
    const rule = localDetectSensitiveInfo();
    const input = rule("my email is foo@bar.com");

    assert.equal(input.type, "SENSITIVE_INFO");
    assert.equal(input.input.inputText, "my email is foo@bar.com");
  });

  test("attaches call-time metadata to the input", () => {
    const rule = localDetectSensitiveInfo();
    const input = rule({
      inputText: "my email is foo@bar.com",
      metadata: { destination: "openai" },
    });

    assert.equal(input.input.inputText, "my email is foo@bar.com");
    assert.deepEqual(input.input.metadata, { destination: "openai" });
  });

  test("allows the four native types without a backend", () => {
    assert.doesNotThrow(() =>
      localDetectSensitiveInfo({
        deny: ["EMAIL", "PHONE_NUMBER", "IP_ADDRESS", "CREDIT_CARD_NUMBER"],
      }),
    );
  });

  test("throws when a deny type needs a backend that is not configured", () => {
    assert.throws(
      () => localDetectSensitiveInfo({ deny: ["GIVEN_NAME"] }),
      /config error: the "GIVEN_NAME" type is only detected when a `backend`/,
    );
  });

  test("throws when an allow type needs a backend that is not configured", () => {
    assert.throws(
      () => localDetectSensitiveInfo({ allow: ["SSN"] }),
      /config error: the "SSN" type is only detected when a `backend`/,
    );
  });

  test("lists every unsupported type in the error, without duplicates", () => {
    assert.throws(
      () => localDetectSensitiveInfo({ deny: ["GIVEN_NAME", "SURNAME", "GIVEN_NAME"] }),
      /the "GIVEN_NAME", "SURNAME" types are only detected/,
    );
  });

  test("does not throw for backend-only types when a backend is configured", () => {
    const backend: SensitiveInfoBackend = {
      detect() {
        return Promise.resolve({ allowed: [], denied: [] });
      },
    };
    assert.doesNotThrow(() => localDetectSensitiveInfo({ deny: ["GIVEN_NAME", "SSN"], backend }));
  });
});

describe("Rule config options", () => {
  test("mode defaults to undefined (LIVE)", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = rule({ key: "user_1" });

    assert.equal(input.config.mode, undefined);
  });

  test("DRY_RUN mode is preserved", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
      mode: "DRY_RUN",
    });
    const input = rule({ key: "user_1" });

    assert.equal(input.config.mode, "DRY_RUN");
  });

  test("label is preserved", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
      label: "my-rule",
    });
    const input = rule({ key: "user_1" });

    assert.equal(input.config.label, "my-rule");
  });

  test("metadata is preserved", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
      metadata: { env: "test" },
    });
    const input = rule({ key: "user_1" });

    assert.deepEqual(input.config.metadata, { env: "test" });
  });
});

describe("result() and deniedResult() with no decision data", () => {
  test("result() returns null for a plain decision", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = rule({ key: "user_1" });

    // A decision without [kInternal] — result lookup should return null
    const decision = {
      conclusion: "ALLOW" as const,
      id: "gdec_test",
      results: [],
      hasError: (): boolean => false,
      warnings: [],
      errorResults: (): never[] => [],
      hasFailedOpen: (): boolean => false,
    };

    assert.equal(input.result(decision), null);
  });

  test("deniedResult() returns null for a plain decision", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = rule({ key: "user_1" });

    const decision = {
      conclusion: "ALLOW" as const,
      id: "gdec_test",
      results: [],
      hasError: (): boolean => false,
      warnings: [],
      errorResults: (): never[] => [],
      hasFailedOpen: (): boolean => false,
    };

    assert.equal(input.deniedResult(decision), null);
  });

  test("results() returns empty array for a plain decision", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });

    const decision = {
      conclusion: "ALLOW" as const,
      id: "gdec_test",
      results: [],
      hasError: (): boolean => false,
      warnings: [],
      errorResults: (): never[] => [],
      hasFailedOpen: (): boolean => false,
    };

    assert.deepEqual(rule.results(decision), []);
  });

  test("deniedResult() on RuleWithConfig returns null for a plain decision", () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });

    const decision = {
      conclusion: "ALLOW" as const,
      id: "gdec_test",
      results: [],
      hasError: (): boolean => false,
      warnings: [],
      errorResults: (): never[] => [],
      hasFailedOpen: (): boolean => false,
    };

    assert.equal(rule.deniedResult(decision), null);
  });
});

describe("defineCustomRule", () => {
  test("returns a factory that produces typed RuleWithConfigCustom", () => {
    const scoreRule = defineCustomRule<
      { threshold: string },
      { score: string },
      { reason: string }
    >({
      evaluate: (config, input) => {
        const score = Number(input.score);
        const threshold = Number(config.threshold);
        return score > threshold
          ? { conclusion: "DENY", data: { reason: "score too high" } }
          : { conclusion: "ALLOW" };
      },
    });

    const rule = scoreRule({ data: { threshold: "0.5" } });
    assert.equal(rule.type, "CUSTOM");
    assert.equal(typeof rule, "function");
  });

  test("preserves config data", () => {
    const scoreRule = defineCustomRule<{ threshold: string }, { score: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });

    const rule = scoreRule({ data: { threshold: "0.5" }, label: "test" });
    assert.equal(rule.config.data?.["threshold"], "0.5");
    assert.equal(rule.config.label, "test");
  });

  test("produces RuleWithInputCustom with correct input data", () => {
    const scoreRule = defineCustomRule<{ threshold: string }, { score: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });

    const rule = scoreRule({ data: { threshold: "0.5" } });
    const input = rule({ data: { score: "0.8" } });
    assert.equal(input.type, "CUSTOM");
    assert.equal(input.input.data["score"], "0.8");
  });

  test("supports mode and metadata on config", () => {
    const scoreRule = defineCustomRule<{ threshold: string }, { score: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });

    const rule = scoreRule({
      data: { threshold: "0.5" },
      mode: "DRY_RUN",
      metadata: { env: "test" },
    });
    assert.equal(rule.config.mode, "DRY_RUN");
    assert.deepEqual(rule.config.metadata, { env: "test" });
  });

  test("shares configId across inputs", () => {
    const scoreRule = defineCustomRule<{ threshold: string }, { score: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });

    const rule = scoreRule({ data: { threshold: "0.5" } });
    const a = rule({ data: { score: "0.1" } });
    const b = rule({ data: { score: "0.9" } });
    assert.equal(a[symbolArcjetInternal].configId, b[symbolArcjetInternal].configId);
    assert.notEqual(a[symbolArcjetInternal].inputId, b[symbolArcjetInternal].inputId);
  });

  test("different factory calls produce different configIds", () => {
    const scoreRule = defineCustomRule<{ threshold: string }, { score: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });

    const a = scoreRule({ data: { threshold: "0.5" } });
    const b = scoreRule({ data: { threshold: "0.5" } });
    assert.notEqual(a[symbolArcjetInternal].configId, b[symbolArcjetInternal].configId);
  });

  test("result methods return null for a plain decision", () => {
    const scoreRule = defineCustomRule<{ threshold: string }, { score: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });

    const rule = scoreRule({ data: { threshold: "0.5" } });
    const input = rule({ data: { score: "0.8" } });

    const decision = {
      conclusion: "ALLOW" as const,
      id: "gdec_test",
      results: [],
      hasError: (): boolean => false,
      warnings: [],
      errorResults: (): never[] => [],
      hasFailedOpen: (): boolean => false,
    };

    assert.equal(input.result(decision), null);
    assert.equal(input.deniedResult(decision), null);
    assert.deepEqual(rule.results(decision), []);
    assert.equal(rule.result(decision), null);
    assert.equal(rule.deniedResult(decision), null);
  });
});

// Build an internal token bucket result carrying correlation IDs.
function tokenBucketResult(
  configId: string,
  inputId: string,
  conclusion: "ALLOW" | "DENY" = "ALLOW",
): InternalResult {
  return {
    conclusion,
    reason: "RATE_LIMIT",
    type: "TOKEN_BUCKET",
    warnings: [],
    remainingTokens: 5,
    maxTokens: 100,
    resetAtUnixSeconds: 0,
    refillRate: 10,
    refillIntervalSeconds: 60,
    [symbolArcjetInternal]: { configId, inputId },
  };
}

// Build an internal errored result carrying correlation IDs.
function errorResult(
  configId: string,
  inputId: string,
  code = "AJ1100",
  message = "boom",
): InternalResult {
  return {
    conclusion: "ALLOW",
    reason: "ERROR",
    type: "RULE_ERROR",
    warnings: [],
    message,
    code,
    [symbolArcjetInternal]: { configId, inputId },
  };
}

function decisionWith(results: InternalResult[]): Decision {
  return {
    conclusion: "ALLOW" as const,
    id: "gdec_test",
    results: results.map((r) => r),
    // oxlint-disable-next-line typescript/no-deprecated -- Decision still requires hasError until it's removed in the next major
    hasError: (): boolean => results.some((r) => r.type === "RULE_ERROR"),
    warnings: [],
    errorResults: () => results.filter((r) => r.type === "RULE_ERROR"),
    hasFailedOpen: (): boolean => false,
    [symbolArcjetInternal]: { results },
  } as Decision;
}

describe("errorResult() and the error/non-error split", () => {
  const config = {
    bucket: "test",
    refillRate: 10,
    intervalSeconds: 60,
    maxTokens: 100,
  };

  test("RuleWithInput.errorResult() returns the errored result", () => {
    const rule = tokenBucket(config);
    const input = rule({ key: "user_1" });
    const { configId } = rule[symbolArcjetInternal];
    const { inputId } = input[symbolArcjetInternal];
    const decision = decisionWith([errorResult(configId, inputId, "AJ1100")]);

    const err = input.errorResult(decision);
    assert.notEqual(err, null);
    assert.equal(err?.type, "RULE_ERROR");
    assert.equal(err?.reason, "ERROR");
    assert.equal(err?.conclusion, "ALLOW"); // fail open
    assert.equal(err?.code, "AJ1100");
  });

  test("RuleWithConfig.errorResult() returns the errored result", () => {
    const rule = tokenBucket(config);
    const input = rule({ key: "user_1" });
    const { configId } = rule[symbolArcjetInternal];
    const { inputId } = input[symbolArcjetInternal];
    const decision = decisionWith([errorResult(configId, inputId, "AJ1200")]);

    const err = rule.errorResult(decision);
    assert.notEqual(err, null);
    assert.equal(err?.code, "AJ1200");
  });

  test("result()/results()/deniedResult() never return an errored result", () => {
    const rule = tokenBucket(config);
    const input = rule({ key: "user_1" });
    const { configId } = rule[symbolArcjetInternal];
    const { inputId } = input[symbolArcjetInternal];
    const decision = decisionWith([errorResult(configId, inputId)]);

    // The whole point of the split: errors must not leak into non-error
    // accessors (previously they were up-cast to e.g. RuleResultTokenBucket).
    assert.equal(input.result(decision), null);
    assert.deepEqual(input.results(decision), []);
    assert.equal(input.deniedResult(decision), null);
    assert.equal(rule.result(decision), null);
    assert.deepEqual(rule.results(decision), []);
    assert.equal(rule.deniedResult(decision), null);
    // ...but errorResult surfaces it.
    assert.notEqual(input.errorResult(decision), null);
  });

  test("errorResult() returns null for a non-error result", () => {
    const rule = tokenBucket(config);
    const input = rule({ key: "user_1" });
    const { configId } = rule[symbolArcjetInternal];
    const { inputId } = input[symbolArcjetInternal];
    const decision = decisionWith([tokenBucketResult(configId, inputId)]);

    assert.equal(input.errorResult(decision), null);
    assert.equal(rule.errorResult(decision), null);
    assert.notEqual(input.result(decision), null);
  });

  test("a DENY is a non-error result and is not dropped", () => {
    const rule = tokenBucket(config);
    const input = rule({ key: "user_1" });
    const { configId } = rule[symbolArcjetInternal];
    const { inputId } = input[symbolArcjetInternal];
    const decision = decisionWith([tokenBucketResult(configId, inputId, "DENY")]);

    const denied = input.deniedResult(decision);
    assert.notEqual(denied, null);
    assert.equal(denied?.conclusion, "DENY");
    assert.equal(input.errorResult(decision), null); // a DENY is not an error
  });

  test("two invocations resolve distinct errors by identifier", () => {
    const rule = tokenBucket(config);
    const call1 = rule({ key: "first" });
    const call2 = rule({ key: "second" });
    const { configId } = rule[symbolArcjetInternal];
    const id1 = call1[symbolArcjetInternal].inputId;
    const id2 = call2[symbolArcjetInternal].inputId;
    const decision = decisionWith([
      errorResult(configId, id1, "AJ1001", "first failed"),
      tokenBucketResult(configId, id2, "ALLOW"),
    ]);

    const err1 = call1.errorResult(decision);
    assert.notEqual(err1, null);
    assert.equal(err1?.code, "AJ1001");
    // call2 did not error; its non-error result resolves cleanly.
    assert.equal(call2.errorResult(decision), null);
    assert.notEqual(call2.result(decision), null);
  });

  test("there is no plural errorResults() accessor on rules", () => {
    const rule = tokenBucket(config);
    const input = rule({ key: "user_1" });
    assert.equal("errorResults" in rule, false);
    assert.equal("errorResults" in input, false);
  });

  test("errorResult() is available across all rule types", () => {
    const inputs = [
      fixedWindow({ maxRequests: 100, windowSeconds: 60 })({ key: "u" }),
      slidingWindow({ maxRequests: 100, intervalSeconds: 60 })({ key: "u" }),
      detectPromptInjection()("text"),
      experimental_moderateContent()("text"),
      localDetectSensitiveInfo()("text"),
      defineCustomRule({ evaluate: () => ({ conclusion: "ALLOW" as const }) })({
        data: {},
      })({ data: {} }),
    ];
    for (const input of inputs) {
      const { configId, inputId } = input[symbolArcjetInternal];
      const decision = decisionWith([errorResult(configId, inputId)]);
      assert.notEqual(input.errorResult(decision), null);
      assert.equal(input.result(decision), null);
    }
  });
});

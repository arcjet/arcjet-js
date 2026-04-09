import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  defineCustomRule,
} from "./rules.ts";
import { symbolArcjetInternal } from "./symbol.ts";

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

  test("produces RuleWithInput with string input", () => {
    const rule = detectPromptInjection();
    const input = rule("some text");

    assert.equal(input.type, "PROMPT_INJECTION");
    assert.equal(input.input, "some text");
  });

  test("preserves mode in config", () => {
    const rule = detectPromptInjection({ mode: "DRY_RUN" });
    const input = rule("text");

    assert.equal(input.config.mode, "DRY_RUN");
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

  test("produces RuleWithInput with string input", () => {
    const rule = localDetectSensitiveInfo();
    const input = rule("my email is foo@bar.com");

    assert.equal(input.type, "SENSITIVE_INFO");
    assert.equal(input.input, "my email is foo@bar.com");
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
        const score = parseFloat(input.score);
        const threshold = parseFloat(config.threshold);
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
    };

    assert.equal(input.result(decision), null);
    assert.equal(input.deniedResult(decision), null);
    assert.deepEqual(rule.results(decision), []);
    assert.equal(rule.result(decision), null);
    assert.equal(rule.deniedResult(decision), null);
  });
});

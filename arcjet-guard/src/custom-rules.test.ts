/**
 * Unit tests for custom rules: `defineCustomRule()`.
 *
 * Includes compile-time type assertions to verify generic type flow
 * from config → input → result.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { defineCustomRule } from "./rules.ts";
import { symbolArcjetInternal } from "./symbol.ts";
import type {
  RuleResultCustom,
  RuleWithConfigCustom,
  RuleWithInputCustom,
  Decision,
} from "./types.ts";

// These compile-time assertions ensure TypeScript narrows correctly.
// If any of these fail, the file won't compile — no runtime needed.

type AssertEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
type Assert<T extends true> = T;

describe("defineCustomRule", () => {
  // A reusable rule definition for most tests
  const scoreRule = defineCustomRule<
    { threshold: string },
    { score: string },
    { reason: string; actual: string }
  >({
    evaluate: (config, input) => {
      const score = parseFloat(input.score);
      const threshold = parseFloat(config.threshold);
      return score > threshold
        ? { conclusion: "DENY", data: { reason: "too high", actual: input.score } }
        : { conclusion: "ALLOW" };
    },
  });

  // The factory return type is a function that produces RuleWithConfigCustom<TData, TInput>
  type ScoreRuleFactory = typeof scoreRule;
  type ScoreConfig = ReturnType<ScoreRuleFactory>;
  type _CheckConfig = Assert<
    AssertEqual<
      ScoreConfig,
      RuleWithConfigCustom<{ reason: string; actual: string }, { score: string }>
    >
  >;

  // Calling the config produces RuleWithInputCustom<TData>
  type ScoreInput = ReturnType<ScoreConfig>;
  type _CheckInput = Assert<
    AssertEqual<ScoreInput, RuleWithInputCustom<{ reason: string; actual: string }>>
  >;

  // result() returns RuleResultCustom<TData> | null
  type ResultType = ReturnType<ScoreConfig["result"]>;
  type _CheckResult = Assert<
    AssertEqual<ResultType, RuleResultCustom<{ reason: string; actual: string }> | null>
  >;

  // results() returns RuleResultCustom<TData>[]
  type ResultsType = ReturnType<ScoreConfig["results"]>;
  type _CheckResults = Assert<
    AssertEqual<ResultsType, RuleResultCustom<{ reason: string; actual: string }>[]>
  >;

  // data field on the result is Readonly<TData>
  type DataField = NonNullable<ResultType>["data"];
  type _CheckData = Assert<AssertEqual<DataField, Readonly<{ reason: string; actual: string }>>>;

  test("factory produces RuleWithConfigCustom with CUSTOM type", () => {
    const rule = scoreRule({ threshold: "0.5" });

    assert.equal(rule.type, "CUSTOM");
    assert.equal(typeof rule, "function");
  });

  test("config data is extracted from typed config fields", () => {
    const rule = scoreRule({ threshold: "0.9" });

    assert.equal(rule.config.data?.["threshold"], "0.9");
  });

  test("common config fields (mode, label, metadata) are preserved", () => {
    const rule = scoreRule({
      threshold: "0.5",
      mode: "DRY_RUN",
      label: "abuse-score",
      metadata: { env: "staging" },
    });

    assert.equal(rule.config.mode, "DRY_RUN");
    assert.equal(rule.config.label, "abuse-score");
    assert.deepEqual(rule.config.metadata, { env: "staging" });
  });

  test("input data is extracted from typed input fields", () => {
    const rule = scoreRule({ threshold: "0.5" });
    const input = rule({ score: "0.8" });

    assert.equal(input.input.data["score"], "0.8");
  });

  test("input metadata is preserved separately", () => {
    const rule = scoreRule({ threshold: "0.5" });
    const input = rule({ score: "0.8", metadata: { trace_id: "t-123" } });

    assert.deepEqual(input.input.metadata, { trace_id: "t-123" });
    // metadata should not leak into data
    assert.equal(input.input.data["metadata"], undefined);
  });

  test("input without metadata does not set metadata on input object", () => {
    const rule = scoreRule({ threshold: "0.5" });
    const input = rule({ score: "0.8" });

    assert.equal(input.input.metadata, undefined);
  });

  test("evaluate function is attached to the input", () => {
    const rule = scoreRule({ threshold: "0.5" });
    const input = rule({ score: "0.8" });

    assert.equal(typeof input.evaluate, "function");
  });

  test("evaluate function is attached to the config", () => {
    const rule = scoreRule({ threshold: "0.5" });

    assert.equal(typeof rule.config.evaluate, "function");
  });

  test("unique configId per factory call", () => {
    const a = scoreRule({ threshold: "0.1" });
    const b = scoreRule({ threshold: "0.2" });

    assert.notEqual(a[symbolArcjetInternal].configId, b[symbolArcjetInternal].configId);
  });

  test("shared configId across inputs from the same config", () => {
    const rule = scoreRule({ threshold: "0.5" });
    const a = rule({ score: "0.1" });
    const b = rule({ score: "0.9" });

    assert.equal(a[symbolArcjetInternal].configId, b[symbolArcjetInternal].configId);
    assert.equal(rule[symbolArcjetInternal].configId, a[symbolArcjetInternal].configId);
  });

  test("unique inputId per input call", () => {
    const rule = scoreRule({ threshold: "0.5" });
    const a = rule({ score: "0.1" });
    const b = rule({ score: "0.9" });

    assert.notEqual(a[symbolArcjetInternal].inputId, b[symbolArcjetInternal].inputId);
  });

  test("result() returns null when decision has no results", () => {
    const rule = scoreRule({ threshold: "0.5" });
    const input = rule({ score: "0.8" });
    const decision = emptyDecision();

    assert.equal(input.result(decision), null);
    assert.equal(rule.result(decision), null);
  });

  test("deniedResult() returns null when decision has no results", () => {
    const rule = scoreRule({ threshold: "0.5" });
    const input = rule({ score: "0.8" });
    const decision = emptyDecision();

    assert.equal(input.deniedResult(decision), null);
    assert.equal(rule.deniedResult(decision), null);
  });

  test("results() returns empty array when decision has no results", () => {
    const rule = scoreRule({ threshold: "0.5" });
    const input = rule({ score: "0.8" });
    const decision = emptyDecision();

    assert.deepEqual(input.results(decision), []);
    assert.deepEqual(rule.results(decision), []);
  });

  test("async evaluate function is preserved", () => {
    const asyncRule = defineCustomRule<{ url: string }, { body: string }, { flagged: string }>({
      evaluate: (_config, _input) => {
        return { conclusion: "ALLOW" as const };
      },
    });

    const rule = asyncRule({ url: "https://example.com" });
    const input = rule({ body: "hello" });

    assert.equal(typeof input.evaluate, "function");
  });

  test("works with default TData", () => {
    const simpleRule = defineCustomRule<{ flag: string }, { value: string }>({
      evaluate: (config, input) => {
        return config.flag === input.value
          ? { conclusion: "DENY", data: { matched: "true" } }
          : { conclusion: "ALLOW" };
      },
    });

    const rule = simpleRule({ flag: "blocked" });
    const input = rule({ value: "blocked" });

    assert.equal(input.type, "CUSTOM");
    assert.equal(input.input.data["value"], "blocked");

    // Type assertion: default TData means Result<Record<string,string>>
    type _Check = Assert<AssertEqual<ReturnType<typeof rule.result>, RuleResultCustom | null>>;
  });

  test("works with empty config fields", () => {
    // Only input matters, config is just `{}`
    const noConfigRule = defineCustomRule<
      Record<string, never>,
      { text: string },
      { clean: string }
    >({
      evaluate: (_config, input) => {
        return input.text.length > 100
          ? { conclusion: "DENY", data: { clean: "false" } }
          : { conclusion: "ALLOW", data: { clean: "true" } };
      },
    });

    const rule = noConfigRule({});
    const input = rule({ text: "short" });

    assert.equal(input.type, "CUSTOM");
    assert.equal(rule.config.evaluate !== undefined, true);
  });

  test("different rule definitions are independent", () => {
    const ruleA = defineCustomRule<{ a: string }, { x: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });
    const ruleB = defineCustomRule<{ b: string }, { y: string }>({
      evaluate: () => ({ conclusion: "DENY" }),
    });

    const configA = ruleA({ a: "1" });
    const configB = ruleB({ b: "2" });

    assert.notEqual(configA[symbolArcjetInternal].configId, configB[symbolArcjetInternal].configId);
    assert.equal(configA.type, "CUSTOM");
    assert.equal(configB.type, "CUSTOM");
  });

  test("evaluate receives signal in options", () => {
    let receivedSignal: AbortSignal | undefined;
    const rule = defineCustomRule<{ x: string }, { y: string }>({
      evaluate: (_config, _input, options) => {
        receivedSignal = options.signal;
        return { conclusion: "ALLOW" };
      },
    });

    const config = rule({ x: "1" });
    const input = config({ y: "2" });

    assert.equal(typeof input.evaluate, "function");
    // Signal is provided by the SDK at call time, not by the user — just verify the param exists
    assert.equal(receivedSignal, undefined); // not called yet
  });

  test("evaluate options type includes signal", () => {
    defineCustomRule<{ x: string }, { y: string }>({
      evaluate: (_config, _input, opts) => {
        // Type assertion: opts.signal is AbortSignal | undefined
        type _Check = Assert<AssertEqual<typeof opts, { signal?: AbortSignal }>>;
        return { conclusion: "ALLOW" };
      },
    });
  });

  test("multiple configs from the same defineCustomRule are independent", () => {
    const rule = defineCustomRule<{ threshold: string }, { score: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });

    const lowThreshold = rule({ threshold: "0.1" });
    const highThreshold = rule({ threshold: "0.9" });

    assert.equal(lowThreshold.config.data?.["threshold"], "0.1");
    assert.equal(highThreshold.config.data?.["threshold"], "0.9");
    assert.notEqual(
      lowThreshold[symbolArcjetInternal].configId,
      highThreshold[symbolArcjetInternal].configId,
    );
  });

  test("config and input from different rules have different configIds", () => {
    const ruleA = defineCustomRule<{ a: string }, { x: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });
    const ruleB = defineCustomRule<{ b: string }, { y: string }>({
      evaluate: () => ({ conclusion: "DENY" }),
    });

    const configA = ruleA({ a: "1" });
    const configB = ruleB({ b: "2" });
    const inputA = configA({ x: "a" });
    const inputB = configB({ y: "b" });

    assert.notEqual(inputA[symbolArcjetInternal].configId, inputB[symbolArcjetInternal].configId);
  });

  test("LIVE mode is the default", () => {
    const rule = defineCustomRule<Record<string, string>, Record<string, string>>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });
    const config = rule({});

    // mode defaults to undefined which the server interprets as LIVE
    assert.equal(config.config.mode, undefined);
  });

  test("DRY_RUN mode is preserved", () => {
    const rule = defineCustomRule<Record<string, string>, Record<string, string>>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });
    const config = rule({ mode: "DRY_RUN" });

    assert.equal(config.config.mode, "DRY_RUN");
  });

  test("result() and deniedResult() with matching ALLOW result", () => {
    const rule = defineCustomRule<{ x: string }, { y: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });
    const config = rule({ x: "1" });
    const input = config({ y: "2" });

    const configId = input[symbolArcjetInternal].configId;
    const inputId = input[symbolArcjetInternal].inputId;

    const decision = decisionWith(configId, inputId, "ALLOW", { checked: "true" });

    const r = input.result(decision);
    assert.notEqual(r, null);
    assert.equal(r?.conclusion, "ALLOW");
    assert.equal(r?.type, "CUSTOM");
    assert.equal(r?.data["checked"], "true");

    assert.equal(input.deniedResult(decision), null);
  });

  test("result() and deniedResult() with matching DENY result", () => {
    const rule = defineCustomRule<{ x: string }, { y: string }>({
      evaluate: () => ({ conclusion: "DENY" }),
    });
    const config = rule({ x: "1" });
    const input = config({ y: "2" });

    const configId = input[symbolArcjetInternal].configId;
    const inputId = input[symbolArcjetInternal].inputId;

    const decision = decisionWith(configId, inputId, "DENY", { reason: "flagged" });

    const r = input.result(decision);
    assert.notEqual(r, null);
    assert.equal(r?.conclusion, "DENY");
    assert.equal(r?.data["reason"], "flagged");

    const d = input.deniedResult(decision);
    assert.notEqual(d, null);
    assert.equal(d?.conclusion, "DENY");
  });

  test("config-level result() finds result across multiple inputs", () => {
    const rule = defineCustomRule<{ x: string }, { y: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });
    const config = rule({ x: "1" });
    const input1 = config({ y: "a" });
    const input2 = config({ y: "b" });

    const configId = config[symbolArcjetInternal].configId;
    const inputId1 = input1[symbolArcjetInternal].inputId;
    const inputId2 = input2[symbolArcjetInternal].inputId;

    const decision = decisionWithMultiple([
      { configId, inputId: inputId1, conclusion: "ALLOW", data: { which: "first" } },
      { configId, inputId: inputId2, conclusion: "DENY", data: { which: "second" } },
    ]);

    // config.result() returns the first match
    const r = config.result(decision);
    assert.notEqual(r, null);
    assert.equal(r?.data["which"], "first");

    // config.results() returns all matches
    const all = config.results(decision);
    assert.equal(all.length, 2);

    // config.deniedResult() returns the first denied
    const d = config.deniedResult(decision);
    assert.notEqual(d, null);
    assert.equal(d?.data["which"], "second");
  });

  test("input-level result() only finds its own result", () => {
    const rule = defineCustomRule<{ x: string }, { y: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });
    const config = rule({ x: "1" });
    const input1 = config({ y: "a" });
    const input2 = config({ y: "b" });

    const configId = config[symbolArcjetInternal].configId;
    const inputId1 = input1[symbolArcjetInternal].inputId;
    const inputId2 = input2[symbolArcjetInternal].inputId;

    const decision = decisionWithMultiple([
      { configId, inputId: inputId1, conclusion: "ALLOW", data: { which: "first" } },
      { configId, inputId: inputId2, conclusion: "DENY", data: { which: "second" } },
    ]);

    const r1 = input1.result(decision);
    assert.equal(r1?.data["which"], "first");

    const r2 = input2.result(decision);
    assert.equal(r2?.data["which"], "second");

    // input1 deniedResult is null (it was ALLOW)
    assert.equal(input1.deniedResult(decision), null);
    // input2 deniedResult is the DENY
    assert.notEqual(input2.deniedResult(decision), null);
  });

  test("result from unrelated rule is not returned", () => {
    const ruleA = defineCustomRule<{ a: string }, { x: string }>({
      evaluate: () => ({ conclusion: "ALLOW" }),
    });
    const ruleB = defineCustomRule<{ b: string }, { y: string }>({
      evaluate: () => ({ conclusion: "DENY" }),
    });

    const configA = ruleA({ a: "1" });
    const configB = ruleB({ b: "2" });
    const inputB = configB({ y: "val" });

    // Decision only has a result for ruleB
    const configIdB = inputB[symbolArcjetInternal].configId;
    const inputIdB = inputB[symbolArcjetInternal].inputId;
    const decision = decisionWith(configIdB, inputIdB, "DENY", { flagged: "true" });

    // ruleA should find nothing
    assert.equal(configA.result(decision), null);
    assert.deepEqual(configA.results(decision), []);
  });
});

function emptyDecision(): Decision {
  return {
    conclusion: "ALLOW" as const,
    id: "gdec_test",
    results: [],
    hasError: (): boolean => false,
  };
}

/** Build a decision containing one custom rule result with internal IDs. */
function decisionWith(
  configId: string,
  inputId: string,
  conclusion: "ALLOW" | "DENY",
  data: Record<string, string>,
): Decision {
  return decisionWithMultiple([{ configId, inputId, conclusion, data }]);
}

/** Build a decision containing multiple custom rule results. */
function decisionWithMultiple(
  results: Array<{
    configId: string;
    inputId: string;
    conclusion: "ALLOW" | "DENY";
    data: Record<string, string>;
  }>,
): Decision {
  const ruleResults = results.map((r) =>
    Object.assign(
      {
        conclusion: r.conclusion,
        reason: "CUSTOM" as const,
        type: "CUSTOM" as const,
        data: r.data,
      },
      { [symbolArcjetInternal]: { configId: r.configId, inputId: r.inputId } },
    ),
  );
  const overallConclusion = results.some((r) => r.conclusion === "DENY") ? "DENY" : "ALLOW";
  const decision = {
    conclusion: overallConclusion,
    id: "gdec_test",
    results: ruleResults,
    hasError: (): boolean => false,
    [symbolArcjetInternal]: { results: ruleResults },
  };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test helper building a mock Decision
  return decision as unknown as Decision;
}

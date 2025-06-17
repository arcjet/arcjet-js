import { describe, test } from "node:test";
import { expect } from "expect";
import sprintf from "../index.js";

function makeDigitSuite(sequence) {
  test(`replaces ${sequence} with an integer`, () => {
    expect(sprintf(`${sequence}`, 1)).toEqual("1");
    expect(sprintf(`int: ${sequence}`, 2)).toEqual("int: 2");
  });

  test(`replaces ${sequence} with a float`, () => {
    expect(sprintf(`${sequence}`, 1.1)).toEqual("1.1");
    expect(sprintf(`int: ${sequence}`, 2.2)).toEqual("int: 2.2");
  });

  test(`does not replace ${sequence} if replacement is missing`, () => {
    expect(sprintf(`%s ${sequence}`, "missing:")).toEqual(
      `missing: ${sequence}`,
    );
  });

  test(`does not replace ${sequence} with non-number`, () => {
    expect(sprintf(`${sequence}`, "not a number")).toEqual(`${sequence}`);
    expect(sprintf(`${sequence}`, {})).toEqual(`${sequence}`);
    expect(sprintf(`${sequence}`, null)).toEqual(`${sequence}`);
    expect(sprintf(`${sequence}`, Symbol("abc"))).toEqual(`${sequence}`);
  });
}

function makeObjectSuite(sequence) {
  test(`replaces ${sequence} with the result of JSON.stringify`, () => {
    expect(sprintf(`${sequence}`, { abc: 123 })).toEqual(`{"abc":123}`);
  });

  test(`replaces ${sequence} with quoted string`, () => {
    expect(sprintf(`${sequence}`, "hello")).toEqual(`'hello'`);
  });

  test(`replaces ${sequence} with function name`, () => {
    function foobar() {}
    expect(sprintf(`${sequence}`, foobar)).toEqual(`foobar`);
  });

  test(`replaces ${sequence} with <anonymous> function`, () => {
    expect(sprintf(`${sequence}`, () => {})).toEqual(`<anonymous>`);
  });

  test(`replaces ${sequence} with [Circular] on failure to JSON.stringify on circular data`, () => {
    const o = {};
    // @ts-expect-error
    o.o = o;
    expect(sprintf(`${sequence}`, o)).toEqual(`"[Circular]"`);
  });

  test(`replaces ${sequence} with [BigInt] on JSON.stringify on BigInt data`, () => {
    expect(sprintf(`${sequence}`, 0n)).toEqual(`"[BigInt]"`);
    expect(sprintf(`${sequence}`, { abc: 0n })).toEqual(`{"abc":"[BigInt]"}`);
  });

  test(`does not replace ${sequence} if replacement is missing`, () => {
    expect(sprintf(`%s ${sequence}`, "missing:")).toEqual(
      `missing: ${sequence}`,
    );
  });

  test(`does not replace ${sequence} if replacement is undefined`, () => {
    expect(sprintf(`%s ${sequence}`, "missing:", undefined)).toEqual(
      `missing: ${sequence}`,
    );
  });
}

describe("sprintf", () => {
  test("throws if first argument is not a string", () => {
    expect(() => {
      /* @ts-expect-error */
      sprintf(1234);
    }).toThrow("First argument must be a string");
  });

  // Note: This means that %% does not get replaced if no replacements provided
  // but this matches the behavior of https://github.com/pinojs/quick-format-unescaped
  test("returns the string verbatim if no replacements provided", () => {
    expect(sprintf("%s %o %d")).toEqual("%s %o %d");
  });

  test("returns string verbatim if no substitution sequences", () => {
    expect(sprintf("hello world", "not used")).toEqual("hello world");
  });

  makeDigitSuite("%d");
  makeDigitSuite("%f");

  test("replaces %f with an integer", () => {
    expect(sprintf("%f", 1)).toEqual("1");
    expect(sprintf("int: %f", 2)).toEqual("int: 2");
  });

  test("replaces %f with a float", () => {
    expect(sprintf("%f", 1.1)).toEqual("1.1");
    expect(sprintf("int: %f", 2.2)).toEqual("int: 2.2");
  });

  test("does not replace %f if replacement is missing", () => {
    expect(sprintf("%s %f", "missing:")).toEqual("missing: %f");
  });

  test("does not replace %f with non-number", () => {
    expect(sprintf("%f", "not a number")).toEqual("%f");
    expect(sprintf("%f", {})).toEqual("%f");
    expect(sprintf("%f", null)).toEqual("%f");
    expect(sprintf("%f", Symbol("abc"))).toEqual("%f");
  });

  test("replaces %i with an integer", () => {
    expect(sprintf("%i", 1)).toEqual("1");
    expect(sprintf("int: %i", 2)).toEqual("int: 2");
    expect(sprintf("not float: %i", 3.3)).toEqual("not float: 3");
  });

  test("does not replace %i if replacement is missing", () => {
    expect(sprintf("%s %i", "missing:")).toEqual("missing: %i");
  });

  test("does not replace %i with non-number", () => {
    expect(sprintf("%i", "not a number")).toEqual("%i");
    expect(sprintf("%i", {})).toEqual("%i");
    expect(sprintf("%i", null)).toEqual("%i");
    expect(sprintf("%i", Symbol("abc"))).toEqual("%i");
  });

  makeObjectSuite("%O");
  makeObjectSuite("%o");
  makeObjectSuite("%j");

  test("replaces %s with a string", () => {
    expect(sprintf("%s", "hello")).toEqual("hello");
    expect(sprintf("hello %s", "world")).toEqual("hello world");
  });

  test("does not replace %s if replacement is missing", () => {
    expect(sprintf("%s %s", "missing:")).toEqual("missing: %s");
  });

  test("does not replace %s with non-string", () => {
    expect(sprintf("%s", 1)).toEqual("%s");
    expect(sprintf("%s", {})).toEqual("%s");
    expect(sprintf("%s", null)).toEqual("%s");
    expect(sprintf("%s", Symbol("abc"))).toEqual("%s");
  });

  test("replaces %% with % character if doing other replacements", () => {
    expect(sprintf("%d %% %d", 2, 1)).toEqual("2 % 1");
  });
});

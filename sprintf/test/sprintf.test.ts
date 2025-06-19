import assert from "node:assert/strict";
import { describe, test } from "node:test";
import sprintf from "../index.js";

function makeDigitSuite(sequence) {
  test(`replaces ${sequence} with an integer`, () => {
    assert.equal(sprintf(`${sequence}`, 1), "1");
    assert.equal(sprintf(`int: ${sequence}`, 2), "int: 2");
  });

  test(`replaces ${sequence} with a float`, () => {
    assert.equal(sprintf(`${sequence}`, 1.1), "1.1");
    assert.equal(sprintf(`int: ${sequence}`, 2.2), "int: 2.2");
  });

  test(`does not replace ${sequence} if replacement is missing`, () => {
    assert.equal(sprintf(`%s ${sequence}`, "missing:"), `missing: ${sequence}`);
  });

  test(`does not replace ${sequence} with non-number`, () => {
    assert.equal(sprintf(`${sequence}`, "not a number"), `${sequence}`);
    assert.equal(sprintf(`${sequence}`, {}), `${sequence}`);
    assert.equal(sprintf(`${sequence}`, null), `${sequence}`);
    assert.equal(sprintf(`${sequence}`, Symbol("abc")), `${sequence}`);
  });
}

function makeObjectSuite(sequence) {
  test(`replaces ${sequence} with the result of JSON.stringify`, () => {
    assert.equal(sprintf(`${sequence}`, { abc: 123 }), `{"abc":123}`);
  });

  test(`replaces ${sequence} with quoted string`, () => {
    assert.equal(sprintf(`${sequence}`, "hello"), `'hello'`);
  });

  test(`replaces ${sequence} with function name`, () => {
    function foobar() {}
    assert.equal(sprintf(`${sequence}`, foobar), `foobar`);
  });

  test(`replaces ${sequence} with <anonymous> function`, () => {
    assert.equal(
      sprintf(`${sequence}`, () => {}),
      `<anonymous>`,
    );
  });

  test(`replaces ${sequence} with [Circular] on failure to JSON.stringify on circular data`, () => {
    const o = {};
    // @ts-expect-error
    o.o = o;
    assert.equal(sprintf(`${sequence}`, o), `"[Circular]"`);
  });

  test(`replaces ${sequence} with [BigInt] on JSON.stringify on BigInt data`, () => {
    assert.equal(sprintf(`${sequence}`, 0n), `"[BigInt]"`);
    assert.equal(sprintf(`${sequence}`, { abc: 0n }), `{"abc":"[BigInt]"}`);
  });

  test(`does not replace ${sequence} if replacement is missing`, () => {
    assert.equal(sprintf(`%s ${sequence}`, "missing:"), `missing: ${sequence}`);
  });

  test(`does not replace ${sequence} if replacement is undefined`, () => {
    assert.equal(
      sprintf(`%s ${sequence}`, "missing:", undefined),
      `missing: ${sequence}`,
    );
  });
}

describe("sprintf", () => {
  test("throws if first argument is not a string", () => {
    assert.throws(() => {
      /* @ts-expect-error */
      sprintf(1234);
    }, /First argument must be a string/);
  });

  // Note: This means that %% does not get replaced if no replacements provided
  // but this matches the behavior of https://github.com/pinojs/quick-format-unescaped
  test("returns the string verbatim if no replacements provided", () => {
    assert.equal(sprintf("%s %o %d"), "%s %o %d");
  });

  test("returns string verbatim if no substitution sequences", () => {
    assert.equal(sprintf("hello world", "not used"), "hello world");
  });

  makeDigitSuite("%d");
  makeDigitSuite("%f");

  test("replaces %f with an integer", () => {
    assert.equal(sprintf("%f", 1), "1");
    assert.equal(sprintf("int: %f", 2), "int: 2");
  });

  test("replaces %f with a float", () => {
    assert.equal(sprintf("%f", 1.1), "1.1");
    assert.equal(sprintf("int: %f", 2.2), "int: 2.2");
  });

  test("does not replace %f if replacement is missing", () => {
    assert.equal(sprintf("%s %f", "missing:"), "missing: %f");
  });

  test("does not replace %f with non-number", () => {
    assert.equal(sprintf("%f", "not a number"), "%f");
    assert.equal(sprintf("%f", {}), "%f");
    assert.equal(sprintf("%f", null), "%f");
    assert.equal(sprintf("%f", Symbol("abc")), "%f");
  });

  test("replaces %i with an integer", () => {
    assert.equal(sprintf("%i", 1), "1");
    assert.equal(sprintf("int: %i", 2), "int: 2");
    assert.equal(sprintf("not float: %i", 3.3), "not float: 3");
  });

  test("does not replace %i if replacement is missing", () => {
    assert.equal(sprintf("%s %i", "missing:"), "missing: %i");
  });

  test("does not replace %i with non-number", () => {
    assert.equal(sprintf("%i", "not a number"), "%i");
    assert.equal(sprintf("%i", {}), "%i");
    assert.equal(sprintf("%i", null), "%i");
    assert.equal(sprintf("%i", Symbol("abc")), "%i");
  });

  makeObjectSuite("%O");
  makeObjectSuite("%o");
  makeObjectSuite("%j");

  test("replaces %s with a string", () => {
    assert.equal(sprintf("%s", "hello"), "hello");
    assert.equal(sprintf("hello %s", "world"), "hello world");
  });

  test("does not replace %s if replacement is missing", () => {
    assert.equal(sprintf("%s %s", "missing:"), "missing: %s");
  });

  test("does not replace %s with non-string", () => {
    assert.equal(sprintf("%s", 1), "%s");
    assert.equal(sprintf("%s", {}), "%s");
    assert.equal(sprintf("%s", null), "%s");
    assert.equal(sprintf("%s", Symbol("abc")), "%s");
  });

  test("replaces %% with % character if doing other replacements", () => {
    assert.equal(sprintf("%d %% %d", 2, 1), "2 % 1");
  });
});

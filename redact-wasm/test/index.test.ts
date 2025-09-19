import assert from "node:assert/strict";
import test from "node:test";
import { initializeWasm } from "../index.js";

const wasm = await initializeWasm(detectNothing, replaceNothing);
assert.ok(wasm);

test("@arcjet/redact-wasm", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "initializeWasm",
    ]);
  });
});

test("card number", async function (t) {
  const emptyOptions = { skipCustomDetect: false, skipCustomRedact: false };

  // Everything starting with a `4` is a Visa card,
  // which can be `16`, `18`, or `19` digits long.
  await t.test("should work w/ Visa card numbers (`42`)", async function () {
    assert.deepEqual(wasm.redact("4242424242424242", emptyOptions), [
      {
        end: 16,
        identifiedType: { tag: "credit-card-number" },
        original: "4242424242424242",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  await t.test("should work w/ Visa card numbers (`40`)", async function () {
    assert.deepEqual(wasm.redact("4000056655665556", emptyOptions), [
      {
        end: 16,
        identifiedType: { tag: "credit-card-number" },
        original: "4000056655665556",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  await t.test("should work w/ Visa card numbers (`44`)", async function () {
    assert.deepEqual(wasm.redact("4444333322221111455", emptyOptions), [
      {
        end: 19,
        identifiedType: { tag: "credit-card-number" },
        original: "4444333322221111455",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  await t.test(
    "should work w/ Mastercard card numbers (`22`)",
    async function () {
      assert.deepEqual(wasm.redact("2223003122003222", emptyOptions), [
        {
          end: 16,
          identifiedType: { tag: "credit-card-number" },
          original: "2223003122003222",
          redacted: "<Redacted credit card number #0>",
          start: 0,
        },
      ]);
    },
  );

  await t.test(
    "should work w/ Mastercard card numbers (`51`)",
    async function () {
      assert.deepEqual(wasm.redact("5105105105105100", emptyOptions), [
        {
          end: 16,
          identifiedType: { tag: "credit-card-number" },
          original: "5105105105105100",
          redacted: "<Redacted credit card number #0>",
          start: 0,
        },
      ]);
    },
  );

  await t.test(
    "should work w/ Mastercard card numbers (`52`)",
    async function () {
      assert.deepEqual(wasm.redact("5200828282828210", emptyOptions), [
        {
          end: 16,
          identifiedType: { tag: "credit-card-number" },
          original: "5200828282828210",
          redacted: "<Redacted credit card number #0>",
          start: 0,
        },
      ]);
    },
  );

  // `37` means Amex, which can be `15` digits long.
  await t.test("should work w/ Amex card numbers", async function () {
    assert.deepEqual(wasm.redact("378282246310005", emptyOptions), [
      {
        end: 15,
        identifiedType: { tag: "credit-card-number" },
        original: "378282246310005",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  // `30`, `36` mean Diners club, which can be `14`, `16`, or `19` digits long.
  await t.test(
    "should work w/ Diners club card numbers (`30`)",
    async function () {
      assert.deepEqual(wasm.redact("3056930009020004", emptyOptions), [
        {
          end: 16,
          identifiedType: { tag: "credit-card-number" },
          original: "3056930009020004",
          redacted: "<Redacted credit card number #0>",
          start: 0,
        },
      ]);
    },
  );

  await t.test(
    "should work w/ Diners club card numbers (`36`)",
    async function () {
      assert.deepEqual(wasm.redact("36227206271667", emptyOptions), [
        {
          end: 14,
          identifiedType: { tag: "credit-card-number" },
          original: "36227206271667",
          redacted: "<Redacted credit card number #0>",
          start: 0,
        },
      ]);
    },
  );

  // `35` means JCB, which can be `16` through `19` digits long.
  await t.test("should work w/ JCB card numbers", async function () {
    assert.deepEqual(wasm.redact("3566002020360505", emptyOptions), [
      {
        end: 16,
        identifiedType: { tag: "credit-card-number" },
        original: "3566002020360505",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  // `60` means Discover, which can be `16` or `19` digits long.
  await t.test("should work w/ Discover card numbers", async function () {
    assert.deepEqual(wasm.redact("6011111111111117", emptyOptions), [
      {
        end: 16,
        identifiedType: { tag: "credit-card-number" },
        original: "6011111111111117",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  // `62` means Union, which can be `14` through `19` digits long.
  await t.test("should work w/ Elo card numbers", async function () {
    assert.deepEqual(wasm.redact("6205500000000000004", emptyOptions), [
      {
        end: 19,
        identifiedType: { tag: "credit-card-number" },
        original: "6205500000000000004",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  // `65` means Elo, which can be `16` digits long.
  await t.test("should work w/ Elo card numbers", async function () {
    assert.deepEqual(wasm.redact("6555900000604105", emptyOptions), [
      {
        end: 16,
        identifiedType: { tag: "credit-card-number" },
        original: "6555900000604105",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  await t.test("should fail when too short", async function () {
    assert.deepEqual(wasm.redact("4242", emptyOptions), []);
  });

  await t.test("should fail when too long", async function () {
    assert.deepEqual(wasm.redact("42424242424242424242", emptyOptions), []);
  });

  await t.test("should fail w/o Luhn (Visa)", async function () {
    assert.deepEqual(wasm.redact("4242424242424241", emptyOptions), []);
  });

  await t.test("should fail w/o Luhn (Mastercard)", async function () {
    assert.deepEqual(wasm.redact("5200828282828219", emptyOptions), []);
  });

  await t.test("should fail w/ non-digits", async function () {
    assert.deepEqual(wasm.redact("hello", emptyOptions), []);
    assert.deepEqual(wasm.redact("áéíóúß", emptyOptions), []);
  });

  await t.test("should fail w/ partial digits", async function () {
    assert.deepEqual(wasm.redact("0num", emptyOptions), []);
  });

  await t.test("should work w/ spaces", async function () {
    assert.deepEqual(wasm.redact("4242 4242 4242 4242", emptyOptions), [
      {
        end: 19,
        identifiedType: { tag: "credit-card-number" },
        original: "4242 4242 4242 4242",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  await t.test("should work w/ dashes", async function () {
    assert.deepEqual(wasm.redact("4242-4242-4242-4242", emptyOptions), [
      {
        end: 19,
        identifiedType: { tag: "credit-card-number" },
        original: "4242-4242-4242-4242",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  await t.test("should work w/ many dashes", async function () {
    assert.deepEqual(wasm.redact("42-42-42-42-42-42-42-42", emptyOptions), [
      {
        end: 23,
        identifiedType: { tag: "credit-card-number" },
        original: "42-42-42-42-42-42-42-42",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  await t.test("should work w/ repeated dashes", async function () {
    assert.deepEqual(wasm.redact("4242-4242-4242--4242", emptyOptions), [
      {
        end: 20,
        identifiedType: { tag: "credit-card-number" },
        original: "4242-4242-4242--4242",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  await t.test("should work w/ dashes and spaces", async function () {
    assert.deepEqual(wasm.redact("4242-4242 4242-4242", emptyOptions), [
      {
        end: 19,
        identifiedType: { tag: "credit-card-number" },
        original: "4242-4242 4242-4242",
        redacted: "<Redacted credit card number #0>",
        start: 0,
      },
    ]);
  });

  await t.test("should fail if too short w/ dashes", async function () {
    assert.deepEqual(wasm.redact("4242-4242-4242-424", emptyOptions), []);
  });

  await t.test("should work if too long w/ dashes", async function () {
    assert.deepEqual(wasm.redact("4242-4242-4242-4242-4242", emptyOptions), []);
  });
});

function detectNothing() {
  return [];
}

function replaceNothing() {
  return undefined;
}

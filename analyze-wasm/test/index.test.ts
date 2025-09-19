import assert from "node:assert/strict";
import test from "node:test";
import { initializeWasm } from "../index.js";

const wasm = await initializeWasm({
  "arcjet:js-req/bot-identifier": {
    detect() {
      return [];
    },
  },
  "arcjet:js-req/email-validator-overrides": {
    hasGravatar() {
      return "unknown";
    },
    hasMxRecords() {
      return "unknown";
    },
    isDisposableEmail() {
      return "unknown";
    },
    isFreeEmail() {
      return "unknown";
    },
  },
  "arcjet:js-req/filter-overrides": {
    ipLookup() {
      return undefined;
    },
  },
  "arcjet:js-req/sensitive-information-identifier": {
    detect() {
      return [];
    },
  },
  "arcjet:js-req/verify-bot": {
    verify() {
      return "unverifiable";
    },
  },
});
assert.ok(wasm);

test("@arcjet/analyze-wasm", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "initializeWasm",
    ]);
  });
});

test("`detectSensitiveInfo`", async function (t) {
  await t.test("should detect a card number", async function () {
    assert.deepEqual(
      wasm.detectSensitiveInfo("a 4242424242424242 b", {
        entities: { tag: "allow", val: [] },
        skipCustomDetect: false,
      }),
      {
        allowed: [],
        denied: [
          { end: 18, identifiedType: { tag: "credit-card-number" }, start: 2 },
        ],
      },
    );
  });

  await t.test("should detect a card number if in `allow`", async function () {
    assert.deepEqual(
      wasm.detectSensitiveInfo("a 4242424242424242 b", {
        entities: { tag: "allow", val: [{ tag: "credit-card-number" }] },
        skipCustomDetect: false,
      }),
      {
        allowed: [
          {
            end: 18,
            identifiedType: { tag: "credit-card-number" },
            start: 2,
          },
        ],
        denied: [],
      },
    );
  });

  await t.test("should detect a card number w/ dashes", async function () {
    assert.deepEqual(
      wasm.detectSensitiveInfo("a 4242-4242-4242-4242 b", {
        entities: { tag: "allow", val: [{ tag: "credit-card-number" }] },
        skipCustomDetect: false,
      }),
      {
        allowed: [
          {
            end: 21,
            identifiedType: { tag: "credit-card-number" },
            start: 2,
          },
        ],
        denied: [],
      },
    );
  });

  await t.test("should detect a card number w/ spaces", async function () {
    assert.deepEqual(
      wasm.detectSensitiveInfo("a 4242 4242 4242 4242 b", {
        entities: { tag: "allow", val: [{ tag: "credit-card-number" }] },
        skipCustomDetect: false,
      }),
      {
        allowed: [
          {
            end: 21,
            identifiedType: { tag: "credit-card-number" },
            start: 2,
          },
        ],
        denied: [],
      },
    );
  });
});

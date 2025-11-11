import assert from "node:assert/strict";
import test from "node:test";
import { cloudflare, google } from "../index.js";

test("@arcjet/ip", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "cloudflare",
      "google",
    ]);
  });
});

test("`cloudflare`", async function (t) {
  await t.test("should be a non-empty array", function () {
    assert.ok(Array.isArray(cloudflare));
    assert.notEqual(cloudflare.length, 0);
  });

  await t.test("should contain strings", function () {
    assert.doesNotThrow(function () {
      for (const value of cloudflare) {
        assert.equal(typeof value, "string");
      }
    });
  });
});

test("`google`", async function (t) {
  await t.test("should be a non-empty array", function () {
    assert.ok(Array.isArray(google));
    assert.notEqual(google.length, 0);
  });

  await t.test("should contain strings", function () {
    assert.doesNotThrow(function () {
      for (const value of google) {
        assert.equal(typeof value, "string");
      }
    });
  });
});

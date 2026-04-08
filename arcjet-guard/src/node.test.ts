import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  launchArcjet,
  createTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  defineCustomRule,
  launchArcjetWithTransport,
} from "./node.ts";

describe("node entrypoint", () => {
  test("launchArcjet is exported as a function", () => {
    assert.equal(typeof launchArcjet, "function");
  });

  test("createTransport is re-exported", () => {
    assert.equal(typeof createTransport, "function");
  });

  test("rule factories are re-exported", () => {
    assert.equal(typeof tokenBucket, "function");
    assert.equal(typeof fixedWindow, "function");
    assert.equal(typeof slidingWindow, "function");
    assert.equal(typeof detectPromptInjection, "function");
    assert.equal(typeof localDetectSensitiveInfo, "function");
    assert.equal(typeof defineCustomRule, "function");
  });

  test("launchArcjetWithTransport is re-exported", () => {
    assert.equal(typeof launchArcjetWithTransport, "function");
  });

  test("launchArcjet returns an object with .guard()", () => {
    const arcjet = launchArcjet({ key: "ajkey_test" });

    assert.equal(typeof arcjet.guard, "function");
  });
});

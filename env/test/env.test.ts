import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  apiKey,
  baseUrl,
  isDevelopment,
  logLevel,
  platform,
} from "../index.ts";

test("@arcjet/env", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "apiKey",
      "baseUrl",
      "isDevelopment",
      "logLevel",
      "platform",
    ]);
  });
});

describe("env", () => {
  test("platform", () => {
    assert.equal(platform({}), undefined);
    assert.equal(platform({ FLY_APP_NAME: "" }), undefined);
    assert.equal(platform({ FLY_APP_NAME: "foobar" }), "fly-io");
    assert.equal(platform({ VERCEL: "" }), undefined);
    assert.equal(platform({ VERCEL: "1" }), "vercel");
    assert.equal(platform({ RENDER: "" }), undefined);
    assert.equal(platform({ RENDER: "true" }), "render");
  });

  test("isDevelopment", () => {
    assert.equal(isDevelopment({}), false);
    assert.equal(isDevelopment({ NODE_ENV: "production" }), false);
    assert.equal(isDevelopment({ NODE_ENV: "development" }), true);
    assert.equal(isDevelopment({ MODE: "production" }), false);
    assert.equal(isDevelopment({ MODE: "development" }), true);
    assert.equal(isDevelopment({ ARCJET_ENV: "production" }), false);
    assert.equal(isDevelopment({ ARCJET_ENV: "development" }), true);
  });

  test("logLevel", () => {
    assert.equal(logLevel({}), "warn");
    assert.equal(logLevel({ ARCJET_LOG_LEVEL: "" }), "warn");
    assert.equal(logLevel({ ARCJET_LOG_LEVEL: "invalid" }), "warn");
    assert.equal(logLevel({ ARCJET_LOG_LEVEL: "debug" }), "debug");
    assert.equal(logLevel({ ARCJET_LOG_LEVEL: "info" }), "info");
    assert.equal(logLevel({ ARCJET_LOG_LEVEL: "warn" }), "warn");
    assert.equal(logLevel({ ARCJET_LOG_LEVEL: "error" }), "error");
  });

  test("baseUrl", () => {
    // dev
    assert.equal(
      baseUrl({ NODE_ENV: "development" }),
      "https://decide.arcjet.com",
    );
    assert.equal(
      baseUrl({
        NODE_ENV: "development",
        ARCJET_BASE_URL: "anything-in-dev?",
      }),
      "https://decide.arcjet.com",
    );
    assert.equal(
      baseUrl({ NODE_ENV: "development", FLY_APP_NAME: "" }),
      "https://decide.arcjet.com",
    );
    assert.equal(
      baseUrl({ NODE_ENV: "development", FLY_APP_NAME: "foobar" }),
      "https://fly.decide.arcjet.com",
    );
    // prod
    assert.equal(baseUrl({}), "https://decide.arcjet.com");
    assert.equal(
      baseUrl({
        ARCJET_BASE_URL: "https://decide.arcjet.com",
      }),
      "https://decide.arcjet.com",
    );
    assert.equal(
      baseUrl({
        ARCJET_BASE_URL: "https://decide.arcjettest.com",
      }),
      "https://decide.arcjettest.com",
    );
    assert.equal(
      baseUrl({
        ARCJET_BASE_URL: "https://fly.decide.arcjet.com",
      }),
      "https://fly.decide.arcjet.com",
    );
    assert.equal(
      baseUrl({
        ARCJET_BASE_URL: "https://fly.decide.arcjettest.com",
      }),
      "https://fly.decide.arcjettest.com",
    );
    assert.equal(
      baseUrl({
        ARCJET_BASE_URL: "https://decide.arcjet.orb.local:4082",
      }),
      "https://decide.arcjet.orb.local:4082",
    );
    assert.equal(
      baseUrl({ FLY_APP_NAME: "foobar" }),
      "https://fly.decide.arcjet.com",
    );
  });

  test("apiKey", () => {
    assert.equal(apiKey({}), undefined);
    assert.equal(apiKey({ ARCJET_KEY: "invalid" }), undefined);
    assert.equal(apiKey({ ARCJET_KEY: "ajkey_abc123" }), "ajkey_abc123");
  });
});

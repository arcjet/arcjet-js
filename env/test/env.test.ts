import assert from "node:assert/strict";
import { describe, test } from "node:test";
import * as env from "../index.ts";

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
    assert.equal(env.platform({}), undefined);

    // https://firebase.google.com/docs/functions/config-env
    assert.equal(env.platform({ FIREBASE_CONFIG: "" }), undefined);
    assert.equal(
      env.platform({ FIREBASE_CONFIG: "{databaseURL…}" }),
      "firebase",
    );

    assert.equal(env.platform({ FLY_APP_NAME: "" }), undefined);
    assert.equal(env.platform({ FLY_APP_NAME: "foobar" }), "fly-io");
    assert.equal(env.platform({ VERCEL: "" }), undefined);
    assert.equal(env.platform({ VERCEL: "1" }), "vercel");
    assert.equal(env.platform({ RENDER: "" }), undefined);
    assert.equal(env.platform({ RENDER: "true" }), "render");
  });

  test("isDevelopment", () => {
    assert.equal(env.isDevelopment({}), false);
    assert.equal(env.isDevelopment({ NODE_ENV: "production" }), false);
    assert.equal(env.isDevelopment({ NODE_ENV: "development" }), true);
    assert.equal(env.isDevelopment({ MODE: "production" }), false);
    assert.equal(env.isDevelopment({ MODE: "development" }), true);
    assert.equal(env.isDevelopment({ ARCJET_ENV: "production" }), false);
    assert.equal(env.isDevelopment({ ARCJET_ENV: "development" }), true);
  });

  test("logLevel", () => {
    assert.equal(env.logLevel({}), "warn");
    assert.equal(env.logLevel({ ARCJET_LOG_LEVEL: "" }), "warn");
    assert.equal(env.logLevel({ ARCJET_LOG_LEVEL: "invalid" }), "warn");
    assert.equal(env.logLevel({ ARCJET_LOG_LEVEL: "debug" }), "debug");
    assert.equal(env.logLevel({ ARCJET_LOG_LEVEL: "info" }), "info");
    assert.equal(env.logLevel({ ARCJET_LOG_LEVEL: "warn" }), "warn");
    assert.equal(env.logLevel({ ARCJET_LOG_LEVEL: "error" }), "error");
  });

  test("baseUrl", () => {
    // dev
    assert.equal(
      env.baseUrl({ NODE_ENV: "development" }),
      "https://decide.arcjet.com",
    );
    assert.equal(
      env.baseUrl({
        NODE_ENV: "development",
        ARCJET_BASE_URL: "anything-in-dev?",
      }),
      "https://decide.arcjet.com",
    );
    assert.equal(
      env.baseUrl({ NODE_ENV: "development", FLY_APP_NAME: "" }),
      "https://decide.arcjet.com",
    );
    assert.equal(
      env.baseUrl({ NODE_ENV: "development", FLY_APP_NAME: "foobar" }),
      "https://fly.decide.arcjet.com",
    );
    // prod
    assert.equal(env.baseUrl({}), "https://decide.arcjet.com");
    assert.equal(
      env.baseUrl({
        ARCJET_BASE_URL: "https://decide.arcjet.com",
      }),
      "https://decide.arcjet.com",
    );
    assert.equal(
      env.baseUrl({
        ARCJET_BASE_URL: "https://decide.arcjettest.com",
      }),
      "https://decide.arcjettest.com",
    );
    assert.equal(
      env.baseUrl({
        ARCJET_BASE_URL: "https://fly.decide.arcjet.com",
      }),
      "https://fly.decide.arcjet.com",
    );
    assert.equal(
      env.baseUrl({
        ARCJET_BASE_URL: "https://fly.decide.arcjettest.com",
      }),
      "https://fly.decide.arcjettest.com",
    );
    assert.equal(
      env.baseUrl({
        ARCJET_BASE_URL: "https://decide.arcjet.orb.local",
      }),
      "https://decide.arcjet.orb.local",
    );
    assert.equal(
      env.baseUrl({ FLY_APP_NAME: "foobar" }),
      "https://fly.decide.arcjet.com",
    );

    // Trailing slash.
    assert.equal(
      env.baseUrl({
        ARCJET_BASE_URL: "https://decide.arcjet.com/",
      }),
      "https://decide.arcjet.com/",
    );
    assert.equal(
      env.baseUrl({
        ARCJET_BASE_URL: "https://decide.arcjettest.com/",
      }),
      "https://decide.arcjettest.com/",
    );
    assert.equal(
      env.baseUrl({
        ARCJET_BASE_URL: "https://fly.decide.arcjet.com/",
      }),
      "https://fly.decide.arcjet.com/",
    );
    assert.equal(
      env.baseUrl({
        ARCJET_BASE_URL: "https://fly.decide.arcjettest.com/",
      }),
      "https://fly.decide.arcjettest.com/",
    );
    assert.equal(
      env.baseUrl({
        ARCJET_BASE_URL: "https://decide.arcjet.orb.local/",
      }),
      "https://decide.arcjet.orb.local/",
    );
  });

  test("apiKey", () => {
    assert.equal(env.apiKey({}), undefined);
    assert.equal(env.apiKey({ ARCJET_KEY: "invalid" }), undefined);
    assert.equal(env.apiKey({ ARCJET_KEY: "ajkey_abc123" }), "ajkey_abc123");
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { setLogLevel } from "../../test/_shared/log-level.ts";
import { decisionAllow, stubClient } from "../../test/_shared/stub-client.ts";
import { captureEvent } from "./capture.ts";

test("AC4.10: captureEvent with missing experimental_capture", () => {
  const { client } = stubClient(decisionAllow());

  delete client.experimental_capture;

  assert.doesNotThrow((): void => {
    captureEvent(client, { action: "test.action" });
  });
});

test("AC4.10: captureEvent warns when client lacks experimental_capture and ARCJET_LOG_LEVEL permits", () => {
  const originalWarn = console.warn;
  const warnings: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnings.push(args);
  };

  const restore = setLogLevel("warn");

  try {
    const { client } = stubClient(decisionAllow());
    delete client.experimental_capture;

    captureEvent(client, { action: "test.action" });

    assert.equal(warnings.length, 1);
    assert.ok(
      Array.isArray(warnings[0]) &&
        typeof warnings[0][0] === "string" &&
        warnings[0][0].includes("@arcjet/guard:") &&
        warnings[0][0].includes("does not support experimental_capture"),
      "warning should include @arcjet/guard prefix and experimental_capture",
    );
  } finally {
    restore();
    console.warn = originalWarn;
  }
});

test("AC4.10: captureEvent does not warn when ARCJET_LOG_LEVEL is not set", () => {
  const originalWarn = console.warn;
  const warnings: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnings.push(args);
  };

  const restore = setLogLevel(undefined);

  try {
    const { client } = stubClient(decisionAllow());
    delete client.experimental_capture;

    captureEvent(client, { action: "test.action" });

    assert.equal(warnings.length, 0, "should not warn when log level is not set");
  } finally {
    restore();
    console.warn = originalWarn;
  }
});

test("AC4.10: captureEvent calls experimental_capture when available", () => {
  const { client, captureCalls } = stubClient(decisionAllow());

  const opts = { action: "test.action", correlationId: "corr_123" };
  captureEvent(client, opts);

  assert.equal(captureCalls.length, 1);
  assert.deepEqual(captureCalls[0], opts);
});

test("AC4.10: captureEvent does not warn when client has experimental_capture", () => {
  const originalWarn = console.warn;
  const warnings: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnings.push(args);
  };

  const restore = setLogLevel("warn");

  try {
    const { client } = stubClient(decisionAllow());

    captureEvent(client, { action: "test.action" });

    assert.equal(warnings.length, 0);
  } finally {
    restore();
    console.warn = originalWarn;
  }
});

test("AC4.10: captureEvent swallows throwing experimental_capture", () => {
  const { client } = stubClient(decisionAllow());

  client.experimental_capture = (): void => {
    throw new Error("capture failed");
  };

  assert.doesNotThrow((): void => {
    captureEvent(client, { action: "test.action" });
  });
});

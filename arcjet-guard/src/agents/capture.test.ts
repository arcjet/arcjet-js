import assert from "node:assert/strict";
import { test } from "node:test";

import { decisionAllow, stubClient } from "../../test/_shared/stub-client.ts";
import { captureEvent } from "./capture.ts";

test("AC4.10: captureEvent forwards to the client's capture()", () => {
  const { client, captureCalls } = stubClient(decisionAllow());

  const opts = { action: "test.action", correlationId: "corr_123" };
  captureEvent(client, opts);

  assert.equal(captureCalls.length, 1);
  assert.deepEqual(captureCalls[0], opts);
});

test("AC4.10: captureEvent swallows a throwing capture()", () => {
  const { client } = stubClient(decisionAllow());

  client.capture = (): void => {
    throw new Error("capture failed");
  };

  assert.doesNotThrow((): void => {
    captureEvent(client, { action: "test.action" });
  });
});

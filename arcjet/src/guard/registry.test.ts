import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { create } from "@bufbuild/protobuf";
import { createRouterTransport } from "@connectrpc/connect";

import {
  capture,
  flush,
  guard,
  launchArcjetWithTransport,
  registerArcjet,
  unregisterArcjet,
  type ArcjetClient,
} from "./index.ts";
import {
  CaptureResponseSchema,
  DecideService,
  type CaptureRequest,
} from "./proto/proto/decide/v2/decide_pb.js";

function captureClient(received: CaptureRequest[], diagnostics: string[] = []): ArcjetClient {
  const transport = createRouterTransport(({ service }) => {
    service(DecideService, {
      capture(request) {
        received.push(request);
        return create(CaptureResponseSchema, {});
      },
    });
  });

  return launchArcjetWithTransport({
    key: "ajkey_test",
    transport,
    logger: {
      warn(messageOrFields, message) {
        if (typeof messageOrFields === "string") {
          diagnostics.push(messageOrFields);
        } else if (typeof message === "string") {
          diagnostics.push(`[${String(messageOrFields["code"])}] ${message}`);
        }
      },
    },
  });
}

describe("client registration", () => {
  test("launching a client does not register it", async () => {
    captureClient([]);

    try {
      const decision = await guard({ label: "unregistered", rules: [] });

      assert.equal(decision.conclusion, "ALLOW");
      assert.equal(decision.hasFailedOpen(), true);
      assert.equal(decision.errorResults().length, 1);
    } finally {
      unregisterArcjet();
    }
  });

  test("unregistered capture() and flush() fail open without throwing", async () => {
    // The whole free-function surface degrades the same way, not just `guard()`:
    // a missing client is a deployment condition, never an exception.
    assert.equal(
      (globalThis as Record<symbol, unknown>)[Symbol.for("arcjet.client")],
      undefined,
      "a previous test leaked a registration",
    );

    assert.doesNotThrow(() => {
      capture({ action: "refund.issued" });
    });
    await assert.doesNotReject(flush());
    await assert.doesNotReject(flush(0));
  });

  test("routes free functions through the registered client", async () => {
    const received: CaptureRequest[] = [];
    const client = captureClient(received);
    registerArcjet(client);

    try {
      capture({ action: "refund.issued" });
      await flush();

      assert.equal(received.length, 1);
      assert.equal(received[0].events[0].action, "refund.issued");
    } finally {
      unregisterArcjet();
    }
  });

  test("keeps the first client until the global registration is cleared", async () => {
    const firstReceived: CaptureRequest[] = [];
    const secondReceived: CaptureRequest[] = [];
    const firstDiagnostics: string[] = [];
    const first = captureClient(firstReceived, firstDiagnostics);
    const second = captureClient(secondReceived);

    registerArcjet(first);
    try {
      registerArcjet(second);
      capture({ action: "first" });
      await flush();

      assert.equal(firstReceived.length, 1);
      assert.equal(secondReceived.length, 0);
      assert.equal(firstDiagnostics.length, 1);
      assert.match(firstDiagnostics[0], /\[AJ3004\]/);
    } finally {
      unregisterArcjet();
    }

    registerArcjet(second);
    try {
      capture({ action: "second" });
      await flush();

      assert.equal(secondReceived.length, 1);
    } finally {
      unregisterArcjet();
    }
  });

  test("registering the same client twice is idempotent", () => {
    const diagnostics: string[] = [];
    const client = captureClient([], diagnostics);

    registerArcjet(client);
    try {
      registerArcjet(client);
      assert.deepEqual(diagnostics, []);
    } finally {
      unregisterArcjet();
    }
  });
});

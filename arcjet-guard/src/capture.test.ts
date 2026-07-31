import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { create } from "@bufbuild/protobuf";
import type { Transport } from "@connectrpc/connect";
import { Code, ConnectError, createRouterTransport } from "@connectrpc/connect";

import { launchArcjetWithTransport } from "./index.ts";
import type { ArcjetGuard } from "./index.ts";
import {
  CaptureResponseSchema,
  DecideService,
  type CaptureRequest,
  type CaptureResponse,
} from "./proto/proto/decide/v2/decide_pb.js";

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function mockCaptureTransport(
  handler: (request: CaptureRequest, context: { requestHeader: Headers }) => CaptureResponse,
): Transport {
  return createRouterTransport(({ service }) => {
    service(DecideService, { capture: handler });
  });
}

describe("capture", () => {
  test("sends a normalized event with nested metadata and authentication", async () => {
    const { promise, resolve } = deferred<{
      request: CaptureRequest;
      authorization: string | null;
    }>();
    const transport = mockCaptureTransport((request, context) => {
      resolve({
        request,
        authorization: context.requestHeader.get("authorization"),
      });
      return create(CaptureResponseSchema, {});
    });
    const arcjet = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });

    arcjet.capture({
      action: "refund.issued",
      correlationId: "workflow_123",
      decisionId: "gdec_123",
      metadata: {
        invoice: { id: "inv_123", amount: 4200 },
        refunded: true,
      },
    });
    await arcjet.flush();

    const { request, authorization } = await promise;
    assert.equal(authorization, "Bearer ajkey_dummy");
    assert.match(request.userAgent, /^arcjet-guard-js\//);
    assert.ok(request.sentAtUnixMs !== undefined && request.sentAtUnixMs > 0n);
    assert.equal(request.events.length, 1);

    const event = request.events[0];
    assert.equal(event.action, "refund.issued");
    assert.equal(event.correlationId, "workflow_123");
    assert.equal(event.decisionId, "gdec_123");
    assert.ok(request.sentAtUnixMs !== undefined);
    assert.ok(event.occurredAtUnixMs <= request.sentAtUnixMs);
    assert.deepEqual(
      { ...event.metadataJson },
      {
        invoice: '{"id":"inv_123","amount":4200}',
        refunded: "true",
      },
    );
    assert.deepEqual(event.localWarnings, []);
    // Sent explicitly rather than left to the server, which never defaults it —
    // an absent source means unknown, not "sdk".
    assert.equal(event.source, "sdk");
  });

  test("preserves metadata encoding warnings on the event", async () => {
    const { promise, resolve } = deferred<CaptureRequest>();
    const diagnostics: string[] = [];
    const transport = mockCaptureTransport((request) => {
      resolve(request);
      return create(CaptureResponseSchema, {});
    });
    const arcjet = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
      logger: {
        warn(messageOrFields, message): void {
          if (typeof messageOrFields === "string") {
            diagnostics.push(messageOrFields);
          } else if (typeof message === "string") {
            diagnostics.push(`[${String(messageOrFields["code"])}] ${message}`);
          }
        },
      },
    });

    arcjet.capture({
      action: "refund.issued",
      metadata: {
        kept: ["nested", { value: 42 }],
        dropped: undefined,
      },
    });
    await arcjet.flush();

    const request = await promise;
    const event = request.events[0];
    assert.deepEqual(
      { ...event.metadataJson },
      {
        kept: '["nested",{"value":42}]',
      },
    );
    assert.equal(event.localWarnings.length, 1);
    assert.equal(event.localWarnings[0].code, "AJ1017");
    assert.match(event.localWarnings[0].message, /"dropped"/);
    assert.equal(diagnostics.length, 1);
    assert.match(diagnostics[0], /\[AJ1017\]/);
  });

  test("accepts an explicit occurrence time", async () => {
    const { promise, resolve } = deferred<CaptureRequest>();
    const transport = mockCaptureTransport((request) => {
      resolve(request);
      return create(CaptureResponseSchema, {});
    });
    const arcjet = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });
    const occurredAt = new Date("2026-07-01T12:00:00Z");

    arcjet.capture({
      action: "refund.issued",
      occurredAt,
    });
    await arcjet.flush();

    const request = await promise;
    assert.equal(request.events[0].occurredAtUnixMs, BigInt(occurredAt.getTime()));
  });

  test("strips malformed optional fields and reports local warnings", async () => {
    const { promise, resolve } = deferred<CaptureRequest>();
    const transport = mockCaptureTransport((request) => {
      resolve(request);
      return create(CaptureResponseSchema, {});
    });
    const arcjet = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });
    const input = {
      action: "refund.issued",
      correlationId: 42,
      get decisionId(): never {
        throw new Error("unreadable");
      },
      occurredAt: new Date(Number.NaN),
      metadata: [],
    };

    arcjet.capture(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- simulate an untyped caller
      input as unknown as Parameters<ArcjetGuard["capture"]>[0],
    );
    // Drain rather than waiting for the batch timer. That timer is unref'd, so a
    // runner with nothing else pending can finish the event loop before it fires
    // and the awaited promise never settles.
    await arcjet.flush();

    const event = (await promise).events[0];
    assert.equal(event.action, "refund.issued");
    assert.equal(event.correlationId, "");
    assert.equal(event.decisionId, "");
    assert.ok(event.occurredAtUnixMs > 0n);
    assert.deepEqual({ ...event.metadataJson }, {});
    assert.deepEqual(
      event.localWarnings.map((warning) => warning.code),
      ["AJ1001", "AJ1001", "AJ1001", "AJ1001"],
    );
    assert.deepEqual(
      event.localWarnings.map((warning) => warning.message),
      [
        "capture.correlationId was invalid and was dropped by the SDK",
        "capture.decisionId was invalid and was dropped by the SDK",
        "capture.occurredAt was invalid and was dropped by the SDK",
        "capture.metadata was invalid and was dropped by the SDK",
      ],
    );
  });

  test("drops input without a valid action without sending or throwing", async () => {
    let sends = 0;
    const diagnostics: string[] = [];
    const transport = mockCaptureTransport(() => {
      sends += 1;
      return create(CaptureResponseSchema, {});
    });
    const arcjet = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
      logger: {
        warn(messageOrFields, message): void {
          if (typeof messageOrFields === "string") {
            diagnostics.push(messageOrFields);
          } else if (typeof message === "string") {
            diagnostics.push(`[${String(messageOrFields["code"])}] ${message}`);
          }
        },
      },
    });

    const malformed: unknown[] = [null, [], {}, { action: "" }, { action: 42 }];

    for (const input of malformed) {
      assert.doesNotThrow(() => {
        arcjet.capture(
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- simulate an untyped caller
          input as Parameters<ArcjetGuard["capture"]>[0],
        );
      });
    }

    // Draining is what makes this deterministic. If any of the malformed calls
    // had been enqueued, flush() would have sent it before returning; a timer
    // would only ever show that nothing had been sent *yet*, so on a slow runner
    // it could pass while the bug was present.
    await arcjet.flush();

    assert.equal(sends, 0);
    assert.equal(diagnostics.length, malformed.length);
    assert.ok(diagnostics.every((message) => message.includes("[AJ3000]")));
  });

  test("diagnoses an RPC failure without throwing into application code", async () => {
    const diagnostics: string[] = [];
    const transport = mockCaptureTransport(() => {
      throw new ConnectError("service unavailable", Code.Unavailable);
    });
    const arcjet = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
      logger: {
        warn(messageOrFields, message): void {
          if (typeof messageOrFields === "string") {
            diagnostics.push(messageOrFields);
          } else if (typeof message === "string") {
            diagnostics.push(`[${String(messageOrFields["code"])}] ${message}`);
          }
        },
      },
    });

    assert.doesNotThrow(() => {
      arcjet.capture({ action: "refund.issued" });
    });
    await arcjet.flush();

    assert.equal(diagnostics.length, 1);
    assert.match(diagnostics[0], /\[AJ3002\]/);
  });

  test("a caller-supplied waitUntil receives a promise covering the send", async () => {
    const received: CaptureRequest[] = [];
    const transport = mockCaptureTransport((request) => {
      received.push(request);
      return create(CaptureResponseSchema, {});
    });
    const arcjet: ArcjetGuard = launchArcjetWithTransport({
      key: "ajkey_test",
      transport,
    });

    const pending: Promise<unknown>[] = [];
    arcjet.capture({
      action: "refund.issued",
      waitUntil: (promise) => {
        pending.push(promise);
      },
    });

    // The hook is handed a promise synchronously so the runtime knows work is
    // outstanding. It covers the batched send rather than replacing it, so
    // nothing has been sent until it settles.
    assert.equal(pending.length, 1);
    assert.equal(received.length, 0);
    // Drained via flush(): the batch timer is unref'd, so on Node 22 the event
    // loop can drain before it fires and this would stay pending forever.
    await arcjet.flush(1000);
    await pending[0];

    assert.equal(received.length, 1);
    assert.equal(received[0].events[0].action, "refund.issued");
  });

  test("an uncallable waitUntil falls back to batching without dropping the event", async () => {
    const received: CaptureRequest[] = [];
    const transport = mockCaptureTransport((request) => {
      received.push(request);
      return create(CaptureResponseSchema, {});
    });
    const diagnostics: string[] = [];
    const arcjet: ArcjetGuard = launchArcjetWithTransport({
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

    assert.doesNotThrow(() => {
      arcjet.capture({
        action: "refund.issued",
        // @ts-expect-error -- a plain JavaScript caller can pass anything.
        waitUntil: "not-a-function",
      });
    });
    await arcjet.flush();

    assert.equal(received.length, 1);
    assert.equal(received[0].events[0].action, "refund.issued");
    assert.deepEqual(diagnostics, []);
  });

  test("a throwing waitUntil getter costs the hint, not the event", async () => {
    const received: CaptureRequest[] = [];
    const transport = mockCaptureTransport((request) => {
      received.push(request);
      return create(CaptureResponseSchema, {});
    });
    const arcjet: ArcjetGuard = launchArcjetWithTransport({
      key: "ajkey_test",
      transport,
    });

    const options = { action: "refund.issued" };
    Object.defineProperty(options, "waitUntil", {
      enumerable: true,
      get(): never {
        throw new Error("boom");
      },
    });

    assert.doesNotThrow(() => {
      arcjet.capture(options);
    });
    await arcjet.flush();

    assert.equal(received.length, 1);
    assert.equal(received[0].events[0].action, "refund.issued");
  });

  test("flush releases diagnostics the channel was holding back", async () => {
    // Coalescing means a burst of drops reports only its first event until
    // something releases the rest. flush() is that something — without the
    // wiring, the accumulated total would never be reported in practice.
    const lines: string[] = [];
    const transport = mockCaptureTransport(() => create(CaptureResponseSchema, {}));
    const arcjet: ArcjetGuard = launchArcjetWithTransport({
      key: "ajkey_test",
      transport,
    });

    const original = console.warn;
    console.warn = (message: string): void => {
      lines.push(message);
    };
    try {
      // Four invalid events: the first is reported, three are held.
      for (let index = 0; index < 4; index++) {
        arcjet.capture({ action: "" });
      }
      assert.equal(lines.length, 1, `expected one line, got ${lines.length}`);

      await arcjet.flush(1000);
    } finally {
      console.warn = original;
    }

    assert.equal(lines.length, 2, "flush should release the held count");
    assert.match(lines[1], /count: 3$/m);
  });
});

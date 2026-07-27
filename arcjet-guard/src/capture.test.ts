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

    const { request, authorization } = await promise;
    assert.equal(authorization, "Bearer ajkey_dummy");
    assert.match(request.userAgent, /^arcjet-guard-js\//);
    assert.ok(request.sentAtUnixMs !== undefined && request.sentAtUnixMs > 0n);
    assert.equal(request.events.length, 1);

    const event = request.events[0];
    assert.equal(event.action, "refund.issued");
    assert.equal(event.correlationId, "workflow_123");
    assert.equal(event.decisionId, "gdec_123");
    assert.equal(event.occurredAtUnixMs, request.sentAtUnixMs);
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
    const transport = mockCaptureTransport((request) => {
      resolve(request);
      return create(CaptureResponseSchema, {});
    });
    const arcjet = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });

    arcjet.capture({
      action: "refund.issued",
      metadata: {
        kept: ["nested", { value: 42 }],
        dropped: undefined,
      },
    });

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
    const actions: string[] = [];
    const { promise, resolve } = deferred<void>();
    const transport = mockCaptureTransport((request) => {
      for (const event of request.events) {
        actions.push(event.action);
      }
      resolve();
      return create(CaptureResponseSchema, {});
    });
    const arcjet = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
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

    // Send one good event and wait for it to land, rather than waiting a fixed
    // number of milliseconds. Anything the malformed calls sent would have been
    // queued ahead of this one, so arriving here with only the good action
    // proves none of them were sent — and the test can't pass by being slow.
    arcjet.capture({ action: "refund.issued" });
    await promise;

    assert.deepEqual(actions, ["refund.issued"]);
  });

  test("does not throw or reject into application code when the RPC fails", async () => {
    const transport = mockCaptureTransport(() => {
      throw new ConnectError("service unavailable", Code.Unavailable);
    });
    const arcjet = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });

    assert.doesNotThrow(() => {
      arcjet.capture({ action: "refund.issued" });
    });

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });
  });
});
